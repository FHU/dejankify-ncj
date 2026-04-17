"use client";

import {
  Image,
  Share2,
  Accessibility,
  Gauge,
  Tags,
  Heading1,
  Palette,
  ExternalLink,
  RotateCcw,
  Calendar,
} from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";
import ReportSection from "@/components/analysis/ReportSection";
import AltTextResults from "@/components/analysis/AltTextResults";
import OpenGraphResults from "@/components/analysis/OpenGraphResults";
import type {
  AnalysisReport as ReportType,
  AnalysisModuleResult,
  AltTextResult,
  OpenGraphResult,
} from "@/types";

const moduleIcons: Record<string, React.ReactNode> = {
  "alt-text": <Image className="w-4 h-4" />,
  "open-graph": <Share2 className="w-4 h-4" />,
  accessibility: <Accessibility className="w-4 h-4" />,
  pagespeed: <Gauge className="w-4 h-4" />,
  "meta-tags": <Tags className="w-4 h-4" />,
  headings: <Heading1 className="w-4 h-4" />,
  contrast: <Palette className="w-4 h-4" />,
};

interface AnalysisReportProps {
  report: ReportType;
  analysisDate: string;
  onRerun?: () => void;
  rerunning?: boolean;
}

export default function AnalysisReport({
  report,
  analysisDate,
  onRerun,
  rerunning = false,
}: AnalysisReportProps) {
  const date = new Date(analysisDate);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Report header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold mb-1 flex items-center gap-2">
            Audit Report
            <a
              href={report.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
              style={{ color: "var(--accent)" }}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </h1>
          <p className="text-sm truncate max-w-md" style={{ color: "var(--text-secondary)" }}>
            {report.url}
          </p>
          <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <Calendar className="w-3 h-3" />
            {date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "UTC",
            })}
          </p>
        </div>

        {onRerun && (
          <button
            onClick={onRerun}
            disabled={rerunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer shrink-0"
            style={{
              background: "var(--bg-raised)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-raised)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <RotateCcw className={`w-4 h-4 ${rerunning ? "animate-spin" : ""}`} />
            {rerunning ? "Re-running…" : "Re-run Analysis"}
          </button>
        )}
      </div>

      {/* Score summary */}
      <div
        className="rounded-xl p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <ScoreRing score={report.overallScore} size={88} strokeWidth={6} label="Overall" />
          <div className="w-px h-16 hidden sm:block" style={{ background: "var(--border)" }} />
          {report.modules.map((mod) => (
            <ScoreRing
              key={mod.slug}
              score={mod.maxScore > 0 ? Math.round((mod.score / mod.maxScore) * 100) : 0}
              size={64}
              strokeWidth={4}
              label={mod.name}
            />
          ))}
        </div>
      </div>

      {/* Module sections */}
      <div className="space-y-3">
        {report.modules.map((mod, idx) => {
          // Render custom children for AI-powered modules
          let children: React.ReactNode = null;

          if (mod.slug === "alt-text") {
            const altMod = mod as AltTextResult;
            children = (
              <AltTextResults
                images={altMod.details.images}
                totalImages={altMod.details.totalImages}
                imagesAnalyzed={altMod.details.imagesAnalyzed}
              />
            );
          } else if (mod.slug === "open-graph") {
            const ogMod = mod as OpenGraphResult;
            children = <OpenGraphResults tags={ogMod.details.tags} />;
          }

          return (
            <ReportSection
              key={mod.slug}
              title={mod.name}
              score={mod.score}
              maxScore={mod.maxScore}
              issues={mod.issues}
              icon={moduleIcons[mod.slug] || <Tags className="w-4 h-4" />}
              defaultOpen={idx === 0}
            >
              {children}
            </ReportSection>
          );
        })}
      </div>
    </div>
  );
}
