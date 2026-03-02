"use client";

import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface Props {
  status: "connected" | "disconnected" | "checking";
  error: string | null;
  onRetry: () => void;
}

export function ConnectionBanner({ status, error, onRetry }: Props) {
  if (status === "connected" || (!error && status !== "disconnected")) {
    return null;
  }

  return (
    <div
      className="px-4 sm:px-6 py-2.5 flex items-center gap-3 text-sm animate-slideDown"
      style={{
        background:
          status === "checking"
            ? "var(--color-accent-light)"
            : "color-mix(in srgb, var(--color-error) 10%, var(--color-bg))",
        borderBottom: `1px solid ${status === "checking" ? "var(--color-accent)" : "var(--color-error)"}`,
      }}
    >
      {status === "checking" ? (
        <RefreshCw
          size={14}
          className="animate-spin flex-shrink-0"
          style={{ color: "var(--color-accent)" }}
        />
      ) : (
        <WifiOff
          size={14}
          className="flex-shrink-0"
          style={{ color: "var(--color-error)" }}
        />
      )}

      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium"
          style={{
            color:
              status === "checking"
                ? "var(--color-accent)"
                : "var(--color-error)",
          }}
        >
          {status === "checking"
            ? "Connecting to Ollama..."
            : "Cannot reach Ollama"}
        </p>
        {error && status === "disconnected" && (
          <p
            className="text-xs truncate"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Run <code className="font-mono">ollama serve</code> on your machine
          </p>
        )}
      </div>

      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
        style={{
          background: "var(--color-surface)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
        }}
      >
        <RefreshCw size={11} />
        Retry
      </button>
    </div>
  );
}
