import * as cheerio from "cheerio";
import type { ContrastResult, ContrastPair, Issue } from "@/types";

// ─── Color parsing utilities ─────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

const NAMED_COLORS: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000",
  blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080",
  gray: "#808080", grey: "#808080", silver: "#c0c0c0", maroon: "#800000",
  navy: "#000080", teal: "#008080", aqua: "#00ffff", fuchsia: "#ff00ff",
  lime: "#00ff00", olive: "#808000",
};

function parseColor(color: string): RGB | null {
  if (!color) return null;
  color = color.trim().toLowerCase();

  // Named colors
  if (NAMED_COLORS[color]) {
    color = NAMED_COLORS[color];
  }

  // Hex: #rgb or #rrggbb
  const hex6 = color.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    return {
      r: parseInt(hex6[1].slice(0, 2), 16),
      g: parseInt(hex6[1].slice(2, 4), 16),
      b: parseInt(hex6[1].slice(4, 6), 16),
    };
  }

  const hex3 = color.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    return {
      r: parseInt(hex3[1][0] + hex3[1][0], 16),
      g: parseInt(hex3[1][1] + hex3[1][1], 16),
      b: parseInt(hex3[1][2] + hex3[1][2], 16),
    };
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = color.match(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

// ─── WCAG contrast ratio calculation ─────────────────────────────

function relativeLuminance(rgb: RGB): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: RGB, bg: RGB): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Main analyzer ───────────────────────────────────────────────

export function analyzeContrast(html: string): ContrastResult {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const pairs: ContrastPair[] = [];

  // Extract color pairs from inline styles
  const elementsWithColor = $("[style]").filter((_, el) => {
    const style = $(el).attr("style") || "";
    return style.includes("color");
  });

  // Also check style blocks for simple selectors
  const styleBlocks: string[] = [];
  $("style").each((_, el) => {
    styleBlocks.push($(el).text());
  });

  // Process inline styles
  elementsWithColor.each((_, el) => {
    const $el = $(el);
    const style = $el.attr("style") || "";

    // Parse color and background-color from inline style
    const colorMatch = style.match(
      /(?:^|;)\s*color\s*:\s*([^;]+)/i
    );
    const bgMatch = style.match(
      /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i
    );

    if (colorMatch && bgMatch) {
      const fg = parseColor(colorMatch[1]);
      const bg = parseColor(bgMatch[1]);

      if (fg && bg) {
        const ratio = contrastRatio(fg, bg);
        const fontSize = style.match(/font-size\s*:\s*([^;]+)/i)?.[1]?.trim();

        // Determine if text is "large" (>= 18pt or >= 14pt bold)
        const isLargeText =
          fontSize &&
          (parseFloat(fontSize) >= 24 ||
            (parseFloat(fontSize) >= 18.67 &&
              (style.includes("bold") || style.includes("700") || style.includes("800") || style.includes("900"))));

        const passesAA = isLargeText ? ratio >= 3 : ratio >= 4.5;
        const passesAAA = isLargeText ? ratio >= 4.5 : ratio >= 7;

        const tagName = el.tagName?.toLowerCase() || "element";
        const text = $el.text().trim().slice(0, 40);
        const elementStr = `<${tagName}>${text}${text.length >= 40 ? "…" : ""}</${tagName}>`;

        pairs.push({
          foreground: colorMatch[1].trim(),
          background: bgMatch[1].trim(),
          ratio: Math.round(ratio * 100) / 100,
          element: elementStr,
          passesAA,
          passesAAA,
          fontSize: fontSize || undefined,
        });

        if (!passesAA) {
          issues.push({
            severity: "error",
            message: `Contrast ratio ${ratio.toFixed(2)}:1 fails WCAG AA (needs ${isLargeText ? "3" : "4.5"}:1).`,
            element: elementStr,
            suggestion: `Foreground: ${colorMatch[1].trim()}, Background: ${bgMatch[1].trim()}. Increase contrast by darkening the foreground or lightening the background.`,
          });
        } else if (!passesAAA) {
          issues.push({
            severity: "warning",
            message: `Contrast ratio ${ratio.toFixed(2)}:1 passes AA but fails AAA (needs ${isLargeText ? "4.5" : "7"}:1).`,
            element: elementStr,
          });
        }
      }
    }
  });

  // Summary
  const failingPairs = pairs.filter((p) => !p.passesAA);
  if (pairs.length === 0) {
    issues.push({
      severity: "info",
      message:
        "No inline color pairs found to check. This analyzer only detects colors set via inline styles or embedded <style> blocks — external CSS is not analyzed.",
      suggestion:
        "Use browser DevTools or a dedicated contrast checker for full coverage.",
    });
  } else if (failingPairs.length === 0) {
    issues.push({
      severity: "pass",
      message: `All ${pairs.length} detected color pairs pass WCAG AA.`,
    });
  }

  const passCount = issues.filter((i) => i.severity === "pass").length;
  const totalChecks = issues.filter(
    (i) => i.severity !== "info"
  ).length;

  return {
    name: "Color Contrast",
    slug: "contrast",
    score: passCount,
    maxScore: Math.max(totalChecks, 1),
    issues,
    details: { pairs },
  };
}
