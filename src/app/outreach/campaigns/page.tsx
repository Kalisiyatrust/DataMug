"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Users,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

type Channel = "email" | "telegram" | "whatsapp";
type Brand = "kalisiya" | "eloi" | "datamug";
type Stage = "new" | "contacted" | "engaged" | "qualified" | "converted";
type CampaignStatus = "draft" | "active" | "sending" | "completed" | "failed" | "paused";

interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  brand?: Brand;
  status: CampaignStatus;
  sentCount?: number;
  totalCount?: number;
  subject?: string;
  body?: string;
  createdAt: string;
  tags?: string[];
  stages?: Stage[];
}

const STAGES: Stage[] = ["new", "contacted", "engaged", "qualified", "converted"];
const BRANDS: Brand[] = ["kalisiya", "eloi", "datamug"];
const CHANNELS: Channel[] = ["email", "telegram", "whatsapp"];

// ─── Helpers ───────────────────────────────────────────────────

function channelBadgeClass(channel: Channel) {
  return {
    email: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    telegram: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    whatsapp: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  }[channel];
}

function statusBadgeClass(status: CampaignStatus) {
  return {
    draft: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400",
    active: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    sending: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    completed: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    paused: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  }[status];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Campaign Card ──────────────────────────────────────────────

function CampaignCard({
  campaign,
  expanded,
  onToggle,
}: {
  campaign: Campaign;
  expanded: boolean;
  onToggle: () => void;
}) {
  const progress =
    campaign.totalCount && campaign.totalCount > 0
      ? Math.round(((campaign.sentCount ?? 0) / campaign.totalCount) * 100)
      : 0;

  return (
    <div
      className="rounded-xl border overflow-hidden hover:shadow-sm transition-shadow"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${channelBadgeClass(
                campaign.channel
              )}`}
            >
              {campaign.channel}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                campaign.status
              )}`}
            >
              {campaign.status}
            </span>
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
            {campaign.name}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            {campaign.totalCount != null && (
              <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Users size={11} />
                {campaign.sentCount ?? 0}/{campaign.totalCount}
              </span>
            )}
            <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(campaign.createdAt)}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-stone-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-stone-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 border-t space-y-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          {/* Progress bar */}
          {campaign.totalCount != null && campaign.totalCount > 0 && (
            <div className="pt-3">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1.5">
                <span>Sent progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Brand */}
          {campaign.brand && (
            <div>
              <p className="text-xs text-stone-400 dark:text-stone-500">Brand</p>
              <p className="text-sm text-stone-700 dark:text-stone-300 capitalize mt-0.5">
                {campaign.brand}
              </p>
            </div>
          )}

          {/* Subject */}
          {campaign.subject && (
            <div>
              <p className="text-xs text-stone-400 dark:text-stone-500">Subject</p>
              <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">
                {campaign.subject}
              </p>
            </div>
          )}

          {/* Body preview */}
          {campaign.body && (
            <div>
              <p className="text-xs text-stone-400 dark:text-stone-500">Body preview</p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 line-clamp-3 font-mono bg-stone-50 dark:bg-stone-900 rounded-lg p-2.5">
                {campaign.body.slice(0, 200)}
                {campaign.body.length > 200 ? "…" : ""}
              </p>
            </div>
          )}

          {/* Tags */}
          {campaign.tags && campaign.tags.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 dark:text-stone-500">Tags</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {campaign.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Target stages */}
          {campaign.stages && campaign.stages.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 dark:text-stone-500">Target stages</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {campaign.stages.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-full text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 capitalize"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Campaign Form ──────────────────────────────────────────

interface NewCampaignFormProps {
  onCreated: (campaign: Campaign) => void;
}

function NewCampaignForm({ onCreated }: NewCampaignFormProps) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [brand, setBrand] = useState<Brand>("kalisiya");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [selectedStages, setSelectedStages] = useState<Stage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleStage = (stage: Stage) => {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  const handleSubmit = async (mode: "draft" | "send") => {
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (!body.trim()) {
      setError("Message body is required.");
      return;
    }
    if (channel === "email" && !subject.trim()) {
      setError("Subject is required for email campaigns.");
      return;
    }
    setError("");
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      channel,
      brand,
      subject: subject.trim() || undefined,
      body: body.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      stages: selectedStages,
      status: mode === "draft" ? "draft" : "active",
    };

    try {
      const res = await fetch("/api/outreach/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? err.message ?? "Failed to create campaign");
      }

      const data = await res.json();
      const created: Campaign = data.campaign ?? data;
      onCreated(created);

      // Reset form
      setName("");
      setSubject("");
      setBody("");
      setTags("");
      setSelectedStages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Plus size={16} className="text-green-600" />
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          New Campaign
        </h3>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. April Newsletter"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Channel */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Channel
          </label>
          <div className="flex gap-2 flex-wrap">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                  channel === ch
                    ? ch === "email"
                      ? "bg-blue-600 text-white border-blue-600"
                      : ch === "telegram"
                      ? "bg-sky-500 text-white border-sky-500"
                      : "bg-green-600 text-white border-green-600"
                    : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                }`}
              >
                {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Brand
          </label>
          <div className="relative">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value as Brand)}
              className="w-full appearance-none px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-8"
            >
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Subject — email only */}
        {channel === "email" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Body */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Campaign message body…"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Target Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="vip, newsletter, trial (comma-separated)"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Target Stages */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Target Stages
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STAGES.map((stage) => (
              <label
                key={stage}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                style={{
                  borderColor: selectedStages.includes(stage)
                    ? "#16a34a"
                    : "var(--color-border)",
                  background: selectedStages.includes(stage)
                    ? "color-mix(in srgb, #16a34a 10%, transparent)"
                    : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedStages.includes(stage)}
                  onChange={() => toggleStage(stage)}
                  className="w-4 h-4 rounded accent-green-600"
                />
                <span className="text-sm text-stone-700 dark:text-stone-300 capitalize">
                  {stage}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Create Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("send")}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Create &amp; Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/outreach/campaign");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Campaign[] = Array.isArray(data)
        ? data
        : data.campaigns ?? data.data ?? [];
      setCampaigns(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreated = (campaign: Campaign) => {
    setCampaigns((prev) => [campaign, ...prev]);
    setExpandedId(campaign.id);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Campaigns
          </h2>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            Manage multi-channel broadcast campaigns
          </p>
        </div>
        <button
          onClick={loadCampaigns}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Campaign list */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            {loading ? "Loading…" : `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          </h3>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                <button onClick={loadCampaigns} className="text-xs underline mt-1">
                  Retry
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border p-4 space-y-2.5"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                >
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-stone-200 dark:bg-stone-700 rounded-full" />
                    <div className="h-5 w-14 bg-stone-100 dark:bg-stone-800 rounded-full" />
                  </div>
                  <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-48" />
                  <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-32" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 && !error ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <Megaphone size={28} className="mx-auto text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No campaigns yet
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                Create your first campaign using the form
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  expanded={expandedId === campaign.id}
                  onToggle={() =>
                    setExpandedId((id) => (id === campaign.id ? null : campaign.id))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: New Campaign Form */}
        <div className="lg:col-span-2">
          <NewCampaignForm onCreated={handleCreated} />
        </div>
      </div>
    </div>
  );
}
