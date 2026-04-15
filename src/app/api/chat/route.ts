import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamChatAboutReport } from "@/lib/claude";
import { checkRateLimit, recordUsage } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId, message } = await req.json();

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: "Missing sessionId or message" },
      { status: 400 }
    );
  }

  // Rate limit check
  const rateCheck = await checkRateLimit(session.user.id);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
  }

  // Verify ownership
  const auditSession = await prisma.auditSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { results: true },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
    },
  });

  if (!auditSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { auditSessionId: sessionId, role: "user", content: message },
  });

  // Build context
  const latestResults = auditSession.analyses[0]?.results;
  const reportContext = latestResults
    ? JSON.stringify(latestResults, null, 2).slice(0, 8000)
    : "No analysis results available yet.";

  const history = [
    ...auditSession.chatMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ].slice(-20);

  // Stream response
  const stream = streamChatAboutReport(history, reportContext);

  // We need to capture the full text to save it after streaming completes.
  // Use a TransformStream to tee the output.
  const fullTextChunks: string[] = [];
  let costCents = 0;
  const userId = session.user.id;

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);

      // Parse the SSE data to capture text
      const text = new TextDecoder().decode(chunk);
      const lines = text.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.text) fullTextChunks.push(data.text);
          if (data.costCents) costCents = data.costCents;
          if (data.done) {
            // Save the complete assistant reply async (fire-and-forget)
            const fullText = fullTextChunks.join("");
            prisma.chatMessage
              .create({
                data: {
                  auditSessionId: sessionId,
                  role: "assistant",
                  content: fullText,
                },
              })
              .then(() => recordUsage(userId, "chat", Math.round(costCents)))
              .catch(console.error);
          }
        } catch {
          // ignore parse errors
        }
      }
    },
  });

  const readable = stream.pipeThrough(transform);

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
