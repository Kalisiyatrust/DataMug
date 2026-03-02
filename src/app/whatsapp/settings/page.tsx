"use client";

import {
  Bell,
  Link2,
  Shield,
  Palette,
  Users,
  Webhook,
  ChevronRight,
} from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "Account",
    items: [
      { icon: Users, label: "Team Members", description: "Manage who has access to the dashboard" },
      { icon: Shield, label: "Permissions", description: "Set role-based access controls" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { icon: Link2, label: "WhatsApp Business API", description: "Connect your WhatsApp Business account" },
      { icon: Webhook, label: "Webhooks", description: "Configure incoming/outgoing webhooks" },
    ],
  },
  {
    title: "Notifications",
    items: [
      { icon: Bell, label: "Alert Preferences", description: "Choose which events trigger notifications" },
    ],
  },
  {
    title: "Appearance",
    items: [
      { icon: Palette, label: "Theme", description: "Light, dark, or system default" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Settings</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Configure your WhatsApp Marketing Dashboard
        </p>
      </div>

      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-2">
            {section.title}
          </h3>
          <div
            className="rounded-xl border overflow-hidden divide-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  style={{ background: "var(--color-surface)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "var(--color-surface-hover)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                      {item.label}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-stone-300 dark:text-stone-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
          API Connection
        </h3>
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">
          The dashboard connects to <code className="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">/api/whatsapp/*</code> endpoints.
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Awaiting API connection — running on mock data
          </span>
        </div>
      </div>
    </div>
  );
}
