"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Plus,
  Globe,
  ChevronDown,
  ChevronRight,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { GroupedSessions } from "@/types";

interface SidebarProps {
  sessions: GroupedSessions;
  onDelete?: (sessionId: string) => void;
}

export default function Sidebar({ sessions, onDelete }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set(Object.keys(sessions))
  );

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (collapsed) {
    return (
      <aside
        className="flex flex-col items-center py-4 gap-4 shrink-0 h-full"
        style={{
          width: "56px",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
        <Link
          href="/dashboard"
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--accent)" }}
          title="New analysis"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col shrink-0 h-full"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="text-base font-bold gradient-text">Dejankify</span>
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Analysis button */}
      <div className="px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full"
          style={{
            background: "var(--accent-glow)",
            color: "var(--accent)",
            border: "1px solid var(--accent-dim)",
          }}
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {Object.keys(sessions).length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No audits yet. Paste a URL to get started.
            </p>
          </div>
        ) : (
          Object.entries(sessions).map(([domain, domainSessions]) => (
            <div key={domain} className="mb-1">
              <button
                onClick={() => toggleDomain(domain)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {expandedDomains.has(domain) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <Globe className="w-3 h-3" />
                {domain}
              </button>

              {expandedDomains.has(domain) && (
                <div className="ml-2">
                  {domainSessions.map((s) => {
                    const isActive = pathname === `/dashboard/session/${s.id}`;
                    return (
                      <div key={s.id} className="group relative">
                        <Link
                          href={`/dashboard/session/${s.id}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
                          style={{
                            background: isActive
                              ? "var(--bg-raised)"
                              : "transparent",
                            color: isActive
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                            borderLeft: isActive
                              ? "2px solid var(--accent)"
                              : "2px solid transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background =
                                "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs">
                              {new URL(s.url).pathname || "/"}
                            </span>
                            <span
                              className="text-xs mt-0.5"
                              style={{ color: "var(--text-muted)" }}
                              suppressHydrationWarning
                            >
                              {formatDate(s.updatedAt)}
                              {s.latestScore !== null && (
                                <span className="ml-2">
                                  Score: {s.latestScore}
                                </span>
                              )}
                            </span>
                          </div>
                        </Link>
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              onDelete(s.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            style={{ color: "var(--error)" }}
                            title="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
