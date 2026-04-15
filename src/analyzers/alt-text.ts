import * as cheerio from "cheerio";
import { resolveImageUrl, processImageForVision } from "@/lib/image-processing";
import { analyzeImage } from "@/lib/claude";
import type { AltTextResult, AltTextImage, Issue } from "@/types";

// ─── Scoring heuristics ──────────────────────────────────────────

const GENERIC_ALT_PATTERNS = [
  /^image$/i, /^img$/i, /^photo$/i, /^picture$/i, /^graphic$/i,
  /^untitled$/i, /^screenshot$/i, /^banner$/i, /^logo$/i,
  /^img[-_]?\d+/i, /^dsc[-_]?\d+/i, /^image[-_]?\d+/i,
  /^photo[-_]?\d+/i, /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i,
];

function scoreAltText(
  alt: string | null | undefined,
  $el: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI
): number {
  if (alt === undefined || alt === null) return 0;

  if (alt === "") {
    const inFigure = $el.closest("figure").length > 0;
    const hasPresentation =
      $el.attr("role") === "presentation" || $el.attr("role") === "none";
    if (inFigure || hasPresentation) return 10; // intentionally decorative
    return 1;
  }

  if (GENERIC_ALT_PATTERNS.some((p) => p.test(alt.trim()))) return 2;
  if (alt.trim().length < 5) return 3;
  if (alt.trim().length < 15) return 5;
  return 8;
}

// ─── Vision prompt ───────────────────────────────────────────────

function buildAltTextPrompt(currentAlt: string | null, pageUrl: string): string {
  return `You are an accessibility expert. Analyze this image and write a concise, descriptive alt text for it.

Requirements:
- Under 125 characters
- Describe what the image shows and its purpose in context
- Do NOT start with "Image of", "Photo of", "Picture of", or "A "
- Be specific: mention key subjects, actions, and relevant details
- If it appears to be a logo or icon, describe it as such
- If it appears decorative with no meaningful content, respond with exactly: DECORATIVE

Context: This image appears on a webpage at ${pageUrl}
${currentAlt ? `Current alt text (may be bad): "${currentAlt}"` : "Current alt text: none"}

Respond with ONLY the alt text string (or DECORATIVE). No quotes, no explanation.`;
}

// ─── Main analyzer ───────────────────────────────────────────────

const MAX_IMAGES_TO_ANALYZE = 5;

export async function analyzeAltText(
  html: string,
  pageUrl: string
): Promise<AltTextResult> {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const images: AltTextImage[] = [];
  let totalCostCents = 0;

  // Collect and score all images
  $("img").each((_, el) => {
    const $img = $(el);
    const src = $img.attr("src") || "";
    const alt = $img.attr("alt");
    const score = scoreAltText(alt, $img, $);

    if (score === 10) return; // decorative, skip

    images.push({
      src,
      currentAlt: alt ?? null,
      currentScore: score,
    });
  });

  // Sort worst first
  images.sort((a, b) => a.currentScore - b.currentScore);

  // Take the worst N for AI analysis
  const candidates = images.slice(0, MAX_IMAGES_TO_ANALYZE);
  const analyzeableImages = candidates.filter((img) => img.currentScore < 8);

  // ─── Fetch, resize, and analyze with Claude Vision ─────────────
  let analyzedCount = 0;

  for (const img of analyzeableImages) {
    const absoluteUrl = resolveImageUrl(img.src, pageUrl);
    if (!absoluteUrl) {
      img.reasoning = "Could not resolve image URL.";
      continue;
    }

    const processed = await processImageForVision(absoluteUrl);
    if (!processed) {
      img.reasoning = "Could not fetch or process image (may be SVG, too large, or blocked).";
      continue;
    }

    try {
      const prompt = buildAltTextPrompt(img.currentAlt, pageUrl);
      const result = await analyzeImage(processed.base64, processed.mediaType, prompt);
      totalCostCents += result.costCents;

      const suggestion = result.text.trim();

      if (suggestion === "DECORATIVE") {
        img.suggestedAlt = '""';
        img.reasoning = "AI determined this image is decorative. Use alt=\"\" and consider adding role=\"presentation\".";
      } else {
        img.suggestedAlt = suggestion;
        img.reasoning = `AI-generated suggestion (${processed.processedWidth}×${processed.processedHeight}px analyzed).`;
      }

      analyzedCount++;
    } catch (err) {
      img.reasoning = `Vision API error: ${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  // ─── Build issues list ─────────────────────────────────────────

  for (const img of candidates) {
    const srcDisplay = img.src.length > 60
      ? `…${img.src.slice(-55)}`
      : img.src;

    if (img.currentScore === 0) {
      issues.push({
        severity: "error",
        message: "Image missing alt attribute entirely.",
        element: `<img src="${srcDisplay}">`,
        suggestion: img.suggestedAlt
          ? `Suggested alt text: "${img.suggestedAlt}"`
          : "Add an alt attribute describing the image content.",
        code: img.suggestedAlt
          ? `<img src="${srcDisplay}" alt="${img.suggestedAlt}">`
          : undefined,
      });
    } else if (img.currentScore <= 2) {
      issues.push({
        severity: "error",
        message: `Generic alt text: "${img.currentAlt}"`,
        element: `<img src="${srcDisplay}" alt="${img.currentAlt}">`,
        suggestion: img.suggestedAlt
          ? `Suggested replacement: "${img.suggestedAlt}"`
          : "Replace with descriptive alt text.",
        code: img.suggestedAlt
          ? `<img src="${srcDisplay}" alt="${img.suggestedAlt}">`
          : undefined,
      });
    } else if (img.currentScore <= 3) {
      issues.push({
        severity: "warning",
        message: `Alt text is very short (${img.currentAlt?.length} chars): "${img.currentAlt}"`,
        element: `<img src="${srcDisplay}" alt="${img.currentAlt}">`,
        suggestion: img.suggestedAlt
          ? `Suggested improvement: "${img.suggestedAlt}"`
          : "Make the alt text more descriptive.",
        code: img.suggestedAlt
          ? `<img src="${srcDisplay}" alt="${img.suggestedAlt}">`
          : undefined,
      });
    } else if (img.currentScore <= 5) {
      issues.push({
        severity: "info",
        message: `Alt text could be more descriptive: "${img.currentAlt}"`,
        element: `<img src="${srcDisplay}" alt="${img.currentAlt}">`,
        suggestion: img.suggestedAlt
          ? `Suggested improvement: "${img.suggestedAlt}"`
          : undefined,
      });
    }
  }

  // Summary
  const goodCount = images.filter((i) => i.currentScore >= 8).length;
  if (images.length > 0 && goodCount === images.length) {
    issues.push({
      severity: "pass",
      message: `All ${images.length} images have reasonable alt text.`,
    });
  } else if (analyzedCount > 0) {
    issues.push({
      severity: "info",
      message: `AI analyzed ${analyzedCount} image(s) and generated alt text suggestions.`,
    });
  }

  const passCount = issues.filter((i) => i.severity === "pass").length;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const totalChecks = Math.max(candidates.length, 1);
  const score = totalChecks - errorCount;

  return {
    name: "Alt Text",
    slug: "alt-text",
    score: Math.max(score, 0),
    maxScore: totalChecks,
    issues,
    details: {
      totalImages: images.length,
      imagesAnalyzed: analyzedCount,
      images: images.slice(0, 10),
      estimatedCostCents: Math.round(totalCostCents * 100) / 100,
    },
  };
}
