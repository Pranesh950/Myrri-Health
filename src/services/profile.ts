// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "health_profile";

export type BiologicalSex = "female" | "male" | "unspecified";

export interface HealthProfile {
  chronologicalAge: number;
  biologicalSex: BiologicalSex;
}

export async function getHealthProfile(): Promise<HealthProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HealthProfile>;
    if (
      typeof parsed.chronologicalAge !== "number" ||
      !Number.isFinite(parsed.chronologicalAge) ||
      parsed.chronologicalAge < 18 ||
      parsed.chronologicalAge > 100
    ) {
      return null;
    }
    const biologicalSex: BiologicalSex =
      parsed.biologicalSex === "female" || parsed.biologicalSex === "male"
        ? parsed.biologicalSex
        : "unspecified";
    return { chronologicalAge: parsed.chronologicalAge, biologicalSex };
  } catch {
    return null;
  }
}

export async function saveHealthProfile(profile: HealthProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
