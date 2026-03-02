"use client";

interface ScoreIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

function getScoreColor(score: number): { bar: string; text: string } {
  if (score >= 60)
    return { bar: "bg-green-500", text: "text-green-600 dark:text-green-400" };
  if (score >= 30)
    return { bar: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

export function ScoreIndicator({
  score,
  showLabel = true,
  size = "md",
}: ScoreIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const colors = getScoreColor(clamped);
  const barHeight = size === "sm" ? "h-1" : "h-1.5";
  const barWidth = size === "sm" ? "w-12" : "w-16";

  return (
    <div className={`inline-flex items-center gap-2 ${size === "sm" ? "gap-1.5" : ""}`}>
      {showLabel && (
        <span className={`text-xs font-semibold tabular-nums ${colors.text}`}>
          {clamped}
        </span>
      )}
      <div
        className={`${barWidth} ${barHeight} rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden`}
      >
        <div
          className={`${barHeight} rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreCircle({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const colors = getScoreColor(clamped);
  let bg = "bg-red-100 dark:bg-red-900/20";
  if (clamped >= 60) bg = "bg-green-100 dark:bg-green-900/20";
  else if (clamped >= 30) bg = "bg-yellow-100 dark:bg-yellow-900/20";

  return (
    <div
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${bg} ${colors.text}`}
    >
      {clamped}
    </div>
  );
}
