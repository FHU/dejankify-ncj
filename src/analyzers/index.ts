import { analyzeMetaTags } from "./meta-tags";
import { analyzeHeadings } from "./headings";
import { analyzeAccessibility } from "./accessibility";
import { analyzeContrast } from "./contrast";
import { analyzeAltText } from "./alt-text";
import { analyzeOpenGraph } from "./open-graph";
import { analyzePageSpeed } from "./pagespeed";
import type { AnalysisReport, AnalysisModuleResult } from "@/types";

export interface FullAnalysisResult {
  report: AnalysisReport;
  estimatedCostCents: number;
}

export async function runFullAnalysis(
  html: string,
  url: string
): Promise<FullAnalysisResult> {
  // Run all analyzers in parallel.
  // Rule-based ones are synchronous but wrapped in Promise.resolve for uniformity.
  // AI-powered ones (alt-text, open-graph) call Claude and may take a few seconds.
  // PageSpeed calls Google's API and can take up to 60s.
  const results = await Promise.allSettled([
    Promise.resolve(analyzeMetaTags(html)),
    Promise.resolve(analyzeHeadings(html)),
    Promise.resolve(analyzeAccessibility(html)),
    Promise.resolve(analyzeContrast(html)),
    analyzeAltText(html, url),
    analyzeOpenGraph(html, url),
    analyzePageSpeed(url),
  ]);

  const modules: AnalysisModuleResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      modules.push(result.value as AnalysisModuleResult);
    } else {
      console.error("Analyzer module failed:", result.reason);
    }
  }

  // Calculate overall score
  const totalScore = modules.reduce((sum, m) => sum + m.score, 0);
  const totalMaxScore = modules.reduce((sum, m) => sum + m.maxScore, 0);
  const overallScore =
    totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  // Aggregate estimated API costs from AI modules
  let estimatedCostCents = 0;
  for (const mod of modules) {
    const details = mod.details as Record<string, unknown> | undefined;
    if (details && typeof details.estimatedCostCents === "number") {
      estimatedCostCents += details.estimatedCostCents;
    }
  }

  return {
    report: {
      url,
      fetchedAt: new Date().toISOString(),
      overallScore,
      modules,
    },
    estimatedCostCents: Math.round(estimatedCostCents * 100) / 100,
  };
}

// Generate score summary for database storage
export function extractScores(
  report: AnalysisReport
): Record<string, number> {
  const scores: Record<string, number> = {
    overall: report.overallScore,
  };

  for (const mod of report.modules) {
    scores[mod.slug] =
      mod.maxScore > 0 ? Math.round((mod.score / mod.maxScore) * 100) : 0;
  }

  return scores;
}
