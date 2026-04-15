import type { PageSpeedResult, PageSpeedCategory, Issue } from "@/types";

const PAGESPEED_API_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PSIAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
}

interface PSICategory {
  id: string;
  title: string;
  score: number;
  auditRefs: Array<{ id: string; weight: number }>;
}

export async function analyzePageSpeed(url: string): Promise<PageSpeedResult> {
  const issues: Issue[] = [];

  const apiKey = process.env.PAGESPEED_API_KEY;
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "PERFORMANCE",
    category: "ACCESSIBILITY",
    // Note: URLSearchParams only keeps last duplicate key.
    // We need to build the URL manually for multiple categories.
  });

  // Build URL with multiple category params
  let apiUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&strategy=mobile`;
  apiUrl += "&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO";
  if (apiKey) apiUrl += `&key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(60_000), // PSI can be slow
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PageSpeed API returned ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;

    if (!lighthouse) {
      throw new Error("No Lighthouse data in PageSpeed response.");
    }

    const categories: PageSpeedCategory[] = [];
    const categoryMap = lighthouse.categories as Record<string, PSICategory>;
    const auditMap = lighthouse.audits as Record<string, PSIAudit>;

    for (const [key, cat] of Object.entries(categoryMap)) {
      const catScore = Math.round((cat.score || 0) * 100);

      // Get the top 5 failing audits for this category
      const failingAudits = cat.auditRefs
        .map((ref) => auditMap[ref.id])
        .filter(
          (audit) =>
            audit &&
            audit.score !== null &&
            audit.score < 0.9 &&
            audit.scoreDisplayMode !== "notApplicable" &&
            audit.scoreDisplayMode !== "informative"
        )
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        .slice(0, 5);

      categories.push({
        name: cat.title,
        score: catScore,
        audits: failingAudits.map((a) => ({
          title: a.title,
          description: a.description?.replace(/\[.*?\]\(.*?\)/g, "").trim() || "", // strip markdown links
          score: a.score !== null ? Math.round(a.score * 100) : null,
        })),
      });

      // Generate issues from failing audits
      for (const audit of failingAudits) {
        const auditScore = audit.score !== null ? Math.round(audit.score * 100) : 0;
        issues.push({
          severity: auditScore < 50 ? "error" : "warning",
          message: `[${cat.title}] ${audit.title} (score: ${auditScore}/100)`,
          suggestion: audit.description?.replace(/\[.*?\]\(.*?\)/g, "").trim(),
        });
      }

      // Add pass/fail summary per category
      if (catScore >= 90) {
        issues.push({
          severity: "pass",
          message: `${cat.title} score: ${catScore}/100`,
        });
      }
    }

    const avgScore = categories.length > 0
      ? Math.round(
          categories.reduce((sum, c) => sum + c.score, 0) / categories.length
        )
      : 0;

    const passCount = issues.filter((i) => i.severity === "pass").length;
    const totalChecks = issues.filter((i) => i.severity !== "info").length;

    return {
      name: "PageSpeed",
      slug: "pagespeed",
      score: passCount,
      maxScore: Math.max(totalChecks, 1),
      issues,
      details: { categories },
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error contacting PageSpeed API";

    issues.push({
      severity: "warning",
      message: `Could not run PageSpeed analysis: ${errorMsg}`,
      suggestion: "PageSpeed analysis may fail for localhost URLs or pages that block Google's crawler.",
    });

    return {
      name: "PageSpeed",
      slug: "pagespeed",
      score: 0,
      maxScore: 1,
      issues,
      details: { categories: [] },
    };
  }
}
