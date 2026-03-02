"use client";

import { useState, useEffect } from "react";
import type { AnalyticsSummary, DailyStat } from "@/lib/analytics";
import { getAnalyticsSummary, clearAnalytics } from "@/lib/analytics";
import {
  X,
  BarChart3,
  Zap,
  Image,
  Clock,
  Flame,
  Trophy,
  Cpu,
  Trash2,
} from "lucide-react";

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsDashboard({
  isOpen,
  onClose,
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      setData(getAnalyticsSummary());
    }
  }, [isOpen]);

  function handleClear() {
    if (confirm("Clear all analytics data? This cannot be undone.")) {
      clearAnalytics();
      setData(getAnalyticsSummary());
    }
  }

  function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatDate(d: string): string {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  if (!isOpen || !data) return null;

  const maxDaily = Math.max(...data.dailyStats.map((d) => d.analyses), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />

      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border overflow-hidden flex flex-col"
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
            <BarChart3 size={18} style={{ color: "var(--color-accent)" }} />
            <h2 className="text-base font-semibold">Usage Analytics</h2>
          </div>
          <div className="flex items-center gap-2">
            {data.totalAnalyses > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                style={{
                  color: "var(--color-error, #ef4444)",
                  background: "var(--color-surface)",
                }}
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {data.totalAnalyses === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <BarChart3 size={40} strokeWidth={1} />
              <p className="text-sm">
                No analytics yet. Start analyzing images to see stats here.
              </p>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={Zap}
                  label="Analyses"
                  value={data.totalAnalyses.toString()}
                />
                <StatCard
                  icon={Image}
                  label="Images"
                  value={data.totalImages.toString()}
                />
                <StatCard
                  icon={Clock}
                  label="Avg Time"
                  value={formatMs(data.avgResponseTimeMs)}
                />
                <StatCard
                  icon={Flame}
                  label="Streak"
                  value={`${data.streakDays}d`}
                />
              </div>

              {/* Daily chart */}
              {data.dailyStats.length > 1 && (
                <div>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Daily Activity (last 30 days)
                  </h3>
                  <div
                    className="flex items-end gap-1 h-32 p-3 rounded-xl border"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface)",
                    }}
                  >
                    {data.dailyStats.map((day) => (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center justify-end gap-1"
                        title={`${formatDate(day.date)}: ${day.analyses} analyses`}
                      >
                        <div
                          className="w-full rounded-sm transition-all duration-300"
                          style={{
                            height: `${Math.max(4, (day.analyses / maxDaily) * 100)}%`,
                            background: "var(--color-accent)",
                            opacity:
                              day.date ===
                              new Date().toISOString().split("T")[0]
                                ? 1
                                : 0.6,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex justify-between mt-1 text-[10px]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span>{formatDate(data.dailyStats[0].date)}</span>
                    <span>
                      {formatDate(
                        data.dailyStats[data.dailyStats.length - 1].date
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Model usage */}
              {data.modelUsage.length > 0 && (
                <div>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Models Used
                  </h3>
                  <div className="space-y-2">
                    {data.modelUsage.map((m) => {
                      const pct = Math.round(
                        (m.count / data.totalAnalyses) * 100
                      );
                      return (
                        <div
                          key={m.model}
                          className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{
                            borderColor: "var(--color-border)",
                            background: "var(--color-surface)",
                          }}
                        >
                          <Cpu
                            size={14}
                            style={{ color: "var(--color-accent)" }}
                          />
                          <span className="text-sm font-mono flex-1">
                            {m.model}
                          </span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-20 h-1.5 rounded-full overflow-hidden"
                              style={{
                                background: "var(--color-surface-hover)",
                              }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: "var(--color-accent)",
                                }}
                              />
                            </div>
                            <span
                              className="text-xs w-10 text-right"
                              style={{
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {m.count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Best day */}
              {data.topDay && (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <Trophy
                    size={18}
                    style={{ color: "#f59e0b" }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Best day: {formatDate(data.topDay.date)}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {data.topDay.count} analyses in a single day
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div
      className="p-3 rounded-xl border text-center"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <Icon
        size={16}
        className="mx-auto mb-1.5"
        style={{ color: "var(--color-accent)" }}
      />
      <p className="text-lg font-bold">{value}</p>
      <p
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </p>
    </div>
  );
}
