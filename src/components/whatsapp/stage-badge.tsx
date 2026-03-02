"use client";

export type Stage =
  | "new"
  | "contacted"
  | "engaged"
  | "qualified"
  | "converted"
  | "lost";

interface StageBadgeProps {
  stage: Stage;
  size?: "sm" | "md";
}

const STAGE_STYLES: Record<Stage, { bg: string; text: string; label: string }> = {
  new: {
    bg: "bg-stone-100 dark:bg-stone-800",
    text: "text-stone-600 dark:text-stone-400",
    label: "New",
  },
  contacted: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    label: "Contacted",
  },
  engaged: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    label: "Engaged",
  },
  qualified: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    label: "Qualified",
  },
  converted: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    label: "Converted",
  },
  lost: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    label: "Lost",
  },
};

export const STAGE_OPTIONS: Stage[] = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "converted",
  "lost",
];

export function StageBadge({ stage, size = "md" }: StageBadgeProps) {
  const styles = STAGE_STYLES[stage];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${styles.bg} ${styles.text} ${sizeClass}`}
    >
      {styles.label}
    </span>
  );
}

export { STAGE_STYLES };
