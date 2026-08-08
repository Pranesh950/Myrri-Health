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
