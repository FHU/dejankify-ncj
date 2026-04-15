import * as cheerio from "cheerio";
import type { HeadingsResult, Issue, HeadingItem } from "@/types";

export function analyzeHeadings(html: string): HeadingsResult {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const headings: HeadingItem[] = [];

  // Extract all headings in document order
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = $(el).prop("tagName")?.toLowerCase() || "";
    const level = parseInt(tag.replace("h", ""), 10);
    const text = $(el).text().trim();
    headings.push({ level, text });
  });

  if (headings.length === 0) {
    issues.push({
      severity: "warning",
      message: "No headings found on the page.",
      suggestion:
        "Add headings (h1–h6) to structure your content. Every page should have at least one <h1>.",
    });

    return {
      name: "Headings",
      slug: "headings",
      score: 0,
      maxScore: 1,
      issues,
      details: { headings },
    };
  }

  // ─── Check for h1 ──────────────────────────────────────────────
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) {
    issues.push({
      severity: "error",
      message: "No <h1> tag found.",
      suggestion:
        "Every page should have exactly one <h1> that describes the page's main topic.",
      code: "<h1>Your Page Title</h1>",
    });
  } else if (h1s.length > 1) {
    issues.push({
      severity: "warning",
      message: `Found ${h1s.length} <h1> tags. Best practice is to have exactly one.`,
      element: h1s.map((h) => `<h1>${h.text}</h1>`).join(", "),
      suggestion:
        "Use a single <h1> for the page's main heading. Demote others to <h2> or lower.",
    });
  } else {
    issues.push({
      severity: "pass",
      message: `Single <h1> found: "${h1s[0].text}"`,
    });
  }

  // ─── Check for skipped levels ──────────────────────────────────
  let skippedLevels = false;
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const curr = headings[i].level;
    // It's only a problem if you go deeper by more than one level
    if (curr > prev + 1) {
      skippedLevels = true;
      headings[i].issue = `Skipped from h${prev} to h${curr}`;
      issues.push({
        severity: "warning",
        message: `Heading level skipped: <h${prev}> → <h${curr}> ("${headings[i].text}")`,
        element: `<h${curr}>${headings[i].text}</h${curr}>`,
        suggestion: `Use <h${prev + 1}> instead, or add intermediate heading levels.`,
      });
    }
  }

  if (!skippedLevels && headings.length > 1) {
    issues.push({
      severity: "pass",
      message: "Heading hierarchy has no skipped levels.",
    });
  }

  // ─── Check for empty headings ──────────────────────────────────
  const emptyHeadings = headings.filter((h) => !h.text);
  if (emptyHeadings.length > 0) {
    issues.push({
      severity: "error",
      message: `Found ${emptyHeadings.length} empty heading(s).`,
      suggestion:
        "Empty headings confuse screen readers. Add text content or remove the heading element.",
    });
  }

  // ─── Check for very long headings ──────────────────────────────
  const longHeadings = headings.filter((h) => h.text.length > 100);
  if (longHeadings.length > 0) {
    longHeadings.forEach((h) => {
      issues.push({
        severity: "info",
        message: `<h${h.level}> is very long (${h.text.length} chars): "${h.text.slice(0, 60)}…"`,
        suggestion:
          "Keep headings concise. Consider moving details into paragraph text.",
      });
    });
  }

  // ─── First heading isn't h1 ────────────────────────────────────
  if (headings[0].level !== 1 && h1s.length > 0) {
    issues.push({
      severity: "info",
      message: `First heading on the page is <h${headings[0].level}>, not <h1>.`,
      suggestion:
        "The <h1> should generally appear before other headings in the document.",
    });
  }

  // ─── Scoring ───────────────────────────────────────────────────
  const passCount = issues.filter((i) => i.severity === "pass").length;
  const totalChecks = issues.filter((i) => i.severity !== "info").length;

  return {
    name: "Headings",
    slug: "headings",
    score: passCount,
    maxScore: Math.max(totalChecks, 1),
    issues,
    details: { headings },
  };
}
