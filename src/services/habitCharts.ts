import { getRecentHabitLogs, HABIT_LIBRARY, HabitLog } from "./journal";

export type SeriesKind = "binary" | "numeric";

export interface ChartSeries {
  id: string;
  label: string;
  emoji: string;
  kind: SeriesKind;
  unit?: string;
  decimals?: number;
  /** Values in chronological order (oldest → newest). */
  values: number[];
  /** Dates (YYYY-MM-DD) matching values, oldest → newest. */
  dates: string[];
  filledCount: number;
  totalDays: number;
}

const CORE_METRICS: Array<{
  id: string;
  label: string;
  emoji: string;
  unit?: string;
  decimals?: number;
  read: (log: HabitLog) => number;
}> = [
  // Default mood is 3 ("okay"), so treat it as unlogged to avoid a fake flat line.
  { id: "mood", label: "Daily mood", emoji: "😊", unit: "/5", decimals: 0, read: (log) => (typeof log.mood === "number" && log.mood !== 3 ? log.mood + 1 : 0) },
  { id: "hydration", label: "Hydration", emoji: "💧", unit: "cups", decimals: 1, read: (log) => log.hydration ?? 0 },
  { id: "caffeine", label: "Caffeine", emoji: "☕", unit: "mg", decimals: 0, read: (log) => log.caffeine ?? 0 },
  { id: "alcohol", label: "Alcohol", emoji: "🍷", unit: "drinks", decimals: 0, read: (log) => log.alcohol ?? 0 },
  // Weight is always charted so "weight over time" works even without the habit active.
  { id: "weight_kg", label: "Weight", emoji: "⚖️", unit: "kg", decimals: 1, read: (log) => log.counters.weight_kg ?? 0 },
];

/**
 * Builds chart series for the active habits plus the core journal metrics,
 * over the requested number of days (oldest → newest).
 */
export async function getJournalSeries(
  days: number,
  activeHabitIds: string[]
): Promise<ChartSeries[]> {
  const logs = await getRecentHabitLogs(days); // index 0 = today
  const chronological = [...logs].reverse();
  const dates = chronological.map((log) => log.date);

  const series: ChartSeries[] = [];
  const emittedIds = new Set<string>();

  for (const habitId of activeHabitIds) {
    const meta = HABIT_LIBRARY.find((habit) => habit.id === habitId);
    if (!meta) continue;

    const values = chronological.map((log) => {
      if (meta.type === "binary") return log.completed[habitId] === true ? 1 : 0;
      return log.counters[habitId] ?? 0;
    });

    emittedIds.add(habitId);
    series.push({
      id: habitId,
      label: meta.label,
      emoji: meta.emoji,
      kind: meta.type === "binary" ? "binary" : "numeric",
      unit: meta.unit,
      decimals: meta.decimals,
      values,
      dates,
      filledCount: values.filter((value) => value > 0).length,
      totalDays: chronological.length,
    });
  }

  for (const metric of CORE_METRICS) {
    if (emittedIds.has(metric.id)) continue;
    const values = chronological.map((log) => metric.read(log));
    series.push({
      id: metric.id,
      label: metric.label,
      emoji: metric.emoji,
      kind: "numeric",
      unit: metric.unit,
      decimals: metric.decimals,
      values,
      dates,
      filledCount: values.filter((value) => value > 0).length,
      totalDays: chronological.length,
    });
  }

  return series;
}

/** Average of non-zero values in a numeric series. */
export function seriesAverage(values: number[]): number | null {
  const nonZero = values.filter((value) => value > 0);
  if (!nonZero.length) return null;
  return nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length;
}
