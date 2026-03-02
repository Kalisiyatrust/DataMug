"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  MessageSquare,
  Image,
  Settings,
  Moon,
  Sun,
  Keyboard,
  Upload,
  FileImage,
  Bookmark,
  BarChart3,
  Plus,
  Trash2,
  ArrowRight,
} from "lucide-react";

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  category: "navigation" | "actions" | "settings";
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export function CommandPalette({
  isOpen,
  onClose,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = query
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.description?.toLowerCase().includes(query.toLowerCase())
      )
    : actions;

  // Group by category
  const grouped: Record<string, CommandAction[]> = {};
  for (const a of filtered) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  const flatFiltered = filtered;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatFiltered[selectedIndex]) {
        flatFiltered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    navigation: "Navigate",
    actions: "Actions",
    settings: "Settings",
  };

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.4)" }}
      />

      <div
        className="relative w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-bg)",
          borderColor: "var(--color-border)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-2.5 px-4 py-3.5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Search
            size={18}
            style={{ color: "var(--color-text-secondary)" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text)" }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--color-surface-hover)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "var(--color-text-secondary)" }}
            >
              No commands found
            </p>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div
                  className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {categoryLabels[cat] || cat}
                </div>
                {items.map((action) => {
                  flatIndex++;
                  const idx = flatFiltered.indexOf(action);
                  const isSelected = idx === selectedIndex;
                  const Icon = action.icon;

                  return (
                    <div
                      key={action.id}
                      data-index={idx}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-75 mx-2 rounded-lg"
                      style={{
                        background: isSelected
                          ? "var(--color-surface-hover)"
                          : "transparent",
                      }}
                      onClick={() => {
                        action.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <Icon
                        size={16}
                        style={{
                          color: isSelected
                            ? "var(--color-accent)"
                            : "var(--color-text-secondary)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{action.label}</span>
                        {action.description && (
                          <span
                            className="text-xs ml-2"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {action.description}
                          </span>
                        )}
                      </div>
                      {action.shortcut && (
                        <kbd
                          className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            background: "var(--color-surface-hover)",
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {action.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <ArrowRight
                          size={12}
                          style={{ color: "var(--color-accent)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t text-[10px]"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>
            <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-border)" }}>
              ↑↓
            </kbd>{" "}
            navigate{" "}
            <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-border)" }}>
              ↵
            </kbd>{" "}
            select
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-border)" }}>
              ⌘K
            </kbd>{" "}
            to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
