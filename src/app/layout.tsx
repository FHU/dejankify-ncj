import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dejankify — Page Audit Tool",
  description:
    "Submit a URL and get structured feedback on SEO, accessibility, and code quality issues.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
