import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearByokConfig } from "./providers/byok";

export interface HealthData {
  steps: number;
  heartRate: number[];
  sleepHours: number;
  activeCalories: number;
  distance: number; // meters
  weight: number | null; // kg
  height: number | null; // cm
  bloodPressure: { systolic: number; diastolic: number } | null;
  bloodOxygen: number | null; // %
  bodyTemperature: number | null; // celsius
  respiratoryRate: number | null; // rpm
  restingHeartRate: number | null; // bpm
  heartRateVariability: number | null; // ms
  /** True when heartRateVariability was estimated from heart-rate readings
   *  (RMSSD proxy) because the wearable writes no dedicated HRV records. */
  hrvEstimated?: boolean;
  vo2Max: number | null;
  bodyFat: number | null; // %
  leanBodyMass: number | null; // kg
  /** Awake time within the sleep window, in hours (0 when no stage data). */
  sleepAwakeHours: number;
  /** Deep-sleep hours (0 when no stage data). */
  sleepDeepHours: number;
  /** REM-sleep hours (0 when no stage data). */
  sleepRemHours: number;
  /** True when the platform supplied a stage breakdown (awake/deep/REM/light). */
  sleepHasStages: boolean;
}

export interface WorkoutSession {
  id: string;
  name: string;
  type: string;
  startTime: Date;
  endTime: Date;
  durationMin: number;
  calories: number | null;
  distance: number | null; // meters
  avgHeartRate: number | null;
  exerciseType: number | null;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  steps: number;
  activeCalories: number;
  workoutCount: number;
  activeMinutes: number;
  /** True when the provider returned at least one activity record for this day. */
  hasData?: boolean;
  /** Distinguishes a measured zero-step day from a missing step sample. */
  hasSteps?: boolean;
}

export interface MetricSample {
  date: string;
  value: number;
}

export type HealthConnectionStatus =
  | "unavailable"
  | "needs_permission"
  | "access_requested"
  | "not_connected"
  | "connected"
  | "connected_no_data"
  | "error";

/** True when health access is confirmed, with or without synced data yet. */
export function isConnectedStatus(status: HealthConnectionStatus): boolean {
  return (
    status === "connected" ||
    status === "connected_no_data" ||
    status === "access_requested"
  );
}

const EMPTY_DATA: HealthData = {
  steps: 0,
  heartRate: [],
  sleepHours: 0,
  activeCalories: 0,
  distance: 0,
  weight: null,
  height: null,
  bloodPressure: null,
  bloodOxygen: null,
  bodyTemperature: null,
  respiratoryRate: null,
  restingHeartRate: null,
  heartRateVariability: null,
  vo2Max: null,
  bodyFat: null,
  leanBodyMass: null,
  sleepAwakeHours: 0,
  sleepDeepHours: 0,
  sleepRemHours: 0,
  sleepHasStages: false,
};

// ─── HealthKit permission keys ───────────────────────────────────────────────
const HEALTHKIT_READ_PERMISSIONS = [
  "StepCount",
  "HeartRate",
  "RestingHeartRate",
  "HeartRateVariability",
  "RespiratoryRate",
  "SleepAnalysis",
  "ActiveEnergyBurned",
  "DistanceWalkingRunning",
  "Weight",
  "Height",
  "BloodPressureSystolic",
  "BloodPressureDiastolic",
  "OxygenSaturation",
  "BodyTemperature",
  "Vo2Max",
  "BodyFatPercentage",
  "LeanBodyMass",
  "Workout",
] as const;

// ─── Health Connect record types ─────────────────────────────────────────────
// Keep the initial permission request in recoverable groups. Health Connect
// providers can differ in which optional metrics they expose; one unsupported
// optional type must not invalidate the core connection flow.
const HEALTH_CONNECT_CORE_READ_TYPES = [
  "Steps",
  "HeartRate",
  "SleepSession",
  "ActiveCaloriesBurned",
  "Distance",
] as const;

const HEALTH_CONNECT_OPTIONAL_READ_TYPES = [
  "RestingHeartRate",
  "HeartRateVariabilityRmssd",
  "RespiratoryRate",
  "Weight",
  "Height",
  "BloodPressure",
  "OxygenSaturation",
  "BodyTemperature",
  "Vo2Max",
  "BodyFat",
  "LeanBodyMass",
  "ExerciseSession",
] as const;

// Map HC exercise type codes → friendly labels + icons
const EXERCISE_TYPE_META: Record<
  number,
  { name: string; category: string; icon: string }
> = {
  0: { name: "Workout", category: "Other", icon: "dumbbell" },
  8: { name: "Cycling", category: "Outdoor", icon: "bike" },
  9: { name: "Stationary Bike", category: "Indoor", icon: "bike" },
  25: { name: "Elliptical", category: "Cardio", icon: "ellipse-outline" },
  36: { name: "HIIT", category: "Cardio", icon: "lightning-bolt" },
  37: { name: "Hiking", category: "Outdoor", icon: "hiking" },
  48: { name: "Pilates", category: "Studio", icon: "yoga" },
  56: { name: "Run", category: "Outdoor", icon: "run" },
  57: { name: "Treadmill Run", category: "Indoor", icon: "run" },
  70: { name: "Strength", category: "Gym", icon: "dumbbell" },
  73: { name: "Open Water Swim", category: "Outdoor", icon: "swim" },
  74: { name: "Pool Swim", category: "Pool", icon: "swim" },
  79: { name: "Walk", category: "Outdoor", icon: "walk" },
  83: { name: "Yoga", category: "Studio", icon: "meditation" },
};

let healthKit: any = null;
let healthConnect: any = null;
let initPromise: Promise<boolean> | null = null;
let initRequestsPermissions = false;
const MAX_HEALTH_HISTORY_DAYS = 30;
const IOS_HEALTHKIT_REQUESTED_KEY = "healthkit_access_requested";
const HEALTH_SETUP_SKIPPED_KEY = "health_setup_skipped";

async function hasHealthKitSetupBeenRequested(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(IOS_HEALTHKIT_REQUESTED_KEY)) === "true";
  } catch {
    return false;
  }
}

async function markHealthKitSetupRequested(): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [IOS_HEALTHKIT_REQUESTED_KEY, "true"],
      [HEALTH_SETUP_SKIPPED_KEY, "false"],
    ]);
  } catch {
    // Health data can still be read if local persistence is unavailable.
  }
}

async function hasHealthSetupBeenSkipped(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HEALTH_SETUP_SKIPPED_KEY)) === "true";
  } catch {
    return false;
  }
}

/**
 * Dev-only: clears every flag and stored value the onboarding flow writes, so
 * the next launch (or an immediate navigation) starts onboarding from scratch.
 * Meal and journal logs are intentionally kept — this resets setup, not data.
 */
export async function resetOnboardingState(): Promise<void> {
  const keys = [
    "onboarding_complete",
    HEALTH_SETUP_SKIPPED_KEY,
    IOS_HEALTHKIT_REQUESTED_KEY,
    "health_profile",
    "coach_plan_v1",
    "active_habits",
    "llm_provider_choice",
    DEVICE_TYPE_KEY,
  ];
  try {
    await AsyncStorage.multiRemove(keys);
    // The next step read must re-detect the source from scratch.
    sourceFilterCache = null;
    // Also drop any BYOK API key so the AI step re-runs from scratch.
    await clearByokConfig();
  } catch (e) {
    console.warn("[HealthService] resetOnboardingState failed:", e);
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lastOf<T>(arr: T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Approximate HRV (RMSSD, ms) from a heart-rate time series (bpm). A true
 * RMSSD needs beat-to-beat RR intervals, which Health Connect / HealthKit
 * heart-rate samples do not expose. This converts each bpm reading to an RR
 * interval (60000/bpm) and takes the root mean square of successive
 * differences — a heuristic proxy that is only used when the wearable writes
 * no dedicated HRV records, and is labelled as an estimate in the UI.
 */
export function estimateHrvFromHeartRate(bpmSamples: number[]): number | null {
  const clean = bpmSamples.filter(
    (v) => typeof v === "number" && Number.isFinite(v) && v >= 40 && v <= 150
  );
  if (clean.length < 10) return null;
  const rr = clean.map((bpm) => 60000 / bpm);
  let sumSq = 0;
  for (let i = 1; i < rr.length; i++) {
    const diff = rr[i] - rr[i - 1];
    sumSq += diff * diff;
  }
  const rmssd = Math.sqrt(sumSq / (rr.length - 1));
  if (!Number.isFinite(rmssd)) return null;
  return Math.round(Math.max(5, Math.min(150, rmssd)) * 10) / 10;
}

/**
 * Picks the most trustworthy total when a metric is read twice — once
 * restricted to the wearable's data origin and once across all sources. The
 * filtered total wins whenever the wearable wrote anything for the metric;
 * the all-sources total is only used when the wearable wrote nothing (e.g. a
 * steps-only device), so a real value is never replaced by zero.
 */
function preferOriginTotal(
  filtered: number | null | undefined,
  allSources: number | null | undefined,
  hasFilter: boolean
): { value: number | null; fellBack: boolean } {
  if (filtered != null && filtered > 0) return { value: filtered, fellBack: false };
  if (hasFilter && (filtered == null || filtered === 0) && allSources != null && allSources > 0) {
    return { value: allSources, fellBack: true };
  }
  if (filtered != null) return { value: filtered, fellBack: false };
  if (allSources != null) return { value: allSources, fellBack: false };
  return { value: null, fellBack: false };
}

/**
 * Merges overlapping/adjacent [startMs, endMs] intervals and returns the total
 * covered duration in hours. Sleep-stage segments must be merged rather than
 * simply summed so overlapping SleepSession records (or duplicated stage
 * segments) can never double-count the same minutes of the night.
 */
function mergedIntervalHours(intervals: Array<[number, number]>): number {
  const sorted = intervals
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s)
    .sort((a, b) => a[0] - b[0]);
  if (!sorted.length) return 0;
  let total = 0;
  let [curStart, curEnd] = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      total += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  total += curEnd - curStart;
  return total / 3600000;
}

// ── Step source selection ─────────────────────────────────────
// The step count should come only from the wearable chosen during onboarding
// (stored under AsyncStorage "device_type"), not from every app that writes
// steps to Health Connect. Keywords are matched against each record's
// dataOrigin (the writing app's package name) so the filter keeps working even
// when a vendor ships more than one package.
const DEVICE_TYPE_KEY = "device_type";

const BRAND_ORIGIN_KEYWORDS: Record<string, string[]> = {
  garmin: ["garmin"],
  fitbit: ["fitbit"],
  samsung: ["samsung"],
  // Pixel Watch data can be written by Google Fit or (newer models) Fitbit.
  googlefit: ["fitness", "fitbit"],
  xiaomi: ["xiaomi"],
  huawei: ["huawei"],
  honor: ["honor"],
  oura: ["oura"],
  whoop: ["whoop"],
  polar: ["polar"],
  withings: ["withings"],
  amazfit: ["amazfit", "huami", "zepp"],
};

const SOURCE_ORIGIN_DETECTION_DAYS = 14;
let sourceFilterCache: { brand: string | null; filter: string[] | undefined } | null = null;

/**
 * Resolves which Health Connect data origin should supply activity totals
 * (steps, active calories, and distance), based on the wearable chosen during
 * onboarding. Health Connect aggregates sum across EVERY app that writes a
 * record type — a watch app plus the phone's own tracking app (Google Fit,
 * Samsung Health, …) double-count calories and distance. Restricting the
 * aggregate to the wearable's origin keeps totals consistent with what the
 * watch reports. Returns undefined when there is no branded wearable ("No
 * Device") or when no written origin matches the brand — in those cases the
 * app keeps the current all-sources aggregate so it never shows an empty
 * count because of a mismatched package name.
 */
async function resolveDataSourceFilter(): Promise<string[] | undefined> {
  if (Platform.OS !== "android") return undefined;

  let brand: string | null = null;
  try {
    brand = await AsyncStorage.getItem(DEVICE_TYPE_KEY);
  } catch {
    return undefined;
  }

  if (sourceFilterCache && sourceFilterCache.brand === brand) {
    return sourceFilterCache.filter;
  }

  const keywords = brand && brand !== "other" ? BRAND_ORIGIN_KEYWORDS[brand] : undefined;
  if (!keywords?.length) {
    sourceFilterCache = { brand, filter: undefined };
    return undefined;
  }

  const hc = healthConnect;
  if (!hc) {
    // Health Connect not ready yet — retry on the next call.
    sourceFilterCache = null;
    return undefined;
  }

  let filter: string[] | undefined;
  try {
    const end = new Date();
    const start = daysAgo(SOURCE_ORIGIN_DETECTION_DAYS);
    const records = await hcRead(hc, "Steps", start, end);
    const origins = Array.from(
      new Set(
        records
          .map((r: any) => r.metadata?.dataOrigin)
          .filter((origin): origin is string => typeof origin === "string" && origin.length > 0)
      )
    );
    const matches = origins.filter((origin) => {
      const o = origin.toLowerCase();
      return keywords.some((k) => o.includes(k.toLowerCase()));
    });
    // Keep every package the vendor writes from (some brands sync through
    // several packages) — they report the same wearable data, so including
    // them all does not inflate totals the way a separate tracking app does.
    filter = matches.length ? matches : undefined;
  } catch (e) {
    console.warn("[HealthService] Data source detection failed:", e);
    filter = undefined;
  }

  // Only cache a resolved origin. While the wearable has not synced any steps
  // yet there is nothing to match, so leave the cache empty and re-detect on
  // the next call — otherwise the filter would never engage after the watch
  // starts writing and the old all-sources total would persist.
  if (filter) {
    sourceFilterCache = { brand, filter };
  } else {
    sourceFilterCache = null;
  }
  return filter;
}

async function getModules() {
  if (Platform.OS === "ios") {
    if (!healthKit) {
      try {
        healthKit = require("react-native-health");
        // Default export may be nested depending on interop
        if (healthKit?.default) healthKit = healthKit.default;
      } catch {
        return null;
      }
    }
    if (!healthKit) return null;
    return { type: "healthkit" as const, module: healthKit };
  }
  if (Platform.OS === "android") {
    if (!healthConnect) {
      try {
        healthConnect = require("react-native-health-connect");
      } catch {
        return null;
      }
    }
    if (!healthConnect) return null;
    return { type: "healthconnect" as const, module: healthConnect };
  }
  return null;
}

function hkGet(
  hk: any,
  method: string,
  options: Record<string, unknown>
): Promise<any[]> {
  return new Promise((resolve) => {
    const fn = hk[method];
    if (typeof fn !== "function") {
      resolve([]);
      return;
    }
    try {
      fn.call(hk, options, (err: any, results: any) => {
        if (err) {
          resolve([]);
          return;
        }
        if (Array.isArray(results)) resolve(results);
        else if (results != null && typeof results === "object") {
          // Some methods return a single sample or { data: [] }
          if (Array.isArray(results.data)) resolve(results.data);
          else if (typeof results.value === "number") resolve([results]);
          else resolve([]);
        } else resolve([]);
      });
    } catch {
      resolve([]);
    }
  });
}

function hkGetOne(
  hk: any,
  method: string,
  options: Record<string, unknown>
): Promise<any | null> {
  return new Promise((resolve) => {
    const fn = hk[method];
    if (typeof fn !== "function") {
      resolve(null);
      return;
    }
    try {
      fn.call(hk, options, (err: any, result: any) => {
        if (err || result == null) resolve(null);
        else resolve(result);
      });
    } catch {
      resolve(null);
    }
  });
}

async function hcRead(
  hc: any,
  recordType: string,
  start: Date,
  end: Date,
  ascending = true,
  dataOriginFilter?: string[]
): Promise<any[]> {
  try {
    const response = await hc.readRecords(recordType, {
      timeRangeFilter: {
        operator: "between",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: ascending,
      ...(dataOriginFilter && dataOriginFilter.length ? { dataOriginFilter } : {}),
    });
    return response?.records || [];
  } catch (err) {
    console.warn(`[HealthService] Failed to read ${recordType}:`, err);
    return [];
  }
}

/**
 * Health Connect's aggregate APIs must be used for cumulative records such as
 * steps. Reading raw records can double-count data written by multiple sources.
 * An optional dataOriginFilter restricts the total to a single writing app.
 */
async function hcAggregate(
  hc: any,
  recordType: string,
  start: Date,
  end: Date,
  dataOriginFilter?: string[]
): Promise<any | null> {
  if (typeof hc.aggregateRecord !== "function") return null;
  try {
    return await hc.aggregateRecord({
      recordType,
      timeRangeFilter: {
        operator: "between",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ...(dataOriginFilter && dataOriginFilter.length ? { dataOriginFilter } : {}),
    });
  } catch (err) {
    console.warn(`[HealthService] Failed to aggregate ${recordType}:`, err);
    return null;
  }
}

async function hcAggregateByDay(
  hc: any,
  recordType: string,
  start: Date,
  end: Date,
  dataOriginFilter?: string[]
): Promise<any[]> {
  if (typeof hc.aggregateGroupByPeriod !== "function") return [];
  try {
    const groups = await hc.aggregateGroupByPeriod({
      recordType,
      timeRangeFilter: {
        operator: "between",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      timeRangeSlicer: { period: "DAYS", length: 1 },
      ...(dataOriginFilter && dataOriginFilter.length ? { dataOriginFilter } : {}),
    });
    return Array.isArray(groups) ? groups : [];
  } catch (err) {
    console.warn(`[HealthService] Failed to aggregate daily ${recordType}:`, err);
    return [];
  }
}

function exerciseMeta(type: number | null | undefined) {
  if (type == null) return EXERCISE_TYPE_META[0];
  return EXERCISE_TYPE_META[type] ?? EXERCISE_TYPE_META[0];
}

export function getExerciseMeta(type: number | null | undefined) {
  return exerciseMeta(type);
}

/** Strain score 0–100 derived from activity load. */
export function computeStrainScore(data: HealthData): number {
  // Weight calories, steps, and elevated HR into a 0–100 strain score.
  const calScore = Math.min(50, ((data.activeCalories || 0) / 600) * 50);
  const stepScore = Math.min(30, ((data.steps || 0) / 10000) * 30);
  const hrs = data.heartRate.filter((h) => h > 100);
  const hrScore =
    hrs.length > 0
      ? Math.min(20, (avg(hrs)! / 160) * 20)
      : Math.min(20, ((data.distance || 0) / 8000) * 20);
  return Math.round(Math.min(100, calScore + stepScore + hrScore));
}

export interface SleepScoreInput {
  sleepHours: number;
  /** Awake hours within the sleep window (0 when stage data is unavailable). */
  sleepAwakeHours?: number;
  /** Deep-sleep hours (0 when stage data is unavailable). */
  sleepDeepHours?: number;
  /** REM-sleep hours (0 when stage data is unavailable). */
  sleepRemHours?: number;
  /** True when the provider supplied a stage breakdown (awake/deep/REM/light). */
  sleepHasStages?: boolean;
}

/**
 * Duration component (max 40): peaks at ~8h of actual sleep and tapers on both
 * sides — oversleeping is penalised just like undersleeping.
 */
function sleepDurationScore(hours: number): number {
  const factor =
    hours <= 0
      ? 0.05
      : hours < 4
        ? 0.05 + (hours / 4) * 0.25 // 0→.05, 4→.30
        : hours < 5
          ? 0.3 + (hours - 4) * 0.15 // 5→.45
          : hours < 6
            ? 0.45 + (hours - 5) * 0.2 // 6→.65
            : hours < 7
              ? 0.65 + (hours - 6) * 0.2 // 7→.85
              : hours < 8
                ? 0.85 + (hours - 7) * 0.15 // 8→1.00
                : hours < 9
                  ? 1 - (hours - 8) * 0.15 // 9→.85
                  : hours < 10
                    ? 0.85 - (hours - 9) * 0.25 // 10→.60
                    : hours < 12
                      ? 0.6 - (hours - 10) * 0.1 // 12→.40
                      : 0.35;
  return 40 * factor;
}

/** Fragmentation (max 20): penalises awake time within the night. */
function sleepFragmentationScore(awakePct: number): number {
  if (awakePct <= 0.03) return 20;
  if (awakePct <= 0.08) return 17;
  if (awakePct <= 0.12) return 14;
  if (awakePct <= 0.18) return 10;
  if (awakePct <= 0.25) return 7;
  return 4;
}

/** Deep sleep (max 20): ideal 13–23% of time asleep. */
function sleepDeepScore(deepPct: number): number {
  if (deepPct <= 0.02) return 5;
  if (deepPct < 0.05) return 9;
  if (deepPct < 0.08) return 13;
  if (deepPct < 0.13) return 17;
  if (deepPct <= 0.23) return 20;
  if (deepPct <= 0.3) return 17;
  if (deepPct <= 0.4) return 14;
  return 12;
}

/** REM sleep (max 15): ideal 18–25% of time asleep. */
function sleepRemScore(remPct: number): number {
  if (remPct <= 0.03) return 4;
  if (remPct < 0.08) return 6;
  if (remPct < 0.13) return 9;
  if (remPct < 0.18) return 12;
  if (remPct <= 0.25) return 15;
  if (remPct <= 0.32) return 13;
  return 11;
}

/** Stage balance (max 5): light sleep should be the bulk of the night. */
function sleepLightScore(asleepHours: number, deepHours: number, remHours: number): number {
  if (asleepHours <= 0) return 0;
  const lightPct = Math.max(0, (asleepHours - deepHours - remHours) / asleepHours);
  if (lightPct >= 0.35 && lightPct <= 0.7) return 5;
  if (lightPct >= 0.25 && lightPct <= 0.8) return 3;
  return 1;
}

/**
 * Duration-only fallback. Without stage data the quality factors (awake, deep,
 * REM) are unknown, so the score is capped at 85 ("Good") — a long night is
 * never presented as excellent when quality can't be verified.
 */
function sleepScoreDurationOnly(sleepHours: number): number {
  if (!sleepHours || sleepHours <= 0) return 0;
  return Math.min(85, Math.round(sleepDurationScore(sleepHours) * 2 + 5));
}

/**
 * Sleep score 0–100 modelled on the Garmin/Firstbeat approach: sleep duration
 * is the largest factor (~40%), then overnight fragmentation (awake time),
 * deep sleep, REM, and stage balance. Garmin also folds overnight stress/HRV
 * into its number — this score cannot see that, so it is honest about being a
 * duration + stage-quality estimate rather than a wearable-exact match.
 *
 * Pass a HealthData-like object (or SleepScoreInput) to include the quality
 * factors. Pass a bare number for a duration-only estimate (capped at 85).
 */
export function computeSleepScore(input: SleepScoreInput | number): number {
  if (typeof input === "number") {
    return sleepScoreDurationOnly(input);
  }
  const {
    sleepHours,
    sleepAwakeHours = 0,
    sleepDeepHours = 0,
    sleepRemHours = 0,
    sleepHasStages = false,
  } = input;
  if (!sleepHours || sleepHours <= 0) return 0;
  if (!sleepHasStages) return sleepScoreDurationOnly(sleepHours);

  // sleepHours already excludes awake time on both stage-capable fetch paths
  // (HealthKit counts ASLEEP segments only; Health Connect is corrected from
  // SleepStage records), so it IS the asleep total — never subtract awake again.
  const asleep = sleepHours;
  const nightTotal = sleepHours + sleepAwakeHours;
  const awakePct = nightTotal > 0 ? sleepAwakeHours / nightTotal : 0;
  const deepPct = sleepDeepHours / asleep;
  const remPct = sleepRemHours / asleep;

  const total =
    sleepDurationScore(asleep) +
    sleepFragmentationScore(awakePct) +
    sleepDeepScore(deepPct) +
    sleepRemScore(remPct) +
    sleepLightScore(asleep, sleepDeepHours, sleepRemHours);
  return Math.max(0, Math.min(100, Math.round(total)));
}

export const HealthService = {
  async markSetupLater(): Promise<void> {
    try {
      await AsyncStorage.setItem(HEALTH_SETUP_SKIPPED_KEY, "true");
    } catch {
      // Setup can still continue if local persistence is unavailable.
    }
  },

  /** True when the user deliberately chose to track manually (No Device /
   *  Continue Without Connecting / Set Up Later) instead of connecting a
   *  wearable. Used by startup to avoid forcing them back into onboarding. */
  async hasSetupBeenSkipped(): Promise<boolean> {
    return hasHealthSetupBeenSkipped();
  },

  async initialize(requestPermissions = true): Promise<boolean> {
    // Deduplicate concurrent calls, but never let a passive read swallow an
    // explicit permission request that arrives while it is in flight.
    while (true) {
      if (!initPromise) {
        const promise = this._doInitialize(requestPermissions);
        initPromise = promise;
        initRequestsPermissions = requestPermissions;
        try {
          return await promise;
        } finally {
          if (initPromise === promise) {
            initPromise = null;
            initRequestsPermissions = false;
          }
        }
      }

      const activePromise = initPromise;
      if (!requestPermissions || initRequestsPermissions) {
        return activePromise;
      }

      // A passive initialization is active. Let it finish, then loop and run
      // the explicit request rather than returning the passive result.
      try {
        await activePromise;
      } catch {
        // The explicit attempt below should still get a chance to run.
      }
    }
  },

  async _doInitialize(requestPermissions = true): Promise<boolean> {
    if (requestPermissions) {
      try {
        await AsyncStorage.setItem(HEALTH_SETUP_SKIPPED_KEY, "false");
      } catch {}
    }
    const ctx = await getModules();
    if (!ctx) {
      return false;
    }

    try {
      if (ctx.type === "healthkit") {
        // HealthKit's init call is also its authorization prompt. Do not call
        // it on passive startup until the user has explicitly chosen Connect.
        if (!requestPermissions) {
          return await this.isAvailable();
        }

        const Permissions = ctx.module.Constants?.Permissions ?? {};
        const read = HEALTHKIT_READ_PERMISSIONS.map((key) => Permissions[key]).filter(
          Boolean
        );
        const opts = { permissions: { read, write: [] as string[] } };
        const ok = await new Promise<boolean>((resolve) => {
          if (typeof ctx.module.initHealthKit !== "function") {
            resolve(false);
            return;
          }
          ctx.module.initHealthKit(opts, (err: any) => resolve(!err));
        });
        if (ok) await markHealthKitSetupRequested();
        return ok;
      }

      if (ctx.type === "healthconnect") {
        // Do not open the permission sheet when Health Connect is unavailable
        // or needs a provider update. The official SDK requires this check first.
        const sdkStatus =
          typeof ctx.module.getSdkStatus === "function"
            ? await ctx.module.getSdkStatus()
            : 3;
        if (sdkStatus !== 3) {
          console.warn(`[HealthService] Health Connect SDK status: ${sdkStatus}`);
          return false;
        }

        const initialized = await ctx.module.initialize();
        if (initialized === false) {
          return false;
        }

        let granted: any[] = [];
        try {
          granted = (await ctx.module.getGrantedPermissions()) || [];
        } catch (e) {
          console.warn("[HealthService] getGrantedPermissions failed:", e);
        }

        const grantedReadTypes = new Set(
          granted
            .filter((p: any) => p.accessType === "read")
            .map((p: any) => p.recordType)
        );
        // Only open the system permission sheet for missing permissions. Ask
        // for core records first, then isolate optional metrics in a separate
        // recoverable request so an unsupported optional record cannot crash or
        // block the wearable connection.
        if (requestPermissions && typeof ctx.module.requestPermission === "function") {
          const permissionsByType = new Map<string, any>();
          for (const permission of granted) {
            if (permission?.recordType) {
              permissionsByType.set(permission.recordType, permission);
            }
          }

          const requestBatch = async (recordTypes: readonly string[]) => {
            const missing = recordTypes
              .filter((recordType) => !grantedReadTypes.has(recordType))
              .map((recordType) => ({
                recordType,
                accessType: "read" as const,
              }));
            if (!missing.length) return;
            try {
              const result = await ctx.module.requestPermission(missing);
              if (Array.isArray(result)) {
                for (const permission of result) {
                  if (permission?.recordType) {
                    permissionsByType.set(permission.recordType, permission);
                  }
                }
              }
            } catch (e) {
              console.warn("[HealthService] core permission request failed:", e);
            }
          };

          const requestOptionalIndividually = async (
            recordTypes: readonly string[]
          ) => {
            for (const recordType of recordTypes) {
              if (grantedReadTypes.has(recordType)) continue;
              try {
                const result = await ctx.module.requestPermission([
                  {
                    recordType,
                    accessType: "read" as const,
                  },
                ]);
                if (Array.isArray(result)) {
                  for (const permission of result) {
                    if (permission?.recordType) {
                      permissionsByType.set(permission.recordType, permission);
                    }
                  }
                }
              } catch (e) {
                // Some Health Connect providers do not expose every optional
                // record. Continue requesting the remaining types instead of
                // letting one unsupported metric abort setup.
                console.warn(
                  `[HealthService] optional permission unavailable for ${recordType}:`,
                  e
                );
              }
            }
          };

          await requestBatch(HEALTH_CONNECT_CORE_READ_TYPES);
          await requestOptionalIndividually(HEALTH_CONNECT_OPTIONAL_READ_TYPES);

          // Re-read the authoritative permission state. Some bridge versions
          // do not return the granted list from requestPermission().
          try {
            const current = await ctx.module.getGrantedPermissions();
            if (Array.isArray(current)) {
              for (const permission of current) {
                if (permission?.recordType) {
                  permissionsByType.set(permission.recordType, permission);
                }
              }
            }
          } catch (e) {
            console.warn("[HealthService] getGrantedPermissions after request failed:", e);
          }
          granted = Array.from(permissionsByType.values());
        }

        const hasAnyRead = granted.some((p: any) => p.accessType === "read");

        if (!hasAnyRead) {
          console.warn(
            "[HealthService] No Health Connect read permissions granted."
          );
        } else {
          console.log(
            `[HealthService] Health Connect: ${granted.length} permission(s) granted.`
          );
        }
        return hasAnyRead;
      }
    } catch (e) {
      console.warn("[HealthService] initialize failed:", e);
      return false;
    }
    return false;
  },

  async isAvailable(): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;
    try {
      if (ctx.type === "healthkit") {
        return new Promise<boolean>((resolve) => {
          if (typeof ctx.module.isAvailable !== "function") {
            resolve(true); // assume available on iOS device builds
            return;
          }
          ctx.module.isAvailable((err: any, available: boolean) => {
            resolve(!err && !!available);
          });
        });
      }
      if (ctx.type === "healthconnect") {
        const status = await ctx.module.getSdkStatus();
        // SdkAvailabilityStatus.SDK_AVAILABLE = 3.
        return status === 3;
      }
    } catch {
      return false;
    }
    return false;
  },

  async hasReadPermissions(): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;
    try {
      if (ctx.type === "healthkit") {
        // Apple intentionally hides granular read authorization. The local
        // flag tells us the authorization flow completed; an empty result is
        // not proof of denial because the wearable may not have synced yet.
        return await hasHealthKitSetupBeenRequested();
      }
      if (ctx.type === "healthconnect") {
        const granted = await ctx.module.getGrantedPermissions();
        return (
          Array.isArray(granted) &&
          granted.some((p: any) => p.accessType === "read")
        );
      }
    } catch {
      return false;
    }
    return false;
  },

  async getConnectionStatus(): Promise<HealthConnectionStatus> {
    try {
      const available = await this.isAvailable();
      if (!available) return "unavailable";
      const perms = await this.hasReadPermissions();
      if (perms) {
        const hasData = await this.hasAnyData(30);
        return hasData ? "connected" : "connected_no_data";
      }
      if (await hasHealthSetupBeenSkipped()) return "not_connected";
      if (Platform.OS === "ios" && (await hasHealthKitSetupBeenRequested())) {
        // HealthKit does not expose read authorization status. Avoid claiming
        // the user denied access when the account simply has no samples yet.
        return "access_requested";
      }
      return "needs_permission";
    } catch {
      return "error";
    }
  },

  async openSettings(): Promise<void> {
    const ctx = await getModules();
    if (!ctx) {
      try {
        await Linking.openSettings();
      } catch {}
      return;
    }
    try {
      if (ctx.type === "healthconnect") {
        if (typeof ctx.module.openHealthConnectSettings === "function") {
          await ctx.module.openHealthConnectSettings();
          return;
        }
        try {
          await Linking.sendIntent("android.settings.HEALTH_CONNECT_SETTINGS");
          return;
        } catch {}
      }
      await Linking.openSettings();
    } catch (e) {
      console.warn("[HealthService] openSettings failed:", e);
    }
  },

  async hasAnyData(days = 7): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;
    try {
      const endDate = new Date();
      const startDate = daysAgo(days);

      if (ctx.type === "healthkit") {
        const probes = [
          "getDailyStepCountSamples",
          "getHeartRateSamples",
          "getWeightSamples",
          "getSleepSamples",
        ];
        for (const method of probes) {
          const records = await hkGet(ctx.module, method, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
          if (records.length > 0) return true;
        }
        return false;
      }

      if (ctx.type === "healthconnect") {
        for (const recordType of ["Steps", "HeartRate", "Weight", "SleepSession"]) {
          const records = await hcRead(ctx.module, recordType, startDate, endDate);
          if (records.length > 0) return true;
        }
        return false;
      }
    } catch {
      return false;
    }
    return false;
  },

  async getTodayData(): Promise<HealthData> {
    const now = new Date();
    const start = startOfDay(now);
    // Sleep spans the previous evening → this morning
    // Start from yesterday noon to exclude the night before last
    const sleepStart = new Date(start);
    sleepStart.setDate(sleepStart.getDate() - 1);
    sleepStart.setHours(12, 0, 0, 0);
    // Keep reads within Health Connect's standard history window. A longer
    // range requires the separate READ_HEALTH_DATA_HISTORY permission.
    const bodyStart = daysAgo(30);

    const ctx = await getModules();
    if (!ctx) return { ...EMPTY_DATA };

    try {
      if (ctx.type === "healthkit") {
        return await this.fetchHealthKitData(ctx.module, start, now, sleepStart, bodyStart);
      }
      if (ctx.type === "healthconnect") {
        return await this.fetchHealthConnectData(
          ctx.module,
          start,
          now,
          sleepStart,
          bodyStart
        );
      }
    } catch (err) {
      console.warn("[HealthService] getTodayData failed:", err);
    }
    return { ...EMPTY_DATA };
  },

  async fetchHealthKitData(
    hk: any,
    startDate: Date,
    endDate: Date,
    sleepStart: Date,
    bodyStart: Date
  ): Promise<HealthData> {
    const data: HealthData = { ...EMPTY_DATA };
    const dayOpts = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    const bodyOpts = {
      startDate: bodyStart.toISOString(),
      endDate: endDate.toISOString(),
    };
    const sleepOpts = {
      startDate: sleepStart.toISOString(),
      endDate: endDate.toISOString(),
    };

    const [
      steps,
      hr,
      sleep,
      cal,
      dist,
      rhr,
      hrv,
      resp,
      weightSamples,
      heightSamples,
      bpSamples,
      o2Samples,
      tempSamples,
      vo2Samples,
      bodyFatSamples,
      leanSamples,
    ] = await Promise.all([
      hkGet(hk, "getDailyStepCountSamples", dayOpts),
      hkGet(hk, "getHeartRateSamples", dayOpts),
      hkGet(hk, "getSleepSamples", sleepOpts),
      hkGet(hk, "getActiveEnergyBurned", dayOpts),
      hkGet(hk, "getDistanceWalkingRunning", dayOpts),
      hkGet(hk, "getRestingHeartRateSamples", bodyOpts),
      hkGet(hk, "getHeartRateVariabilitySamples", bodyOpts),
      hkGet(hk, "getRespiratoryRateSamples", dayOpts),
      hkGet(hk, "getWeightSamples", bodyOpts),
      hkGet(hk, "getHeightSamples", bodyOpts),
      hkGet(hk, "getBloodPressureSamples", bodyOpts),
      hkGet(hk, "getOxygenSaturationSamples", dayOpts),
      hkGet(hk, "getBodyTemperatureSamples", dayOpts),
      hkGet(hk, "getVo2MaxSamples", bodyOpts),
      hkGet(hk, "getBodyFatPercentageSamples", bodyOpts),
      hkGet(hk, "getLeanBodyMassSamples", bodyOpts),
    ]);

    data.steps = steps.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
    data.heartRate = hr
      .map((h: any) => h.value)
      .filter((v: any) => typeof v === "number");
    if (data.heartRate.length === 0) {
      // Wearables often sync heart rate in delayed batches, so a strict
      // [midnight → now] window can be blank early in the day even though the
      // device recorded all day. Fall back to a rolling 24h window before
      // reporting "no data".
      const hrStart = new Date(endDate.getTime() - 24 * 3600 * 1000);
      const hrFallback = await hkGet(hk, "getHeartRateSamples", {
        startDate: hrStart.toISOString(),
        endDate: endDate.toISOString(),
      });
      data.heartRate = hrFallback
        .map((h: any) => h.value)
        .filter((v: any) => typeof v === "number");
    }
    if (data.heartRate.length === 0) {
      console.warn(
        "[HealthService] No HeartRate samples in the last 24h — verify Heart Rate read permission is granted in Apple Health."
      );
    }

    // Sleep: only count asleep segments (value 0=inBed, 1=asleep, 2=awake,
    // 3=core, 4=deep, 5=rem — the library exposes both numeric and label
    // forms). Tally awake/deep/REM separately so the sleep score can reflect
    // quality the way Garmin-style scores do, instead of rewarding duration
    // alone. AWAKE segments are deliberately excluded from total sleep time.
    let sleepAsleep = 0;
    let sleepAwake = 0;
    let sleepDeep = 0;
    let sleepRem = 0;
    let hasStageLabels = false;
    for (const s of sleep) {
      const raw = s.value;
      const label = String(raw ?? "").toUpperCase();
      const dur =
        (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 3600000;
      if (!Number.isFinite(dur) || dur <= 0) continue;
      // Pure in-bed segments mark the window but are neither sleep nor scored
      // wake time (the ASLEEP/AWAKE segments nest inside them).
      if (label === "INBED" || label === "IN_BED" || raw === 0) continue;
      if (label === "AWAKE" || raw === 2) {
        sleepAwake += dur;
        continue;
      }
      sleepAsleep += dur;
      if (label === "ASLEEP_DEEP" || raw === 4) sleepDeep += dur;
      else if (label === "ASLEEP_REM" || raw === 5) sleepRem += dur;
      if (
        label.includes("ASLEEP_CORE") ||
        label.includes("ASLEEP_DEEP") ||
        label.includes("ASLEEP_REM") ||
        raw === 3 ||
        raw === 4 ||
        raw === 5
      ) {
        hasStageLabels = true;
      }
    }
    // Fallback: if the stage filter removed everything but samples exist, sum
    // every non-awake, non-in-bed interval (older watch apps write only ASLEEP).
    if (sleepAsleep === 0 && sleep.length > 0) {
      for (const s of sleep) {
        const label = String(s.value ?? "").toUpperCase();
        if (
          label === "INBED" ||
          label === "IN_BED" ||
          label === "AWAKE" ||
          s.value === 0 ||
          s.value === 2
        ) {
          continue;
        }
        const dur =
          (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 3600000;
        if (Number.isFinite(dur) && dur > 0) sleepAsleep += dur;
      }
    }
    // Sanity cap — anything above 14h is almost certainly overlapping sessions
    if (sleepAsleep > 14) sleepAsleep = 14;
    data.sleepHours = sleepAsleep;
    data.sleepAwakeHours = sleepAwake;
    data.sleepDeepHours = sleepDeep;
    data.sleepRemHours = sleepRem;
    data.sleepHasStages = hasStageLabels;

    data.activeCalories = cal.reduce(
      (sum: number, c: any) => sum + (c.value || 0),
      0
    );
    data.distance = dist.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

    const lastRhr = lastOf(rhr);
    data.restingHeartRate = lastRhr?.value ?? null;

    const lastHrv = lastOf(hrv);
    data.heartRateVariability = lastHrv?.value ?? null;
    if (data.heartRateVariability == null) {
      // The wearable may not write dedicated HRV samples to HealthKit (e.g.
      // third-party bands). Fall back to an RMSSD estimate from the day's
      // heart-rate readings rather than reporting "no data".
      const estimated = estimateHrvFromHeartRate(data.heartRate);
      if (estimated != null) {
        data.heartRateVariability = estimated;
        data.hrvEstimated = true;
      }
    }

    const lastResp = lastOf(resp);
    data.respiratoryRate = lastResp?.value ?? null;

    // Prefer dedicated latest helpers when available
    const latestWeight = await hkGetOne(hk, "getLatestWeight", { unit: "kg" });
    data.weight =
      latestWeight?.value ?? lastOf(weightSamples)?.value ?? null;

    const latestHeight = await hkGetOne(hk, "getLatestHeight", { unit: "cm" });
    data.height =
      latestHeight?.value ?? lastOf(heightSamples)?.value ?? null;

    const lastBp = lastOf(bpSamples);
    data.bloodPressure = lastBp
      ? {
          systolic: lastBp.bloodPressureSystolicValue ?? lastBp.value ?? 0,
          diastolic: lastBp.bloodPressureDiastolicValue ?? 0,
        }
      : null;

    const lastO2 = lastOf(o2Samples);
    // HealthKit SpO2 is often 0–1 fraction
    if (lastO2?.value != null) {
      data.bloodOxygen =
        lastO2.value <= 1 ? lastO2.value * 100 : lastO2.value;
    }

    const lastTemp = lastOf(tempSamples);
    data.bodyTemperature = lastTemp?.value ?? null;

    const lastVo2 = lastOf(vo2Samples);
    data.vo2Max = lastVo2?.value ?? null;

    const lastFat = lastOf(bodyFatSamples);
    // Body fat often stored as 0–1 fraction
    if (lastFat?.value != null) {
      data.bodyFat = lastFat.value <= 1 ? lastFat.value * 100 : lastFat.value;
    }

    const lastLean = lastOf(leanSamples);
    data.leanBodyMass = lastLean?.value ?? null;

    return data;
  },

  async fetchHealthConnectData(
    hc: any,
    startDate: Date,
    endDate: Date,
    sleepStart: Date,
    bodyStart: Date
  ): Promise<HealthData> {
    const data: HealthData = { ...EMPTY_DATA };
    // Restrict activity totals to the wearable selected during onboarding so
    // the phone's own tracking apps cannot double-count steps, calories, or
    // distance (see resolveDataSourceFilter).
    const originFilter = await resolveDataSourceFilter();

    const [
      stepsAggregate,
      hr,
      sleep,
      caloriesAggregate,
      distanceAggregate,
      caloriesAllSources,
      distanceAllSources,
      rhr,
      hrv,
      resp,
      weight,
      height,
      bp,
      o2,
      temp,
      vo2,
      bodyFat,
      lean,
    ] = await Promise.all([
      hcAggregate(hc, "Steps", startDate, endDate, originFilter),
      hcRead(hc, "HeartRate", startDate, endDate),
      hcRead(hc, "SleepSession", sleepStart, endDate),
      hcAggregate(hc, "ActiveCaloriesBurned", startDate, endDate, originFilter),
      hcAggregate(hc, "Distance", startDate, endDate, originFilter),
      hcAggregate(hc, "ActiveCaloriesBurned", startDate, endDate),
      hcAggregate(hc, "Distance", startDate, endDate),
      hcRead(hc, "RestingHeartRate", bodyStart, endDate),
      hcRead(hc, "HeartRateVariabilityRmssd", bodyStart, endDate),
      hcRead(hc, "RespiratoryRate", startDate, endDate),
      hcRead(hc, "Weight", bodyStart, endDate),
      hcRead(hc, "Height", bodyStart, endDate),
      hcRead(hc, "BloodPressure", bodyStart, endDate),
      hcRead(hc, "OxygenSaturation", startDate, endDate),
      hcRead(hc, "BodyTemperature", startDate, endDate),
      hcRead(hc, "Vo2Max", bodyStart, endDate),
      hcRead(hc, "BodyFat", bodyStart, endDate),
      hcRead(hc, "LeanBodyMass", bodyStart, endDate),
    ]);

    if (stepsAggregate?.COUNT_TOTAL != null) {
      data.steps = stepsAggregate.COUNT_TOTAL;
    } else {
      const fallbackSteps = await hcRead(hc, "Steps", startDate, endDate, true, originFilter);
      data.steps = fallbackSteps.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
    }
    data.heartRate = hr.flatMap((h: any) =>
      (h.samples || []).map((s: any) => s.beatsPerMinute)
    );
    if (data.heartRate.length === 0) {
      // Wearables often sync heart rate in delayed batches, so a strict
      // [midnight → now] window can be blank early in the day even though the
      // device recorded all day. Fall back to a rolling 24h window before
      // reporting "no data".
      const hrStart = new Date(endDate.getTime() - 24 * 3600 * 1000);
      const hrFallback = await hcRead(hc, "HeartRate", hrStart, endDate);
      data.heartRate = hrFallback.flatMap((h: any) =>
        (h.samples || []).map((s: any) => s.beatsPerMinute)
      );
    }
    if (data.heartRate.length === 0) {
      console.warn(
        "[HealthService] No HeartRate samples in the last 24h — verify Heart Rate read permission is granted in Health Connect."
      );
    }

    data.sleepHours = sleep.reduce((sum: number, s: any) => {
      const dur =
        (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) /
        3600000;
      return sum + (Number.isFinite(dur) ? dur : 0);
    }, 0);

    // Sleep-stage breakdown (awake / deep / REM) when the wearable writes
    // stage segments. Health Connect exposes stages embedded in each
    // SleepSession record (SleepStageType: UNKNOWN=0, AWAKE=1, SLEEPING=2,
    // OUT_OF_BED=3, LIGHT=4, DEEP=5, REM=6) — there is no standalone stage
    // record type in this bridge. SleepSession on its own only exposes the
    // in-bed window, which includes awake time; the stage segments let the
    // score match Garmin-style quality factors instead of rewarding the raw
    // session length. Segments are merged per stage so overlapping sessions
    // cannot double-count the same minutes.
    data.sleepAwakeHours = 0;
    data.sleepDeepHours = 0;
    data.sleepRemHours = 0;
    data.sleepHasStages = false;
    const stageIntervals: Array<[number, number]> = [];
    const awakeIntervals: Array<[number, number]> = [];
    const deepIntervals: Array<[number, number]> = [];
    const remIntervals: Array<[number, number]> = [];
    for (const session of sleep) {
      for (const seg of session.stages ?? []) {
        const segStart = new Date(seg.startTime).getTime();
        const segEnd = new Date(seg.endTime).getTime();
        if (!Number.isFinite(segStart) || !Number.isFinite(segEnd) || segEnd <= segStart) {
          continue;
        }
        stageIntervals.push([segStart, segEnd]);
        if (seg.stage === 1 || seg.stage === 3) awakeIntervals.push([segStart, segEnd]);
        else if (seg.stage === 5) deepIntervals.push([segStart, segEnd]);
        else if (seg.stage === 6) remIntervals.push([segStart, segEnd]);
      }
    }
    if (stageIntervals.length > 0) {
      const stageTotal = mergedIntervalHours(stageIntervals);
      const awake = mergedIntervalHours(awakeIntervals);
      const deep = mergedIntervalHours(deepIntervals);
      const rem = mergedIntervalHours(remIntervals);
      const asleepFromStages = Math.max(0, stageTotal - awake);
      // Trust stage-based totals only when they cover most of the night;
      // partial stage uploads keep the session total and duration-only scoring.
      if (
        asleepFromStages > 0 &&
        (data.sleepHours <= 0 || asleepFromStages >= data.sleepHours * 0.7)
      ) {
        data.sleepHours = Math.min(asleepFromStages, 14);
        data.sleepHasStages = true;
      }
      data.sleepAwakeHours = awake;
      data.sleepDeepHours = deep;
      data.sleepRemHours = rem;
    }

    const cal = preferOriginTotal(
      caloriesAggregate?.ACTIVE_CALORIES_TOTAL?.inKilocalories,
      caloriesAllSources?.ACTIVE_CALORIES_TOTAL?.inKilocalories,
      !!originFilter?.length
    );
    const dist = preferOriginTotal(
      distanceAggregate?.DISTANCE?.inMeters,
      distanceAllSources?.DISTANCE?.inMeters,
      !!originFilter?.length
    );

    if (cal.value != null) {
      data.activeCalories = cal.value;
      if (cal.fellBack) {
        console.warn(
          "[HealthService] Wearable origin wrote no active calories — using all-sources total."
        );
      }
    } else {
      const fallbackCalories = await hcRead(
        hc,
        "ActiveCaloriesBurned",
        startDate,
        endDate,
        true,
        originFilter
      );
      data.activeCalories = fallbackCalories.reduce(
        (sum: number, c: any) => sum + (c.energy?.inKilocalories || 0),
        0
      );
    }

    if (dist.value != null) {
      data.distance = dist.value;
      if (dist.fellBack) {
        console.warn(
          "[HealthService] Wearable origin wrote no distance — using all-sources total."
        );
      }
    } else {
      const fallbackDistance = await hcRead(
        hc,
        "Distance",
        startDate,
        endDate,
        true,
        originFilter
      );
      data.distance = fallbackDistance.reduce(
        (sum: number, d: any) => sum + (d.distance?.inMeters || 0),
        0
      );
    }

    // Dev aid: compare these origins/totals with what the Health Connect app
    // shows. Multiple origins for calories/distance usually mean the wearable
    // and the phone's tracking app are both writing to Health Connect.
    if (__DEV__) {
      console.log(
        `[HealthService] Today: steps=${data.steps} cal=${Math.round(data.activeCalories)} kcal (${(caloriesAggregate?.dataOrigins ?? []).join(", ") || "none"}) dist=${Math.round(data.distance)} m (${(distanceAggregate?.dataOrigins ?? []).join(", ") || "none"})`
      );
    }

    const lastRhr = lastOf(rhr);
    data.restingHeartRate = lastRhr?.beatsPerMinute ?? null;

    const lastHrv = lastOf(hrv);
    data.heartRateVariability = lastHrv?.heartRateVariabilityMillis ?? null;
    if (data.heartRateVariability == null) {
      // Many wearables (Garmin, Fitbit, …) do not write HeartRateVariabilityRmssd
      // records to Health Connect even though they sync heart rate. Derive an
      // RMSSD estimate from the day's heart-rate readings as a fallback.
      const estimated = estimateHrvFromHeartRate(data.heartRate);
      if (estimated != null) {
        data.heartRateVariability = estimated;
        data.hrvEstimated = true;
      }
    }

    const lastResp = lastOf(resp);
    data.respiratoryRate = lastResp?.rate ?? null;

    const lastWeight = lastOf(weight);
    data.weight = lastWeight?.weight?.inKilograms ?? null;

    const lastHeight = lastOf(height);
    data.height =
      lastHeight?.height?.inMeters != null
        ? lastHeight.height.inMeters * 100
        : null;

    const lastBp = lastOf(bp);
    data.bloodPressure = lastBp
      ? {
          systolic: lastBp.systolic?.inMillimetersOfMercury ?? 0,
          diastolic: lastBp.diastolic?.inMillimetersOfMercury ?? 0,
        }
      : null;

    const lastO2 = lastOf(o2);
    data.bloodOxygen = lastO2?.percentage ?? null;

    const lastTemp = lastOf(temp);
    data.bodyTemperature = lastTemp?.temperature?.inCelsius ?? null;

    const lastVo2 = lastOf(vo2);
    data.vo2Max = lastVo2?.vo2MillilitersPerMinuteKilogram ?? null;

    const lastFat = lastOf(bodyFat);
    data.bodyFat = lastFat?.percentage ?? null;

    const lastLean = lastOf(lean);
    data.leanBodyMass = lastLean?.mass?.inKilograms ?? null;

    return data;
  },

  /** True when the platform's workout read is authorized. Android: the
   *  ExerciseSession read permission (declared in app.json as
   *  READ_EXERCISE and requested during setup as an optional type). iOS:
   *  workouts are part of the HealthKit permission set, which hides granular
   *  state — assume granted once setup has completed. */
  async canReadWorkouts(): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;
    try {
      if (ctx.type === "healthkit") return true;
      if (ctx.type === "healthconnect") {
        const granted = await ctx.module.getGrantedPermissions();
        return (
          Array.isArray(granted) &&
          granted.some(
            (p: any) => p?.accessType === "read" && p?.recordType === "ExerciseSession"
          )
        );
      }
      return false;
    } catch {
      return false;
    }
  },

  async getWorkouts(days = 30): Promise<WorkoutSession[]> {
    const safeDays = Math.max(1, Math.min(days, MAX_HEALTH_HISTORY_DAYS));
    const ctx = await getModules();
    if (!ctx) return [];
    const end = new Date();
    const start = daysAgo(safeDays);

    try {
      if (ctx.type === "healthkit") {
        const results = await new Promise<any[]>((resolve) => {
          const fn = ctx.module.getAnchoredWorkouts;
          if (typeof fn !== "function") {
            // Fallback: getSamples with workout type
            hkGet(ctx.module, "getSamples", {
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              type: "Workout",
            }).then(resolve);
            return;
          }
          fn.call(
            ctx.module,
            {
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              type: "Workout",
            },
            (err: any, res: any) => {
              if (err) resolve([]);
              else resolve(res?.data || res || []);
            }
          );
        });

        return results
          .map((w: any, i: number): WorkoutSession => {
            const startTime = new Date(w.start || w.startDate);
            const endTime = new Date(w.end || w.endDate);
            const durationMin =
              w.duration != null
                ? w.duration / 60
                : (endTime.getTime() - startTime.getTime()) / 60000;
            const activityName = w.activityName || w.activityId || "Workout";
            return {
              id: w.id || `hk-${i}-${startTime.getTime()}`,
              name: String(activityName),
              type: String(activityName),
              startTime,
              endTime,
              durationMin: Math.max(0, durationMin),
              calories: w.calories ?? null,
              distance: w.distance ?? null,
              avgHeartRate: null,
              exerciseType: typeof w.activityId === "number" ? w.activityId : null,
            };
          })
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      }

      if (ctx.type === "healthconnect") {
        // ExerciseSession is requested during setup as an optional, recoverable
        // read permission (see HEALTH_CONNECT_OPTIONAL_READ_TYPES). Lost on
        // reconnect, or removed in Health Connect, it is detected here so we
        // can degrade gracefully instead of throwing on the read.
        if (!(await this.canReadWorkouts())) return [];

        const records = await hcRead(ctx.module, "ExerciseSession", start, end);
        // Also pull calories overlapping each session window if available,
        // restricted to the wearable so phone-app calories are not attributed
        // to the workout.
        const originFilter = await resolveDataSourceFilter();
        let calRecords = await hcRead(
          ctx.module,
          "ActiveCaloriesBurned",
          start,
          end,
          true,
          originFilter
        );
        if (!calRecords.length && originFilter?.length) {
          // The wearable writes no calories — fall back to all sources so
          // sessions still get a calorie estimate.
          calRecords = await hcRead(ctx.module, "ActiveCaloriesBurned", start, end);
        }

        return records
          .map((r: any, i: number): WorkoutSession => {
            const startTime = new Date(r.startTime);
            const endTime = new Date(r.endTime);
            const durationMin =
              (endTime.getTime() - startTime.getTime()) / 60000;
            const meta = exerciseMeta(r.exerciseType);
            const name = r.title?.trim() || meta.name;

            // Sum calories that fall inside the session window
            let calories: number | null = null;
            const sessionCals = calRecords.filter((c: any) => {
              const cs = new Date(c.startTime).getTime();
              return cs >= startTime.getTime() && cs <= endTime.getTime();
            });
            if (sessionCals.length) {
              calories = sessionCals.reduce(
                (sum: number, c: any) => sum + (c.energy?.inKilocalories || 0),
                0
              );
            }

            return {
              id: r.metadata?.id || `hc-${i}-${startTime.getTime()}`,
              name,
              type: `${meta.name} · ${meta.category}`,
              startTime,
              endTime,
              durationMin: Math.max(0, durationMin),
              calories,
              distance: null,
              avgHeartRate: null,
              exerciseType: r.exerciseType ?? null,
            };
          })
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      }
    } catch (e) {
      console.warn("[HealthService] getWorkouts failed:", e);
    }
    return [];
  },

  async getDailyActivity(days = 30): Promise<DailyActivity[]> {
    const safeDays = Math.max(1, Math.min(days, MAX_HEALTH_HISTORY_DAYS));
    const ctx = await getModules();
    const end = new Date();
    const start = startOfDay(daysAgo(safeDays - 1));
    const byDate = new Map<string, DailyActivity>();

    // Seed empty days
    for (let i = 0; i < safeDays; i++) {
      const d = daysAgo(safeDays - 1 - i);
      const key = formatDateKey(startOfDay(d));
      byDate.set(key, {
        date: key,
        steps: 0,
        activeCalories: 0,
        workoutCount: 0,
        activeMinutes: 0,
        hasData: false,
        hasSteps: false,
      });
    }

    if (!ctx) return Array.from(byDate.values());

    try {
      if (ctx.type === "healthkit") {
        const steps = await hkGet(ctx.module, "getDailyStepCountSamples", {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
        for (const s of steps) {
          const key = formatDateKey(new Date(s.startDate || s.date));
          const entry = byDate.get(key);
          if (entry) {
            entry.steps += s.value || 0;
            entry.hasData = true;
            entry.hasSteps = true;
          }
        }

        const cals = await hkGet(ctx.module, "getActiveEnergyBurned", {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
        for (const c of cals) {
          const key = formatDateKey(new Date(c.startDate));
          const entry = byDate.get(key);
          if (entry) {
            entry.activeCalories += c.value || 0;
            entry.hasData = true;
          }
        }
      }

      if (ctx.type === "healthconnect") {
        // Aggregate by day so steps and calories are not double-counted across
        // watch, phone, and other Health Connect data sources. Steps, calories,
        // and distance are restricted to the wearable selected during
        // onboarding so the phone's own tracking apps cannot inflate totals.
        const originFilter = await resolveDataSourceFilter();
        const [stepDays, calorieDays, calorieDaysAll] = await Promise.all([
          hcAggregateByDay(ctx.module, "Steps", start, end, originFilter),
          hcAggregateByDay(ctx.module, "ActiveCaloriesBurned", start, end, originFilter),
          hcAggregateByDay(ctx.module, "ActiveCaloriesBurned", start, end),
        ]);

        if (stepDays.length > 0) {
          for (const group of stepDays) {
            const key = formatDateKey(new Date(group.startTime));
            const entry = byDate.get(key);
            if (entry && group.result?.COUNT_TOTAL != null) {
              entry.steps = group.result.COUNT_TOTAL;
              entry.hasData = true;
              entry.hasSteps = true;
            }
          }
        } else {
          const steps = await hcRead(ctx.module, "Steps", start, end, true, originFilter);
          for (const s of steps) {
            const key = formatDateKey(new Date(s.startTime));
            const entry = byDate.get(key);
            if (entry) {
              entry.steps += s.count || 0;
              entry.hasData = true;
              entry.hasSteps = true;
            }
          }
        }

        if (calorieDays.length > 0) {
          const allByDate = new Map(
            calorieDaysAll.map((g: any) => [
              formatDateKey(new Date(g.startTime)),
              g.result?.ACTIVE_CALORIES_TOTAL?.inKilocalories,
            ])
          );
          for (const group of calorieDays) {
            const key = formatDateKey(new Date(group.startTime));
            const entry = byDate.get(key);
            const chosen = preferOriginTotal(
              group.result?.ACTIVE_CALORIES_TOTAL?.inKilocalories,
              allByDate.get(key),
              !!originFilter?.length
            );
            if (entry && chosen.value != null) {
              entry.activeCalories = chosen.value;
              entry.hasData = true;
            }
          }
        } else {
          let cals = await hcRead(
            ctx.module,
            "ActiveCaloriesBurned",
            start,
            end,
            true,
            originFilter
          );
          if (!cals.length && originFilter?.length) {
            // The wearable writes no calories — fall back to all sources so
            // the chart is not zeroed for steps-only devices.
            cals = await hcRead(ctx.module, "ActiveCaloriesBurned", start, end);
          }
          for (const c of cals) {
            const key = formatDateKey(new Date(c.startTime));
            const entry = byDate.get(key);
            if (entry) {
              entry.activeCalories += c.energy?.inKilocalories || 0;
              entry.hasData = true;
            }
          }
        }
      }

      const workouts = await this.getWorkouts(safeDays);
      for (const w of workouts) {
        const key = formatDateKey(w.startTime);
        const entry = byDate.get(key);
        if (entry) {
          entry.workoutCount += 1;
          entry.activeMinutes += w.durationMin;
          entry.hasData = true;
        }
      }
    } catch (e) {
      console.warn("[HealthService] getDailyActivity failed:", e);
    }

    return Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  },

  async getSleepHistory(days = 30): Promise<MetricSample[]> {
    const safeDays = Math.max(1, Math.min(days, MAX_HEALTH_HISTORY_DAYS));
    const ctx = await getModules();
    if (!ctx) return [];
    const end = new Date();
    const start = daysAgo(safeDays);
    const intervalsByDate = new Map<string, Array<[number, number]>>();

    // Split sessions at midnight and merge overlaps. This avoids double-counting
    // overlapping stage records and makes the returned value a daily total.
    const addInterval = (intervalStart: Date, intervalEnd: Date) => {
      let cursor = intervalStart.getTime();
      const finish = intervalEnd.getTime();
      if (!Number.isFinite(cursor) || !Number.isFinite(finish) || finish <= cursor) return;
      while (cursor < finish) {
        const cursorDate = new Date(cursor);
        const nextDay = new Date(
          cursorDate.getFullYear(),
          cursorDate.getMonth(),
          cursorDate.getDate() + 1
        ).getTime();
        const segmentEnd = Math.min(finish, nextDay);
        const key = formatDateKey(cursorDate);
        const segments = intervalsByDate.get(key) ?? [];
        segments.push([cursor, segmentEnd]);
        intervalsByDate.set(key, segments);
        cursor = segmentEnd;
      }
    };

    try {
      if (ctx.type === "healthkit") {
        const samples = await hkGet(ctx.module, "getSleepSamples", {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
        for (const sample of samples) {
          const value = String(sample.value ?? "").toUpperCase();
          // HealthKit stage values include ASLEEP, ASLEEP_CORE, ASLEEP_DEEP,
          // and ASLEEP_REM. Exclude INBED/AWAKE to avoid inflated sleep totals.
          if (value && !value.includes("ASLEEP") && value !== "1") continue;
          addInterval(new Date(sample.startDate), new Date(sample.endDate));
        }
      } else if (ctx.type === "healthconnect") {
        // Health Connect SleepSession records carry stage segments (awake,
        // light, deep, REM) when the wearable writes them. Prefer those over
        // the raw session window so awake time inside the night is not counted
        // as sleep — but only when the stage upload covers most of the session
        // (the same 70% trust rule getTodayData uses), otherwise a partial
        // upload would undercount the night in the daily history.
        const sessions = await hcRead(ctx.module, "SleepSession", start, end);
        for (const session of sessions) {
          const stages = session.stages ?? [];
          const windowHours =
            (new Date(session.endTime).getTime() -
              new Date(session.startTime).getTime()) /
            3600000;
          if (stages.length && Number.isFinite(windowHours) && windowHours > 0) {
            const stageIntervals: Array<[number, number]> = [];
            const asleepIntervals: Array<[number, number]> = [];
            for (const seg of stages) {
              const segStart = new Date(seg.startTime).getTime();
              const segEnd = new Date(seg.endTime).getTime();
              if (!Number.isFinite(segStart) || !Number.isFinite(segEnd) || segEnd <= segStart) {
                continue;
              }
              stageIntervals.push([segStart, segEnd]);
              // SleepStageType: AWAKE=1 and OUT_OF_BED=3 are not sleep.
              if (seg.stage === 1 || seg.stage === 3) continue;
              asleepIntervals.push([segStart, segEnd]);
            }
            const stageHours = mergedIntervalHours(stageIntervals);
            const asleepHours = mergedIntervalHours(asleepIntervals);
            if (asleepHours > 0 && stageHours >= windowHours * 0.7) {
              for (const [s, e] of asleepIntervals) {
                addInterval(new Date(s), new Date(e));
              }
              continue;
            }
          }
          addInterval(new Date(session.startTime), new Date(session.endTime));
        }
      }
    } catch (e) {
      console.warn("[HealthService] getSleepHistory failed:", e);
    }

    return Array.from(intervalsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, segments]) => {
        const merged = segments.sort(([a], [b]) => a - b).reduce<Array<[number, number]>>(
          (result, current) => {
            const previous = result[result.length - 1];
            if (previous && current[0] <= previous[1]) {
              previous[1] = Math.max(previous[1], current[1]);
            } else {
              result.push([...current]);
            }
            return result;
          },
          []
        );
        const hours = merged.reduce((sum, [from, to]) => sum + (to - from) / 3600000, 0);
        return { date, value: Math.min(hours, 18) };
      })
      .filter((sample) => sample.value > 0);
  },

  async getMetricHistory(
    metric: "restingHeartRate" | "heartRateVariability" | "weight" | "bodyFat",
    days = 14
  ): Promise<MetricSample[]> {
    const safeDays = Math.max(1, Math.min(days, MAX_HEALTH_HISTORY_DAYS));
    const ctx = await getModules();
    if (!ctx) return [];
    const end = new Date();
    const start = daysAgo(safeDays);

    try {
      if (ctx.type === "healthkit") {
        const methodMap: Record<string, string> = {
          restingHeartRate: "getRestingHeartRateSamples",
          heartRateVariability: "getHeartRateVariabilitySamples",
          weight: "getWeightSamples",
          bodyFat: "getBodyFatPercentageSamples",
        };
        const samples = await hkGet(ctx.module, methodMap[metric], {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
        const result = samples
          .map((s: any) => {
            let value = s.value;
            if (metric === "bodyFat" && value != null && value <= 1) {
              value = value * 100;
            }
            return {
              date: formatDateKey(new Date(s.startDate || s.endDate)),
              value: Number(value),
            };
          })
          .filter((s: MetricSample) => Number.isFinite(s.value));
        // Some wearables never write dedicated HRV samples. Fall back to a
        // per-day RMSSD estimate from the heart-rate readings.
        if (metric === "heartRateVariability" && result.length === 0) {
          const hrSamples = await hkGet(ctx.module, "getHeartRateSamples", {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          });
          const byDay = new Map<string, number[]>();
          for (const s of hrSamples) {
            const d = new Date(s.startDate || s.endDate);
            if (!Number.isFinite(d.getTime())) continue;
            const key = formatDateKey(d);
            const arr = byDay.get(key) ?? [];
            arr.push(s.value);
            byDay.set(key, arr);
          }
          return Array.from(byDay.entries())
            .map(([date, values]) => ({
              date,
              value: estimateHrvFromHeartRate(values),
            }))
            .filter((s): s is MetricSample => s.value != null)
            .sort((a, b) => a.date.localeCompare(b.date));
        }
        return result;
      }

      if (ctx.type === "healthconnect") {
        const typeMap: Record<string, string> = {
          restingHeartRate: "RestingHeartRate",
          heartRateVariability: "HeartRateVariabilityRmssd",
          weight: "Weight",
          bodyFat: "BodyFat",
        };
        const records = await hcRead(ctx.module, typeMap[metric], start, end);
        const result = records
          .map((r: any) => {
            let value: number | null = null;
            if (metric === "restingHeartRate") value = r.beatsPerMinute;
            else if (metric === "heartRateVariability")
              value = r.heartRateVariabilityMillis;
            else if (metric === "weight") value = r.weight?.inKilograms;
            else if (metric === "bodyFat") value = r.percentage;
            return {
              date: formatDateKey(new Date(r.time || r.startTime || r.endTime)),
              value: Number(value),
            };
          })
          .filter((s: MetricSample) => Number.isFinite(s.value));
        // Many wearables never write HeartRateVariabilityRmssd records to
        // Health Connect. Fall back to a per-day RMSSD estimate from the
        // heart-rate samples.
        if (metric === "heartRateVariability" && result.length === 0) {
          const hrRecords = await hcRead(ctx.module, "HeartRate", start, end);
          const byDay = new Map<string, number[]>();
          for (const rec of hrRecords) {
            for (const sample of rec.samples ?? []) {
              const d = new Date(sample.time ?? rec.startTime);
              if (!Number.isFinite(d.getTime())) continue;
              const key = formatDateKey(d);
              const arr = byDay.get(key) ?? [];
              arr.push(sample.beatsPerMinute);
              byDay.set(key, arr);
            }
          }
          return Array.from(byDay.entries())
            .map(([date, values]) => ({
              date,
              value: estimateHrvFromHeartRate(values),
            }))
            .filter((s): s is MetricSample => s.value != null)
            .sort((a, b) => a.date.localeCompare(b.date));
        }
        return result;
      }
    } catch (e) {
      console.warn(`[HealthService] getMetricHistory(${metric}) failed:`, e);
    }
    return [];
  },
};
