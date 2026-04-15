import { notFound } from "next/navigation";
import { getSession } from "@/actions/sessions";
import SessionView from "./SessionView";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;

  let session;
  try {
    session = await getSession(id);
  } catch {
    notFound();
  }

  const latestAnalysis = session.analyses[0] || null;

  return (
    <SessionView
      sessionId={session.id}
      url={session.url}
      analysis={
        latestAnalysis
          ? {
              id: latestAnalysis.id,
              results: latestAnalysis.results as Record<string, unknown>,
              scores: latestAnalysis.scores as Record<string, number> | null,
              status: latestAnalysis.status,
              createdAt: latestAnalysis.createdAt.toISOString(),
              errorMessage: latestAnalysis.errorMessage,
            }
          : null
      }
      analysisHistory={session.analyses.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        scores: a.scores as Record<string, number> | null,
      }))}
      chatMessages={session.chatMessages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
