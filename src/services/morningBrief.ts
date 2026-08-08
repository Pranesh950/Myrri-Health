// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  getHabitLog,
  formatDateKey,
  getActiveHabitIds,
  HABIT_LIBRARY,
} from "./journal";
import { getMeals } from "./foodDatabase";
import { loadPlan } from "./coachPlan";
import { HealthService } from "./health";

const BRIEF_KEY = "morning_brief_settings_v1";
export const BRIEF_CHANNEL_ID = "morning-brief";

export interface MorningBriefSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  scheduledId: string | null;
}

const DEFAULT_SETTINGS: MorningBriefSettings = {
  enabled: false,
  hour: 7,
  minute: 0,
  scheduledId: null,
};

export async function getBriefSettings(): Promise<MorningBriefSettings> {
  try {
    const raw = await AsyncStorage.getItem(BRIEF_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MorningBriefSettings>;
    return {
      enabled: parsed.enabled === true,
      hour:
        typeof parsed.hour === "number" &&
        parsed.hour >= 0 &&
        parsed.hour <= 23
          ? parsed.hour
          : DEFAULT_SETTINGS.hour,
      minute:
        typeof parsed.minute === "number" &&
        parsed.minute >= 0 &&
        parsed.minute <= 59
          ? parsed.minute
          : DEFAULT_SETTINGS.minute,
      scheduledId: parsed.scheduledId ?? null,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(settings: MorningBriefSettings): Promise<void> {
  await AsyncStorage.setItem(BRIEF_KEY, JSON.stringify(settings));
}

export function formatBriefTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(BRIEF_CHANNEL_ID, {
      name: "Morning brief",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#202126",
    });
  } catch (e) {
    console.warn("[MorningBrief] channel setup failed:", e);
  }
}

// ── Message content ───────────────────────────────────────────

/**
 * Builds the morning message: how yesterday went + what today needs.
 * Deterministic (no LLM) so it is fast and reliable at delivery time.
 */
export async function buildMorningMessage(): Promise<{ title: string; body: string }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  const activeIds = await getActiveHabitIds();
  const log = await getHabitLog(yesterdayKey);
  const plan = await loadPlan();

  const habitMeta = (id: string) => HABIT_LIBRARY.find((habit) => habit.id === id);

  let completedCount = 0;
  for (const id of activeIds) {
    const meta = habitMeta(id);
    if (!meta) continue;
    const done =
      meta.type === "binary"
        ? log.completed[id] === true
        : (log.counters[id] ?? 0) > 0;
    if (done) completedCount += 1;
  }

  const meals = await getMeals(yesterdayKey);
  const calories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const protein = meals.reduce((sum, meal) => sum + meal.protein, 0);

  let steps: number | null = null;
  let sleepHours: number | null = null;
  try {
    await HealthService.initialize(false);
    const [daily, sleepHistory] = await Promise.all([
      HealthService.getDailyActivity(2),
      HealthService.getSleepHistory(3),
    ]);
    const day = daily.find((d) => d.date === yesterdayKey);
    if (day && day.hasData) steps = day.steps;
    const sleep = sleepHistory.find((sample) => sample.date === yesterdayKey);
    if (sleep) sleepHours = sleep.value;
  } catch {
    // Health data is optional — the brief works from the journal alone.
  }

  // Yesterday recap
  const recap: string[] = [];
  if (activeIds.length > 0) {
    recap.push(`${completedCount}/${activeIds.length} goals`);
  }
  if (steps != null && steps > 0) recap.push(`${steps.toLocaleString()} steps`);
  if (sleepHours != null && sleepHours > 0) recap.push(`${sleepHours.toFixed(1)}h sleep`);
  if (calories > 0) {
    recap.push(`${Math.round(calories).toLocaleString()} cal${protein > 0 ? ` · ${protein.toFixed(0)}g protein` : ""}`);
  }

  // Today's reminders from the plan
  const planHabitIds = plan?.habitIds ?? [];
  const reminders = planHabitIds
    .map(habitMeta)
    .filter(Boolean)
    .slice(0, 3);
  const reminderParts = reminders.map((habit) => habit!.label.toLowerCase());
  if (plan?.sleepHours != null) {
    reminderParts.push(`${plan.sleepHours}h sleep`);
  }

  const hasJournalData =
    completedCount > 0 ||
    meals.length > 0 ||
    log.mood !== 3 ||
    log.hydration > 0 ||
    log.caffeine > 0 ||
    log.alcohol > 0;

  if (!hasJournalData && steps == null && sleepHours == null) {
    return {
      title: "Good morning ☀️",
      body: `Your journal is quiet — log a few things today and tomorrow's brief will tell you how you did.`,
    };
  }

  const recapText = recap.length ? `Yesterday: ${recap.join(" · ")}.` : "";
  const reminderText = reminderParts.length
    ? ` Today: ${reminderParts.join(", ")}.`
    : "";

  return {
    title: "Good morning ☀️",
    body: `${recapText}${reminderText}`,
  };
}

// ── Scheduling ────────────────────────────────────────────────

export async function scheduleBrief(hour: number, minute: number): Promise<string | null> {
  try {
    await ensureChannel();
    const { title, body } = await buildMorningMessage();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        data: { type: "morning-brief", hour, minute },
      },
      trigger: { hour, minute, repeats: true, channelId: BRIEF_CHANNEL_ID },
    });
    return id;
  } catch (e) {
    console.warn("[MorningBrief] schedule failed:", e);
    return null;
  }
}

export async function cancelBrief(scheduledId: string | null): Promise<void> {
  if (scheduledId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(scheduledId);
    } catch (e) {
      console.warn("[MorningBrief] cancel failed:", e);
    }
  }
}

async function requestPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** Enables the brief: requests permission, schedules, persists. */
export async function enableMorningBrief(hour: number, minute: number): Promise<boolean> {
  const granted = await requestPermission();
  if (!granted) return false;

  const existing = await getBriefSettings();
  await cancelBrief(existing.scheduledId);

  const id = await scheduleBrief(hour, minute);
  if (!id) return false; // Scheduling failed — don't claim it's enabled.

  await saveSettings({ enabled: true, hour, minute, scheduledId: id });
  return true;
}

/** Disables the brief and cancels the scheduled notification. */
export async function disableMorningBrief(): Promise<void> {
  const existing = await getBriefSettings();
  await cancelBrief(existing.scheduledId);
  await saveSettings({ ...existing, enabled: false, scheduledId: null });
}

/**
 * Rebuilds the message with fresh content and reschedules at the saved time.
 * Called on app start and when the journal tab focuses, so the content stays
 * roughly current even though local notifications carry fixed text.
 */
export async function ensureMorningBriefScheduled(): Promise<void> {
  try {
    const settings = await getBriefSettings();
    if (!settings.enabled) return;
    await cancelBrief(settings.scheduledId);
    const id = await scheduleBrief(settings.hour, settings.minute);
    if (id !== settings.scheduledId) {
      await saveSettings({ ...settings, scheduledId: id });
    }
  } catch (e) {
    console.warn("[MorningBrief] ensure failed:", e);
  }
}

/** Fires the brief immediately (used by the test button in settings). */
export async function sendTestBrief(): Promise<void> {
  try {
    await ensureChannel();
    const { title, body } = await buildMorningMessage();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default", data: { type: "morning-brief", test: true } },
      trigger: null,
    });
  } catch (e) {
    console.warn("[MorningBrief] test send failed:", e);
  }
}


