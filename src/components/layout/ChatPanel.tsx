"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Send,
  PanelRightClose,
  Bot,
  User,
  Loader2,
  X,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatPanelProps {
  sessionId?: string;
  messages: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  disabled?: boolean;
}

export default function ChatPanel({
  sessionId,
  messages,
  onSendMessage,
  disabled = false,
}: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !onSendMessage) return;
    const msg = input.trim();
    setInput("");
    setSending(true);
    try {
      await onSendMessage(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Collapsed — floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer z-30"
        style={{
          background: "var(--bg-raised)",
          color: "var(--accent)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
        disabled={!sessionId}
        title={sessionId ? "Ask about this report" : "Run an analysis first"}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>
    );
  }

  // Chat content (shared between mobile overlay and desktop panel)
  const chatContent = (
    <>
      {/* Chat header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold">Ask about this report</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}
        >
          <X className="w-4 h-4 lg:hidden" />
          <PanelRightClose className="w-4 h-4 hidden lg:block" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot
              className="w-8 h-8 mx-auto mb-3"
              style={{ color: "var(--text-muted)" }}
            />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Ask anything about the audit results — how to fix issues,
              what they mean, or get code snippets.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex gap-2.5"
            style={{
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background:
                  msg.role === "user"
                    ? "var(--accent-dim)"
                    : "var(--bg-overlay)",
              }}
            >
              {msg.role === "user" ? (
                <User className="w-3 h-3" style={{ color: "white" }} />
              ) : (
                <Bot className="w-3 h-3" style={{ color: "var(--accent)" }} />
              )}
            </div>
            <div
              className="rounded-xl px-3.5 py-2.5 text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap"
              style={{
                background:
                  msg.role === "user"
                    ? "var(--accent-dim)"
                    : "var(--bg-raised)",
                color:
                  msg.role === "user" ? "white" : "var(--text-primary)",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--bg-overlay)" }}
            >
              <Bot className="w-3 h-3" style={{ color: "var(--accent)" }} />
            </div>
            <div
              className="rounded-xl px-3.5 py-2.5"
              style={{ background: "var(--bg-raised)" }}
            >
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="px-3 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about an issue..."
            disabled={disabled || sending}
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder-[var(--text-muted)]"
            style={{
              color: "var(--text-primary)",
              maxHeight: "120px",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || disabled}
            className="p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            style={{
              color: input.trim() ? "var(--accent)" : "var(--text-muted)",
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: full-screen overlay */}
      <div className="fixed inset-0 z-50 flex flex-col lg:hidden animate-fade-in"
        style={{ background: "var(--bg-surface)" }}
      >
        {chatContent}
      </div>

      {/* Desktop: side panel */}
      <aside
        className="hidden lg:flex flex-col shrink-0 h-full animate-fade-in"
        style={{
          width: "var(--chat-width)",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        {chatContent}
      </aside>
    </>
  );
}
