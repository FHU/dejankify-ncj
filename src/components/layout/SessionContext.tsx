"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface SessionContextValue {
  sessionId: string | null;
  chatMessages: ChatMsg[];
  setSessionData: (id: string, messages: ChatMsg[]) => void;
  handleSendMessage: (message: string) => Promise<void>;
  chatSending: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  sessionId: null,
  chatMessages: [],
  setSessionData: () => {},
  handleSendMessage: async () => {},
  chatSending: false,
});

export function useSessionContext() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatSending, setChatSending] = useState(false);

  const setSessionData = useCallback((id: string, messages: ChatMsg[]) => {
    setSessionId(id);
    setChatMessages(messages);
  }, []);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!sessionId) return;
      setChatSending(true);

      // Add user message optimistically
      const userMsg: ChatMsg = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      // Create placeholder for streaming assistant reply
      const assistantId = `temp-${Date.now()}-reply`;
      const assistantMsg: ChatMsg = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.text) {
                // Append text chunk to the assistant message
                setChatMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + data.text }
                      : m
                  )
                );
              }

              if (data.error) {
                setChatMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `Error: ${data.error}` }
                      : m
                  )
                );
              }
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Something went wrong";
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Sorry, something went wrong: ${errorMsg}` }
              : m
          )
        );
      } finally {
        setChatSending(false);
      }
    },
    [sessionId]
  );

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        chatMessages,
        setSessionData,
        handleSendMessage,
        chatSending,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
