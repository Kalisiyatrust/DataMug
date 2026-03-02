"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Play,
  Pause,
  BarChart2,
  ChevronRight,
  X,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Send,
  Eye,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Megaphone,
} from "lucide-react";
import { BrandBadge } from "@/components/whatsapp/brand-badge";
import { StageBadge } from "@/components/whatsapp/stage-badge";
import type { Brand } from "@/components/whatsapp/brand-badge";
import type { Stage } from "@/components/whatsapp/stage-badge";

// ─── Types ────────────────────────────────────────────────────

type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed";

interface Campaign {
  id: string;
  name: string;
  brand: Brand;
  status: CampaignStatus;
  templateName: string;
  targetCount: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  createdAt: string;
  scheduledFor?: string;
  completedAt?: string;
  targetStages: Stage[];
  targetTags: string[];
}

interface MessageLog {
  id: string;
  contact: string;
  phone: string;
  status: "delivered" | "read" | "replied" | "failed";
  sentAt: string;
}

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "1", name: "Q1 Premium Upsell", brand: "Kalisiya", status: "active",
    templateName: "Premium Upgrade Offer", targetCount: 240, sent: 240, delivered: 228, read: 162, replied: 48,
    createdAt: "Feb 28, 2026", targetStages: ["engaged", "qualified"], targetTags: ["hot-lead"],
  },
  {
    id: "2", name: "Eloi Spring Launch", brand: "Eloi", status: "scheduled",
    templateName: "Spring Product Launch", targetCount: 185, sent: 0, delivered: 0, read: 0, replied: 0,
    createdAt: "Mar 1, 2026", scheduledFor: "Mar 5, 2026 09:00", targetStages: ["new", "contacted"], targetTags: [],
  },
  {
    id: "3", name: "DataMug Onboarding Drip", brand: "DataMug", status: "completed",
    templateName: "Welcome & Setup Guide", targetCount: 312, sent: 312, delivered: 305, read: 289, replied: 94,
    createdAt: "Feb 20, 2026", completedAt: "Feb 22, 2026", targetStages: ["new"], targetTags: ["new-user"],
  },
  {
    id: "4", name: "Enterprise Re-engagement", brand: "Kalisiya", status: "paused",
    templateName: "Re-engagement Message", targetCount: 67, sent: 34, delivered: 32, read: 18, replied: 6,
    createdAt: "Feb 25, 2026", targetStages: ["contacted", "engaged"], targetTags: ["enterprise"],
  },
  {
    id: "5", name: "Dubai VIP Follow-up", brand: "Eloi", status: "completed",
    templateName: "VIP Follow-up", targetCount: 28, sent: 28, delivered: 28, read: 26, replied: 19,
    createdAt: "Feb 15, 2026", completedAt: "Feb 15, 2026", targetStages: ["qualified", "converted"], targetTags: ["vip", "high-value"],
  },
  {
    id: "6", name: "DataMug Trial Conversion", brand: "DataMug", status: "draft",
    templateName: "Trial Expiry Reminder", targetCount: 89, sent: 0, delivered: 0, read: 0, replied: 0,
    createdAt: "Mar 2, 2026", targetStages: ["engaged"], targetTags: ["trial"],
  },
];

const MOCK_MESSAGE_LOG: MessageLog[] = [
  { id: "1", contact: "Sarah Chen", phone: "+44 7700 900123", status: "replied", sentAt: "10:32 AM" },
  { id: "2", contact: "Li Wei", phone: "+86 138 0013 8000", status: "read", sentAt: "10:33 AM" },
  { id: "3", contact: "Emma Wilson", phone: "+44 7911 123456", status: "delivered", sentAt: "10:33 AM" },
  { id: "4", contact: "Marco Rossi", phone: "+39 02 1234 5678", status: "read", sentAt: "10:34 AM" },
  { id: "5", contact: "Tom Bradley", phone: "+1 555 234 5678", status: "replied", sentAt: "10:35 AM" },
  { id: "6", contact: "Carlos Mendez", phone: "+52 55 1234 5678", status: "failed", sentAt: "10:35 AM" },
  { id: "7", contact: "Sofia Andersen", phone: "+45 32 12 34 56", status: "delivered", sentAt: "10:36 AM" },
];

const MOCK_TEMPLATES = ["Premium Upgrade Offer", "Spring Product Launch", "Welcome & Setup Guide", "Re-engagement Message", "VIP Follow-up", "Trial Expiry Reminder", "Follow-up Check-in"];

const BRANDS: Brand[] = ["Kalisiya", "Eloi", "DataMug"];
const ALL_BRANDS: Brand[] = ["All Brands", "Kalisiya", "Eloi", "DataMug"];
const STAGES: Stage[] = ["new", "contacted", "engaged", "qualified", "converted", "lost"];

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, { bg: string; text: string; dot: string }> = {
    draft: { bg: "bg-stone-100 dark:bg-stone-800", text: "text-stone-600 dark:text-stone-400", dot: "bg-stone-400" },
    scheduled: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
    active: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
    paused: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-500" },
    completed: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Message Log Status ───────────────────────────────────────

function LogStatusBadge({ status }: { status: MessageLog["status"] }) {
  const styles: Record<MessageLog["status"], { bg: string; text: string }> = {
    delivered: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" },
    read: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400" },
    replied: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400" },
    failed: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400" },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide font-medium">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">{value}</p>
      {sub && <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-stone-500 dark:text-stone-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── New Campaign Form ────────────────────────────────────────

function NewCampaignForm({ onClose, onSave }: { onClose: () => void; onSave: (c: Campaign) => void }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState<Brand>("Kalisiya");
  const [template, setTemplate] = useState(MOCK_TEMPLATES[0]);
  const [selectedStages, setSelectedStages] = useState<Stage[]>([]);
  const [tags, setTags] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const toggleStage = (stage: Stage) => {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  const estimate = selectedStages.length > 0 ? selectedStages.length * 42 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({
      id: String(Date.now()),
      name,
      brand,
      status: sendNow ? "active" : "scheduled",
      templateName: template,
      targetCount: estimate,
      sent: sendNow ? estimate : 0,
      delivered: sendNow ? Math.round(estimate * 0.95) : 0,
      read: 0,
      replied: 0,
      createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      scheduledFor: sendNow ? undefined : `${scheduleDate} ${scheduleTime}`,
      targetStages: selectedStages,
      targetTags: tagList,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-50 w-full max-w-lg flex flex-col border-l shadow-2xl overflow-hidden animate-slideRight"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">New Campaign</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <X size={16} className="text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q2 Re-engagement"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Brand + Template */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Brand</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {BRANDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {MOCK_TEMPLATES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Template Preview */}
          <div className="rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setPreviewExpanded((p) => !p)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 dark:bg-stone-800 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText size={14} className="text-stone-400" />
                Template Preview
              </span>
              <ChevronRight size={14} className={`transition-transform ${previewExpanded ? "rotate-90" : ""}`} />
            </button>
            {previewExpanded && (
              <div className="p-3 bg-white dark:bg-stone-900">
                <div className="max-w-[240px] mx-auto">
                  <div className="bg-[#dcf8c6] dark:bg-green-800 rounded-lg rounded-br-sm px-3 py-2 shadow-sm">
                    <p className="text-xs text-stone-800 dark:text-stone-100 leading-relaxed">
                      Hi <strong>Sarah</strong>, we have an exclusive offer just for you at {brand}. We'd love to share how we can help <strong>TechFlow Ltd</strong> grow. Reply <em>YES</em> to learn more!
                    </p>
                    <p className="text-right text-xs text-stone-400 mt-1">09:00 ✓✓</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Target Stages</label>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => toggleStage(stage)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    selectedStages.includes(stage)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Target Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="enterprise, hot-lead, trial"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Audience estimate */}
          {estimate > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Users size={15} className="text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Estimated audience: <strong>~{estimate} contacts</strong>
              </p>
            </div>
          )}

          {/* Scheduling */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Send Time</label>
            <div className="flex gap-3 mb-3">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setSendNow(v)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    sendNow === v
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  {v ? <Send size={14} /> : <Calendar size={14} />}
                  {v ? "Send Immediately" : "Schedule"}
                </button>
              ))}
            </div>
            {!sendNow && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || selectedStages.length === 0}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendNow ? "Launch Campaign" : "Schedule Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Campaign Detail View ─────────────────────────────────────

function CampaignDetail({ campaign, onBack, onToggle }: { campaign: Campaign; onBack: () => void; onToggle: (id: string) => void }) {
  const deliveryRate = campaign.sent > 0 ? Math.round((campaign.delivered / campaign.sent) * 100) : 0;
  const readRate = campaign.delivered > 0 ? Math.round((campaign.read / campaign.delivered) * 100) : 0;
  const replyRate = campaign.read > 0 ? Math.round((campaign.replied / campaign.read) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
        >
          <ArrowLeft size={16} />
          All Campaigns
        </button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-sm text-stone-500 dark:text-stone-400">
            <BrandBadge brand={campaign.brand} size="sm" />
            <span>·</span>
            <span>Template: {campaign.templateName}</span>
            <span>·</span>
            <span>Created {campaign.createdAt}</span>
          </div>
        </div>
        {(campaign.status === "active" || campaign.status === "paused") && (
          <button
            onClick={() => onToggle(campaign.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              campaign.status === "active"
                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
            }`}
          >
            {campaign.status === "active" ? <><Pause size={15} /> Pause Campaign</> : <><Play size={15} /> Resume Campaign</>}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Sent" value={campaign.sent.toLocaleString()} sub={`of ${campaign.targetCount} targeted`} icon={Send} color="#3b82f6" />
        <StatCard label="Delivered" value={campaign.delivered.toLocaleString()} sub={`${deliveryRate}% delivery rate`} icon={CheckCircle} color="#10b981" />
        <StatCard label="Read" value={campaign.read.toLocaleString()} sub={`${readRate}% read rate`} icon={Eye} color="#8b5cf6" />
        <StatCard label="Replied" value={campaign.replied.toLocaleString()} sub={`${replyRate}% reply rate`} icon={MessageSquare} color="#f59e0b" />
      </div>

      {/* Funnel visualization */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Delivery Funnel</h3>
        <div className="space-y-3">
          {[
            { label: "Sent", value: campaign.sent, max: campaign.targetCount, color: "#3b82f6" },
            { label: "Delivered", value: campaign.delivered, max: campaign.targetCount, color: "#10b981" },
            { label: "Read", value: campaign.read, max: campaign.targetCount, color: "#8b5cf6" },
            { label: "Replied", value: campaign.replied, max: campaign.targetCount, color: "#f59e0b" },
          ].map(({ label, value, max, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-stone-500 dark:text-stone-400 w-16">{label}</span>
              <div className="flex-1">
                <ProgressBar value={value} max={max} color={color} />
              </div>
              <span className="text-xs tabular-nums font-medium text-stone-700 dark:text-stone-300 w-10 text-right">
                {value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Targeting info + Message log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Targeting */}
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Targeting</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mb-1.5">Stages</p>
              <div className="flex flex-wrap gap-1">
                {campaign.targetStages.map((s) => <StageBadge key={s} stage={s} size="sm" />)}
              </div>
            </div>
            {campaign.targetTags.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {campaign.targetTags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Schedule</p>
              <p className="text-sm text-stone-700 dark:text-stone-300">
                {campaign.scheduledFor ? (
                  <span className="flex items-center gap-1.5"><Calendar size={13} className="text-blue-500" />{campaign.scheduledFor}</span>
                ) : campaign.completedAt ? (
                  <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-500" />Completed {campaign.completedAt}</span>
                ) : (
                  <span className="flex items-center gap-1.5"><RefreshCw size={13} className="text-green-500 animate-spin" />Running now</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div className="lg:col-span-2 rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Message Log</h3>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Recent message delivery status</p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {MOCK_MESSAGE_LOG.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-500 dark:text-stone-400 flex-shrink-0">
                  {log.contact[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{log.contact}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{log.phone}</p>
                </div>
                <LogStatusBadge status={log.status} />
                <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">{log.sentAt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Campaigns Page ───────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<Brand | "All Brands">("All Brands");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new") setShowNewForm(true);
    setTimeout(() => setLoading(false), 600);
  }, []);

  const filtered = campaigns.filter((c) => {
    const matchesBrand = brandFilter === "All Brands" || c.brand === brandFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.templateName.toLowerCase().includes(search.toLowerCase());
    return matchesBrand && matchesStatus && matchesSearch;
  });

  const toggleCampaign = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "active" ? "paused" : "active" }
          : c
      )
    );
    if (detailCampaign?.id === id) {
      setDetailCampaign((prev) =>
        prev ? { ...prev, status: prev.status === "active" ? "paused" : "active" } : prev
      );
    }
  };

  if (detailCampaign) {
    return (
      <div className="h-full overflow-auto">
        <CampaignDetail
          campaign={detailCampaign}
          onBack={() => setDetailCampaign(null)}
          onToggle={toggleCampaign}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
          />
        </div>
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value as Brand | "All Brands")}
          className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {ALL_BRANDS.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">All Status</option>
          {(["draft", "scheduled", "active", "paused", "completed"] as CampaignStatus[]).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={() => setShowNewForm(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          New Campaign
        </button>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border p-5 h-24" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Megaphone size={32} className="text-stone-300 dark:text-stone-600 mb-3" />
          <h3 className="text-base font-semibold text-stone-600 dark:text-stone-400 mb-1">No campaigns found</h3>
          <p className="text-sm text-stone-400 dark:text-stone-500 mb-4">Create your first campaign to reach your contacts</p>
          <button onClick={() => setShowNewForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={14} /> New Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const deliveryRate = campaign.sent > 0 ? Math.round((campaign.delivered / campaign.sent) * 100) : 0;
            const readRate = campaign.delivered > 0 ? Math.round((campaign.read / campaign.delivered) * 100) : 0;
            return (
              <div
                key={campaign.id}
                className="rounded-xl border p-5 hover:shadow-sm transition-all cursor-pointer group"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                onClick={() => setDetailCampaign(campaign)}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{campaign.name}</h3>
                      <StatusBadge status={campaign.status} />
                      <BrandBadge brand={campaign.brand} size="sm" />
                    </div>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      Template: {campaign.templateName} · {campaign.targetCount.toLocaleString()} contacts
                      {campaign.scheduledFor ? ` · Scheduled ${campaign.scheduledFor}` : ""}
                      {campaign.completedAt ? ` · Completed ${campaign.completedAt}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(campaign.status === "active" || campaign.status === "paused") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCampaign(campaign.id); }}
                        className={`p-2 rounded-lg transition-colors ${
                          campaign.status === "active"
                            ? "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                            : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        }`}
                        title={campaign.status === "active" ? "Pause" : "Resume"}
                      >
                        {campaign.status === "active" ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailCampaign(campaign); }}
                      className="p-2 rounded-lg text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="View Details"
                    >
                      <BarChart2 size={16} />
                    </button>
                    <ChevronRight size={16} className="text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400 transition-colors" />
                  </div>
                </div>

                {/* Stats row */}
                {campaign.sent > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                    {[
                      { label: "Sent", value: campaign.sent, icon: Send, color: "#3b82f6" },
                      { label: "Delivered", value: campaign.delivered, icon: CheckCircle, color: "#10b981" },
                      { label: "Read", value: campaign.read, icon: Eye, color: "#8b5cf6" },
                      { label: "Replied", value: campaign.replied, icon: MessageSquare, color: "#f59e0b" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon size={12} style={{ color }} />
                          <span className="text-xs text-stone-400 dark:text-stone-500">{label}</span>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-200">{value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}

                {campaign.sent > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Delivery</p>
                      <ProgressBar value={campaign.delivered} max={campaign.sent} color="#10b981" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Read Rate</p>
                      <ProgressBar value={campaign.read} max={campaign.delivered || 1} color="#8b5cf6" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNewForm && (
        <NewCampaignForm
          onClose={() => setShowNewForm(false)}
          onSave={(c) => {
            setCampaigns((prev) => [c, ...prev]);
            setShowNewForm(false);
          }}
        />
      )}
    </div>
  );
}
