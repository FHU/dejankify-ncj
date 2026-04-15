import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function SessionNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--bg-raised)" }}
      >
        <FileQuestion className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
      </div>
      <h2 className="text-lg font-bold">Session not found</h2>
      <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-secondary)" }}>
        This audit session doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: "var(--bg-raised)",
          color: "var(--accent)",
          border: "1px solid var(--border)",
        }}
      >
        Back to dashboard
      </Link>
    </div>
  );
}
