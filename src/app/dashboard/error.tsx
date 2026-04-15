"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(248,113,113,0.15)" }}
      >
        <AlertCircle className="w-8 h-8" style={{ color: "var(--error)" }} />
      </div>
      <h2 className="text-lg font-bold">Something went wrong</h2>
      <p
        className="text-sm text-center max-w-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
        style={{
          background: "var(--bg-raised)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        <RotateCcw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
