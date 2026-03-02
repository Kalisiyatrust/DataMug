"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Upload,
  ChevronDown,
  X,
  Trash2,
  Tag,
  ArrowUpDown,
  MessageSquare,
  ExternalLink,
  CheckSquare,
  Square,
  Users,
} from "lucide-react";
import { BrandBadge } from "@/components/whatsapp/brand-badge";
import { StageBadge } from "@/components/whatsapp/stage-badge";
import { ScoreIndicator } from "@/components/whatsapp/score-indicator";
import { ContactForm } from "@/components/whatsapp/contact-form";
import { CSVImportModal } from "@/components/whatsapp/csv-import-modal";
import type { Brand } from "@/components/whatsapp/brand-badge";
import type { Stage } from "@/components/whatsapp/stage-badge";
import type { ContactFormData } from "@/components/whatsapp/contact-form";

// ─── Types ────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  brand: Brand;
  tags: string[];
  stage: Stage;
  score: number;
  lastContact: string;
  notes: string;
}

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_CONTACTS: Contact[] = [
  { id: "1", name: "Sarah Chen", phone: "+44 7700 900123", email: "sarah@techflow.com", company: "TechFlow Ltd", brand: "Kalisiya", tags: ["hot-lead", "enterprise"], stage: "qualified", score: 78, lastContact: "2h ago", notes: "Interested in premium plan" },
  { id: "2", name: "James Okafor", phone: "+234 801 234 5678", email: "james@lagosdigital.ng", company: "Lagos Digital", brand: "Eloi", tags: ["callback-requested"], stage: "engaged", score: 62, lastContact: "5h ago", notes: "Requested call back" },
  { id: "3", name: "Priya Sharma", phone: "+91 98765 43210", email: "priya@sharmaanalytics.in", company: "Sharma Analytics", brand: "DataMug", tags: ["follow-up"], stage: "contacted", score: 45, lastContact: "1d ago", notes: "Needs case studies" },
  { id: "4", name: "Marco Rossi", phone: "+39 02 1234 5678", email: "marco@rossispa.it", company: "Rossi SpA", brand: "Kalisiya", tags: ["pricing-inquiry"], stage: "new", score: 30, lastContact: "2d ago", notes: "Asking about pricing" },
  { id: "5", name: "Aisha Patel", phone: "+971 50 123 4567", email: "aisha@dubaiventures.ae", company: "Dubai Ventures", brand: "Eloi", tags: ["customer", "vip"], stage: "converted", score: 92, lastContact: "3d ago", notes: "VIP customer, signed contract" },
  { id: "6", name: "Tom Bradley", phone: "+1 555 234 5678", email: "tom@bradleyco.com", company: "Bradley & Co", brand: "DataMug", tags: ["new-user"], stage: "new", score: 20, lastContact: "1w ago", notes: "Just signed up" },
  { id: "7", name: "Li Wei", phone: "+86 138 0013 8000", email: "li.wei@sinotech.cn", company: "SinoTech", brand: "Kalisiya", tags: ["enterprise", "partnership"], stage: "qualified", score: 85, lastContact: "4h ago", notes: "Potential partner" },
  { id: "8", name: "Fatima Al-Amin", phone: "+966 50 987 6543", email: "fatima@riyadhgroup.sa", company: "Riyadh Group", brand: "Eloi", tags: ["high-value"], stage: "engaged", score: 70, lastContact: "6h ago", notes: "High-value opportunity" },
  { id: "9", name: "Carlos Mendez", phone: "+52 55 1234 5678", email: "carlos@mendezventures.mx", company: "Mendez Ventures", brand: "DataMug", tags: ["information-request"], stage: "contacted", score: 38, lastContact: "2d ago", notes: "Requested product info" },
  { id: "10", name: "Emma Wilson", phone: "+44 7911 123456", email: "emma@innovatelondon.co.uk", company: "Innovate London", brand: "Kalisiya", tags: ["trial"], stage: "engaged", score: 55, lastContact: "1d ago", notes: "On free trial" },
  { id: "11", name: "Kwame Mensah", phone: "+233 24 123 4567", email: "kwame@ghanatech.gh", company: "Ghana Tech", brand: "Eloi", tags: ["startup"], stage: "new", score: 25, lastContact: "5d ago", notes: "Early stage startup" },
  { id: "12", name: "Sofia Andersen", phone: "+45 32 12 34 56", email: "sofia@nordicbiz.dk", company: "Nordic Biz", brand: "DataMug", tags: ["referral"], stage: "qualified", score: 72, lastContact: "8h ago", notes: "Referred by existing customer" },
];

const BRANDS: Brand[] = ["All Brands", "Kalisiya", "Eloi", "DataMug"];
const STAGES: Stage[] = ["new", "contacted", "engaged", "qualified", "converted", "lost"];

// ─── Slide-out Panel ──────────────────────────────────────────

function ContactPanel({
  contact,
  onClose,
  onEdit,
}: {
  contact: Contact;
  onClose: () => void;
  onEdit: (data: ContactFormData) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-50 w-full max-w-md flex flex-col border-l shadow-2xl overflow-hidden animate-slideRight"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {editing ? "Edit Contact" : "Contact Details"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <X size={16} className="text-stone-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {editing ? (
            <ContactForm
              initial={contact}
              onSave={(data) => {
                onEdit(data);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className="space-y-5">
              {/* Contact summary */}
              <div className="text-center pb-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-2xl font-bold text-stone-600 dark:text-stone-400 mx-auto mb-3">
                  {contact.name[0]}
                </div>
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">{contact.name}</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">{contact.company}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <BrandBadge brand={contact.brand} size="sm" />
                  <StageBadge stage={contact.stage} size="sm" />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {[
                  { label: "Phone", value: contact.phone },
                  { label: "Email", value: contact.email },
                  { label: "Company", value: contact.company },
                  { label: "Last Contact", value: contact.lastContact },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-stone-500 dark:text-stone-400">{label}</span>
                    <span className="text-sm text-stone-700 dark:text-stone-300 font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-500 dark:text-stone-400">Lead Score</span>
                  <ScoreIndicator score={contact.score} />
                </div>
              </div>

              {/* Tags */}
              {contact.tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div>
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Notes</p>
                  <p className="text-sm text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 rounded-lg p-3 leading-relaxed">
                    {contact.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 space-y-2">
                <a
                  href={`/whatsapp/conversations`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <MessageSquare size={15} />
                  Open Conversation
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => setEditing(true)}
                  className="w-full px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  Edit Contact
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contacts Page ────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<Brand>("All Brands");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelContact, setPanelContact] = useState<Contact | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sortField, setSortField] = useState<keyof Contact>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [bulkMenu, setBulkMenu] = useState(false);

  useEffect(() => {
    // Check URL params for action
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new") setShowAddForm(true);
    if (params.get("action") === "import") setShowImportModal(true);
    setTimeout(() => setLoading(false), 600);
  }, []);

  // Filter + sort
  const filtered = contacts
    .filter((c) => {
      const matchesBrand = brandFilter === "All Brands" || c.brand === brandFilter;
      const matchesStage = stageFilter === "all" || c.stage === stageFilter;
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !tagFilter || c.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase()));
      return matchesBrand && matchesStage && matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      const va = String(a[sortField]);
      const vb = String(b[sortField]);
      if (sortField === "score") {
        return sortDir === "asc" ? a.score - b.score : b.score - a.score;
      }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const allSelectedFiltered = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleAll = () => {
    if (allSelectedFiltered) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: keyof Contact) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleDelete = () => {
    setContacts((prev) => prev.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
    setBulkMenu(false);
  };

  const handleAddContact = (data: ContactFormData) => {
    const newContact = {
      id: String(Date.now()),
      ...data,
      email: data.email || "",
      lastContact: "just now",
    };
    setContacts((prev) => [newContact, ...prev]);
    setShowAddForm(false);
  };

  const handleEditContact = (id: string, data: ContactFormData) => {
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    setPanelContact(null);
  };

  const SortIcon = ({ field }: { field: keyof Contact }) => (
    <ArrowUpDown
      size={12}
      className={`inline-block ml-1 ${sortField === field ? "text-blue-500" : "text-stone-300 dark:text-stone-600"}`}
    />
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center gap-3 flex-shrink-0"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Brand filter */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value as Brand)}
          className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {BRANDS.map((b) => <option key={b}>{b}</option>)}
        </select>

        {/* Stage filter */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        {/* Tag filter */}
        <div className="relative">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Filter by tag..."
            className="pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-36"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setBulkMenu((m) => !m)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                {selected.size} selected
                <ChevronDown size={13} />
              </button>
              {bulkMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg z-10 overflow-hidden animate-slideDown">
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
                    onClick={() => { setBulkMenu(false); }}
                  >
                    <Tag size={14} className="text-blue-500" />
                    Add Tag
                  </button>
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
                    onClick={() => { setBulkMenu(false); }}
                  >
                    <ArrowUpDown size={14} className="text-purple-500" />
                    Change Stage
                  </button>
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
                    onClick={() => { setBulkMenu(false); }}
                  >
                    <Upload size={14} className="text-green-500" />
                    Export Selected
                  </button>
                  <div className="border-t border-stone-100 dark:border-stone-800" />
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} />
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <Upload size={14} />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add Contact
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 sm:px-6 py-2 border-b flex-shrink-0" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
          {search || brandFilter !== "All Brands" || stageFilter !== "all" || tagFilter ? " (filtered)" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex gap-4 items-center">
                <div className="w-4 h-4 bg-stone-200 dark:bg-stone-700 rounded" />
                <div className="w-8 h-8 bg-stone-200 dark:bg-stone-700 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-32" />
                  <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-24" />
                </div>
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-20 hidden sm:block" />
                <div className="h-5 bg-stone-100 dark:bg-stone-800 rounded-full w-16 hidden md:block" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8">
            <Users size={32} className="text-stone-300 dark:text-stone-600 mb-3" />
            <h3 className="text-base font-semibold text-stone-600 dark:text-stone-400 mb-1">No contacts found</h3>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-4">
              {search || brandFilter !== "All Brands" || stageFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first contact"}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              Add Contact
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10" style={{ background: "var(--color-surface)" }}>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                    {allSelectedFiltered ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide cursor-pointer hover:text-stone-700 dark:hover:text-stone-200" onClick={() => handleSort("name")}>
                  Name <SortIcon field="name" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide hidden sm:table-cell cursor-pointer hover:text-stone-700 dark:hover:text-stone-200" onClick={() => handleSort("company")}>
                  Company <SortIcon field="company" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide hidden md:table-cell cursor-pointer hover:text-stone-700 dark:hover:text-stone-200" onClick={() => handleSort("brand")}>
                  Brand <SortIcon field="brand" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Tags
                </th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide cursor-pointer hover:text-stone-700 dark:hover:text-stone-200" onClick={() => handleSort("stage")}>
                  Stage <SortIcon field="stage" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide cursor-pointer hover:text-stone-700 dark:hover:text-stone-200 hidden sm:table-cell" onClick={() => handleSort("score")}>
                  Score <SortIcon field="score" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide hidden xl:table-cell cursor-pointer hover:text-stone-700 dark:hover:text-stone-200" onClick={() => handleSort("lastContact")}>
                  Last Contact <SortIcon field="lastContact" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className={`border-b transition-colors cursor-pointer ${
                    selected.has(contact.id)
                      ? "bg-blue-50 dark:bg-blue-900/10"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                  style={{ borderColor: "var(--color-border)" }}
                  onClick={() => setPanelContact(contact)}
                >
                  <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleOne(contact.id); }}>
                    <button className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                      {selected.has(contact.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-600 dark:text-stone-400 flex-shrink-0">
                        {contact.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-stone-800 dark:text-stone-200">{contact.name}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">{contact.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400 hidden sm:table-cell">{contact.company}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <BrandBadge brand={contact.brand} size="sm" />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 2 && (
                        <span className="text-xs text-stone-400">+{contact.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge stage={contact.stage} size="sm" />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <ScoreIndicator score={contact.score} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400 dark:text-stone-500 hidden xl:table-cell">
                    {contact.lastContact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Contact Slide-out */}
      {showAddForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div
            className="relative z-50 w-full max-w-md flex flex-col border-l shadow-2xl overflow-hidden animate-slideRight"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Add New Contact</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <X size={16} className="text-stone-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ContactForm onSave={handleAddContact} onCancel={() => setShowAddForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Panel */}
      {panelContact && (
        <ContactPanel
          contact={panelContact}
          onClose={() => setPanelContact(null)}
          onEdit={(data) => handleEditContact(panelContact.id, data)}
        />
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <CSVImportModal
          onClose={() => setShowImportModal(false)}
          onImport={({ rows, brand }) => {
            const newContacts: Contact[] = rows.map((row, i) => ({
              id: `import-${Date.now()}-${i}`,
              name: row.name || "Unknown",
              phone: row.phone || "",
              email: row.email || "",
              company: row.company || "",
              brand: brand as Brand,
              tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
              stage: (row.stage as Stage) || "new",
              score: Number(row.score) || 0,
              lastContact: "just now",
              notes: row.notes || "",
            }));
            setContacts((prev) => [...newContacts, ...prev]);
          }}
        />
      )}
    </div>
  );
}


