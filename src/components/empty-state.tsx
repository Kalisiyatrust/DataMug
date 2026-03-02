"use client";

import { ANALYSIS_PRESETS } from "@/lib/constants";
import {
  Eye,
  FileText,
  Scan,
  FileSearch,
  HelpCircle,
  Code,
  Coffee,
  Upload,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactElement> = {
  eye: <Eye size={16} />,
  "file-text": <FileText size={16} />,
  scan: <Scan size={16} />,
  "file-search": <FileSearch size={16} />,
  "help-circle": <HelpCircle size={16} />,
  code: <Code size={16} />,
};

interface Props {
  onPresetClick: (prompt: string) => void;
}

export function EmptyState({ onPresetClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-4">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--color-accent-light)" }}
        >
          <Coffee size={32} style={{ color: "var(--color-accent)" }} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome to DataMug
          </h2>
          <p
            className="text-sm mt-1 max-w-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Upload an image and get AI-powered analysis. OCR, object detection,
            document understanding, and more.
          </p>
        </div>
      </div>

      {/* Quick start hint */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
        }}
      >
        <Upload size={12} />
        Drop an image anywhere, paste from clipboard, or click the image button
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md w-full">
        {ANALYSIS_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetClick(preset.prompt)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl text-sm transition-all duration-200 cursor-pointer border group hover:scale-[1.02]"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <span
              className="transition-colors duration-200"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {ICON_MAP[preset.icon]}
            </span>
            <span className="text-xs font-medium">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Privacy note */}
      <p
        className="text-xs max-w-xs"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Powered by Ollama. All processing happens locally on your machine — your
        images never leave your network.
      </p>
    </div>
  );
}
