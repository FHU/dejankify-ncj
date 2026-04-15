"use client";

import { useState } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";

interface UrlInputProps {
  onSubmit: (url: string) => Promise<void>;
  loading?: boolean;
}

export default function UrlInput({ onSubmit, loading = false }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const validate = (value: string): boolean => {
    if (!value.trim()) {
      setError("Please enter a URL");
      return false;
    }
    try {
      const testUrl = value.match(/^https?:\/\//) ? value : `https://${value}`;
      new URL(testUrl);
      setError("");
      return true;
    } catch {
      setError("Please enter a valid URL");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(url) || loading) return;
    await onSubmit(url.trim());
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Analyze a page</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Enter any URL to get a full SEO, accessibility, and code quality audit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
          style={{
            background: "var(--bg-raised)",
            border: `1px solid ${error ? "var(--error)" : "var(--border)"}`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) validate(e.target.value);
            }}
            placeholder="https://example.com/page"
            disabled={loading}
            className="flex-1 bg-transparent text-base outline-none placeholder-[var(--text-muted)]"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shrink-0"
            style={{
              background: loading || !url.trim()
                ? "var(--bg-overlay)"
                : "linear-gradient(135deg, var(--accent-dim), #1e40af)",
              color: loading || !url.trim() ? "var(--text-muted)" : "white",
              border: "1px solid var(--accent-dim)",
              opacity: loading || !url.trim() ? 0.6 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Dejankify
              </>
            )}
          </button>
        </div>

        {error && (
          <p
            className="text-xs mt-2 ml-1 animate-fade-in"
            style={{ color: "var(--error)" }}
          >
            {error}
          </p>
        )}
      </form>

      {/* Hints */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {["example.com", "github.com", "wikipedia.org"].map((hint) => (
          <button
            key={hint}
            onClick={() => setUrl(`https://${hint}`)}
            className="text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            {hint}
          </button>
        ))}
      </div>
    </div>
  );
}
