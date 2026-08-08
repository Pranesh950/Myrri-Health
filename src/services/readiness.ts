// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AsyncStorage from "@react-native-async-storage/async-storage";

const BASELINE_KEY = "readiness_baseline";

interface DailySnapshot {
  date: string;
  hrv: number | null;
  rhr: number | null;
  sleepHours: number | null;
}

interface BaselineData {
  snapshots: DailySnapshot[];
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  return formatDate(new Date());
}

export async function loadBaseline(): Promise<BaselineData> {
  try {
    const raw = await AsyncStorage.getItem(BASELINE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { snapshots: [] };
}

async function saveBaseline(data: BaselineData): Promise<void> {
  await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(data));
}

export async function recordDailySnapshot(
  hrv: number | null,
  rhr: number | null,
  sleepHours: number | null
): Promise<void> {
  const baseline = await loadBaseline();
  const key = todayKey();
  const idx = baseline.snapshots.findIndex((s) => s.date === key);
  const entry: DailySnapshot = { date: key, hrv, rhr, sleepHours };
  if (idx >= 0) {
    baseline.snapshots[idx] = entry;
  } else {
    baseline.snapshots.push(entry);
  }
  await saveBaseline(baseline);
}

function getRecentValues(
  snapshots: DailySnapshot[],
  field: "hrv" | "rhr" | "sleepHours",
  days: number
): number[] {
  const sorted = snapshots
    .filter((s) => s[field] != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
  return sorted.map((s) => s[field] as number);
}

export interface ReadinessResult {
  score: number;
  hrvDeviation: number;
  rhrDeviation: number;
  summary: string;
}

const SUMMARY_PHRASES_HIGH = [
  "System is primed",
  "Ready to perform",
  "Fully recovered",
  "Peak readiness",
  "Optimized state",
];
const SUMMARY_PHRASES_MODERATE = [
  "Moderate recovery",
  "Proceed with care",
  "Balanced state",
  "Adequate readiness",
  "Normal variance",
];
const SUMMARY_PHRASES_LOW = [
  "Prioritize recovery",
  "High fatigue",
  "Rest recommended",
  "Reduced capacity",
  "Stress elevated",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function calculateReadiness(
  currentHRV: number | null,
  currentRHR: number | null,
  currentSleepHours: number | null
): Promise<ReadinessResult> {
  const baseline = await loadBaseline();

  await recordDailySnapshot(currentHRV, currentRHR, currentSleepHours);

  const hrvValues = getRecentValues(baseline.snapshots, "hrv", 21);
  const rhrValues = getRecentValues(baseline.snapshots, "rhr", 21);

  let score = 50;

  if (currentHRV != null && hrvValues.length > 0) {
    const avgHRV = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
    const hrvRatio = avgHRV > 0 ? currentHRV / avgHRV : 1;
    score += Math.round(Math.min(25, Math.max(-25, (hrvRatio - 1) * 50)));
  } else if (currentHRV != null) {
    score += 10;
  }

  if (currentRHR != null && rhrValues.length > 0) {
    const avgRHR = rhrValues.reduce((a, b) => a + b, 0) / rhrValues.length;
    const rhrRatio = avgRHR > 0 ? currentRHR / avgRHR : 1;
    score -= Math.round(Math.min(25, Math.max(-25, (rhrRatio - 1) * 50)));
  } else if (currentRHR != null) {
    score -= 5;
  }

  if (currentSleepHours != null) {
    if (currentSleepHours >= 7) score += 15;
    else if (currentSleepHours >= 5) score += 5;
    else score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  let summary: string;
  if (score >= 70) {
    summary = pickRandom(SUMMARY_PHRASES_HIGH);
  } else if (score >= 40) {
    summary = pickRandom(SUMMARY_PHRASES_MODERATE);
  } else {
    summary = pickRandom(SUMMARY_PHRASES_LOW);
  }

  const hrvDeviation =
    currentHRV != null && hrvValues.length > 0
      ? currentHRV - hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
      : 0;

  const avgRHRForDev =
    rhrValues.length > 0 ? rhrValues.reduce((a, b) => a + b, 0) / rhrValues.length : 0;
  const rhrDeviation =
    currentRHR != null && rhrValues.length > 0
      ? Math.round(currentRHR - avgRHRForDev)
      : 0;

  return { score, hrvDeviation, rhrDeviation, summary };
}
