"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import type { OGTag } from "@/types";

interface OpenGraphResultsProps {
  tags: OGTag[];
}

const statusConfig = {
  present: {
    icon: CheckCircle,
    color: "var(--success)",
    label: "Present",
  },
  missing: {
    icon: XCircle,
    color: "var(--error)",
    label: "Missing",
  },
  improvable: {
    icon: AlertTriangle,
    color: "var(--warning)",
    label: "Needs work",
  },
};

export default function OpenGraphResults({ tags }: OpenGraphResultsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Generate the full copy-paste snippet
  const allSuggested = tags
    .filter((t) => t.suggestedValue || t.status === "missing")
    .map((t) => {
      const val = t.suggestedValue || "your value here";
      return `<meta property="${t.property}" content="${val}">`;
    });

  return (
    <div className="space-y-2">
      {tags.map((tag, idx) => {
        const config = statusConfig[tag.status];
        const Icon = config.icon;

        return (
          <div
            key={tag.property}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
            style={{ background: "var(--bg-raised)" }}
          >
            <Icon
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: config.color }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tag.property}
                </code>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: `${config.color}15`,
                    color: config.color,
                  }}
                >
                  {config.label}
                </span>
              </div>

              {/* Current value */}
              {tag.currentValue && (
                <p
                  className="text-xs mt-1 truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Current: &ldquo;{tag.currentValue.slice(0, 80)}
                  {tag.currentValue.length > 80 ? "…" : ""}&rdquo;
                </p>
              )}

              {/* AI suggestion */}
              {tag.suggestedValue && (
                <div className="flex items-start gap-2 mt-1.5">
                  <Sparkles
                    className="w-3 h-3 shrink-0 mt-0.5"
                    style={{ color: "var(--accent)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <code
                      className="text-xs block px-2 py-1.5 rounded"
                      style={{
                        background: "var(--accent-glow)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--accent-dim)",
                      }}
                    >
                      {`<meta property="${tag.property}" content="${tag.suggestedValue}">`}
                    </code>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(
                        `<meta property="${tag.property}" content="${tag.suggestedValue}">`,
                        idx
                      )
                    }
                    className="p-1 rounded transition-colors cursor-pointer shrink-0"
                    style={{ color: "var(--text-muted)" }}
                    title="Copy to clipboard"
                  >
                    {copiedIdx === idx ? (
                      <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Copy all suggested tags */}
      {allSuggested.length > 2 && (
        <button
          onClick={() =>
            handleCopy(allSuggested.join("\n"), -1)
          }
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          style={{
            background: "var(--accent-glow)",
            color: "var(--accent)",
            border: "1px solid var(--accent-dim)",
          }}
        >
          {copiedIdx === -1 ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copiedIdx === -1 ? "Copied!" : `Copy all ${allSuggested.length} suggested tags`}
        </button>
      )}
    </div>
  );
}
