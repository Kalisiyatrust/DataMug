/**
 * Conversation thread management using localStorage.
 * Supports CRUD, pinning, search, export/import.
 */

import type { Message, ExportData, ExportedThread } from "@/types";
import { generateId } from "./constants";

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  pinned?: boolean;
}

const STORAGE_KEY = "datamug-threads";
const MAX_THREADS = 50;

/**
 * Get all saved threads, sorted: pinned first, then by most recently updated.
 */
export function getThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const threads: ChatThread[] = JSON.parse(raw);
    return threads.sort((a, b) => {
      // Pinned first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  } catch {
    return [];
  }
}

/**
 * Save a thread (create or update).
 */
export function saveThread(thread: ChatThread): void {
  const threads = getThreads();
  const index = threads.findIndex((t) => t.id === thread.id);

  if (index >= 0) {
    threads[index] = { ...thread, updatedAt: Date.now() };
  } else {
    threads.unshift({ ...thread, updatedAt: Date.now() });
  }

  // Enforce max threads
  const trimmed = threads.slice(0, MAX_THREADS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Delete a thread by ID.
 */
export function deleteThread(id: string): void {
  const threads = getThreads().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

/**
 * Create a new empty thread.
 */
export function createThread(model?: string): ChatThread {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model,
    pinned: false,
  };
}

/**
 * Toggle pinned state for a thread.
 */
export function togglePin(id: string): ChatThread | null {
  const threads = getThreads();
  const thread = threads.find((t) => t.id === id);
  if (!thread) return null;

  const updated = { ...thread, pinned: !thread.pinned };
  saveThread(updated);
  return updated;
}

/**
 * Auto-generate a title from the first user message.
 */
export function generateTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";

  let title = firstUser.content;
  // If it's a preset prompt, shorten it
  if (title.length > 40) {
    title = title.slice(0, 37) + "...";
  }
  // Prefix with image emoji if it had an image
  if (firstUser.image) {
    title = "📷 " + title;
  }
  return title;
}

/**
 * Migrate from old single-history format to threads.
 */
export function migrateFromLegacy(): ChatThread | null {
  if (typeof window === "undefined") return null;
  const old = localStorage.getItem("datamug-history");
  if (!old) return null;

  try {
    const messages: Message[] = JSON.parse(old);
    if (!Array.isArray(messages) || messages.length === 0) return null;

    const thread: ChatThread = {
      id: generateId(),
      title: generateTitle(messages),
      messages,
      createdAt: messages[0]?.timestamp || Date.now(),
      updatedAt: Date.now(),
    };

    saveThread(thread);
    localStorage.removeItem("datamug-history");
    return thread;
  } catch {
    return null;
  }
}

/**
 * Search across all threads. Returns matching thread IDs with match context.
 */
export function searchThreads(
  query: string
): Array<{ threadId: string; matchCount: number; preview: string }> {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const threads = getThreads();
  const results: Array<{
    threadId: string;
    matchCount: number;
    preview: string;
  }> = [];

  for (const thread of threads) {
    let matchCount = 0;
    let preview = "";

    // Check title
    if (thread.title.toLowerCase().includes(lowerQuery)) {
      matchCount++;
      if (!preview) preview = thread.title;
    }

    // Check messages
    for (const msg of thread.messages) {
      if (msg.content.toLowerCase().includes(lowerQuery)) {
        matchCount++;
        if (!preview) {
          // Extract context around the match
          const idx = msg.content.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, idx - 30);
          const end = Math.min(msg.content.length, idx + query.length + 60);
          preview =
            (start > 0 ? "…" : "") +
            msg.content.slice(start, end).trim() +
            (end < msg.content.length ? "…" : "");
        }
      }
    }

    if (matchCount > 0) {
      results.push({ threadId: thread.id, matchCount, preview });
    }
  }

  // Sort by match count descending
  return results.sort((a, b) => b.matchCount - a.matchCount);
}

/**
 * Export threads to a downloadable JSON file.
 */
export function exportThreads(threadIds?: string[]): ExportData {
  const threads = getThreads();
  const toExport = threadIds
    ? threads.filter((t) => threadIds.includes(t.id))
    : threads;

  const exportData: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    app: "DataMug",
    threads: toExport.map(
      (t): ExportedThread => ({
        id: t.id,
        title: t.title,
        messages: t.messages.map((m) => ({
          ...m,
          // Strip image data to reduce file size in export
          image: m.image ? "[image data stripped]" : undefined,
        })),
        createdAt: t.createdAt,
        model: t.model,
        pinned: t.pinned,
      })
    ),
  };

  return exportData;
}

/**
 * Trigger a JSON download in the browser.
 */
export function downloadExport(data: ExportData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `datamug-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import threads from an exported JSON file.
 * Returns count of imported threads.
 */
export function importThreads(data: ExportData): number {
  if (data.app !== "DataMug" || !data.threads || !Array.isArray(data.threads)) {
    throw new Error("Invalid DataMug export file");
  }

  const existing = getThreads();
  const existingIds = new Set(existing.map((t) => t.id));
  let imported = 0;

  for (const thread of data.threads) {
    // Skip duplicates by ID
    if (existingIds.has(thread.id)) continue;

    const newThread: ChatThread = {
      id: thread.id || generateId(),
      title: thread.title || "Imported Chat",
      messages: thread.messages || [],
      createdAt: thread.createdAt || Date.now(),
      updatedAt: Date.now(),
      model: thread.model,
      pinned: thread.pinned || false,
    };

    saveThread(newThread);
    imported++;
  }

  return imported;
}

/**
 * Export a single thread as plain text.
 */
export function threadToText(thread: ChatThread): string {
  const lines: string[] = [
    `# ${thread.title}`,
    `Date: ${new Date(thread.createdAt).toLocaleDateString()}`,
    `Model: ${thread.model || "Default"}`,
    `Messages: ${thread.messages.length}`,
    "",
    "---",
    "",
  ];

  for (const msg of thread.messages) {
    const role = msg.role === "user" ? "You" : "DataMug";
    const time = new Date(msg.timestamp).toLocaleTimeString();
    lines.push(`**${role}** (${time}):`);
    if (msg.image) lines.push("[Image attached]");
    lines.push(msg.content);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Download a thread as a .txt file.
 */
export function downloadThreadAsText(thread: ChatThread): void {
  const text = threadToText(thread);
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${thread.title.replace(/[^a-zA-Z0-9]/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
