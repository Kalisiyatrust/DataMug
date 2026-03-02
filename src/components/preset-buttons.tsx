"use client";

import { ANALYSIS_PRESETS } from "@/lib/constants";
import {
  Eye,
  FileText,
  Scan,
  FileSearch,
  HelpCircle,
  Code,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  eye: <Eye size={14} />,
  "file-text": <FileText size={14} />,
  scan: <Scan size={14} />,
  "file-search": <FileSearch size={14} />,
  "help-circle": <HelpCircle size={14} />,
  code: <Code size={14} />,
};

interface Props {
  onSelect: (presetId: string) => void;
}

export function PresetButtons({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ANALYSIS_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text-secondary)",
          }}
          title={preset.prompt}
        >
          {ICON_MAP[preset.icon]}
          {preset.label}
        </button>
      ))}
    </div>
  );
}
