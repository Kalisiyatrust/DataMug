"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  X,
  FileText,
  Megaphone,
} from "lucide-react";
import { BrandBadge } from "@/components/whatsapp/brand-badge";
import { TemplateEditor } from "@/components/whatsapp/template-editor";
import type { Brand } from "@/components/whatsapp/brand-badge";

// ─── Types ────────────────────────────────────────────────────

type TemplateCategory = "Marketing" | "Utility" | "Authentication" | "Follow-up" | "Welcome" | "Reminder";

interface Template {
  id: string;
  name: string;
  brand: Brand;
  category: TemplateCategory;
  body: string;
  createdAt: string;
  usedInCampaigns: number;
}

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_TEMPLATES: Template[] = [
  {
    id: "1", name: "Premium Upgrade Offer", brand: "Kalisiya", category: "Marketing",
    body: "Hi {{name}},\n\nWe noticed you've been a valued member of Kalisiya for a while now. We'd love to offer you an exclusive upgrade to our premium plan.\n\nThis month only: 30% off for existing members. Reply *YES* to claim your offer or *INFO* for more details.\n\nBest,\nThe Kalisiya Team",
    createdAt: "Feb 10, 2026", usedInCampaigns: 3,
  },
  {
    id: "2", name: "Welcome & Setup Guide", brand: "Kalisiya", category: "Welcome",
    body: "Welcome to Kalisiya, {{name}}! 🎉\n\nWe're thrilled to have {{company}} on board. Here's how to get started:\n\n1️⃣ Complete your profile\n2️⃣ Connect your first data source\n3️⃣ Run your first analysis\n\nNeed help? Reply to this message anytime.\n\nYour onboarding specialist, {{agent_name}}",
    createdAt: "Jan 15, 2026", usedInCampaigns: 5,
  },
  {
    id: "3", name: "Re-engagement Message", brand: "Kalisiya", category: "Follow-up",
    body: "Hi {{name}},\n\nWe haven't heard from you in a while and wanted to check in. Is there anything we can help {{company}} with?\n\nWe've added some exciting new features since you last logged in — reply *UPDATES* to hear about them.\n\nTalk soon,\n{{agent_name}}",
    createdAt: "Feb 20, 2026", usedInCampaigns: 1,
  },
  {
    id: "4", name: "Spring Product Launch", brand: "Eloi", category: "Marketing",
    body: "Hi {{name}},\n\nBig news from Eloi — our spring product line is here! ✨\n\nAs a valued contact, you get exclusive early access before the public launch on March 10th.\n\nReply *ACCESS* to get your exclusive link, or *LATER* if you'd prefer to wait.\n\nThe Eloi Team",
    createdAt: "Feb 28, 2026", usedInCampaigns: 1,
  },
  {
    id: "5", name: "VIP Follow-up", brand: "Eloi", category: "Follow-up",
    body: "Hi {{name}},\n\nThank you for your continued partnership with Eloi. As one of our most valued clients, I wanted to personally reach out to ensure everything is running smoothly for {{company}}.\n\nWould you be available for a 15-minute call this week? I have some exciting updates to share.\n\nBest regards,\n{{agent_name}}",
    createdAt: "Jan 20, 2026", usedInCampaigns: 2,
  },
  {
    id: "6", name: "Appointment Reminder", brand: "Eloi", category: "Reminder",
    body: "Hi {{name}},\n\nThis is a reminder that you have an appointment with the Eloi team on {{date}}.\n\nPlease confirm your attendance by replying *CONFIRM*, or *RESCHEDULE* if you need to change the time.\n\nSee you soon!",
    createdAt: "Feb 5, 2026", usedInCampaigns: 4,
  },
  {
    id: "7", name: "Trial Expiry Reminder", brand: "DataMug", category: "Reminder",
    body: "Hi {{name}},\n\nYour DataMug free trial ends in 3 days. Don't lose access to your data!\n\nUpgrade now to keep all your analyses and unlock:\n• Unlimited uploads\n• Advanced AI models\n• Team collaboration\n\nReply *UPGRADE* to continue, or *EXTEND* to request a 7-day extension.\n\nThe DataMug Team",
    createdAt: "Feb 18, 2026", usedInCampaigns: 2,
  },
  {
    id: "8", name: "Feature Announcement", brand: "DataMug", category: "Marketing",
    body: "Hi {{name}},\n\nExciting news — DataMug just launched a major update!\n\n🆕 New features:\n• Multi-model comparison\n• Batch image processing\n• Export to PDF/Excel\n\nLog in now to try them out, or reply *DEMO* and we'll walk you through it personally.\n\n{{agent_name}} @ DataMug",
    createdAt: "Mar 1, 2026", usedInCampaigns: 0,
  },
];

const ALL_BRANDS: (Brand | "All Brands")[] = ["All Brands", "Kalisiya", "Eloi", "DataMug"];
const CATEGORIES: TemplateCategory[] = ["Marketing", "Utility", "Authentication", "Follow-up", "Welcome", "Reminder"];

const CATEGORY_STYLES: Record<TemplateCategory, { bg: string; text: string }> = {
  Marketing: { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-400" },
  Utility: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  Authentication: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
  "Follow-up": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
  Welcome: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
  Reminder: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
};

function CategoryBadge({ category }: { category: TemplateCategory }) {
  const s = CATEGORY_STYLES[category];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {category}
    </span>
  );
}

// ─── Template Card ────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = template.body.slice(0, 120) + (template.body.length > 120 ? "..." : "");

  return (
    <div
      className="rounded-xl border overflow-hidden hover:shadow-sm transition-shadow flex flex-col"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{template.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <BrandBadge brand={template.brand} size="sm" />
              <CategoryBadge category={template.category} />
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onDuplicate}
              title="Duplicate"
              className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={onEdit}
              title="Edit"
              className="p-1.5 rounded-md text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={onDelete}
              title="Delete"
              className="p-1.5 rounded-md text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Body preview */}
        <div
          className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed cursor-pointer"
          onClick={() => setExpanded((e) => !e)}
        >
          <p className="whitespace-pre-wrap">{expanded ? template.body : preview}</p>
          {template.body.length > 120 && (
            <button className="text-blue-600 dark:text-blue-400 hover:underline mt-1 text-xs">
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div
        className="px-4 py-2.5 border-t mt-auto flex items-center justify-between"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
      >
        <span className="text-xs text-stone-400 dark:text-stone-500">
          Created {template.createdAt}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
          <Megaphone size={11} />
          {template.usedInCampaigns} campaign{template.usedInCampaigns !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ─── Templates Page ───────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<Brand | "All Brands">("All Brands");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  const filtered = templates.filter((t) => {
    const matchesBrand = brandFilter === "All Brands" || t.brand === brandFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase());
    return matchesBrand && matchesCategory && matchesSearch;
  });

  // Group by brand
  const grouped: Partial<Record<Brand, Template[]>> = {};
  filtered.forEach((t) => {
    if (!grouped[t.brand]) grouped[t.brand] = [];
    grouped[t.brand]!.push(t);
  });

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDuplicate = (template: Template) => {
    const dup: Template = {
      ...template,
      id: String(Date.now()),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      usedInCampaigns: 0,
    };
    setTemplates((prev) => [dup, ...prev]);
  };

  const handleSave = (data: { name: string; body: string; category: string; brand: string }) => {
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, name: data.name, body: data.body, category: data.category as TemplateCategory, brand: data.brand as Brand }
            : t
        )
      );
      setEditingTemplate(null);
    } else {
      const newTemplate: Template = {
        id: String(Date.now()),
        name: data.name,
        brand: data.brand as Brand,
        category: data.category as TemplateCategory,
        body: data.body,
        createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        usedInCampaigns: 0,
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      setShowNewForm(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
          />
        </div>
        <select
          value={brandFilter as string}
          onChange={(e) => setBrandFilter(e.target.value as Brand | "All Brands")}
          className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {ALL_BRANDS.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setShowNewForm(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          New Template
        </button>
      </div>

      {/* New Template form (inline) */}
      {showNewForm && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">New Template</h2>
            <button
              onClick={() => setShowNewForm(false)}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X size={16} className="text-stone-500" />
            </button>
          </div>
          <TemplateEditor onSave={handleSave} onCancel={() => setShowNewForm(false)} />
        </div>
      )}

      {/* Edit modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingTemplate(null)} />
          <div
            className="relative z-10 w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden animate-slideUp max-h-[90vh] flex flex-col"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Edit Template</h2>
              <button onClick={() => setEditingTemplate(null)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <X size={16} className="text-stone-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <TemplateEditor
                initialName={editingTemplate.name}
                initialBody={editingTemplate.body}
                initialCategory={editingTemplate.category}
                initialBrand={editingTemplate.brand}
                onSave={handleSave}
                onCancel={() => setEditingTemplate(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border h-48" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText size={32} className="text-stone-300 dark:text-stone-600 mb-3" />
          <h3 className="text-base font-semibold text-stone-600 dark:text-stone-400 mb-1">No templates found</h3>
          <p className="text-sm text-stone-400 dark:text-stone-500 mb-4">Create your first message template</p>
          <button onClick={() => setShowNewForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={14} /> New Template
          </button>
        </div>
      ) : (
        /* Grouped by brand */
        Object.entries(grouped).map(([brand, brandTemplates]) => (
          <section key={brand}>
            <div className="flex items-center gap-3 mb-3">
              <BrandBadge brand={brand as Brand} size="md" />
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {brandTemplates!.length} template{brandTemplates!.length !== 1 ? "s" : ""}
              </span>
              <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brandTemplates!.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => setEditingTemplate(template)}
                  onDelete={() => handleDelete(template.id)}
                  onDuplicate={() => handleDuplicate(template)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
