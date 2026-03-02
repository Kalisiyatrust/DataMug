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

const ICON_MAP: Record<string, React.ReactElement> = {
  eye: <Eye size={13} />,
  "file-text": <FileText size={13} />,
  scan: <Scan size={13} />,
  "file-search": <FileSearch size={13} />,
  "help-circle": <HelpCircle size={13} />,
  code: <Code size={13} />,
};

interface Props {
  onSelect: (presetId: string) => void;
}

export function PresetButtons({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5 animate-fadeIn">
      <span
        className="text-xs self-center mr-1"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Quick:
      </span>
      {ANALYSIS_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border hover:scale-[1.03]"
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
