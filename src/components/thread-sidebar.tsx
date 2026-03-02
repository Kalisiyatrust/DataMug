"use client";

import { useState, useRef, useCallback } from "react";
import type { ChatThread } from "@/lib/threads";
import {
  searchThreads,
  exportThreads,
  downloadExport,
  importThreads,
  downloadThreadAsText,
} from "@/lib/threads";
import type { ExportData } from "@/types";
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  Check,
  Search,
  X,
  Pin,
  Download,
  Upload,
  FileText,
} from "lucide-react";

interface Props {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onImportComplete: () => void;
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
  onTogglePin,
  onImportComplete,
  isOpen,
  onToggle,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ threadId: string; matchCount: number; preview: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim().length >= 2) {
        const results = searchThreads(query);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    },
    []
  );

  function handleExportAll() {
    const data = exportThreads();
    downloadExport(data);
    setShowMenu(false);
  }

  function handleExportThread(thread: ChatThread) {
    downloadThreadAsText(thread);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
    setShowMenu(false);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data: ExportData = JSON.parse(event.target?.result as string);
        const count = importThreads(data);
        setImportMessage(`Imported ${count} chat${count !== 1 ? "s" : ""}`);
        onImportComplete();
        setTimeout(() => setImportMessage(null), 3000);
      } catch {
        setImportMessage("Invalid file format");
        setTimeout(() => setImportMessage(null), 3000);
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
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

  // Filter threads by search
  const displayThreads =
    isSearching && searchQuery.trim().length >= 2
      ? threads.filter((t) =>
          searchResults.some((r) => r.threadId === t.id)
        )
      : threads;

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
            onClick={() => setIsSearching(!isSearching)}
            className="p-1.5 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
            style={{
              color: isSearching
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
            }}
            title="Search chats"
          >
            <Search size={14} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
              style={{ color: "var(--color-text-secondary)" }}
              title="More options"
            >
              <FileText size={14} />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-8 z-30 w-40 rounded-lg shadow-lg border py-1 animate-fadeIn"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <button
                  onClick={handleExportAll}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs cursor-pointer hover:bg-[var(--color-surface-hover)]"
                  style={{ color: "var(--color-text)" }}
                >
                  <Download size={12} />
                  Export all chats
                </button>
                <button
                  onClick={handleImportClick}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs cursor-pointer hover:bg-[var(--color-surface-hover)]"
                  style={{ color: "var(--color-text)" }}
                >
                  <Upload size={12} />
                  Import chats
                </button>
              </div>
            )}
          </div>
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

      {/* Search bar */}
      {isSearching && (
        <div className="px-3 py-2 border-b animate-slideDown" style={{ borderColor: "var(--color-border)" }}>
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Search size={12} style={{ color: "var(--color-text-secondary)" }} />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "var(--color-text)" }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="cursor-pointer"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {searchQuery.trim().length >= 2 && (
            <p
              className="text-xs mt-1 px-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Import message */}
      {importMessage && (
        <div
          className="px-3 py-2 text-xs text-center animate-fadeIn"
          style={{
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
          }}
        >
          {importMessage}
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto py-1">
        {displayThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
            <MessageSquare
              size={20}
              style={{ color: "var(--color-text-secondary)" }}
            />
            <p
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {isSearching && searchQuery
                ? "No matching chats found."
                : "No chats yet. Start a new one."}
            </p>
          </div>
        ) : (
          displayThreads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const isEditing = editingId === thread.id;
            const msgCount = thread.messages.length;
            const searchResult = searchResults.find(
              (r) => r.threadId === thread.id
            );

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
                      <span className="flex items-center gap-1">
                        {thread.pinned && (
                          <Pin
                            size={10}
                            style={{ color: "var(--color-accent)" }}
                            className="flex-shrink-0"
                          />
                        )}
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
                      </span>
                      {isSearching && searchResult ? (
                        <span
                          className="text-xs truncate"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {searchResult.preview}
                        </span>
                      ) : (
                        <span
                          className="text-xs truncate"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {msgCount} message{msgCount !== 1 ? "s" : ""} ·{" "}
                          {formatDate(thread.updatedAt)}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(thread.id);
                      }}
                      className="p-1 rounded cursor-pointer hover:bg-[var(--color-surface-hover)]"
                      style={{
                        color: thread.pinned
                          ? "var(--color-accent)"
                          : "var(--color-text-secondary)",
                      }}
                      title={thread.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportThread(thread);
                      }}
                      className="p-1 rounded cursor-pointer hover:bg-[var(--color-surface-hover)]"
                      style={{ color: "var(--color-text-secondary)" }}
                      title="Export as text"
                    >
                      <Download size={11} />
                    </button>
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

      {/* Close menu on outside click */}
      {showMenu && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowMenu(false)}
        />
      )}

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
