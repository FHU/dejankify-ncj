"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatAboutReport } from "@/lib/claude";
import { checkRateLimit, recordUsage } from "@/lib/rate-limit";

export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<{ success: boolean; reply?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check rate limit
  const rateCheck = await checkRateLimit(session.user.id);
  if (!rateCheck.allowed) {
    return { success: false, error: rateCheck.reason };
  }

  // Verify the user owns this session
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
    return { success: false, error: "Session not found" };
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      auditSessionId: sessionId,
      role: "user",
      content: message,
    },
  });

  try {
    // Build context from latest analysis results
    const latestResults = auditSession.analyses[0]?.results;
    const reportContext = latestResults
      ? JSON.stringify(latestResults, null, 2).slice(0, 8000) // cap context size
      : "No analysis results available yet.";

    // Build conversation history
    const history = [
      ...auditSession.chatMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Keep last 20 messages to manage token usage
    const recentHistory = history.slice(-20);

    const result = await chatAboutReport(recentHistory, reportContext);

    // Save assistant reply
    await prisma.chatMessage.create({
      data: {
        auditSessionId: sessionId,
        role: "assistant",
        content: result.text,
      },
    });

    // Record usage
    await recordUsage(session.user.id, "chat", Math.round(result.costCents));

    return { success: true, reply: result.text };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to get AI response";
    return { success: false, error: errorMessage };
  }
}
