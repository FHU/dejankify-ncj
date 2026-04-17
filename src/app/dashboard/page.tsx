"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import UrlInput from "@/components/analysis/UrlInput";
import { createSession } from "@/actions/sessions";
import { runAnalysis } from "@/actions/analyze";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (url: string) => {
    setLoading(true);
    try {
      const sessionId = await createSession(url);
      runAnalysis(sessionId).catch(console.error);
      router.push(`/dashboard/session/${sessionId}`);
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full px-6 py-12">
      <h2>Submit a URL</h2>
      <UrlInput onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
