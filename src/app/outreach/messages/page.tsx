"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

type Channel = "email" | "telegram" | "whatsapp";
type Status = "sent" | "delivered" | "failed" | "queued";

interface OutreachMessage {
  id: string;
  channel: Channel;
  recipient: string;
  body: string;
  status: Status;
  createdAt: string;
  brand?: string;
}

type ChannelFilter = "all" | Channel;
type StatusFilter = "all" | Status;

const PAGE_SIZE = 20;

// ─── Badge helpers ──────────────────────────────────────────────

function channelBadge(channel: Channel) {
  return {
    email: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    telegram: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    whatsapp: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  }[channel];
}

function statusBadge(status: Status) {
  return {
    sent: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    delivered: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    queued: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  }[status];
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Filter Button ──────────────────────────────────────────────

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
        active
          ? "bg-green-600 text-white border-green-600 shadow-sm"
          : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function MessagesPage() {
  const [allMessages, setAllMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/outreach/messages");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: OutreachMessage[] = Array.isArray(data)
        ? data
        : data.messages ?? data.data ?? [];
      setAllMessages(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [channelFilter, statusFilter, search]);

  // Filter + search
  const filtered = allMessages.filter((msg) => {
    if (channelFilter !== "all" && msg.channel !== channelFilter) return false;
    if (statusFilter !== "all" && msg.status !== statusFilter) return false;
    if (
      search &&
      !msg.recipient.toLowerCase().includes(search.toLowerCase()) &&
      !msg.body.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Message Log
          </h2>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            All outreach messages across channels
          </p>
        </div>
        <button
          onClick={loadMessages}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        {/* Channel filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-stone-400 dark:text-stone-500 w-12 flex-shrink-0">
            Channel
          </span>
          <FilterBtn
            active={channelFilter === "all"}
            onClick={() => setChannelFilter("all")}
          >
            All
          </FilterBtn>
          <FilterBtn
            active={channelFilter === "email"}
            onClick={() => setChannelFilter("email")}
          >
            Email
          </FilterBtn>
          <FilterBtn
            active={channelFilter === "telegram"}
            onClick={() => setChannelFilter("telegram")}
          >
            Telegram
          </FilterBtn>
          <FilterBtn
            active={channelFilter === "whatsapp"}
            onClick={() => setChannelFilter("whatsapp")}
          >
            WhatsApp
          </FilterBtn>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-stone-400 dark:text-stone-500 w-12 flex-shrink-0">
            Status
          </span>
          <FilterBtn
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </FilterBtn>
          <FilterBtn
            active={statusFilter === "sent"}
            onClick={() => setStatusFilter("sent")}
          >
            Sent
          </FilterBtn>
          <FilterBtn
            active={statusFilter === "delivered"}
            onClick={() => setStatusFilter("delivered")}
          >
            Delivered
          </FilterBtn>
          <FilterBtn
            active={statusFilter === "failed"}
            onClick={() => setStatusFilter("failed")}
          >
            Failed
          </FilterBtn>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient or message…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button onClick={loadMessages} className="text-xs underline mt-1">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        {/* Table header */}
        <div
          className="hidden sm:grid grid-cols-[120px_160px_1fr_100px_130px] gap-3 px-5 py-2.5 border-b text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span>Channel</span>
          <span>To</span>
          <span>Message</span>
          <span>Status</span>
          <span>Sent at</span>
        </div>

        {loading ? (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[120px_160px_1fr_100px_130px] gap-3 px-5 py-3.5 hidden sm:grid">
                <div className="animate-pulse h-5 w-16 bg-stone-200 dark:bg-stone-700 rounded-full" />
                <div className="animate-pulse h-4 bg-stone-200 dark:bg-stone-700 rounded w-28" />
                <div className="animate-pulse h-4 bg-stone-100 dark:bg-stone-800 rounded" />
                <div className="animate-pulse h-5 w-16 bg-stone-100 dark:bg-stone-800 rounded-full" />
                <div className="animate-pulse h-4 bg-stone-100 dark:bg-stone-800 rounded w-24" />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare
              size={28}
              className="mx-auto text-stone-300 dark:text-stone-600 mb-3"
            />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {allMessages.length === 0
                ? "No messages found"
                : "No messages match your filters"}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {paginated.map((msg) => (
              <div
                key={msg.id}
                className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[120px_160px_1fr_100px_130px] gap-3 px-5 py-3.5 items-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${channelBadge(
                      msg.channel
                    )}`}
                  >
                    {msg.channel}
                  </span>
                  <span className="text-sm text-stone-700 dark:text-stone-300 truncate font-medium">
                    {msg.recipient}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    {msg.body.slice(0, 50)}
                    {msg.body.length > 50 ? "…" : ""}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${statusBadge(
                      msg.status
                    )}`}
                  >
                    {msg.status}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden px-4 py-3.5 space-y-2">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${channelBadge(
                          msg.channel
                        )}`}
                      >
                        {msg.channel}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(
                          msg.status
                        )}`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      {formatDateTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                    {msg.recipient}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                    {msg.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination footer */}
        {!loading && filtered.length > 0 && (
          <div
            className="flex items-center justify-between px-5 py-3 border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} — page {page} of{" "}
              {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                {page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
