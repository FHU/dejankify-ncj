"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GroupedSessions, SessionSummary } from "@/types";

export async function getUserSessions(): Promise<GroupedSessions> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const auditSessions = await prisma.auditSession.findMany({
    where: { userId: session.user.id },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { scores: true },
      },
      _count: { select: { analyses: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const summaries: SessionSummary[] = auditSessions.map((s) => {
    const latestScores = s.analyses[0]?.scores as Record<string, number> | null;
    return {
      id: s.id,
      url: s.url,
      domain: s.domain,
      latestScore: latestScores
        ? Math.round(
            Object.values(latestScores).reduce((a, b) => a + b, 0) /
              Object.values(latestScores).length
          )
        : null,
      analysisCount: s._count.analyses,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  });

  // Group by domain
  const grouped: GroupedSessions = {};
  for (const s of summaries) {
    if (!grouped[s.domain]) grouped[s.domain] = [];
    grouped[s.domain].push(s);
  }

  return grouped;
}

export async function getSession(sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const auditSession = await prisma.auditSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!auditSession) throw new Error("Session not found");

  return auditSession;
}

export async function deleteSession(sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await prisma.auditSession.deleteMany({
    where: { id: sessionId, userId: session.user.id },
  });
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function createSession(url: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const domain = extractDomain(normalizedUrl);

  const auditSession = await prisma.auditSession.create({
    data: {
      url: normalizedUrl,
      domain,
      userId: session.user.id,
    },
  });

  return auditSession.id;
}
