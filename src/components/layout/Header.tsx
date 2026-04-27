"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User, Menu } from "lucide-react";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSignOut: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({ user, onSignOut, onToggleSidebar }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="flex items-center justify-between lg:justify-end px-4 sm:px-6 py-3 shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Mobile menu button */}
      {onToggleSidebar ? (
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg transition-colors cursor-pointer lg:hidden"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Menu className="w-5 h-5" />
        </button>
      ) : (
        <div />
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="w-7 h-7 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--accent-dim)" }}
            >
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <span
            className="text-sm font-medium hidden sm:inline"
            style={{ color: "var(--text-secondary)" }}
          >
            {user.name || user.email}
          </span>
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-48 rounded-lg py-1 z-50 animate-fade-in"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="px-3 py-2 text-xs truncate"
              style={{
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {user.email}
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
