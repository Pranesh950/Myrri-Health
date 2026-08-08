import AsyncStorage from "@react-native-async-storage/async-storage";

const EXERCISE_LOG_KEY = "resistance_log";
const EXERCISE_CATALOG_KEY = "resistance_catalog";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

export interface ExerciseSet {
  reps: number;
  weight: number;
}

export interface ExerciseLogEntry {
  id: string;
  exerciseId: string;
  date: string;
  sets: ExerciseSet[];
  notes?: string;
}

export interface VolumeByMuscleGroup {
  muscleGroup: string;
  volume: number;
}

const DEFAULT_CATALOG: Exercise[] = [
  { id: "bench-press", name: "Bench Press", muscleGroup: "Chest" },
  { id: "overhead-press", name: "Overhead Press", muscleGroup: "Shoulders" },
  { id: "squat", name: "Squat", muscleGroup: "Quads" },
  { id: "deadlift", name: "Deadlift", muscleGroup: "Back" },
  { id: "barbell-row", name: "Barbell Row", muscleGroup: "Back" },
  { id: "pull-up", name: "Pull-Up", muscleGroup: "Back" },
  { id: "dumbbell-curl", name: "Dumbbell Curl", muscleGroup: "Biceps" },
  { id: "triceps-pushdown", name: "Triceps Pushdown", muscleGroup: "Triceps" },
  { id: "leg-press", name: "Leg Press", muscleGroup: "Quads" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscleGroup: "Hamstrings" },
  { id: "lateral-raise", name: "Lateral Raise", muscleGroup: "Shoulders" },
  { id: "face-pull", name: "Face Pull", muscleGroup: "Shoulders" },
  { id: "dumbbell-row", name: "Dumbbell Row", muscleGroup: "Back" },
  { id: "incline-bench", name: "Incline Bench Press", muscleGroup: "Chest" },
  { id: "cable-fly", name: "Cable Fly", muscleGroup: "Chest" },
];

export function getDefaultExercises(): Exercise[] {
  return DEFAULT_CATALOG;
}

export function calcTotalVolume(sets: ExerciseSet[]): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadExerciseCatalog(): Promise<Exercise[]> {
  try {
    const raw = await AsyncStorage.getItem(EXERCISE_CATALOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_CATALOG;
}

export async function saveExerciseCatalog(exercises: Exercise[]): Promise<void> {
  await AsyncStorage.setItem(EXERCISE_CATALOG_KEY, JSON.stringify(exercises));
}

export async function loadLog(): Promise<ExerciseLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(EXERCISE_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveLogEntry(entry: ExerciseLogEntry): Promise<void> {
  const log = await loadLog();
  const idx = log.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    log[idx] = entry;
  } else {
    log.push(entry);
  }
  await AsyncStorage.setItem(EXERCISE_LOG_KEY, JSON.stringify(log));
}

export async function deleteLogEntry(id: string): Promise<void> {
  const log = await loadLog();
  const filtered = log.filter((e) => e.id !== id);
  await AsyncStorage.setItem(EXERCISE_LOG_KEY, JSON.stringify(filtered));
}

export async function getTodayLog(): Promise<ExerciseLogEntry[]> {
  const today = formatDateKey(new Date());
  const log = await loadLog();
  return log.filter((e) => e.date === today);
}

export async function getVolumeHistory(days: number): Promise<{ date: string; volume: number }[]> {
  const log = await loadLog();
  const grouped: Record<string, number> = {};
  for (const entry of log) {
    const vol = calcTotalVolume(entry.sets);
    grouped[entry.date] = (grouped[entry.date] || 0) + vol;
  }
  const result = Object.entries(grouped)
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
  return result;
}

export async function getVolumeByMuscleGroup(days: number): Promise<VolumeByMuscleGroup[]> {
  const log = await loadLog();
  const catalog = await loadExerciseCatalog();
  const cutOff = new Date();
  cutOff.setDate(cutOff.getDate() - days);
  const cutOffStr = formatDateKey(cutOff);

  const result: Record<string, number> = {};
  for (const entry of log) {
    if (entry.date < cutOffStr) continue;
    const ex = catalog.find((e) => e.id === entry.exerciseId);
    const group = ex?.muscleGroup ?? "Other";
    const vol = calcTotalVolume(entry.sets);
    result[group] = (result[group] || 0) + vol;
  }
  return Object.entries(result).map(([muscleGroup, volume]) => ({ muscleGroup, volume }));
}
