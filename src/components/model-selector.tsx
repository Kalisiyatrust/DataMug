"use client";

import { useState, useRef, useEffect } from "react";
import type { OllamaModel } from "@/types";
import {
  getModelCapabilities,
  isVisionModel,
  formatSize,
} from "@/lib/constants";
import {
  RefreshCw,
  ChevronDown,
  Loader2,
  Eye,
  Cpu,
  Check,
} from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusColors = {
    connected: "var(--color-success)",
    disconnected: "var(--color-error)",
    checking: "var(--color-accent)",
  };

  const selectedModel = models.find((m) => m.id === selected);
  const selectedCaps = selected ? getModelCapabilities(selected) : null;

  // Separate vision and non-vision models
  const visionModels = models.filter((m) => isVisionModel(m.name));
  const otherModels = models.filter((m) => !isVisionModel(m.name));

  return (
    <div className="flex items-center gap-1.5">
      {/* Connection dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300"
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

      {/* Custom dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => models.length > 0 && setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors duration-200"
          style={{
            borderColor: isOpen
              ? "var(--color-accent)"
              : "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
          }}
          disabled={models.length === 0}
        >
          {selectedCaps && (
            <Eye
              size={11}
              style={{ color: "var(--color-accent)" }}
            />
          )}
          <span className="max-w-[120px] truncate">
            {connectionStatus === "checking"
              ? "Connecting..."
              : selected
                ? selectedCaps?.label || selected
                : "No models"}
          </span>
          <ChevronDown
            size={11}
            className="transition-transform duration-200"
            style={{
              color: "var(--color-text-secondary)",
              transform: isOpen ? "rotate(180deg)" : "none",
            }}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden shadow-lg z-50 animate-slideDown"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              width: "280px",
            }}
          >
            {/* Vision models section */}
            {visionModels.length > 0 && (
              <>
                <div
                  className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  style={{
                    background: "var(--color-surface-hover)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <Eye size={10} />
                  Vision Models
                </div>
                {visionModels.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    isSelected={model.id === selected}
                    onSelect={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                  />
                ))}
              </>
            )}

            {/* Other models */}
            {otherModels.length > 0 && (
              <>
                <div
                  className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  style={{
                    background: "var(--color-surface-hover)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <Cpu size={10} />
                  Text Models
                </div>
                {otherModels.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    isSelected={model.id === selected}
                    onSelect={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                  />
                ))}
              </>
            )}

            {models.length === 0 && (
              <div
                className="px-3 py-4 text-center text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                No models found. Run{" "}
                <code className="font-mono">ollama pull llava:7b</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refresh button */}
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

function ModelRow({
  model,
  isSelected,
  onSelect,
}: {
  model: OllamaModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const caps = getModelCapabilities(model.name);
  const hasVision = isVisionModel(model.name);

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors duration-150 hover:bg-[var(--color-surface-hover)]"
      style={{
        background: isSelected ? "var(--color-accent-light)" : "transparent",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium truncate"
            style={{
              color: isSelected
                ? "var(--color-accent)"
                : "var(--color-text)",
            }}
          >
            {caps?.label || model.name}
          </span>
          {hasVision && (
            <span
              className="text-xs px-1.5 py-0 rounded-full"
              style={{
                background: "var(--color-accent-light)",
                color: "var(--color-accent)",
                fontSize: "0.625rem",
              }}
            >
              vision
            </span>
          )}
        </div>
        {caps && (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "var(--color-text-secondary)", fontSize: "0.65rem" }}
          >
            {caps.description} · {caps.sizeTag}
          </p>
        )}
        {!caps && model.size && (
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-secondary)", fontSize: "0.65rem" }}
          >
            {formatSize(model.size)}
          </p>
        )}
      </div>

      {isSelected && (
        <Check size={14} style={{ color: "var(--color-accent)" }} />
      )}
    </button>
  );
}
