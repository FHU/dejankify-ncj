"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { fetchPage } from "@/lib/fetcher";
import { runFullAnalysis, extractScores } from "@/analyzers";
import { checkRateLimit, recordUsage } from "@/lib/rate-limit";

export async function runAnalysis(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check rate limit
  const rateCheck = await checkRateLimit(session.user.id);
  if (!rateCheck.allowed) {
    return { success: false, error: rateCheck.reason };
  }

  // Get the audit session
  const auditSession = await prisma.auditSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });

  if (!auditSession) {
    return { success: false, error: "Session not found" };
  }

  // Create a pending analysis record
  const analysis = await prisma.auditAnalysis.create({
    data: {
      auditSessionId: sessionId,
      url: auditSession.url,
      rawHtml: "", // will be populated after fetch
      results: {},
      status: "running",
    },
  });

  try {
    // Step 1: Fetch the page
    const fetchResult = await fetchPage(auditSession.url);

    // Update with raw HTML
    await prisma.auditAnalysis.update({
      where: { id: analysis.id },
      data: { rawHtml: fetchResult.html, url: fetchResult.finalUrl },
    });

    // Step 2: Run all analysis modules
    const { report, estimatedCostCents } = await runFullAnalysis(
      fetchResult.html,
      fetchResult.finalUrl
    );
    const scores = extractScores(report);

    // Step 3: Save results
    await prisma.auditAnalysis.update({
      where: { id: analysis.id },
      data: {
        results: report as unknown as Prisma.InputJsonValue,
        scores,
        status: "complete",
      },
    });

    // Update session timestamp
    await prisma.auditSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Record usage with real cost from AI modules
    await recordUsage(
      session.user.id,
      "analysis",
      Math.max(Math.round(estimatedCostCents), 1)
    );

    return { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred";

    // Mark analysis as failed
    await prisma.auditAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: "error",
        errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}
