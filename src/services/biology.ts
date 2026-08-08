// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { DailyActivity, HealthData, MetricSample } from "./health";

export interface Biomarker {
  id: string;
  title: string;
  value: string;
  unit: string;
  status: "optimal" | "fair" | "attention";
  icon: string;
  iconColor: string;
}

export interface BioAgeHistory {
  restingHeartRate?: MetricSample[];
  heartRateVariability?: MetricSample[];
  sleep?: MetricSample[];
  activity?: DailyActivity[];
}

export interface BioAgeResult {
  /** A physiological-age index, not a clinically validated biological-age clock. */
  biologicalAge: number;
  chronologicalAge: number;
  difference: number;
  label: string;
  color: string;
  /** Heuristic data reliability, not a calibrated statistical confidence interval. */
  confidence: number;
  dataReliability: number;
  confidenceLabel: "low" | "moderate" | "high";
  dataPoints: number;
  coverageDays: number;
  baselineDays: number;
  domainScores: {
    cardiovascular: number;
    activity: number;
    bodyComposition: number;
    recovery: number;
    vitals: number;
  };
}

const IDEAL_RANGES: Record<string, { min: number; max: number; icon: string; iconColor: string }> = {
  hrv: { min: 40, max: 80, icon: "waveform", iconColor: "#5B8FA8" },
  restingHr: { min: 50, max: 70, icon: "heart-pulse", iconColor: "#BF4B4B" },
  respiratoryRate: { min: 12, max: 20, icon: "lungs", iconColor: "#7BAE7F" },
  bloodOxygen: { min: 95, max: 100, icon: "water", iconColor: "#5B8FA8" },
  sleep: { min: 7, max: 9, icon: "weather-night", iconColor: "#5B8FA8" },
  steps: { min: 7000, max: 15000, icon: "shoe-print", iconColor: "#7BAE7F" },
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function finite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

/**
 * Interpolated age references based on published cardiorespiratory-fitness
 * percentile tables (ACSM/FRIEND framework; Kaminsky et al., JACC 2015,
 * doi:10.1016/j.jacc.2015.10.031). These are population reference values,
 * not a validated wearable biological-age clock.
 */
const AGE_POINTS = [20, 30, 40, 50, 60, 70, 80];
const VO2_MALE = [48, 42.4, 37.8, 32.6, 28.2, 24.4, 21.2];
const VO2_FEMALE = [37.6, 30.2, 26.7, 23.4, 20, 18.3, 16.5];
const HRV_REFERENCE = [58, 50, 42, 36, 30, 26, 22];
// Heuristic age-trend anchors for transparent wellness normalization;
// RHR/HRV are secondary signals because device method and acute state matter.
// They are not validated standalone biological-age norms and are intentionally damped.
const RHR_REFERENCE = [66, 67, 69, 70, 71, 72, 73];

function interpolate(age: number, values: number[]): number {
  if (age <= AGE_POINTS[0]) return values[0];
  if (age >= AGE_POINTS[AGE_POINTS.length - 1]) return values[values.length - 1];
  for (let i = 1; i < AGE_POINTS.length; i += 1) {
    if (age <= AGE_POINTS[i]) {
      const fraction = (age - AGE_POINTS[i - 1]) / (AGE_POINTS[i] - AGE_POINTS[i - 1]);
      return values[i - 1] + (values[i] - values[i - 1]) * fraction;
    }
  }
  return values[values.length - 1];
}

export function getVO2MaxNorm(age: number, isMale: boolean): number {
  return interpolate(age, isMale ? VO2_MALE : VO2_FEMALE);
}

export function getHRVNorm(age: number): number {
  return interpolate(age, HRV_REFERENCE);
}

export function getRHRNorm(age: number): number {
  return interpolate(age, RHR_REFERENCE);
}

function median(values: number[]): number | null {
  const clean = values.filter((value) => finite(value) && value > 0).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 0
    ? (clean[middle - 1] + clean[middle]) / 2
    : clean[middle];
}

/** Collapse dense device samples to one robust value per calendar day first. */
function dailyMedians(samples: MetricSample[]): MetricSample[] {
  const byDate = new Map<string, number[]>();
  for (const sample of samples) {
    if (!finite(sample.value) || sample.value <= 0) continue;
    const values = byDate.get(sample.date) ?? [];
    values.push(sample.value);
    byDate.set(sample.date, values);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, value: median(values)! }));
}

function scoreHigherBetter(value: number | null, reference: number, spread: number): number | null {
  return finite(value) && value > 0
    ? clamp(50 + ((value / reference) - 1) * spread)
    : null;
}

function scoreLowerBetter(value: number | null, reference: number, spread: number): number | null {
  return finite(value) && value > 0
    ? clamp(50 + ((reference - value) / reference) * spread)
    : null;
}

function getVO2Reference(
  age: number,
  biologicalSex: "female" | "male" | "unspecified"
): number {
  if (biologicalSex === "female") return getVO2MaxNorm(age, false);
  if (biologicalSex === "male") return getVO2MaxNorm(age, true);
  return (getVO2MaxNorm(age, true) + getVO2MaxNorm(age, false)) / 2;
}

function scoreVO2(value: number | null, age: number, biologicalSex: "female" | "male" | "unspecified"): number | null {
  return scoreHigherBetter(value, getVO2Reference(age, biologicalSex), 58);
}

function scoreSleep(hours: number | null): number | null {
  if (!finite(hours) || hours <= 0) return null;
  // Broad adult sleep guidance: reward 7–9 hours without treating a target as a diagnosis.
  if (hours >= 7 && hours <= 9) return 92;
  if (hours >= 6 && hours < 7) return clamp(92 - (7 - hours) * 28);
  if (hours > 9 && hours <= 10) return clamp(92 - (hours - 9) * 24);
  if (hours >= 5 && hours < 6) return clamp(58 - (6 - hours) * 25);
  if (hours > 10 && hours <= 12) return clamp(68 - (hours - 10) * 22);
  return 20;
}

function scoreActivity(days: DailyActivity[]): { score: number | null; coverage: number } {
  if (!days.length) return { score: null, coverage: 0 };
  // Only count days with an actual movement signal. Calorie-only records are
  // intentionally excluded because device calorie estimates are not a stable
  // activity measure; explicit zero-step days remain valid observations.
  const observed = days.filter(
    (day) => day.hasSteps === true || day.activeMinutes > 0
  );
  if (!observed.length) return { score: null, coverage: 0 };
  const stepScores = observed
    .map((day) => (day.hasSteps === true ? clamp((day.steps / 7500) * 100) : null))
    .filter((score): score is number => score != null);
  const minuteScores = observed
    .map((day) => (day.activeMinutes > 0 ? clamp((day.activeMinutes / 30) * 100) : null))
    .filter((score): score is number => score != null);
  // Steps and active minutes are correlated, so they form one movement domain;
  // calories are intentionally excluded because they are device-dependent.
  const movementScores = stepScores.length && minuteScores.length
    ? [median(stepScores), median(minuteScores)].filter((score): score is number => score != null)
    : stepScores.length ? stepScores : minuteScores;
  return {
    score: median(movementScores),
    coverage: observed.length / days.length,
  };
}

function scoreBodyFat(
  bodyFat: number | null,
  biologicalSex: "female" | "male" | "unspecified"
): number | null {
  if (!finite(bodyFat) || bodyFat <= 0 || bodyFat >= 70) return null;
  const ideal = biologicalSex === "female" ? 25 : biologicalSex === "male" ? 18 : 21.5;
  return clamp(100 - (Math.abs(bodyFat - ideal) / 12) * 100);
}

function scoreBMI(weightKg: number | null, heightCm: number | null): number | null {
  if (!finite(weightKg) || !finite(heightCm) || weightKg <= 0 || heightCm <= 0) return null;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  if (bmi >= 18.5 && bmi <= 24.9) return 90;
  if (bmi >= 17 && bmi < 18.5 || bmi > 24.9 && bmi <= 29.9) return 65;
  if (bmi >= 15 && bmi < 17 || bmi > 29.9 && bmi <= 34.9) return 40;
  return 20;
}

function scoreBloodPressure(pressure: HealthData["bloodPressure"]): number | null {
  if (!pressure || !finite(pressure.systolic) || !finite(pressure.diastolic)) return null;
  const { systolic, diastolic } = pressure;
  if (systolic < 90 || diastolic < 60) return 45;
  if (systolic < 120 && diastolic < 80) return 95;
  if (systolic < 130 && diastolic < 80) return 82;
  if (systolic < 140 || diastolic < 90) return 58;
  if (systolic < 180 || diastolic < 120) return 32;
  return 15;
}

function weightedAvailable(values: Array<[number | null, number]>): { score: number | null; weight: number } {
  const available = values.filter(
    ([value, weight]) => finite(value) && weight > 0
  ) as Array<[number, number]>;
  if (!available.length) return { score: null, weight: 0 };
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return { score: null, weight: 0 };
  }
  const score = available.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
  return { score: Math.round(score), weight: totalWeight };
}

function getAgeLabel(difference: number): { label: string; color: string } {
  if (difference <= -5) return { label: "Exceptional", color: "#2F8F6B" };
  if (difference <= -2) return { label: "Excellent", color: "#5B9E6F" };
  if (difference <= 1) return { label: "Good", color: "#7BAE7F" };
  if (difference <= 4) return { label: "Fair", color: "#D4A24C" };
  if (difference <= 8) return { label: "Needs improvement", color: "#C4892A" };
  return { label: "Needs attention", color: "#C45C52" };
}

/**
 * Estimate a wellness-oriented biological-age index from available signals.
 *
 * This is intentionally not a clinical aging clock: consumer metrics vary by
 * device and are noisy. The model therefore uses age-matched reference values,
 * continuous scores, domain caps, availability-aware weights, and a confidence
 * dampener so sparse data cannot create a dramatic age gap.
 */
export function calculateBiologicalAge(
  chronologicalAge: number,
  data: Partial<HealthData>,
  biologicalSex: "female" | "male" | "unspecified" = "unspecified",
  history: BioAgeHistory = {}
): BioAgeResult {
  const age = clamp(chronologicalAge, 18, 100);
  const rhrHistory = dailyMedians(history.restingHeartRate ?? []);
  const hrvHistory = dailyMedians(history.heartRateVariability ?? []);
  const sleepHistory = dailyMedians(history.sleep ?? []);
  const rhrValues = rhrHistory.map((sample) => sample.value);
  const hrvValues = hrvHistory.map((sample) => sample.value);
  const sleepValues = sleepHistory.map((sample) => sample.value);
  const rhr = scoreLowerBetter(median(rhrValues) ?? data.restingHeartRate ?? null, getRHRNorm(age), 72);
  const hrv = scoreHigherBetter(median(hrvValues) ?? data.heartRateVariability ?? null, getHRVNorm(age), 50);
  const sleep = scoreSleep(median(sleepValues) ?? data.sleepHours ?? null);
  const activity = scoreActivity(history.activity ?? []);
  const vo2 = scoreVO2(data.vo2Max ?? null, age, biologicalSex);
  const bodyFat = scoreBodyFat(data.bodyFat ?? null, biologicalSex);
  const bmi = scoreBMI(data.weight ?? null, data.height ?? null);
  const bloodPressure = scoreBloodPressure(data.bloodPressure ?? null);

  // One score per domain prevents correlated signals from pretending to be
  // independent evidence. VO2 max is the primary anchor when available.
  const cardiovascular = weightedAvailable([
    [vo2, 0.62],
    [rhr, 0.23],
    [hrv, 0.15],
  ]);
  const bodyComposition = weightedAvailable([
    [bodyFat, 1],
    [bodyFat == null ? bmi : null, 1],
  ]);
  const recovery = weightedAvailable([[sleep, 1]]);
  const vitals = weightedAvailable([[bloodPressure, 1]]);

  const weightedDomains: Array<[number | null, number]> = [
    [cardiovascular.score, 0.48 * cardiovascular.weight],
    [activity.score, 0.22 * activity.coverage],
    [bodyComposition.score, 0.14 * bodyComposition.weight],
    [recovery.score, 0.1 * (sleepValues.length ? Math.min(1, sleepValues.length / 14) : 0)],
    [vitals.score, 0.06 * vitals.weight],
  ];
  const overall = weightedAvailable(weightedDomains);
  const historyWindowDays = 30;
  const coverageFor = (samples: MetricSample[]): number =>
    Math.min(1, new Set(samples.map((sample) => sample.date)).size / historyWindowDays);
  const historyCoverageInputs: Array<[number, number]> = [];
  if (rhrHistory.length) historyCoverageInputs.push([coverageFor(rhrHistory), 0.3]);
  if (hrvHistory.length) historyCoverageInputs.push([coverageFor(hrvHistory), 0.25]);
  if (sleepHistory.length) historyCoverageInputs.push([coverageFor(sleepHistory), 0.25]);
  if (activity.score != null) historyCoverageInputs.push([activity.coverage, 0.2]);
  const coverageWeight = historyCoverageInputs.reduce((sum, [, weight]) => sum + weight, 0);
  const weightedHistoryCoverage = coverageWeight > 0
    ? historyCoverageInputs.reduce((sum, [coverage, weight]) => sum + coverage * weight, 0) / coverageWeight
    : 0;
  const baselineDays = Math.round(weightedHistoryCoverage * historyWindowDays);
  const dataPoints = [vo2, rhr, hrv, sleep, activity.score, bodyFat, bmi, bloodPressure]
    .filter((value) => value != null).length;
  const domainCoverage = weightedDomains.reduce(
    (sum, [score, weight]) => score == null ? sum : sum + weight,
    0
  );
  const historyQuality = weightedHistoryCoverage;
  const confidence = clamp(domainCoverage * 100 * (0.55 + historyQuality * 0.45));
  const confidenceLabel: BioAgeResult["confidenceLabel"] =
    confidence >= 70 ? "high" : confidence >= 40 ? "moderate" : "low";

  // This is a calibrated index, not a mortality model. Keep the gap small and
  // damp it heavily until at least two weeks of longitudinal data exist.
  const rawAdjustment = ((overall.score ?? 50) - 50) / 50 * 8;
  const adjustment = rawAdjustment * (0.35 + 0.65 * historyQuality) * (confidence / 100);
  const biologicalAge = Math.round(clamp(age - adjustment, 18, 100));
  const difference = biologicalAge - Math.round(age);
  const ageLabel = getAgeLabel(difference);

  return {
    biologicalAge,
    chronologicalAge: Math.round(age),
    difference,
    label: ageLabel.label,
    color: ageLabel.color,
    confidence: Math.round(confidence),
    dataReliability: Math.round(confidence),
    confidenceLabel,
    dataPoints,
    coverageDays: baselineDays,
    baselineDays,
    domainScores: {
      cardiovascular: cardiovascular.score ?? 0,
      activity: activity.score ?? 0,
      bodyComposition: bodyComposition.score ?? 0,
      recovery: recovery.score ?? 0,
      vitals: vitals.score ?? 0,
    },
  };
}

export function getStatusForValue(value: number, range: { min: number; max: number }): "optimal" | "fair" | "attention" {
  if (value >= range.min && value <= range.max) return "optimal";
  const tolerance = (range.max - range.min) * 0.3;
  if (value >= range.min - tolerance && value <= range.max + tolerance) return "fair";
  return "attention";
}

export function buildBiomarkers(data: Partial<HealthData>): Biomarker[] {
  const markers: Biomarker[] = [];

  if (data.heartRateVariability != null) {
    const range = IDEAL_RANGES.hrv;
    markers.push({
      id: "hrv",
      title: "HRV",
      value: `${Math.round(data.heartRateVariability)}`,
      unit: "ms",
      status: getStatusForValue(data.heartRateVariability, range),
      icon: range.icon,
      iconColor: range.iconColor,
    });
  }

  if (data.restingHeartRate != null) {
    const range = IDEAL_RANGES.restingHr;
    markers.push({
      id: "restingHr",
      title: "Resting HR",
      value: `${Math.round(data.restingHeartRate)}`,
      unit: "bpm",
      status: getStatusForValue(data.restingHeartRate, range),
      icon: range.icon,
      iconColor: range.iconColor,
    });
  }

  if (data.respiratoryRate != null) {
    const range = IDEAL_RANGES.respiratoryRate;
    markers.push({
      id: "respiratoryRate",
      title: "Respiratory Rate",
      value: `${data.respiratoryRate.toFixed(1)}`,
      unit: "rpm",
      status: getStatusForValue(data.respiratoryRate, range),
      icon: range.icon,
      iconColor: range.iconColor,
    });
  }

  if (data.bloodOxygen != null) {
    const range = IDEAL_RANGES.bloodOxygen;
    markers.push({
      id: "bloodOxygen",
      title: "Blood Oxygen",
      value: `${Math.round(data.bloodOxygen)}`,
      unit: "%",
      status: getStatusForValue(data.bloodOxygen, range),
      icon: range.icon,
      iconColor: range.iconColor,
    });
  }

  if (data.sleepHours != null && data.sleepHours > 0) {
    const range = IDEAL_RANGES.sleep;
    markers.push({
      id: "sleep",
      title: "Sleep",
      value: `${data.sleepHours.toFixed(1)}`,
      unit: "hrs",
      status: getStatusForValue(data.sleepHours, range),
      icon: range.icon,
      iconColor: range.iconColor,
    });
  }

  if (data.steps != null) {
    const range = IDEAL_RANGES.steps;
    markers.push({
      id: "steps",
      title: "Steps",
      value: `${data.steps.toLocaleString()}`,
      unit: "",
      status: getStatusForValue(data.steps, range),
      icon: range.icon,
      iconColor: range.iconColor,
    });
  }

  return markers;
}
