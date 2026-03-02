"use client";

/**
 * share-menu.tsx
 * Per-message share/export dropdown menu for DataMug.
 * Renders as a small icon button that appears on hover of assistant messages.
 * Supports: copy text, copy markdown, download HTML, download text.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Share2, Copy, Check, FileDown, FileText, ChevronDown } from "lucide-react";
import type { Message } from "@/types";
import {
  copyToClipboard,
  downloadAsHTML,
  downloadAsText,
  formatAsMarkdown,
  generateShareText,
} from "@/lib/export-utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  message: Message;
  allMessages: Message[];
  threadTitle?: string;
  model?: string;
}

type ActionKey =
  | "copy-text"
  | "copy-markdown"
  | "download-html"
  | "download-text";

interface MenuItem {
  key: ActionKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MENU_ITEMS: MenuItem[] = [
  {
    key: "copy-text",
    label: "Copy message",
    description: "Copy this response as plain text",
    icon: <Copy size={13} />,
  },
  {
    key: "copy-markdown",
    label: "Copy as Markdown",
    description: "Copy full conversation in Markdown format",
    icon: <Copy size={13} />,
  },
  {
    key: "download-html",
    label: "Download as HTML",
    description: "Save conversation as a printable HTML file",
    icon: <FileDown size={13} />,
  },
  {
    key: "download-text",
    label: "Download as text",
    description: "Save conversation as a .txt file",
    icon: <FileText size={13} />,
  },
];

// How long a success state stays shown (ms)
const SUCCESS_DURATION = 2200;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ShareMenu({ message, allMessages, threadTitle, model }: Props) {
  const [open, setOpen] = useState(false);
  const [successKey, setSuccessKey] = useState<ActionKey | null>(null);
  const [errorKey, setErrorKey] = useState<ActionKey | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Close on outside click ──────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Cleanup success timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // ── Action handlers ─────────────────────────────────────────────────────

  const markSuccess = useCallback((key: ActionKey) => {
    setSuccessKey(key);
    setErrorKey(null);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSuccessKey(null);
    }, SUCCESS_DURATION);
    // Auto-close after a brief delay so the user sees the tick
    setTimeout(() => setOpen(false), 600);
  }, []);

  const markError = useCallback((key: ActionKey) => {
    setErrorKey(key);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setErrorKey(null);
    }, SUCCESS_DURATION);
  }, []);

  const handleAction = useCallback(
    async (key: ActionKey) => {
      const title = threadTitle ?? "DataMug Conversation";

      switch (key) {
        case "copy-text": {
          const text = generateShareText(message);
          const ok = await copyToClipboard(text);
          ok ? markSuccess(key) : markError(key);
          break;
        }

        case "copy-markdown": {
          const md = formatAsMarkdown(allMessages, title);
          const ok = await copyToClipboard(md);
          ok ? markSuccess(key) : markError(key);
          break;
        }

        case "download-html": {
          try {
            downloadAsHTML(title, allMessages, model);
            markSuccess(key);
          } catch {
            markError(key);
          }
          break;
        }

        case "download-text": {
          try {
            const md = formatAsMarkdown(allMessages, title);
            const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").slice(0, 60) || "datamug";
            downloadAsText(md, `${safeTitle}.txt`);
            markSuccess(key);
          } catch {
            markError(key);
          }
          break;
        }
      }
    },
    [message, allMessages, threadTitle, model, markSuccess, markError]
  );

  // ── Render ──────────────────────────────────────────────────────────────

  const anySuccess = successKey !== null;

  return (
    <div className="relative inline-block">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all duration-200 cursor-pointer"
        style={{
          background: open
            ? "var(--color-surface-hover)"
            : anySuccess
              ? "transparent"
              : "var(--color-surface-hover)",
          color: anySuccess
            ? "var(--color-accent, #6366f1)"
            : "var(--color-text-secondary)",
          outline: "none",
        }}
        title="Share or export"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {anySuccess ? (
          <>
            <Check size={10} />
            <span>Done</span>
          </>
        ) : (
          <>
            <Share2 size={10} />
            <span>Share</span>
            <ChevronDown
              size={9}
              style={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute z-50 rounded-xl shadow-lg overflow-hidden"
          style={{
            bottom: "calc(100% + 6px)",
            left: 0,
            minWidth: "220px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          {/* Menu header */}
          <div
            className="px-3 py-2 text-xs font-semibold"
            style={{
              color: "var(--color-text-secondary)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface-hover)",
            }}
          >
            Export / Share
          </div>

          {/* Menu items */}
          {MENU_ITEMS.map((item, index) => {
            const isSuccess = successKey === item.key;
            const isError = errorKey === item.key;

            return (
              <button
                key={item.key}
                role="menuitem"
                onClick={() => handleAction(item.key)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors duration-100 cursor-pointer"
                style={{
                  background: isSuccess
                    ? "var(--color-accent, #6366f1)10"
                    : "transparent",
                  borderBottom:
                    index < MENU_ITEMS.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                  color: isError
                    ? "#ef4444"
                    : isSuccess
                      ? "var(--color-accent, #6366f1)"
                      : "var(--color-text)",
                }}
                onMouseEnter={(e) => {
                  if (!isSuccess && !isError) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--color-surface-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSuccess) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      isSuccess ? "var(--color-accent, #6366f1)10" : "transparent";
                  }
                }}
              >
                {/* Icon column */}
                <span
                  className="flex-shrink-0 mt-0.5"
                  style={{
                    color: isError
                      ? "#ef4444"
                      : isSuccess
                        ? "var(--color-accent, #6366f1)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  {isSuccess ? (
                    <Check size={13} />
                  ) : (
                    item.icon
                  )}
                </span>

                {/* Label + description */}
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium leading-tight">
                    {isSuccess
                      ? item.key.startsWith("copy")
                        ? "Copied!"
                        : "Downloaded!"
                      : isError
                        ? "Failed — try again"
                        : item.label}
                  </span>
                  {!isSuccess && !isError && (
                    <span
                      className="text-xs leading-tight"
                      style={{ color: "var(--color-text-secondary)", fontSize: "11px" }}
                    >
                      {item.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage note (for integration into message-bubble.tsx)
// ─────────────────────────────────────────────────────────────────────────────
//
// Replace the existing copy-button block in message-bubble.tsx:
//
//   {!isUser && !isStreaming && (
//     <div className="absolute -bottom-6 left-2 flex items-center gap-1
//                     opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
//       {/* existing Copy button ... */}
//       <ShareMenu
//         message={message}
//         allMessages={allMessages}        // pass from parent
//         threadTitle={threadTitle}        // pass from parent
//         model={model}                   // pass from parent
//       />
//     </div>
//   )}
//
// Update the Props interface to include:
//   allMessages: Message[];
//   threadTitle?: string;
//   model?: string;
