"use client";

export type Brand = "Kalisiya" | "Eloi" | "DataMug" | "All Brands";

interface BrandBadgeProps {
  brand: Brand;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
}

const BRAND_STYLES: Record<Brand, { dot: string; bg: string; text: string }> = {
  Kalisiya: {
    dot: "bg-indigo-500",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-400",
  },
  Eloi: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  DataMug: {
    dot: "bg-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  "All Brands": {
    dot: "bg-stone-400",
    bg: "bg-stone-100 dark:bg-stone-800",
    text: "text-stone-600 dark:text-stone-400",
  },
};

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
};

export function BrandBadge({ brand, size = "md", showDot = true }: BrandBadgeProps) {
  const styles = BRAND_STYLES[brand] ?? BRAND_STYLES["All Brands"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${styles.bg} ${styles.text} ${SIZE_CLASSES[size]}`}
    >
      {showDot && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      )}
      {brand}
    </span>
  );
}

export function BrandDot({ brand, size = 8 }: { brand: Brand; size?: number }) {
  const styles = BRAND_STYLES[brand] ?? BRAND_STYLES["All Brands"];
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${styles.dot}`}
      style={{ width: size, height: size }}
    />
  );
}

export { BRAND_STYLES };
