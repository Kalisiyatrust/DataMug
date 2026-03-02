"use client";

import type { OllamaModel } from "@/types";
import { RefreshCw, ChevronDown } from "lucide-react";

interface Props {
  models: OllamaModel[];
  selected: string;
  onChange: (model: string) => void;
  onRefresh: () => void;
}

export function ModelSelector({ models, selected, onChange, onRefresh }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-lg border outline-none cursor-pointer"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
          }}
        >
          {models.length === 0 && (
            <option value="">No models found</option>
          )}
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-secondary)" }}
        />
      </div>

      <button
        onClick={onRefresh}
        className="p-1.5 rounded-lg transition-colors cursor-pointer"
        style={{ color: "var(--color-text-secondary)" }}
        title="Refresh models"
      >
        <RefreshCw size={14} />
      </button>
    </div>
  );
}
