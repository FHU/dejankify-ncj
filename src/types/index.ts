// ─── Analysis Module Types ────────────────────────────────────────

export type Severity = "error" | "warning" | "info" | "pass";

export interface Issue {
  severity: Severity;
  message: string;
  element?: string; // the HTML element or selector involved
  suggestion?: string; // how to fix it
  code?: string; // suggested fix code snippet
}

export interface ModuleResult {
  name: string;
  slug: string;
  score: number; // 0-100
  maxScore: number;
  issues: Issue[];
  details?: Record<string, unknown>;
}

// ─── Alt Text Module ──────────────────────────────────────────────

export interface AltTextImage {
  src: string;
  currentAlt: string | null;
  currentScore: number; // 0-10, lower = worse
  suggestedAlt?: string;
  reasoning?: string;
}

export interface AltTextResult extends ModuleResult {
  slug: "alt-text";
  details: {
    totalImages: number;
    imagesAnalyzed: number;
    images: AltTextImage[];
    estimatedCostCents?: number;
  };
}

// ─── Open Graph Module ────────────────────────────────────────────

export interface OGTag {
  property: string;
  currentValue: string | null;
  suggestedValue?: string;
  status: "present" | "missing" | "improvable";
}

export interface OpenGraphResult extends ModuleResult {
  slug: "open-graph";
  details: {
    tags: OGTag[];
    estimatedCostCents?: number;
  };
}

// ─── Accessibility Module ─────────────────────────────────────────

export interface AccessibilityResult extends ModuleResult {
  slug: "accessibility";
}

// ─── PageSpeed Module ─────────────────────────────────────────────

export interface PageSpeedCategory {
  name: string;
  score: number; // 0-100
  audits: { title: string; description: string; score: number | null }[];
}

export interface PageSpeedResult extends ModuleResult {
  slug: "pagespeed";
  details: {
    categories: PageSpeedCategory[];
  };
}

// ─── Meta Tags Module ─────────────────────────────────────────────

export interface MetaTagResult extends ModuleResult {
  slug: "meta-tags";
}

// ─── Headings Module ──────────────────────────────────────────────

export interface HeadingItem {
  level: number;
  text: string;
  issue?: string;
}

export interface HeadingsResult extends ModuleResult {
  slug: "headings";
  details: {
    headings: HeadingItem[];
  };
}

// ─── Color Contrast Module ────────────────────────────────────────

export interface ContrastPair {
  foreground: string;
  background: string;
  ratio: number;
  element: string;
  passesAA: boolean;
  passesAAA: boolean;
  fontSize?: string;
}

export interface ContrastResult extends ModuleResult {
  slug: "contrast";
  details: {
    pairs: ContrastPair[];
  };
}

// ─── Aggregated Report ────────────────────────────────────────────

export type AnalysisModuleResult =
  | AltTextResult
  | OpenGraphResult
  | AccessibilityResult
  | PageSpeedResult
  | MetaTagResult
  | HeadingsResult
  | ContrastResult;

export interface AnalysisReport {
  url: string;
  fetchedAt: string;
  overallScore: number;
  modules: AnalysisModuleResult[];
}

// ─── Session Types ────────────────────────────────────────────────

export interface SessionSummary {
  id: string;
  url: string;
  domain: string;
  latestScore: number | null;
  analysisCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedSessions {
  [domain: string]: SessionSummary[];
}
