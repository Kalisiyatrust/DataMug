/**
 * Conversation thread management using localStorage.
 */

import type { Message } from "@/types";
import { generateId } from "./constants";

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

const STORAGE_KEY = "datamug-threads";
const MAX_THREADS = 50;

/**
 * Get all saved threads, sorted by most recently updated.
 */
export function getThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const threads: ChatThread[] = JSON.parse(raw);
    return threads.sort((a, b) => b.updatedAt - a.updatedAt);
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
  };
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
