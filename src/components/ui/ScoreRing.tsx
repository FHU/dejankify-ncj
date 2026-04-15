"use client";

interface ScoreRingProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function scoreColor(score: number): string {
  if (score >= 90) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--error)";
}

export default function ScoreRing({
  score,
  size = 72,
  strokeWidth = 5,
  label,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-overlay)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-lg font-bold"
          style={{ color, fontFamily: "Bricolage Grotesque, system-ui" }}
        >
          {score}
        </div>
      </div>
      {label && (
        <span
          className="text-xs font-medium text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
