import { prisma } from "@/lib/prisma";

const DAILY_ANALYSIS_LIMIT = parseInt(
  process.env.DAILY_ANALYSIS_LIMIT || "15",
  10
);
const DAILY_COST_LIMIT_CENTS = parseInt(
  process.env.DAILY_COST_LIMIT_CENTS || "200",
  10
);

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  usage?: { analysisCount: number; estimatedCostCents: number };
}> {
  const date = todayString();

  const usage = await prisma.dailyUsage.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (!usage) {
    return { allowed: true, usage: { analysisCount: 0, estimatedCostCents: 0 } };
  }

  if (usage.analysisCount >= DAILY_ANALYSIS_LIMIT) {
    return {
      allowed: false,
      reason: `Daily analysis limit reached (${DAILY_ANALYSIS_LIMIT}/day). Try again tomorrow.`,
      usage: {
        analysisCount: usage.analysisCount,
        estimatedCostCents: usage.estimatedCostCents,
      },
    };
  }

  if (usage.estimatedCostCents >= DAILY_COST_LIMIT_CENTS) {
    return {
      allowed: false,
      reason: `Daily cost limit reached. Try again tomorrow.`,
      usage: {
        analysisCount: usage.analysisCount,
        estimatedCostCents: usage.estimatedCostCents,
      },
    };
  }

  return {
    allowed: true,
    usage: {
      analysisCount: usage.analysisCount,
      estimatedCostCents: usage.estimatedCostCents,
    },
  };
}

export async function recordUsage(
  userId: string,
  type: "analysis" | "chat",
  estimatedCostCents: number = 0
): Promise<void> {
  const date = todayString();

  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      analysisCount: type === "analysis" ? 1 : 0,
      chatMessageCount: type === "chat" ? 1 : 0,
      estimatedCostCents,
    },
    update: {
      analysisCount:
        type === "analysis" ? { increment: 1 } : undefined,
      chatMessageCount:
        type === "chat" ? { increment: 1 } : undefined,
      estimatedCostCents: { increment: estimatedCostCents },
    },
  });
}
