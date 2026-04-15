import * as cheerio from "cheerio";
import type { AccessibilityResult, Issue } from "@/types";

export function analyzeAccessibility(html: string): AccessibilityResult {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];

  // ─── Language attribute ────────────────────────────────────────
  const lang = $("html").attr("lang");
  if (!lang) {
    issues.push({
      severity: "error",
      message: 'Missing lang attribute on <html> element.',
      suggestion: "Screen readers need this to determine pronunciation.",
      code: '<html lang="en">',
    });
  } else {
    issues.push({ severity: "pass", message: `Language is set to "${lang}".` });
  }

  // ─── Landmark roles ────────────────────────────────────────────
  const hasMain = $("main, [role='main']").length > 0;
  const hasNav = $("nav, [role='navigation']").length > 0;

  if (!hasMain) {
    issues.push({
      severity: "error",
      message: "No <main> landmark found.",
      suggestion:
        "Wrap primary content in <main> so assistive tech can skip to it.",
      code: "<main>\n  <!-- primary content -->\n</main>",
    });
  } else {
    issues.push({ severity: "pass", message: "<main> landmark is present." });
  }

  if (!hasNav) {
    issues.push({
      severity: "info",
      message: "No <nav> landmark found.",
      suggestion:
        "If the page has navigation links, wrap them in <nav> for accessibility.",
    });
  }

  // ─── Skip navigation link ─────────────────────────────────────
  const skipLinks = $('a[href^="#"]').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return (
      text.includes("skip") ||
      text.includes("jump to") ||
      text.includes("main content")
    );
  });

  if (skipLinks.length === 0) {
    issues.push({
      severity: "warning",
      message: "No skip navigation link found.",
      suggestion:
        "Add a visually hidden skip link as the first focusable element.",
      code: '<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>',
    });
  } else {
    issues.push({ severity: "pass", message: "Skip navigation link is present." });
  }

  // ─── Form labels ───────────────────────────────────────────────
  const inputs = $("input, select, textarea").not(
    '[type="hidden"], [type="submit"], [type="button"], [type="reset"], [type="image"]'
  );
  let unlabeledCount = 0;

  inputs.each((_, el) => {
    const $el = $(el);
    const id = $el.attr("id");
    const ariaLabel = $el.attr("aria-label");
    const ariaLabelledBy = $el.attr("aria-labelledby");
    const title = $el.attr("title");
    const placeholder = $el.attr("placeholder");

    const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
    const isWrappedInLabel = $el.closest("label").length > 0;

    if (!hasLabel && !isWrappedInLabel && !ariaLabel && !ariaLabelledBy && !title) {
      unlabeledCount++;
      const type = $el.attr("type") || el.tagName?.toLowerCase() || "input";
      const name = $el.attr("name") || "";
      issues.push({
        severity: "error",
        message: `Unlabeled form control: <${el.tagName?.toLowerCase()} type="${type}"${name ? ` name="${name}"` : ""}>`,
        element: $.html(el)?.slice(0, 120) || "",
        suggestion:
          "Add a <label> with a matching 'for' attribute, or use aria-label.",
        code: `<label for="${id || name || "field"}">${placeholder || "Label text"}</label>\n<input id="${id || name || "field"}" type="${type}" />`,
      });
    }
  });

  if (inputs.length > 0 && unlabeledCount === 0) {
    issues.push({
      severity: "pass",
      message: `All ${inputs.length} form controls have labels.`,
    });
  }

  // ─── Images without alt ────────────────────────────────────────
  const images = $("img");
  let missingAltCount = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined) {
      missingAltCount++;
    }
  });

  if (missingAltCount > 0) {
    issues.push({
      severity: "error",
      message: `${missingAltCount} image(s) missing alt attribute entirely.`,
      suggestion:
        'Every <img> needs an alt attribute. Use alt="" for decorative images.',
    });
  } else if (images.length > 0) {
    issues.push({
      severity: "pass",
      message: `All ${images.length} images have alt attributes.`,
    });
  }

  // ─── Links without accessible text ─────────────────────────────
  let emptyLinkCount = 0;
  $("a").each((_, el) => {
    const $a = $(el);
    const text = $a.text().trim();
    const ariaLabel = $a.attr("aria-label");
    const title = $a.attr("title");
    const hasImg = $a.find("img[alt]").length > 0;
    const ariaHidden = $a.attr("aria-hidden") === "true";

    if (!text && !ariaLabel && !title && !hasImg && !ariaHidden) {
      emptyLinkCount++;
    }
  });

  if (emptyLinkCount > 0) {
    issues.push({
      severity: "warning",
      message: `${emptyLinkCount} link(s) have no accessible text.`,
      suggestion:
        "Add text content, aria-label, or a title attribute to links.",
    });
  }

  // ─── Buttons without accessible text ───────────────────────────
  let emptyButtonCount = 0;
  $("button, [role='button']").each((_, el) => {
    const $btn = $(el);
    const text = $btn.text().trim();
    const ariaLabel = $btn.attr("aria-label");
    const title = $btn.attr("title");

    if (!text && !ariaLabel && !title) {
      emptyButtonCount++;
    }
  });

  if (emptyButtonCount > 0) {
    issues.push({
      severity: "warning",
      message: `${emptyButtonCount} button(s) have no accessible text.`,
      suggestion: "Add text content or aria-label to buttons.",
    });
  }

  // ─── Tabindex > 0 ──────────────────────────────────────────────
  const positiveTabindex = $("[tabindex]").filter((_, el) => {
    const val = parseInt($(el).attr("tabindex") || "0", 10);
    return val > 0;
  });

  if (positiveTabindex.length > 0) {
    issues.push({
      severity: "warning",
      message: `${positiveTabindex.length} element(s) use tabindex > 0.`,
      suggestion:
        "Avoid positive tabindex values. Use tabindex=\"0\" or restructure DOM order instead.",
    });
  }

  // ─── Auto-playing media ────────────────────────────────────────
  const autoplayMedia = $("video[autoplay], audio[autoplay]");
  if (autoplayMedia.length > 0) {
    issues.push({
      severity: "warning",
      message: `${autoplayMedia.length} media element(s) auto-play.`,
      suggestion:
        "Auto-playing media can be disorienting. Ensure users can pause/stop playback.",
    });
  }

  // ─── Scoring ───────────────────────────────────────────────────
  const passCount = issues.filter((i) => i.severity === "pass").length;
  const totalChecks = issues.filter((i) => i.severity !== "info").length;

  return {
    name: "Accessibility",
    slug: "accessibility",
    score: passCount,
    maxScore: Math.max(totalChecks, 1),
    issues,
  };
}
