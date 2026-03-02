"use client";

import { useState, useEffect, useRef } from "react";
import type { PromptTemplate, TemplateCategory } from "@/lib/prompt-templates";
import {
  getTemplates,
  getTemplatesByCategory,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  trackTemplateUsage,
  CATEGORY_META,
} from "@/lib/prompt-templates";
import {
  X,
  Plus,
  Search,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  Bookmark,
  Eye,
  FileText,
  Scan,
  Code,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Star,
  Table,
  Bug,
  GitBranch,
  Calculator,
  FileSearch,
  Accessibility,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  eye: Eye,
  "file-text": FileText,
  scan: Scan,
  code: Code,
  "help-circle": HelpCircle,
  "message-square": MessageSquare,
  sparkles: Sparkles,
  star: Star,
  table: Table,
  bug: Bug,
  "git-branch": GitBranch,
  calculator: Calculator,
  "file-search": FileSearch,
  accessibility: Accessibility,
  bookmark: Bookmark,
};

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
}

export function TemplateLibrary({
  isOpen,
  onClose,
  onSelect,
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [grouped, setGrouped] = useState<
    Record<TemplateCategory, PromptTemplate[]>
  >({} as any);
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<
    TemplateCategory | "all"
  >("all");
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshTemplates();
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function refreshTemplates() {
    setTemplates(getTemplates());
    setGrouped(getTemplatesByCategory());
  }

  function handleSelect(template: PromptTemplate) {
    trackTemplateUsage(template.id);
    onSelect(template.prompt);
    onClose();
  }

  function handleDelete(id: string) {
    deleteTemplate(id);
    refreshTemplates();
  }

  const filtered = search
    ? templates.filter(
        (t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.prompt.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Bookmark size={18} style={{ color: "var(--color-accent)" }} />
            <h2 className="text-base font-semibold">Prompt Templates</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowCreateForm(true);
                setEditingTemplate(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: "var(--color-accent)",
                color: "white",
              }}
            >
              <Plus size={14} />
              New
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <Search
              size={14}
              style={{ color: "var(--color-text-secondary)" }}
            />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--color-text)" }}
            />
          </div>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingTemplate) && (
          <TemplateForm
            initial={editingTemplate}
            onSave={(data) => {
              if (editingTemplate) {
                updateTemplate(editingTemplate.id, data);
              } else {
                createTemplate({ ...data, icon: "star" });
              }
              setShowCreateForm(false);
              setEditingTemplate(null);
              refreshTemplates();
            }}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingTemplate(null);
            }}
          />
        )}

        {/* Template List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {search ? (
            /* Search results */
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p
                  className="text-sm text-center py-8"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  No templates match "{search}"
                </p>
              ) : (
                filtered.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onSelect={handleSelect}
                    onEdit={setEditingTemplate}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          ) : (
            /* Grouped by category */
            <div className="space-y-4">
              {(Object.keys(CATEGORY_META) as TemplateCategory[]).map(
                (cat) => {
                  const items = grouped[cat] || [];
                  if (items.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  const isExpanded =
                    expandedCategory === "all" || expandedCategory === cat;

                  return (
                    <div key={cat}>
                      <button
                        onClick={() =>
                          setExpandedCategory(isExpanded ? ("all" as const) : cat)
                        }
                        className="flex items-center gap-2 mb-2 w-full text-left cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown
                            size={14}
                            style={{ color: "var(--color-text-secondary)" }}
                          />
                        ) : (
                          <ChevronRight
                            size={14}
                            style={{ color: "var(--color-text-secondary)" }}
                          />
                        )}
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          ({items.length})
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 ml-5">
                          {items.map((t) => (
                            <TemplateCard
                              key={t.id}
                              template={t}
                              onSelect={handleSelect}
                              onEdit={
                                t.isBuiltIn ? undefined : setEditingTemplate
                              }
                              onDelete={
                                t.isBuiltIn ? undefined : handleDelete
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Template Card ─────────────────────────────────────────────────── */

function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDelete,
}: {
  template: PromptTemplate;
  onSelect: (t: PromptTemplate) => void;
  onEdit?: (t: PromptTemplate) => void;
  onDelete?: (id: string) => void;
}) {
  const IconComponent = ICON_MAP[template.icon] || Star;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-150 group"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
      onClick={() => onSelect(template)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--color-border)";
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: "var(--color-accent-light)",
          color: "var(--color-accent)",
        }}
      >
        <IconComponent size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{template.label}</span>
          {template.isBuiltIn && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--color-surface-hover)",
                color: "var(--color-text-secondary)",
              }}
            >
              Built-in
            </span>
          )}
        </div>
        <p
          className="text-xs mt-0.5 line-clamp-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {template.description}
        </p>
      </div>

      {/* Actions for custom templates */}
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template);
              }}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template.id);
              }}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--color-error, #ef4444)" }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Create / Edit Form ────────────────────────────────────────────── */

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: PromptTemplate | null;
  onSave: (data: {
    label: string;
    prompt: string;
    category: TemplateCategory;
    description: string;
  }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label || "");
  const [prompt, setPrompt] = useState(initial?.prompt || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState<TemplateCategory>(
    initial?.category || "custom"
  );

  return (
    <div
      className="mx-5 mb-3 p-4 rounded-xl border space-y-3"
      style={{
        borderColor: "var(--color-accent)",
        background: "var(--color-surface)",
      }}
    >
      <h3 className="text-sm font-semibold">
        {initial ? "Edit Template" : "Create Template"}
      </h3>

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Template name"
        className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
        }}
      />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt text... (what to ask the AI)"
        rows={3}
        className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none resize-none"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
        }}
      />

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
        }}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as TemplateCategory)}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
          background: "var(--color-bg)",
        }}
      >
        {(Object.keys(CATEGORY_META) as TemplateCategory[]).map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORY_META[cat].label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          style={{
            background: "var(--color-surface-hover)",
            color: "var(--color-text-secondary)",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (!label.trim() || !prompt.trim()) return;
            onSave({ label, prompt, category, description });
          }}
          disabled={!label.trim() || !prompt.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
          style={{
            background: "var(--color-accent)",
            color: "white",
          }}
        >
          {initial ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}
