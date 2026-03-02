"use client";

import dynamic from "next/dynamic";

// Lazy load the markdown renderer (react-markdown + remark-gfm are ~40KB gzipped).
// By deferring this import, the initial JS bundle is smaller and the page becomes
// interactive faster. The skeleton placeholder prevents layout shift while the
// module loads.
export const LazyMarkdown = dynamic(
  () => import("react-markdown").then((mod) => ({ default: mod.default })),
  {
    loading: () => (
      <div className="animate-pulse space-y-2">
        <div
          className="h-3 rounded"
          style={{ background: "var(--color-surface-hover)", width: "80%" }}
        />
        <div
          className="h-3 rounded"
          style={{ background: "var(--color-surface-hover)", width: "60%" }}
        />
      </div>
    ),
    ssr: false,
  }
);
