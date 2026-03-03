"use client";

import { useState } from "react";
import {
  Mail,
  Send,
  MessageCircle,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Globe,
  Key,
  Info,
} from "lucide-react";

// ─── Masked Input ───────────────────────────────────────────────

interface MaskedInputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

function MaskedInput({
  id,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: MaskedInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono disabled:bg-stone-50 dark:disabled:bg-stone-800"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── Status Toast ───────────────────────────────────────────────

function InlineStatus({
  type,
  message,
}: {
  type: "success" | "error" | null;
  message: string;
}) {
  if (!type) return null;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
        type === "success"
          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700"
          : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700"
      }`}
    >
      {type === "success" ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
      {message}
    </div>
  );
}

// ─── Info Note ──────────────────────────────────────────────────

function EnvNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400">
      <Info size={13} className="flex-shrink-0 mt-0.5 text-stone-400" />
      <span>{children}</span>
    </div>
  );
}

// ─── Section Card ───────────────────────────────────────────────

function SectionCard({
  title,
  description,
  icon: Icon,
  accentClass,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass}`}>
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h3>
          <p className="text-xs text-stone-400 dark:text-stone-500">{description}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Read-only URL display ──────────────────────────────────────

function WebhookUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
        <Globe size={13} className="text-stone-400 flex-shrink-0" />
        <span className="text-xs font-mono text-stone-600 dark:text-stone-400 truncate">
          {url}
        </span>
      </div>
      <button
        type="button"
        onClick={copy}
        className="px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ─── Brevo Email Section ────────────────────────────────────────

function BrevoSection() {
  const [apiKey, setApiKey] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleTest = async () => {
    setTesting(true);
    setStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/outreach/settings/brevo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({
          type: "success",
          message: data.message ?? "Connection successful!",
        });
      } else {
        throw new Error(data.error ?? data.message ?? "Connection failed");
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SectionCard
      title="Email (Brevo)"
      description="Transactional and bulk email via Brevo API"
      icon={Mail}
      accentClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
    >
      <EnvNote>
        Set <strong>BREVO_API_KEY</strong> in Vercel env vars — values entered here are for
        testing only and are not persisted.
      </EnvNote>

      <div className="space-y-1.5">
        <label
          htmlFor="brevo-api-key"
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400"
        >
          <Key size={11} /> API Key
        </label>
        <MaskedInput
          id="brevo-api-key"
          value={apiKey}
          onChange={setApiKey}
          placeholder="xkeysib-…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="brevo-sender-name"
            className="text-xs font-medium text-stone-500 dark:text-stone-400"
          >
            Default sender name
          </label>
          <input
            id="brevo-sender-name"
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="MugData Team"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="brevo-sender-email"
            className="text-xs font-medium text-stone-500 dark:text-stone-400"
          >
            Default sender email
          </label>
          <input
            id="brevo-sender-email"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="hello@mugdata.com"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      <InlineStatus type={status.type} message={status.message} />

      <button
        type="button"
        onClick={handleTest}
        disabled={testing || !apiKey}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {testing ? <Loader2 size={14} className="animate-spin" /> : null}
        Test Connection
      </button>
    </SectionCard>
  );
}

// ─── Telegram Section ───────────────────────────────────────────

function TelegramSection() {
  const [botToken, setBotToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleTest = async () => {
    setTesting(true);
    setStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/telegram/webhook");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: "success", message: data.message ?? "Bot is online!" });
      } else {
        throw new Error(data.error ?? "Test failed");
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSetWebhook = async () => {
    setSettingWebhook(true);
    setStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/outreach/settings/telegram/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: botToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({
          type: "success",
          message: data.message ?? "Webhook set successfully!",
        });
      } else {
        throw new Error(data.error ?? "Failed to set webhook");
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to set webhook",
      });
    } finally {
      setSettingWebhook(false);
    }
  };

  return (
    <SectionCard
      title="Telegram Bot"
      description="Send messages via your Telegram bot"
      icon={Send}
      accentClass="bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400"
    >
      <EnvNote>
        Set <strong>TELEGRAM_BOT_TOKEN</strong> in Vercel env vars — values entered here are
        for testing only and are not persisted.
      </EnvNote>

      <div className="space-y-1.5">
        <label
          htmlFor="telegram-token"
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400"
        >
          <Key size={11} /> Bot Token
        </label>
        <MaskedInput
          id="telegram-token"
          value={botToken}
          onChange={setBotToken}
          placeholder="123456:ABCdef…"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Webhook URL
        </label>
        <WebhookUrl url="https://mugdata.com/api/telegram/webhook" />
      </div>

      <InlineStatus type={status.type} message={status.message} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSetWebhook}
          disabled={settingWebhook || !botToken}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {settingWebhook ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          Set Webhook
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : null}
          Test Bot
        </button>
      </div>
    </SectionCard>
  );
}

// ─── WhatsApp Section ───────────────────────────────────────────

function WhatsAppSection() {
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");

  return (
    <SectionCard
      title="WhatsApp (Meta Cloud API)"
      description="Send messages via Meta Business API"
      icon={MessageCircle}
      accentClass="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
    >
      <EnvNote>
        Set <strong>META_WHATSAPP_TOKEN</strong> and{" "}
        <strong>META_PHONE_NUMBER_ID</strong> in Vercel env vars — values entered here are
        for reference only and are not persisted.
      </EnvNote>

      <div className="space-y-1.5">
        <label
          htmlFor="meta-token"
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400"
        >
          <Key size={11} /> Access Token
        </label>
        <MaskedInput
          id="meta-token"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="EAAxxxxx…"
        />
        <EnvNote>Set META_WHATSAPP_TOKEN in Vercel env vars.</EnvNote>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="meta-phone-id"
          className="text-xs font-medium text-stone-500 dark:text-stone-400"
        >
          Phone Number ID
        </label>
        <input
          id="meta-phone-id"
          type="text"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="1234567890123"
          className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <EnvNote>Set META_PHONE_NUMBER_ID in Vercel env vars.</EnvNote>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Webhook URL
        </label>
        <WebhookUrl url="https://mugdata.com/api/whatsapp/meta-webhook" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Verify Token
        </label>
        <div className="px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono text-stone-500 dark:text-stone-400">
          Set META_WHATSAPP_VERIFY_TOKEN in Vercel env vars
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Channel Settings
        </h2>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
          Configure your outreach channel credentials and integrations
        </p>
      </div>

      <BrevoSection />
      <TelegramSection />
      <WhatsAppSection />
    </div>
  );
}
