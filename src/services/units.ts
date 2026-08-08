// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AsyncStorage from "@react-native-async-storage/async-storage";

export type DistanceUnit = "km" | "mi";
export type WeightUnit = "kg" | "lb";

const DISTANCE_KEY = "distance_unit";
const WEIGHT_KEY = "weight_unit";

export async function getDistanceUnit(): Promise<DistanceUnit> {
  try {
    const stored = await AsyncStorage.getItem(DISTANCE_KEY);
    if (stored === "mi" || stored === "km") return stored;
  } catch {}
  return "km";
}

export async function setDistanceUnit(unit: DistanceUnit): Promise<void> {
  try {
    await AsyncStorage.setItem(DISTANCE_KEY, unit);
  } catch {}
}

export async function getWeightUnit(): Promise<WeightUnit> {
  try {
    const stored = await AsyncStorage.getItem(WEIGHT_KEY);
    if (stored === "lb" || stored === "kg") return stored;
  } catch {}
  return "kg";
}

export async function setWeightUnit(unit: WeightUnit): Promise<void> {
  try {
    await AsyncStorage.setItem(WEIGHT_KEY, unit);
  } catch {}
}

const METERS_PER_MILE = 1609.344;
export const KG_PER_LB = 0.45359237;

export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

/**
 * Formats a distance given in meters for display, respecting the chosen unit.
 * Falls back to "m" for small distances regardless of preference.
 */
export function formatDistance(meters: number, unit: DistanceUnit): string {
  if (unit === "mi") {
    const miles = meters / METERS_PER_MILE;
    return miles >= 0.1 ? `${miles.toFixed(1)} mi` : `${Math.round(meters)} m`;
  }
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

/** Formats a weight given in kilograms for display in the chosen unit. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === "lb") return `${kgToLbs(kg).toFixed(1)} lbs`;
  return `${kg.toFixed(1)} kg`;
}
