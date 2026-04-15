"use client";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{
        background: "var(--bg-overlay)",
        ...style,
      }}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonScoreRing({ size = 72 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Skeleton
        className="rounded-full"
        style={{ width: size, height: size }}
      />
      <Skeleton className="h-3" style={{ width: 48 }} />
    </div>
  );
}

export function SkeletonReportSection() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 flex-1" style={{ maxWidth: 140 }} />
        <div className="flex items-center gap-3 ml-auto">
          <Skeleton className="h-1.5 rounded-full" style={{ width: 64 }} />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonReport() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Skeleton className="h-6 mb-2" style={{ width: 200 }} />
        <Skeleton className="h-4 mb-1" style={{ width: 300 }} />
        <Skeleton className="h-3" style={{ width: 180 }} />
      </div>

      {/* Score rings */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <SkeletonScoreRing size={88} />
          <div
            className="w-px h-16 hidden sm:block"
            style={{ background: "var(--border)" }}
          />
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonScoreRing key={i} size={64} />
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonReportSection key={i} />
        ))}
      </div>
    </div>
  );
}
