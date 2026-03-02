"use client";

import { useState } from "react";
import type { ChatThread } from "@/lib/threads";
import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  Check,
} from "lucide-react";

interface Props {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onRenameThread,
  isOpen,
  onToggle,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  function startEditing(id: string, currentTitle: string) {
    setEditingId(id);
    setEditTitle(currentTitle);
  }

  function confirmEdit(id: string) {
    if (editTitle.trim()) {
      onRenameThread(id, editTitle.trim());
    }
    setEditingId(null);
  }

  function formatDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  // Collapsed toggle button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-3 left-3 z-20 p-2 rounded-lg cursor-pointer transition-colors duration-200"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
        }}
        title="Open chat history"
      >
        <PanelLeftOpen size={16} />
      </button>
    );
  }

  return (
    <div
      className="flex flex-col h-full border-r animate-slideRight"
      style={{
        width: "260px",
        minWidth: "260px",
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-3 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span className="text-sm font-medium">Chats</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewThread}
            className="p-1.5 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
            style={{ color: "var(--color-accent)" }}
            title="New chat"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
            style={{ color: "var(--color-text-secondary)" }}
            title="Close sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto py-1">
        {threads.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4"
          >
            <MessageSquare
              size={20}
              style={{ color: "var(--color-text-secondary)" }}
            />
            <p
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              No chats yet. Start a new one.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const isEditing = editingId === thread.id;
            const msgCount = thread.messages.length;

            return (
              <div
                key={thread.id}
                className="group flex items-center gap-1 px-2 py-0.5"
              >
                <button
                  onClick={() => onSelectThread(thread.id)}
                  className="flex-1 flex flex-col px-2.5 py-2 rounded-lg text-left cursor-pointer transition-all duration-150 min-w-0"
                  style={{
                    background: isActive
                      ? "var(--color-accent-light)"
                      : "transparent",
                    borderLeft: isActive
                      ? "2px solid var(--color-accent)"
                      : "2px solid transparent",
                  }}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmEdit(thread.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 text-xs bg-transparent outline-none border-b px-0 py-0.5"
                        style={{
                          borderColor: "var(--color-accent)",
                          color: "var(--color-text)",
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmEdit(thread.id);
                        }}
                        className="p-0.5 cursor-pointer"
                        style={{ color: "var(--color-accent)" }}
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="text-xs font-medium truncate"
                        style={{
                          color: isActive
                            ? "var(--color-accent)"
                            : "var(--color-text)",
                        }}
                      >
                        {thread.title}
                      </span>
                      <span
                        className="text-xs truncate"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {msgCount} message{msgCount !== 1 ? "s" : ""} ·{" "}
                        {formatDate(thread.updatedAt)}
                      </span>
                    </>
                  )}
                </button>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(thread.id, thread.title);
                      }}
                      className="p-1 rounded cursor-pointer hover:bg-[var(--color-surface-hover)]"
                      style={{ color: "var(--color-text-secondary)" }}
                      title="Rename"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                      className="p-1 rounded cursor-pointer hover:bg-[var(--color-surface-hover)]"
                      style={{ color: "var(--color-error)" }}
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 border-t text-center"
        style={{ borderColor: "var(--color-border)" }}
      >
        <p
          className="text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {threads.length} chat{threads.length !== 1 ? "s" : ""} · Stored
          locally
        </p>
      </div>
    </div>
  );
}
