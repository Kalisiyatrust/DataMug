"use client";

import { useState, useEffect } from "react";
import {
  X,
  Settings as SettingsIcon,
  Monitor,
  Moon,
  Sun,
  Database,
  Trash2,
  Download,
  Info,
} from "lucide-react";

export interface AppSettings {
  defaultModel: string;
  theme: "system" | "light" | "dark";
  streamingEnabled: boolean;
  maxHistoryMessages: number;
  autoSaveGallery: boolean;
  compactMode: boolean;
}

const SETTINGS_KEY = "datamug-settings";

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: "",
  theme: "system",
  streamingEnabled: true,
  maxHistoryMessages: 10,
  autoSaveGallery: true,
  compactMode: false,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  models: { id: string; name: string }[];
}

export function SettingsPanel({ isOpen, onClose, models }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
    }
  }, [isOpen]);

  function update(partial: Partial<AppSettings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);

    // Apply theme immediately
    if (partial.theme !== undefined) {
      applyTheme(partial.theme);
    }
  }

  function applyTheme(theme: "system" | "light" | "dark") {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }

  function getStorageUsage(): string {
    let total = 0;
    for (const key in localStorage) {
      if (key.startsWith("datamug")) {
        total += (localStorage.getItem(key) || "").length * 2; // UTF-16
      }
    }
    if (total < 1024) return `${total} B`;
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
    return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  }

  function clearAllData() {
    if (
      confirm(
        "Delete all DataMug data? This includes threads, gallery, templates, and settings. This cannot be undone."
      )
    ) {
      for (const key in localStorage) {
        if (key.startsWith("datamug")) {
          localStorage.removeItem(key);
        }
      }
      window.location.reload();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />

      <div
        className="relative w-full max-w-md max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <SettingsIcon
              size={18}
              style={{ color: "var(--color-accent)" }}
            />
            <h2 className="text-base font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Theme */}
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Theme
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "system", label: "System", icon: Monitor },
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => update({ theme: value })}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border"
                  style={{
                    background:
                      settings.theme === value
                        ? "var(--color-accent)"
                        : "var(--color-surface)",
                    color:
                      settings.theme === value
                        ? "white"
                        : "var(--color-text)",
                    borderColor:
                      settings.theme === value
                        ? "var(--color-accent)"
                        : "var(--color-border)",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Default model */}
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Default Model
            </label>
            <select
              value={settings.defaultModel}
              onChange={(e) => update({ defaultModel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
                background: "var(--color-surface)",
              }}
            >
              <option value="">Auto-detect</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label
              className="text-xs font-semibold uppercase tracking-wider block"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Preferences
            </label>

            <ToggleRow
              label="Auto-save images to gallery"
              description="Save thumbnails of analyzed images"
              checked={settings.autoSaveGallery}
              onChange={(v) => update({ autoSaveGallery: v })}
            />

            <ToggleRow
              label="Compact mode"
              description="Reduce spacing for more content"
              checked={settings.compactMode}
              onChange={(v) => update({ compactMode: v })}
            />

            <ToggleRow
              label="Streaming responses"
              description="Show AI responses as they generate"
              checked={settings.streamingEnabled}
              onChange={(v) => update({ streamingEnabled: v })}
            />
          </div>

          {/* Context window */}
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              History context ({settings.maxHistoryMessages} messages)
            </label>
            <input
              type="range"
              min={2}
              max={20}
              step={2}
              value={settings.maxHistoryMessages}
              onChange={(e) =>
                update({ maxHistoryMessages: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <div
              className="flex justify-between text-[10px] mt-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span>2 (faster)</span>
              <span>20 (more context)</span>
            </div>
          </div>

          {/* Data */}
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Data
            </label>
            <div
              className="flex items-center justify-between p-3 rounded-lg border"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div className="flex items-center gap-2">
                <Database
                  size={14}
                  style={{ color: "var(--color-text-secondary)" }}
                />
                <span className="text-sm">Storage used</span>
              </div>
              <span
                className="text-sm font-mono"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {getStorageUsage()}
              </span>
            </div>

            <button
              onClick={clearAllData}
              className="flex items-center gap-1.5 mt-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer w-full justify-center border"
              style={{
                borderColor: "var(--color-error, #ef4444)",
                color: "var(--color-error, #ef4444)",
              }}
            >
              <Trash2 size={12} />
              Clear all DataMug data
            </button>
          </div>

          {/* About */}
          <div
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{ background: "var(--color-surface)" }}
          >
            <Info
              size={14}
              style={{ color: "var(--color-text-secondary)" }}
            />
            <div>
              <p className="text-xs font-medium">DataMug v0.3.0</p>
              <p
                className="text-[10px]"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Private AI Vision Analysis · mugdata.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Toggle component ────────────────────────────────────────────── */

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm">{label}</p>
        <p
          className="text-[11px]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {description}
        </p>
      </div>
      <div
        className="w-9 h-5 rounded-full relative transition-colors duration-200 flex-shrink-0"
        style={{
          background: checked
            ? "var(--color-accent)"
            : "var(--color-surface-hover)",
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
          style={{
            transform: checked ? "translateX(18px)" : "translateX(2px)",
          }}
        />
      </div>
    </div>
  );
}
