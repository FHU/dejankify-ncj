import * as cheerio from "cheerio";
import { complete } from "@/lib/claude";
import type { OpenGraphResult, OGTag, Issue } from "@/types";

const REQUIRED_OG_TAGS = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
];

const RECOMMENDED_OG_TAGS = ["og:site_name", "og:locale"];

// ─── Page content extraction for Claude context ──────────────────

function extractPageContext(
  $: cheerio.CheerioAPI,
  pageUrl: string
): string {
  const title = $("title").first().text().trim();
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() || "";
  const h1 = $("h1").first().text().trim();

  // Grab first ~500 chars of visible body text for context
  const bodyText = $("body")
    .find("p, li, td, span, div")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 20)
    .slice(0, 10)
    .join(" ")
    .slice(0, 500);

  // Find candidate images (first large-ish image on page)
  const candidateImages: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    const width = parseInt($(el).attr("width") || "0", 10);
    if (src && (width >= 200 || !$(el).attr("width"))) {
      candidateImages.push(src);
    }
  });

  return `URL: ${pageUrl}
Page title: ${title || "(none)"}
Meta description: ${metaDesc || "(none)"}
Main heading (h1): ${h1 || "(none)"}
Body text excerpt: ${bodyText || "(none)"}
Candidate images: ${candidateImages.slice(0, 3).join(", ") || "(none found)"}`;
}

// ─── Claude prompt for OG suggestions ────────────────────────────

function buildOGPrompt(
  pageContext: string,
  missingTags: string[],
  improvableTags: { property: string; currentValue: string }[],
  pageUrl: string
): string {
  return `You are an SEO specialist. Based on the following page content, suggest Open Graph meta tag values.

${pageContext}

${missingTags.length > 0 ? `Missing tags that need values: ${missingTags.join(", ")}` : ""}
${improvableTags.length > 0 ? `Tags that could be improved:\n${improvableTags.map((t) => `  ${t.property}: "${t.currentValue}"`).join("\n")}` : ""}

Rules:
- og:title: concise, under 60 characters, compelling for social sharing
- og:description: under 200 characters, summarizes the page's value proposition
- og:image: use an absolute URL. Pick the most representative image from the candidates listed, or suggest "${pageUrl}/og-image.png" as a placeholder
- og:url: use the canonical page URL
- og:type: usually "website" for general pages, "article" for blog posts
- og:site_name: the brand/site name if detectable from the page

Respond in this exact JSON format, only including tags you have suggestions for:
{
  "suggestions": {
    "og:title": "suggested value",
    "og:description": "suggested value"
  }
}

Respond with ONLY valid JSON. No markdown fences, no explanation.`;
}

// ─── Main analyzer ───────────────────────────────────────────────

export async function analyzeOpenGraph(
  html: string,
  pageUrl: string
): Promise<OpenGraphResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const tags: OGTag[] = [];

  const missingTags: string[] = [];
  const improvableTags: { property: string; currentValue: string }[] = [];

  // ─── Check required OG tags ────────────────────────────────────

  for (const prop of REQUIRED_OG_TAGS) {
    const el = $(`meta[property="${prop}"]`);
    const content = el.attr("content")?.trim() || null;

    if (!content) {
      tags.push({ property: prop, currentValue: null, status: "missing" });
      missingTags.push(prop);
    } else {
      if (prop === "og:title" && content.length > 90) {
        tags.push({ property: prop, currentValue: content, status: "improvable" });
        improvableTags.push({ property: prop, currentValue: content });
      } else if (prop === "og:description" && content.length > 200) {
        tags.push({ property: prop, currentValue: content, status: "improvable" });
        improvableTags.push({ property: prop, currentValue: content });
      } else if (prop === "og:image" && !content.startsWith("http")) {
        tags.push({ property: prop, currentValue: content, status: "improvable" });
        improvableTags.push({ property: prop, currentValue: content });
      } else {
        tags.push({ property: prop, currentValue: content, status: "present" });
      }
    }
  }

  // ─── Get AI suggestions for missing/improvable tags ────────────

  let aiSuggestions: Record<string, string> = {};
  let costCents = 0;

  if (missingTags.length > 0 || improvableTags.length > 0) {
    try {
      const pageContext = extractPageContext($, pageUrl);
      const prompt = buildOGPrompt(pageContext, missingTags, improvableTags, pageUrl);

      const result = await complete(prompt, {
        system: "You are an SEO expert. Respond only with valid JSON.",
        maxTokens: 512,
        model: "analysis",
      });
      costCents = result.costCents;

      // Parse the JSON response
      const cleaned = result.text.replace(/```json\s*|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.suggestions && typeof parsed.suggestions === "object") {
        aiSuggestions = parsed.suggestions;
      }
    } catch (err) {
      // AI suggestions are best-effort; don't fail the whole module
      console.error("OG suggestion generation failed:", err);
    }
  }

  // ─── Apply suggestions and build issues ────────────────────────

  for (const tag of tags) {
    const suggestion = aiSuggestions[tag.property];

    if (tag.status === "missing") {
      issues.push({
        severity: "error",
        message: `Missing ${tag.property} tag.`,
        suggestion: suggestion
          ? `AI-suggested value: "${suggestion}"`
          : `Add <meta property="${tag.property}" content="..."> to <head>.`,
        code: suggestion
          ? `<meta property="${tag.property}" content="${suggestion}">`
          : `<meta property="${tag.property}" content="your value here">`,
      });
      // Store suggestion on the tag object
      if (suggestion) tag.suggestedValue = suggestion;
    } else if (tag.status === "improvable") {
      issues.push({
        severity: "warning",
        message: tag.property === "og:image"
          ? `${tag.property} should use an absolute URL.`
          : `${tag.property} is long (${tag.currentValue!.length} chars) and may be truncated.`,
        element: `<meta property="${tag.property}" content="${tag.currentValue!.slice(0, 60)}…">`,
        suggestion: suggestion
          ? `AI-suggested replacement: "${suggestion}"`
          : tag.property === "og:image"
          ? "Use a full URL like https://example.com/image.jpg"
          : `Keep ${tag.property} under ${tag.property === "og:title" ? 60 : 200} characters.`,
        code: suggestion
          ? `<meta property="${tag.property}" content="${suggestion}">`
          : undefined,
      });
      if (suggestion) tag.suggestedValue = suggestion;
    } else {
      issues.push({
        severity: "pass",
        message: `${tag.property} is set: "${tag.currentValue!.slice(0, 60)}"`,
      });
    }
  }

  // ─── Check recommended tags ────────────────────────────────────

  for (const prop of RECOMMENDED_OG_TAGS) {
    const el = $(`meta[property="${prop}"]`);
    const content = el.attr("content")?.trim() || null;
    const suggestion = aiSuggestions[prop];

    if (!content) {
      issues.push({
        severity: "info",
        message: suggestion
          ? `Consider adding ${prop}: "${suggestion}"`
          : `Consider adding ${prop} for richer social previews.`,
        code: suggestion
          ? `<meta property="${prop}" content="${suggestion}">`
          : `<meta property="${prop}" content="your value here">`,
      });
    }
  }

  // ─── Twitter Card ──────────────────────────────────────────────

  const twitterCard = $('meta[name="twitter:card"]');
  if (twitterCard.length === 0) {
    issues.push({
      severity: "info",
      message: "No Twitter Card meta tags found.",
      suggestion: "Adding twitter:card enables richer link previews on X/Twitter.",
      code: '<meta name="twitter:card" content="summary_large_image">',
    });
  }

  // ─── Generate complete snippet if multiple tags are missing ────

  if (missingTags.length >= 3 && Object.keys(aiSuggestions).length > 0) {
    const snippet = missingTags
      .map((prop) => {
        const val = aiSuggestions[prop] || "your value here";
        return `<meta property="${prop}" content="${val}">`;
      })
      .join("\n");

    issues.push({
      severity: "info",
      message: "Here's a complete OG tag snippet you can paste into your <head>:",
      code: snippet,
    });
  }

  // ─── Scoring ───────────────────────────────────────────────────

  const passCount = issues.filter((i) => i.severity === "pass").length;
  const totalChecks = issues.filter((i) => i.severity !== "info").length;

  return {
    name: "Open Graph",
    slug: "open-graph",
    score: passCount,
    maxScore: Math.max(totalChecks, 1),
    issues,
    details: {
      tags,
      estimatedCostCents: Math.round(costCents * 100) / 100,
    },
  };
}
