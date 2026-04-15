"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import type { Severity, Issue } from "@/types";

interface ReportSectionProps {
  title: string;
  score: number;
  maxScore: number;
  issues: Issue[];
  icon: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

const severityConfig: Record<
  Severity,
  { icon: typeof XCircle; color: string; label: string }
> = {
  error: { icon: XCircle, color: "var(--error)", label: "Error" },
  warning: { icon: AlertTriangle, color: "var(--warning)", label: "Warning" },
  info: { icon: Info, color: "var(--info)", label: "Info" },
  pass: { icon: CheckCircle, color: "var(--success)", label: "Pass" },
};

export default function ReportSection({
  title,
  score,
  maxScore,
  issues,
  icon,
  children,
  defaultOpen = false,
}: ReportSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const passCount = issues.filter((i) => i.severity === "pass").length;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Section header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center w-full px-4 py-3.5 text-left transition-colors cursor-pointer"
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span style={{ color: "var(--accent)" }}>{icon}</span>
          <span className="font-semibold text-sm">{title}</span>

          {/* Issue count badges */}
          <div className="flex items-center gap-1.5 ml-2">
            {errorCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "rgba(248,113,113,0.15)",
                  color: "var(--error)",
                }}
              >
                {errorCount} {errorCount === 1 ? "error" : "errors"}
              </span>
            )}
            {warningCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "rgba(251,191,36,0.15)",
                  color: "var(--warning)",
                }}
              >
                {warningCount} {warningCount === 1 ? "warning" : "warnings"}
              </span>
            )}
            {errorCount === 0 && warningCount === 0 && passCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "rgba(52,211,153,0.15)",
                  color: "var(--success)",
                }}
              >
                All passed
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-16 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--bg-overlay)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background:
                  pct >= 90
                    ? "var(--success)"
                    : pct >= 50
                    ? "var(--warning)"
                    : "var(--error)",
              }}
            />
          </div>
          <span
            className="text-xs font-mono w-8 text-right"
            style={{ color: "var(--text-secondary)" }}
          >
            {pct}%
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div
          className="px-4 pb-4 animate-fade-in"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {/* Issue list */}
          {issues.length > 0 && (
            <div className="mt-3 space-y-2">
              {issues.map((issue, idx) => {
                const cfg = severityConfig[issue.severity];
                const Icon = cfg.icon;
                return (
                  <div
                    key={idx}
                    className="flex gap-3 p-3 rounded-lg"
                    style={{ background: "var(--bg-raised)" }}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: cfg.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed">{issue.message}</p>
                      {issue.element && (
                        <code
                          className="text-xs mt-1 block truncate px-2 py-1 rounded"
                          style={{
                            background: "var(--bg-overlay)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {issue.element}
                        </code>
                      )}
                      {issue.suggestion && (
                        <p
                          className="text-xs mt-1.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          💡 {issue.suggestion}
                        </p>
                      )}
                      {issue.code && (
                        <pre
                          className="text-xs mt-2 p-2.5 rounded-lg overflow-x-auto"
                          style={{
                            background: "var(--bg-base)",
                            color: "var(--accent)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {issue.code}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Module-specific content */}
          {children && <div className="mt-3">{children}</div>}
        </div>
      )}
    </div>
  );
}
