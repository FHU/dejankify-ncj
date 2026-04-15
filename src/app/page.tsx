import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(167,139,250,0.06) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg text-center">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}
          >
            <Sparkles className="w-6 h-6" style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight gradient-text">
            Dejankify
          </h1>
        </div>

        <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
          Paste a URL. Get a full audit of SEO, accessibility, and code quality
          issues — with AI-powered fixes.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Alt Text Generation",
            "Open Graph Tags",
            "Accessibility Scan",
            "PageSpeed Scores",
            "Meta Tag Audit",
            "Heading Hierarchy",
            "Color Contrast",
          ].map((feature) => (
            <span
              key={feature}
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "var(--bg-raised)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {feature}
            </span>
          ))}
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="group flex items-center gap-3 px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--accent-dim), #1e40af)",
              color: "white",
              border: "1px solid var(--accent-dim)",
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Free to use · Your data stays private
        </p>
      </div>
    </div>
  );
}
