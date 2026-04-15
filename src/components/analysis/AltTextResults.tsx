"use client";

import { Image, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import type { AltTextImage } from "@/types";

interface AltTextResultsProps {
  images: AltTextImage[];
  totalImages: number;
  imagesAnalyzed: number;
}

function scoreLabel(score: number): { text: string; color: string } {
  if (score === 0) return { text: "Missing", color: "var(--error)" };
  if (score <= 2) return { text: "Generic", color: "var(--error)" };
  if (score <= 3) return { text: "Too short", color: "var(--warning)" };
  if (score <= 5) return { text: "Could improve", color: "var(--warning)" };
  return { text: "Good", color: "var(--success)" };
}

export default function AltTextResults({
  images,
  totalImages,
  imagesAnalyzed,
}: AltTextResultsProps) {
  const flaggedImages = images.filter((img) => img.currentScore < 8);

  if (flaggedImages.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {totalImages} images found · {imagesAnalyzed} analyzed with AI
        </p>
      </div>

      {flaggedImages.map((img, idx) => {
        const label = scoreLabel(img.currentScore);
        const srcDisplay =
          img.src.length > 50 ? `…${img.src.slice(-45)}` : img.src;

        return (
          <div
            key={idx}
            className="rounded-lg overflow-hidden"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Image header */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <Image
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: "var(--text-muted)" }}
              />
              <span
                className="text-xs truncate flex-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {srcDisplay}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background: `${label.color}15`,
                  color: label.color,
                }}
              >
                {label.text}
              </span>
            </div>

            {/* Before / After */}
            <div className="px-3 py-3 space-y-2.5">
              {/* Current alt text */}
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="w-3.5 h-3.5 shrink-0 mt-0.5"
                  style={{ color: label.color }}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs font-medium block mb-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Current
                  </span>
                  <code
                    className="text-xs block px-2 py-1.5 rounded"
                    style={{
                      background: "var(--bg-overlay)",
                      color:
                        img.currentAlt === null
                          ? "var(--error)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {img.currentAlt === null
                      ? "(no alt attribute)"
                      : img.currentAlt === ""
                      ? '(empty string: "")'
                      : `"${img.currentAlt}"`}
                  </code>
                </div>
              </div>

              {/* Suggested alt text */}
              {img.suggestedAlt && (
                <div className="flex items-start gap-2">
                  <Sparkles
                    className="w-3.5 h-3.5 shrink-0 mt-0.5"
                    style={{ color: "var(--accent)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-xs font-medium block mb-0.5"
                      style={{ color: "var(--accent)" }}
                    >
                      AI Suggestion
                    </span>
                    <code
                      className="text-xs block px-2 py-1.5 rounded"
                      style={{
                        background: "var(--accent-glow)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--accent-dim)",
                      }}
                    >
                      {img.suggestedAlt === '""'
                        ? 'alt="" (decorative — add role="presentation")'
                        : `"${img.suggestedAlt}"`}
                    </code>
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {img.reasoning && !img.suggestedAlt && (
                <p
                  className="text-xs ml-5.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {img.reasoning}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
