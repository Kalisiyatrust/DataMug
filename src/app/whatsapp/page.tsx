"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  Plus,
  Upload,
  Megaphone,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { BrandBadge } from "@/components/whatsapp/brand-badge";
import { StageBadge } from "@/components/whatsapp/stage-badge";
import type { Brand } from "@/components/whatsapp/brand-badge";
import type { Stage } from "@/components/whatsapp/stage-badge";

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_KPI = {
  totalContacts: 1248,
  activeConversations: 43,
  messagesSent: 8542,
  replyRate: 62,
};

const MOCK_VOLUME = [
  { day: "Mon", sent: 320, received: 198 },
  { day: "Tue", sent: 410, received: 260 },
  { day: "Wed", sent: 380, received: 240 },
  { day: "Thu", sent: 540, received: 310 },
  { day: "Fri", sent: 490, received: 295 },
  { day: "Sat", sent: 210, received: 130 },
  { day: "Sun", sent: 170, received: 98 },
];

const MOCK_FUNNEL: { stage: Stage; count: number; pct: number }[] = [
  { stage: "new", count: 420, pct: 100 },
  { stage: "contacted", count: 318, pct: 76 },
  { stage: "engaged", count: 220, pct: 52 },
  { stage: "qualified", count: 140, pct: 33 },
  { stage: "converted", count: 87, pct: 21 },
];

const MOCK_BRANDS: { name: Brand; contacts: number; messages: number; rate: number }[] = [
  { name: "Kalisiya", contacts: 512, messages: 3820, rate: 68 },
  { name: "Eloi", contacts: 389, messages: 2900, rate: 59 },
  { name: "DataMug", contacts: 347, messages: 1822, rate: 61 },
];

interface Activity {
  id: string;
  contact: string;
  brand: Brand;
  message: string;
  time: string;
  direction: "inbound" | "outbound";
}

const MOCK_ACTIVITY: Activity[] = [
  { id: "1", contact: "Sarah Chen", brand: "Kalisiya", message: "Yes, I'm interested in the premium plan", time: "2m ago", direction: "inbound" },
  { id: "2", contact: "James Okafor", brand: "Eloi", message: "Thanks for reaching out! Can we schedule a call?", time: "5m ago", direction: "inbound" },
  { id: "3", contact: "Priya Sharma", brand: "DataMug", message: "Hi Priya, following up on your inquiry...", time: "12m ago", direction: "outbound" },
  { id: "4", contact: "Marco Rossi", brand: "Kalisiya", message: "What are the pricing options?", time: "18m ago", direction: "inbound" },
  { id: "5", contact: "Aisha Patel", brand: "Eloi", message: "Your proposal looks great, moving forward!", time: "25m ago", direction: "inbound" },
  { id: "6", contact: "Tom Bradley", brand: "DataMug", message: "Welcome to DataMug! Here's how to get started...", time: "34m ago", direction: "outbound" },
  { id: "7", contact: "Li Wei", brand: "Kalisiya", message: "I've reviewed the documents you sent", time: "45m ago", direction: "inbound" },
  { id: "8", contact: "Fatima Al-Amin", brand: "Eloi", message: "Campaign launched successfully to 240 contacts", time: "1h ago", direction: "outbound" },
  { id: "9", contact: "Carlos Mendez", brand: "DataMug", message: "Can you send me more information?", time: "1h ago", direction: "inbound" },
  { id: "10", contact: "Emma Wilson", brand: "Kalisiya", message: "Your free trial starts today — let's connect!", time: "2h ago", direction: "outbound" },
];

const ALL_BRANDS: Brand[] = ["All Brands", "Kalisiya", "Eloi", "DataMug"];

// ─── Skeleton ─────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="animate-pulse rounded-xl border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-20 mb-3" />
      <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-16 mb-2" />
      <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-24" />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  color?: string;
}

function KPICard({ title, value, subtitle, icon: Icon, trend, color = "var(--color-accent)" }: KPICardProps) {
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
      <div className="flex items-center gap-1.5 mt-1">
        {trend !== undefined && (
          <span className={`inline-flex items-center text-xs font-medium ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
            <TrendingUp size={11} className={trend < 0 ? "rotate-180" : ""} />
            {Math.abs(trend)}%
          </span>
        )}
        {subtitle && (
          <p className="text-xs text-stone-400 dark:text-stone-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────

function VolumeChart({ data }: { data: typeof MOCK_VOLUME }) {
  const max = Math.max(...data.flatMap((d) => [d.sent, d.received]));
  return (
    <div className="flex items-end gap-2 h-32 pt-4">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col gap-0.5 items-center">
            <div
              className="w-full rounded-t-sm bg-blue-500 dark:bg-blue-400 opacity-90 transition-all"
              style={{ height: `${(d.sent / max) * 80}px` }}
              title={`Sent: ${d.sent}`}
            />
            <div
              className="w-full rounded-t-sm bg-stone-300 dark:bg-stone-600 transition-all"
              style={{ height: `${(d.received / max) * 80}px` }}
              title={`Received: ${d.received}`}
            />
          </div>
          <span className="text-xs text-stone-400 dark:text-stone-500">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Funnel ───────────────────────────────────────────────────

function FunnelChart({ data }: { data: typeof MOCK_FUNNEL }) {
  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.stage} className="flex items-center gap-3">
          <div className="w-20 flex-shrink-0">
            <StageBadge stage={item.stage} size="sm" />
          </div>
          <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-700"
              style={{ width: `${item.pct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-stone-600 dark:text-stone-400 w-12 text-right">
            {item.count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────

export default function WhatsAppDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState<Brand>("All Brands");
  const [error, setError] = useState("");

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [activeBrand]);

  const handleBrandChange = (brand: Brand) => {
    setLoading(true);
    setActiveBrand(brand);
  };

  const filteredActivity =
    activeBrand === "All Brands"
      ? MOCK_ACTIVITY
      : MOCK_ACTIVITY.filter((a) => a.brand === activeBrand);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Brand Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {ALL_BRANDS.map((brand) => (
            <button
              key={brand}
              onClick={() => handleBrandChange(brand)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                activeBrand === brand
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/whatsapp/contacts?action=new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <Plus size={13} />
            New Contact
          </Link>
          <Link
            href="/whatsapp/campaigns?action=new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Megaphone size={13} />
            New Campaign
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <KPISkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button
            onClick={() => { setError(""); setLoading(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Contacts"
            value={MOCK_KPI.totalContacts.toLocaleString()}
            subtitle="across all brands"
            icon={Users}
            trend={12}
            color="#3b82f6"
          />
          <KPICard
            title="Active Conversations"
            value={MOCK_KPI.activeConversations}
            subtitle="open threads"
            icon={MessageSquare}
            trend={5}
            color="#10b981"
          />
          <KPICard
            title="Messages Sent"
            value={MOCK_KPI.messagesSent.toLocaleString()}
            subtitle="last 30 days"
            icon={Send}
            trend={8}
            color="#8b5cf6"
          />
          <KPICard
            title="Reply Rate"
            value={`${MOCK_KPI.replyRate}%`}
            subtitle="avg across brands"
            icon={TrendingUp}
            trend={3}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message Volume */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Message Volume
              </h3>
              <p className="text-xs text-stone-400 dark:text-stone-500">Last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm bg-blue-500 dark:bg-blue-400" />
                Sent
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm bg-stone-300 dark:bg-stone-600" />
                Received
              </div>
            </div>
          </div>
          {loading ? (
            <div className="animate-pulse h-32 bg-stone-100 dark:bg-stone-800 rounded-lg" />
          ) : (
            <VolumeChart data={MOCK_VOLUME} />
          )}
        </div>

        {/* Lead Funnel */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Lead Stage Funnel
              </h3>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                {activeBrand === "All Brands" ? "All brands" : activeBrand}
              </p>
            </div>
            <Link
              href="/whatsapp/contacts"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse h-5 bg-stone-100 dark:bg-stone-800 rounded" />
              ))}
            </div>
          ) : (
            <FunnelChart data={MOCK_FUNNEL} />
          )}
        </div>
      </div>

      {/* Brand Breakdown + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Brand Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Brand Breakdown
          </h3>
          {MOCK_BRANDS.map((brand) => (
            <div
              key={brand.name}
              className="rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              onClick={() => handleBrandChange(brand.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <BrandBadge brand={brand.name} size="md" />
                <span className="text-xs text-stone-400 dark:text-stone-500">
                  {brand.rate}% reply
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Contacts</p>
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {brand.contacts.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Messages</p>
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {brand.messages.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Actions */}
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <h4 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
              Quick Actions
            </h4>
            <div className="space-y-1.5">
              <Link
                href="/whatsapp/contacts?action=new"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <Plus size={15} className="text-blue-500" />
                New Contact
              </Link>
              <Link
                href="/whatsapp/campaigns?action=new"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <Megaphone size={15} className="text-purple-500" />
                New Campaign
              </Link>
              <Link
                href="/whatsapp/contacts?action=import"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <Upload size={15} className="text-green-500" />
                Import Contacts
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="lg:col-span-2 rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Recent Activity
            </h3>
            <Link
              href="/whatsapp/conversations"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-5 py-3.5 flex gap-3">
                  <div className="animate-pulse w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="animate-pulse h-3 bg-stone-200 dark:bg-stone-700 rounded w-32" />
                    <div className="animate-pulse h-3 bg-stone-100 dark:bg-stone-800 rounded w-48" />
                  </div>
                </div>
              ))
            ) : filteredActivity.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-stone-400 dark:text-stone-500">
                No recent activity for {activeBrand}
              </div>
            ) : (
              filteredActivity.map((activity) => (
                <Link
                  key={activity.id}
                  href="/whatsapp/conversations"
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0 flex items-center justify-center text-xs font-medium text-stone-600 dark:text-stone-400">
                    {activity.contact[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                        {activity.contact}
                      </p>
                      <BrandBadge brand={activity.brand} size="sm" />
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activity.direction === "inbound"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                      }`}>
                        {activity.direction === "inbound" ? "↙ in" : "↗ out"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                      {activity.message}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0 mt-0.5">
                    {activity.time}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
