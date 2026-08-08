import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRecentHabitLogs, HABIT_TAGS } from "./journal";
import { calculateReadiness } from "./readiness";
import { HealthService } from "./health";

export interface HabitImpact {
  id: string;
  label: string;
  icon: string;
  count: number;
  impact: number;
  metric: string;
}

const READINESS_HISTORY_KEY = "readiness_history";

interface ReadinessHistoryEntry {
  date: string;
  score: number;
}

export async function getReadinessHistory(days: number): Promise<ReadinessHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(READINESS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-days) : [];
  } catch {
    return [];
  }
}

export async function recordReadiness(date: string, score: number): Promise<void> {
  const history = await getReadinessHistory(365);
  const idx = history.findIndex((h) => h.date === date);
  if (idx >= 0) {
    history[idx].score = score;
  } else {
    history.push({ date, score });
  }
  await AsyncStorage.setItem(READINESS_HISTORY_KEY, JSON.stringify(history));
}

export async function calculateHabitImpacts(days: number = 14): Promise<HabitImpact[]> {
  const logs = await getRecentHabitLogs(days);
  const history = await getReadinessHistory(days + 1);

  const readinessByDate: Record<string, number> = {};
  for (const entry of history) {
    readinessByDate[entry.date] = entry.score;
  }

  const impacts: HabitImpact[] = [];

  for (const tag of HABIT_TAGS) {
    let count = 0;
    let withHabitScore = 0;
    let withHabitCount = 0;
    let withoutHabitScore = 0;
    let withoutHabitCount = 0;

    for (let i = 0; i < logs.length - 1; i++) {
      const log = logs[i];
      const nextDay = new Date(log.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayKey = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;
      const readiness = readinessByDate[nextDayKey];
      if (readiness == null) continue;

      if (log.completed[tag.id]) {
        count++;
        withHabitScore += readiness;
        withHabitCount++;
      } else {
        withoutHabitScore += readiness;
        withoutHabitCount++;
      }
    }

    let impact = 0;
    if (withHabitCount > 0 && withoutHabitCount > 0) {
      const withAvg = withHabitScore / withHabitCount;
      const withoutAvg = withoutHabitScore / withoutHabitCount;
      impact = Math.round((withAvg - withoutAvg) * (tag.positive ? 1 : -1));
    }

    impacts.push({
      id: tag.id,
      label: tag.label,
      icon: tag.icon,
      count,
      impact,
      metric: tag.metric,
    });
  }

  return impacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export async function recordTodayReadiness(): Promise<void> {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await HealthService.initialize(false);
  const data = await HealthService.getTodayData();
  const readiness = await calculateReadiness(data.heartRateVariability, data.restingHeartRate, data.sleepHours);
  await recordReadiness(dateKey, readiness.score);
}
