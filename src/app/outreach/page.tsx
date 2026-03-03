"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Send,
  Megaphone,
  TrendingUp,
  Mail,
  MessageCircle,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface StatsData {
  totalContacts: number;
  messagesSent: number;
  activeCampaigns: number;
  deliveryRate: number;
}

interface OutreachMessage {
  id: string;
  channel: "email" | "telegram" | "whatsapp";
  recipient: string;
  body: string;
  status: "sent" | "delivered" | "failed" | "queued";
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function channelBadge(channel: OutreachMessage["channel"]) {
  const map = {
    email: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    telegram: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    whatsapp: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  };
  return map[channel];
}

function statusBadge(status: OutreachMessage["status"]) {
  const map = {
    sent: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    delivered: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    queued: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  };
  return map[status];
}

function formatTime(iso: string) {
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

// ─── Skeleton ──────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border p-5"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-20 mb-3" />
      <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-16 mb-2" />
      <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-24" />
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color = "#16a34a" }: StatCardProps) {
  return (
    <div
      className="rounded-xl border p-5 hover:shadow-sm transition-shadow"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
          {title}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Quick Action Card ─────────────────────────────────────────

interface QuickActionProps {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  accentClass: string;
  iconColor: string;
}

function QuickActionCard({
  label,
  href,
  icon: Icon,
  description,
  accentClass,
  iconColor,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-5 flex items-start gap-4 hover:shadow-sm transition-all duration-150 hover:scale-[1.01] group"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass}`}
      >
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-0.5">
          {label}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400">{description}</p>
      </div>
      <ArrowUpRight
        size={15}
        className="text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400 transition-colors mt-0.5 flex-shrink-0"
      />
    </Link>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────

export default function OutreachDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [contactsRes, messagesRes, campaignsRes] = await Promise.allSettled([
        fetch("/api/whatsapp/contacts"),
        fetch("/api/outreach/messages?limit=10"),
        fetch("/api/outreach/campaign"),
      ]);

      let totalContacts = 0;
      let messagesSent = 0;
      let activeCampaigns = 0;
      let deliveredCount = 0;
      let sentMessages: OutreachMessage[] = [];

      if (contactsRes.status === "fulfilled" && contactsRes.value.ok) {
        const data = await contactsRes.value.json();
        totalContacts = Array.isArray(data)
          ? data.length
          : data.total ?? data.count ?? 0;
      }

      if (messagesRes.status === "fulfilled" && messagesRes.value.ok) {
        const data = await messagesRes.value.json();
        const list: OutreachMessage[] = Array.isArray(data)
          ? data
          : data.messages ?? data.data ?? [];
        sentMessages = list;
        messagesSent = Array.isArray(data)
          ? data.length
          : data.total ?? data.count ?? list.length;
        deliveredCount = list.filter(
          (m) => m.status === "delivered" || m.status === "sent"
        ).length;
      }

      if (campaignsRes.status === "fulfilled" && campaignsRes.value.ok) {
        const data = await campaignsRes.value.json();
        const list = Array.isArray(data)
          ? data
          : data.campaigns ?? data.data ?? [];
        activeCampaigns = list.filter(
          (c: { status?: string }) =>
            c.status === "active" || c.status === "sending"
        ).length;
      }

      const deliveryRate =
        messagesSent > 0 ? Math.round((deliveredCount / messagesSent) * 100) : 0;

      setStats({ totalContacts, messagesSent, activeCampaigns, deliveryRate });
      setMessages(sentMessages.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Overview
          </h2>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            All outreach channels at a glance
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadData}
            className="text-xs font-medium text-red-700 dark:text-red-400 hover:underline whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Contacts"
            value={(stats?.totalContacts ?? 0).toLocaleString()}
            subtitle="across all brands"
            icon={Users}
            color="#3b82f6"
          />
          <StatCard
            title="Messages Sent"
            value={(stats?.messagesSent ?? 0).toLocaleString()}
            subtitle="all channels"
            icon={Send}
            color="#16a34a"
          />
          <StatCard
            title="Active Campaigns"
            value={stats?.activeCampaigns ?? 0}
            subtitle="currently running"
            icon={Megaphone}
            color="#8b5cf6"
          />
          <StatCard
            title="Delivery Rate"
            value={`${stats?.deliveryRate ?? 0}%`}
            subtitle="sent + delivered"
            icon={TrendingUp}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickActionCard
            label="Send Email"
            href="/outreach/send?channel=email"
            icon={Mail}
            description="Compose and send via Brevo"
            accentClass="bg-blue-50 dark:bg-blue-900/20"
            iconColor="#3b82f6"
          />
          <QuickActionCard
            label="Send Telegram"
            href="/outreach/send?channel=telegram"
            icon={Send}
            description="Reach contacts via Telegram bot"
            accentClass="bg-sky-50 dark:bg-sky-900/20"
            iconColor="#0ea5e9"
          />
          <QuickActionCard
            label="Send WhatsApp"
            href="/outreach/send?channel=whatsapp"
            icon={MessageCircle}
            description="Send via Meta Cloud API"
            accentClass="bg-green-50 dark:bg-green-900/20"
            iconColor="#16a34a"
          />
        </div>
      </div>

      {/* Recent Messages */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Recent Messages
          </h3>
          <Link
            href="/outreach/messages"
            className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowUpRight size={11} />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="animate-pulse h-5 w-16 bg-stone-200 dark:bg-stone-700 rounded-full" />
                <div className="flex-1 animate-pulse h-3 bg-stone-200 dark:bg-stone-700 rounded w-32" />
                <div className="animate-pulse h-3 bg-stone-100 dark:bg-stone-800 rounded w-48 hidden sm:block" />
                <div className="animate-pulse h-5 w-16 bg-stone-100 dark:bg-stone-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Send size={28} className="mx-auto text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No messages yet
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              Send your first message to see it here
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${channelBadge(
                    msg.channel
                  )}`}
                >
                  {msg.channel}
                </span>
                <span className="text-sm text-stone-700 dark:text-stone-300 w-36 flex-shrink-0 truncate font-medium">
                  {msg.recipient}
                </span>
                <span className="flex-1 text-xs text-stone-500 dark:text-stone-400 truncate hidden sm:block">
                  {msg.body.slice(0, 80)}
                  {msg.body.length > 80 ? "…" : ""}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge(
                    msg.status
                  )}`}
                >
                  {msg.status}
                </span>
                <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0 hidden md:block">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
