"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mail,
  Send,
  MessageCircle,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  PenLine,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

type Channel = "email" | "telegram" | "whatsapp";
type Brand = "kalisiya" | "eloi" | "datamug";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

// ─── Channel config ─────────────────────────────────────────────

const CHANNELS: { id: Channel; label: string; icon: React.ElementType; color: string }[] = [
  { id: "email", label: "Email", icon: Mail, color: "text-blue-600 dark:text-blue-400" },
  { id: "telegram", label: "Telegram", icon: Send, color: "text-sky-600 dark:text-sky-400" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-600 dark:text-green-400" },
];

const BRANDS: Brand[] = ["kalisiya", "eloi", "datamug"];

// ─── Toast ─────────────────────────────────────────────────────

interface ToastProps {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}

function Toast({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slideDown max-w-sm ${
        type === "success"
          ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200"
          : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
      }`}
    >
      {type === "success" ? (
        <CheckCircle size={16} className="flex-shrink-0" />
      ) : (
        <AlertCircle size={16} className="flex-shrink-0" />
      )}
      {message}
      <button
        onClick={onClose}
        className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

// ─── Inner Form Component ───────────────────────────────────────

function SendForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialChannel = (searchParams.get("channel") as Channel) ?? "email";
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [brand, setBrand] = useState<Brand>("kalisiya");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [manualRecipient, setManualRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      setContactsLoading(true);
      setContactsError("");
      try {
        const res = await fetch("/api/whatsapp/contacts");
        if (!res.ok) throw new Error("Failed to fetch contacts");
        const data = await res.json();
        const list: Contact[] = Array.isArray(data)
          ? data
          : data.contacts ?? data.data ?? [];
        setContacts(list);
      } catch (err) {
        setContactsError(err instanceof Error ? err.message : "Could not load contacts");
      } finally {
        setContactsLoading(false);
      }
    };
    fetchContacts();
  }, []);

  // Sync channel from URL when it changes
  useEffect(() => {
    const ch = searchParams.get("channel") as Channel;
    if (ch && ["email", "telegram", "whatsapp"].includes(ch)) {
      setChannel(ch);
    }
  }, [searchParams]);

  const handleChannelChange = (ch: Channel) => {
    setChannel(ch);
    router.replace(`/outreach/send?channel=${ch}`, { scroll: false });
  };

  const getRecipient = () => {
    if (useManual) return manualRecipient;
    const c = contacts.find((c) => c.id === selectedContactId);
    if (!c) return "";
    return channel === "email" ? c.email ?? "" : c.phone ?? "";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = getRecipient();
    if (!recipient) {
      setToast({ type: "error", message: "Please select or enter a recipient." });
      return;
    }
    if (!body.trim()) {
      setToast({ type: "error", message: "Message body cannot be empty." });
      return;
    }
    if (channel === "email" && !subject.trim()) {
      setToast({ type: "error", message: "Subject is required for email." });
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, string> = {
        channel,
        brand,
        recipient,
        body,
      };
      if (channel === "email") payload.subject = subject;

      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? err.message ?? "Send failed");
      }

      setToast({ type: "success", message: "Message sent successfully!" });
      setBody("");
      setSubject("");
      setSelectedContactId("");
      setManualRecipient("");
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to send message",
      });
    } finally {
      setSending(false);
    }
  };

  const activeChannel = CHANNELS.find((c) => c.id === channel)!;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Send Message
        </h2>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
          Reach contacts via any channel
        </p>
      </div>

      <form onSubmit={handleSend} className="space-y-5">
        {/* Channel Tabs */}
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Channel
          </p>
          <div className="flex gap-2 flex-wrap">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const isActive = channel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleChannelChange(ch.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                    isActive
                      ? ch.id === "email"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : ch.id === "telegram"
                        ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                        : "bg-green-600 text-white border-green-600 shadow-sm"
                      : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <Icon size={15} />
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand + Recipient */}
        <div
          className="rounded-xl border p-4 space-y-4"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          {/* Brand Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              Brand
            </label>
            <div className="relative">
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="w-full appearance-none px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors pr-8"
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

          {/* Recipient mode toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Recipient
              </label>
              <button
                type="button"
                onClick={() => setUseManual((v) => !v)}
                className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
              >
                {useManual ? (
                  <>
                    <User size={11} /> Select contact
                  </>
                ) : (
                  <>
                    <PenLine size={11} /> Enter manually
                  </>
                )}
              </button>
            </div>

            {useManual ? (
              <input
                type="text"
                value={manualRecipient}
                onChange={(e) => setManualRecipient(e.target.value)}
                placeholder={
                  channel === "email"
                    ? "name@example.com"
                    : "+1234567890 or @username"
                }
                className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            ) : contactsLoading ? (
              <div className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-400 animate-pulse">
                Loading contacts…
              </div>
            ) : contactsError ? (
              <div className="text-xs text-red-600 dark:text-red-400 px-1">
                {contactsError} —{" "}
                <button
                  type="button"
                  onClick={() => setUseManual(true)}
                  className="underline"
                >
                  enter manually
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-8"
                >
                  <option value="">— select a contact —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {channel === "email" && c.email ? ` (${c.email})` : ""}
                      {channel !== "email" && c.phone ? ` (${c.phone})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div
          className="rounded-xl border p-4 space-y-4"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Message
          </p>

          {/* Subject — email only */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <label className="text-xs text-stone-500 dark:text-stone-400">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject…"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500 dark:text-stone-400">
              {channel === "email" ? "Body (HTML or plain text)" : "Message"}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={channel === "email" ? 10 : 5}
              placeholder={
                channel === "email"
                  ? "<p>Hello {{name}},</p>\n<p>Your message here…</p>"
                  : "Type your message…"
              }
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y font-mono"
            />
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {body.length} characters
            </p>
          </div>
        </div>

        {/* Send Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setBody("");
              setSubject("");
              setSelectedContactId("");
              setManualRecipient("");
            }}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={sending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all ${
              activeChannel.id === "email"
                ? "bg-blue-600 hover:bg-blue-700"
                : activeChannel.id === "telegram"
                ? "bg-sky-500 hover:bg-sky-600"
                : "bg-green-600 hover:bg-green-700"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {sending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send size={15} />
                Send via {activeChannel.label}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page (wrapped in Suspense for useSearchParams) ─────────────

export default function SendPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-stone-400" />
        </div>
      }
    >
      <SendForm />
    </Suspense>
  );
}
