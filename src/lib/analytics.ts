/**
 * Usage analytics stored in localStorage.
 * Tracks: analyses count, models used, response times, images processed.
 */

export interface AnalyticsEvent {
  type: "analysis";
  model: string;
  responseTimeMs: number;
  imageCount: number;
  promptLength: number;
  responseLength: number;
  timestamp: number;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  analyses: number;
  images: number;
  totalResponseMs: number;
  models: Record<string, number>;
}

export interface AnalyticsSummary {
  totalAnalyses: number;
  totalImages: number;
  avgResponseTimeMs: number;
  modelUsage: { model: string; count: number }[];
  dailyStats: DailyStat[];
  streakDays: number;
  topDay: { date: string; count: number } | null;
}

const STORAGE_KEY = "datamug-analytics";
const MAX_EVENTS = 1000;

function getEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(events.slice(-MAX_EVENTS))
  );
}

/**
 * Record an analysis event.
 */
export function trackAnalysis(params: {
  model: string;
  responseTimeMs: number;
  imageCount: number;
  promptLength: number;
  responseLength: number;
}): void {
  const events = getEvents();
  events.push({
    type: "analysis",
    ...params,
    timestamp: Date.now(),
  });
  saveEvents(events);
}

/**
 * Get summarised analytics.
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  const events = getEvents();

  if (events.length === 0) {
    return {
      totalAnalyses: 0,
      totalImages: 0,
      avgResponseTimeMs: 0,
      modelUsage: [],
      dailyStats: [],
      streakDays: 0,
      topDay: null,
    };
  }

  let totalImages = 0;
  let totalResponseMs = 0;
  const modelCounts: Record<string, number> = {};
  const dailyMap: Record<string, DailyStat> = {};

  for (const ev of events) {
    totalImages += ev.imageCount;
    totalResponseMs += ev.responseTimeMs;
    modelCounts[ev.model] = (modelCounts[ev.model] || 0) + 1;

    const date = new Date(ev.timestamp).toISOString().split("T")[0];
    if (!dailyMap[date]) {
      dailyMap[date] = {
        date,
        analyses: 0,
        images: 0,
        totalResponseMs: 0,
        models: {},
      };
    }
    dailyMap[date].analyses++;
    dailyMap[date].images += ev.imageCount;
    dailyMap[date].totalResponseMs += ev.responseTimeMs;
    dailyMap[date].models[ev.model] =
      (dailyMap[date].models[ev.model] || 0) + 1;
  }

  const modelUsage = Object.entries(modelCounts)
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count);

  const dailyStats = Object.values(dailyMap).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Calculate streak
  let streakDays = 0;
  const today = new Date().toISOString().split("T")[0];
  const dateSet = new Set(dailyStats.map((d) => d.date));
  let checkDate = new Date();
  while (dateSet.has(checkDate.toISOString().split("T")[0])) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Top day
  let topDay: { date: string; count: number } | null = null;
  for (const d of dailyStats) {
    if (!topDay || d.analyses > topDay.count) {
      topDay = { date: d.date, count: d.analyses };
    }
  }

  return {
    totalAnalyses: events.length,
    totalImages,
    avgResponseTimeMs:
      events.length > 0 ? Math.round(totalResponseMs / events.length) : 0,
    modelUsage,
    dailyStats: dailyStats.slice(-30), // last 30 days
    streakDays,
    topDay,
  };
}

/**
 * Clear all analytics data.
 */
export function clearAnalytics(): void {
  localStorage.removeItem(STORAGE_KEY);
}
