"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, FileSearch, Calendar } from "lucide-react";
import AnalysisReport from "@/components/analysis/AnalysisReport";
import { SkeletonReport } from "@/components/ui/Skeleton";
import { useSessionContext } from "@/components/layout/SessionContext";
import { runAnalysis } from "@/actions/analyze";
import type { AnalysisReport as ReportType } from "@/types";

interface AnalysisEntry {
  id: string;
  status: string;
  createdAt: string;
  scores: Record<string, number> | null;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface SessionViewProps {
  sessionId: string;
  url: string;
  analysis: {
    id: string;
    results: Record<string, unknown>;
    scores: Record<string, number> | null;
    status: string;
    createdAt: string;
    errorMessage: string | null;
  } | null;
  analysisHistory: AnalysisEntry[];
  chatMessages: ChatMsg[];
}

export default function SessionView({
  sessionId,
  url,
  analysis,
  analysisHistory,
  chatMessages,
}: SessionViewProps) {
  const router = useRouter();
  const { setSessionData } = useSessionContext();
  const [rerunning, setRerunning] = useState(false);
  const [selectedAnalysisIdx, setSelectedAnalysisIdx] = useState(0);

  // Register this session with the layout's chat panel
  useEffect(() => {
    setSessionData(sessionId, chatMessages);
  }, [sessionId, chatMessages, setSessionData]);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const result = await runAnalysis(sessionId);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Re-run failed:", result.error);
      }
    } catch (err) {
      console.error("Re-run error:", err);
    } finally {
      setRerunning(false);
    }
  };

  // No analysis yet
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--accent-glow)" }}
        >
          <FileSearch className="w-8 h-8" style={{ color: "var(--accent)" }} />
        </div>
        <h2 className="text-lg font-bold">Analysis Pending</h2>
        <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-secondary)" }}>
          The analysis for <strong>{url}</strong> hasn&apos;t started yet.
        </p>
        <button
          onClick={handleRerun}
          disabled={rerunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          style={{
            background: "linear-gradient(135deg, var(--accent-dim), #1e40af)",
            color: "white",
            border: "1px solid var(--accent-dim)",
          }}
        >
          {rerunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSearch className="w-4 h-4" />
          )}
          {rerunning ? "Starting…" : "Run Analysis"}
        </button>
      </div>
    );
  }

  // Error state
  if (analysis.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(248,113,113,0.15)" }}
        >
          <AlertCircle className="w-8 h-8" style={{ color: "var(--error)" }} />
        </div>
        <h2 className="text-lg font-bold">Analysis Failed</h2>
        <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-secondary)" }}>
          {analysis.errorMessage || "Something went wrong while analyzing this page."}
        </p>
        <button
          onClick={handleRerun}
          disabled={rerunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          style={{
            background: "var(--bg-raised)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Running state — show skeleton report
  if (analysis.status === "running" || analysis.status === "pending") {
    return (
      <div>
        <div
          className="flex items-center gap-3 px-6 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Analyzing <strong>{url}</strong> — running 7 audit modules…
          </p>
        </div>
        <SkeletonReport />
      </div>
    );
  }

  // Completed — show report
  const report = analysis.results as unknown as ReportType;

  return (
    <div>
      {/* Analysis history selector (if multiple runs) */}
      {analysisHistory.length > 1 && (
        <div
          className="px-6 py-2 flex items-center gap-3 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)" }}>
            History:
          </span>
          {analysisHistory.map((entry, idx) => (
            <button
              key={entry.id}
              onClick={() => setSelectedAnalysisIdx(idx)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
              style={{
                background:
                  idx === selectedAnalysisIdx ? "var(--accent-glow)" : "var(--bg-raised)",
                color:
                  idx === selectedAnalysisIdx ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${
                  idx === selectedAnalysisIdx ? "var(--accent-dim)" : "var(--border)"
                }`,
              }}
            >
              <Calendar className="w-3 h-3" />
              {new Date(entry.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "UTC",
              })}
            </button>
          ))}
        </div>
      )}

      <AnalysisReport
        report={report}
        analysisDate={analysis.createdAt}
        onRerun={handleRerun}
        rerunning={rerunning}
      />
    </div>
  );
}
