"use client";

import type { OllamaModel } from "@/types";
import { RefreshCw, ChevronDown, Wifi, WifiOff, Loader2 } from "lucide-react";

interface Props {
  models: OllamaModel[];
  selected: string;
  onChange: (model: string) => void;
  onRefresh: () => void;
  connectionStatus: "connected" | "disconnected" | "checking";
}

export function ModelSelector({
  models,
  selected,
  onChange,
  onRefresh,
  connectionStatus,
}: Props) {
  const statusColors = {
    connected: "var(--color-success)",
    disconnected: "var(--color-error)",
    checking: "var(--color-accent)",
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Connection status dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: statusColors[connectionStatus],
          boxShadow:
            connectionStatus === "connected"
              ? `0 0 6px ${statusColors.connected}`
              : "none",
        }}
        title={
          connectionStatus === "connected"
            ? "Connected to Ollama"
            : connectionStatus === "checking"
              ? "Connecting..."
              : "Disconnected"
        }
      />

      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-lg border outline-none cursor-pointer transition-colors duration-200"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
          }}
          disabled={models.length === 0}
        >
          {models.length === 0 && (
            <option value="">
              {connectionStatus === "checking"
                ? "Connecting..."
                : "No models found"}
            </option>
          )}
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={11}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-secondary)" }}
        />
      </div>

      <button
        onClick={onRefresh}
        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors duration-200 cursor-pointer"
        style={{ color: "var(--color-text-secondary)" }}
        title="Refresh models"
      >
        {connectionStatus === "checking" ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <RefreshCw size={13} />
        )}
      </button>
    </div>
  );
}
