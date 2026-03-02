"use client";

import { Bot } from "lucide-react";

interface Props {
  hasImage: boolean;
}

export function TypingIndicator({ hasImage }: Props) {
  return (
    <div className="flex gap-3">
      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
        style={{
          background: "var(--color-surface-hover)",
          color: "var(--color-text-secondary)",
        }}
      >
        <Bot size={14} />
      </div>

      <div
        className="rounded-2xl px-4 py-3 border"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                background: "var(--color-accent)",
                animationDelay: "0ms",
                animationDuration: "1.2s",
              }}
            />
            <span
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                background: "var(--color-accent)",
                animationDelay: "200ms",
                animationDuration: "1.2s",
              }}
            />
            <span
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                background: "var(--color-accent)",
                animationDelay: "400ms",
                animationDuration: "1.2s",
              }}
            />
          </div>
          <span
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {hasImage ? "Analyzing image..." : "Thinking..."}
          </span>
        </div>
      </div>
    </div>
  );
}
