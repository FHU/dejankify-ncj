import * as cheerio from "cheerio";
import type { MetaTagResult, Issue } from "@/types";

export function analyzeMetaTags(html: string): MetaTagResult {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];

  // ─── Title ──────────────────────────────────────────────────────
  const titles = $("title");
  if (titles.length === 0) {
    issues.push({
      severity: "error",
      message: "Missing <title> tag.",
      suggestion: "Add a <title> tag inside <head>. Ideal length: 50–60 characters.",
      code: "<title>Your Page Title Here</title>",
    });
  } else if (titles.length > 1) {
    issues.push({
      severity: "warning",
      message: `Found ${titles.length} <title> tags. Only one is allowed.`,
      suggestion: "Remove duplicate <title> tags.",
    });
  } else {
    const titleText = titles.first().text().trim();
    if (!titleText) {
      issues.push({
        severity: "error",
        message: "The <title> tag is empty.",
        suggestion: "Add descriptive text to your <title> tag (50–60 characters ideal).",
      });
    } else if (titleText.length < 30) {
      issues.push({
        severity: "warning",
        message: `Title is short (${titleText.length} chars): "${titleText}"`,
        suggestion: "Aim for 50–60 characters for optimal SEO display.",
      });
    } else if (titleText.length > 70) {
      issues.push({
        severity: "warning",
        message: `Title is long (${titleText.length} chars) and may be truncated in search results.`,
        element: `<title>${titleText}</title>`,
        suggestion: "Keep title under 60 characters to avoid truncation.",
      });
    } else {
      issues.push({
        severity: "pass",
        message: `Title is good (${titleText.length} chars): "${titleText}"`,
      });
    }
  }

  // ─── Meta description ──────────────────────────────────────────
  const descriptions = $('meta[name="description"]');
  if (descriptions.length === 0) {
    issues.push({
      severity: "error",
      message: "Missing <meta name=\"description\"> tag.",
      suggestion: "Add a meta description (150–160 characters ideal).",
      code: '<meta name="description" content="A brief description of your page content.">',
    });
  } else if (descriptions.length > 1) {
    issues.push({
      severity: "warning",
      message: `Found ${descriptions.length} meta descriptions. Only one should exist.`,
      suggestion: "Remove duplicate meta description tags.",
    });
  } else {
    const desc = descriptions.first().attr("content")?.trim() || "";
    if (!desc) {
      issues.push({
        severity: "error",
        message: "Meta description exists but has no content.",
        suggestion: "Add descriptive content (150–160 characters).",
      });
    } else if (desc.length < 70) {
      issues.push({
        severity: "warning",
        message: `Meta description is short (${desc.length} chars).`,
        suggestion: "Aim for 150–160 characters for optimal search display.",
      });
    } else if (desc.length > 170) {
      issues.push({
        severity: "warning",
        message: `Meta description is long (${desc.length} chars) and may be truncated.`,
        suggestion: "Keep under 160 characters to avoid truncation.",
      });
    } else {
      issues.push({
        severity: "pass",
        message: `Meta description is good (${desc.length} chars).`,
      });
    }
  }

  // ─── Viewport ──────────────────────────────────────────────────
  const viewport = $('meta[name="viewport"]');
  if (viewport.length === 0) {
    issues.push({
      severity: "error",
      message: "Missing viewport meta tag. Page won't be mobile-friendly.",
      suggestion: "Add a viewport meta tag for responsive design.",
      code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    });
  } else {
    issues.push({ severity: "pass", message: "Viewport meta tag is present." });
  }

  // ─── Charset ───────────────────────────────────────────────────
  const charset = $('meta[charset]');
  const httpEquivCharset = $('meta[http-equiv="Content-Type"]');
  if (charset.length === 0 && httpEquivCharset.length === 0) {
    issues.push({
      severity: "warning",
      message: "No charset declaration found.",
      suggestion: "Add charset declaration as the first element in <head>.",
      code: '<meta charset="UTF-8">',
    });
  } else {
    issues.push({ severity: "pass", message: "Charset declaration is present." });
  }

  // ─── Canonical ─────────────────────────────────────────────────
  const canonical = $('link[rel="canonical"]');
  if (canonical.length === 0) {
    issues.push({
      severity: "info",
      message: "No canonical URL specified.",
      suggestion: "Add a canonical link to prevent duplicate content issues.",
      code: '<link rel="canonical" href="https://example.com/page">',
    });
  } else {
    issues.push({ severity: "pass", message: "Canonical URL is specified." });
  }

  // ─── Scoring ───────────────────────────────────────────────────
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const passCount = issues.filter((i) => i.severity === "pass").length;
  const total = errorCount + warningCount + passCount;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return {
    name: "Meta Tags",
    slug: "meta-tags",
    score: passCount,
    maxScore: total,
    issues,
  };
}
