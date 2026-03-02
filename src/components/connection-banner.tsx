"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw, WifiOff, Wifi } from "lucide-react";

interface Props {
  status: "connected" | "disconnected" | "checking";
  error: string | null;
  onRetry: () => void;
}

export function ConnectionBanner({ status, error, onRetry }: Props) {
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [showRecovered, setShowRecovered] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef(status);

  // Track browser online/offline events
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // Auto-retry when coming back online
      onRetry();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onRetry]);

  // Auto-retry with exponential backoff when disconnected
  useEffect(() => {
    if (status === "disconnected" && isOnline && autoRetryCount < 5) {
      const delay = Math.min(10_000 * Math.pow(2, autoRetryCount), 60_000);
      retryTimerRef.current = setTimeout(() => {
        setAutoRetryCount((c) => c + 1);
        onRetry();
      }, delay);
    }

    // Reset retry count when connected
    if (status === "connected") {
      setAutoRetryCount(0);
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [status, autoRetryCount, isOnline, onRetry]);

  // Flash "reconnected" message briefly
  useEffect(() => {
    if (prevStatusRef.current === "disconnected" && status === "connected") {
      setShowRecovered(true);
      const timer = setTimeout(() => setShowRecovered(false), 3000);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  // Show recovery banner
  if (showRecovered) {
    return (
      <div
        className="px-4 sm:px-6 py-2 flex items-center gap-3 text-sm animate-slideDown"
        style={{
          background:
            "color-mix(in srgb, var(--color-success) 10%, var(--color-bg))",
          borderBottom: "1px solid var(--color-success)",
        }}
      >
        <Wifi
          size={14}
          className="flex-shrink-0"
          style={{ color: "var(--color-success)" }}
        />
        <p
          className="text-xs font-medium"
          style={{ color: "var(--color-success)" }}
        >
          Reconnected to Ollama
        </p>
      </div>
    );
  }

  // Browser is offline
  if (!isOnline) {
    return (
      <div
        className="px-4 sm:px-6 py-2.5 flex items-center gap-3 text-sm animate-slideDown"
        style={{
          background:
            "color-mix(in srgb, var(--color-error) 10%, var(--color-bg))",
          borderBottom: "1px solid var(--color-error)",
        }}
      >
        <WifiOff
          size={14}
          className="flex-shrink-0"
          style={{ color: "var(--color-error)" }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium"
            style={{ color: "var(--color-error)" }}
          >
            You are offline
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Check your internet connection. DataMug will reconnect automatically.
          </p>
        </div>
      </div>
    );
  }

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
            {autoRetryCount > 0 && autoRetryCount < 5
              ? `Auto-retrying... (attempt ${autoRetryCount}/5) · `
              : ""}
            Run <code className="font-mono">ollama serve</code> on your machine
          </p>
        )}
      </div>

      <button
        onClick={() => {
          setAutoRetryCount(0);
          onRetry();
        }}
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
