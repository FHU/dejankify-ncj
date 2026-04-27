"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ChatPanel from "@/components/layout/ChatPanel";
import { SessionProvider, useSessionContext } from "@/components/layout/SessionContext";
import type { GroupedSessions } from "@/types";
import { getUserSessions, deleteSession } from "@/actions/sessions";

interface DashboardShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  initialSessions: GroupedSessions;
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
}

function ShellInner({
  user,
  initialSessions,
  children,
  signOutAction,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessions, setSessions] = useState(initialSessions);
  const [sidebarOpenedAt, setSidebarOpenedAt] = useState<string | null>(null);
  const mobileSidebarOpen = sidebarOpenedAt === pathname;
  const { sessionId, chatMessages, handleSendMessage } = useSessionContext();

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const frame = requestAnimationFrame(() => {
      setMobileSidebarOpen(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [mobileSidebarOpen, pathname]);

  const refreshSessions = useCallback(async () => {
    try {
      const updated = await getUserSessions();
      setSessions(updated);
    } catch {
      // silently fail
    }
  }, []);

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    await refreshSessions();
    if (sessionId === id) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpenedAt(null)}
        />
      )}

      {/* Sidebar — always visible on lg+, overlay on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
          transition-transform duration-200 ease-out
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <Sidebar sessions={sessions} onDelete={handleDelete} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          user={user}
          onSignOut={signOutAction}
          onToggleSidebar={() => setSidebarOpenedAt(mobileSidebarOpen ? null : pathname)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Chat panel */}
      <ChatPanel
        sessionId={sessionId || undefined}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        disabled={!sessionId}
      />
    </div>
  );
}

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <SessionProvider>
      <ShellInner {...props} />
    </SessionProvider>
  );
}
