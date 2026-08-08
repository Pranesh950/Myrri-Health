import AsyncStorage from "@react-native-async-storage/async-storage";
import { HABIT_LIBRARY, saveActiveHabitIds } from "./journal";
import { getGoalById, getGoalChunkText, searchGoalChunks, GOAL_DOCS } from "./goalLibrary";
import { getHealthProfile } from "./profile";
import { getMeals, MealEntry } from "./foodDatabase";
import { type ToolHandler } from "./localLLM";

// ── Types ─────────────────────────────────────────────────────

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface CoachPlan {
  version: number;
  createdAt: string;
  updatedAt: string;
  goalIds: string[];
  goalLabels: string[];
  habitIds: string[];
  nutrition: NutritionTargets | null;
  sleepHours: number | null;
  stepsPerDay: number | null;
  trainingDays: number | null;
  activityLevel: "sedentary" | "light" | "moderate" | "active";
  focusNote: string;
  generatedBy: "ai" | "draft";
}

export type ActivityLevel = CoachPlan["activityLevel"];

export interface PlanInput {
  goalIds: string[];
  trainingDays: number | null;
  activityLevel: ActivityLevel;
}

const PLAN_KEY = "coach_plan_v1";
const PLAN_VERSION = 1;

export function validateHabitIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const valid = new Set(HABIT_LIBRARY.map((habit) => habit.id));
  return Array.from(new Set(ids.map(String))).filter((id) => valid.has(id)).slice(0, 14);
}

function clamp(value: unknown, min: number, max: number, fallback: number | null): number | null {
  const num = typeof value === "number" && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(Math.min(max, Math.max(min, num)));
}

export function sanitizeNutrition(input: unknown): NutritionTargets | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const calories = clamp(raw.calories, 1200, 6000, null);
  if (calories == null) return null;
  return {
    calories,
    proteinG: clamp(raw.proteinG ?? raw.protein, 40, 400, Math.round(calories * 0.25 / 4))!,
    carbsG: clamp(raw.carbsG ?? raw.carbs, 0, 900, Math.round(calories * 0.4 / 4))!,
    fatG: clamp(raw.fatG ?? raw.fat, 20, 300, Math.round(calories * 0.3 / 9))!,
  };
}

export function sanitizeSleepHours(value: unknown): number | null {
  return clamp(value, 5, 12, null);
}

export function sanitizeStepsPerDay(value: unknown): number | null {
  return clamp(value, 1000, 30000, null);
}

export function sanitizeTrainingDays(value: unknown): number | null {
  return clamp(value, 0, 7, null);
}

// ── Storage ───────────────────────────────────────────────────

export async function loadPlan(): Promise<CoachPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoachPlan;
    if (!parsed || parsed.version !== PLAN_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function savePlan(plan: CoachPlan): Promise<void> {
  await AsyncStorage.setItem(PLAN_KEY, JSON.stringify({ ...plan, version: PLAN_VERSION }));
}

export async function clearPlan(): Promise<void> {
  await AsyncStorage.removeItem(PLAN_KEY);
}

/** Updates just the nutrition targets on the saved plan. Returns the updated plan or null. */
export async function updateNutritionTargets(
  targets: NutritionTargets
): Promise<CoachPlan | null> {
  const sanitized = sanitizeNutrition(targets);
  if (!sanitized) return null;
  const plan = await loadPlan();
  if (!plan) return null;
  const updated: CoachPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
    nutrition: sanitized,
  };
  await savePlan(updated);
  return updated;
}

export async function getPlanGoalSummary(): Promise<string | null> {
  const plan = await loadPlan();
  if (!plan) return null;
  return plan.goalLabels.join(", ") || null;
}

// ── Deterministic draft builder ───────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

function round5(value: number): number {
  return Math.round(value / 5) * 5;
}

// ── Deterministic multi-goal plan builder ─────────────────────

/** Goals compete for the same calorie budget; these modes make the combination
 * logic explicit (cut + bulk → recomposition, etc.). */
type GoalMode = "cut" | "bulk" | "recomp" | "performance" | "maintain";

function collectGoalModes(goalIds: string[]): Set<GoalMode> {
  const modes = new Set<GoalMode>();
  for (const id of goalIds) {
    if (id === "weight_loss") modes.add("cut");
    else if (id === "muscle_gain") modes.add("bulk");
    else if (id === "body_recomp") modes.add("recomp");
    else if (id === "strength" || id === "faster_running" || id === "endurance") modes.add("performance");
    else modes.add("maintain");
  }
  return modes;
}

/**
 * Builds a deterministic, evidence-informed plan from the selected goals and
 * the user's profile. This is the only plan builder — no AI is involved.
 *
 * Multiple goals are combined with logical rules grounded in the sport-science
 * consensus (ISSN/ACSM): cutting + bulking becomes recomposition, deficits are
 * softened when performance goals need fuel, protein rises to the highest goal
 * demand, and habits are ranked by how many selected goals share them.
 */
export async function buildDraftPlan(input: PlanInput): Promise<CoachPlan> {
  const { goalIds, trainingDays, activityLevel } = input;
  const validGoals = goalIds.map(getGoalById).filter(Boolean);
  const selectedIds = new Set(validGoals.map((goal) => goal.id));
  const modes = collectGoalModes(validGoals.map((goal) => goal.id));

  const profile = await getHealthProfile();
  // Estimates based on a reference weight/height; a real profile or Coach
  // chat refines these later.
  const referenceWeightKg = profile?.biologicalSex === "female" ? 62 : profile?.biologicalSex === "male" ? 75 : 68;
  const age = profile?.chronologicalAge ?? 30;
  const isFemale = profile?.biologicalSex === "female";

  // Mifflin-St Jeor.
  const bmr = 10 * referenceWeightKg + 6.25 * 170 - 5 * age + (isFemale ? -161 : 5);
  const tdee = Math.max(1400, bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.375));

  // ── Calorie budget ──────────────────────────────────────────
  // Combining goals: cut + bulk → recomposition (near maintenance); deficits
  // stay conservative when performance goals need fuel; recovery goals stay
  // at maintenance.
  // Goals that don't map to a mode (e.g. sleep, stress) intentionally keep
  // the delta at 0 — maintenance.
  let calorieDelta = 0;
  if (modes.has("cut") && modes.has("bulk")) {
    calorieDelta = -200;
  } else if (modes.has("bulk")) {
    calorieDelta = 250;
  } else if (modes.has("cut")) {
    calorieDelta = modes.has("performance") ? -300 : -450;
  } else if (modes.has("recomp")) {
    calorieDelta = -150;
  } else if (modes.has("performance")) {
    calorieDelta = 100;
  }
  // Never go below the 1200 kcal floor, even on an aggressive cut.
  const calories = round5(Math.max(1200, tdee + calorieDelta));

  // ── Protein — the highest demand across the goal set (g/kg) ─
  let proteinPerKg = 1.6;
  if (selectedIds.has("body_recomp")) proteinPerKg = Math.max(proteinPerKg, 2.2);
  if (selectedIds.has("weight_loss")) proteinPerKg = Math.max(proteinPerKg, 2.0);
  if (selectedIds.has("muscle_gain")) proteinPerKg = Math.max(proteinPerKg, 2.0);
  if (selectedIds.has("strength")) proteinPerKg = Math.max(proteinPerKg, 1.9);
  if (selectedIds.has("injury_recovery")) proteinPerKg = Math.max(proteinPerKg, 1.8);
  if (selectedIds.has("faster_running") || selectedIds.has("endurance")) proteinPerKg = Math.max(proteinPerKg, 1.6);
  const proteinG = Math.round(referenceWeightKg * proteinPerKg);

  // ── Carbs & fat — fuelled by the most demanding training goal ─
  const carbShare =
    selectedIds.has("faster_running") || selectedIds.has("endurance")
      ? 0.5
      : selectedIds.has("strength") || selectedIds.has("muscle_gain")
        ? 0.45
        : 0.4;
  let carbsG = Math.round((calories * carbShare) / 4);
  // Keep carbs inside a sane per-kg band regardless of the percentage.
  carbsG = Math.max(2 * referenceWeightKg, Math.min(6 * referenceWeightKg, carbsG));
  // Fat takes the remainder, held within the 25–35% AMDR band.
  let fatG = Math.round((calories - proteinG * 4 - carbsG * 4) / 9);
  fatG = Math.round(Math.max((calories * 0.25) / 9, Math.min((calories * 0.35) / 9, fatG)));

  // ── Habits — ranked by how many selected goals share them ───
  const habitScores = new Map<string, number>();
  for (const goal of validGoals) {
    for (const habitId of goal.habits) {
      habitScores.set(habitId, (habitScores.get(habitId) ?? 0) + 1);
    }
  }
  // Universal foundations: every plan needs hydration and sleep hygiene.
  for (const id of ["water_goal", "early_bed", "device_bed"]) {
    habitScores.set(id, (habitScores.get(id) ?? 0) + 1);
  }
  const libraryOrder = new Map(HABIT_LIBRARY.map((habit, index) => [habit.id, index]));
  const habitIds = validateHabitIds(
    Array.from(habitScores.entries())
      .map(([id, score]) => ({ id, score, order: libraryOrder.get(id) ?? 999 }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map((entry) => entry.id)
  );

  // ── Sleep & steps — highest demand, honouring recovery ──────
  let sleepHours = validGoals.length
    ? Math.max(...validGoals.map((goal) => goal.sleepHours))
    : 8;
  sleepHours = Math.min(9, Math.max(6.5, sleepHours));

  let stepsPerDay = validGoals.length
    ? Math.max(...validGoals.map((goal) => goal.stepsPerDay))
    : 8000;
  if (selectedIds.has("injury_recovery")) {
    // Recovery wins: pain-free movement only.
    stepsPerDay = Math.min(stepsPerDay, 6000);
  }
  stepsPerDay = Math.min(12000, Math.max(1000, stepsPerDay));

  // ── Focus note ──────────────────────────────────────────────
  const goalLabels = validGoals.map((goal) => goal.label);
  let focusNote: string;
  if (modes.has("cut") && modes.has("bulk")) {
    focusNote =
      "Focused on recomposition — losing fat while building muscle — with a small calorie deficit, high protein, and consistent strength work. Targets are estimates; ask Coach to tune them with your real weight and schedule.";
  } else if (goalLabels.length > 1) {
    const headline = goalLabels
      .slice(0, -1)
      .map((label) => label.toLowerCase())
      .join(", ");
    focusNote = `Focused on ${headline} and ${goalLabels[goalLabels.length - 1].toLowerCase()} together, with targets balanced so the goals support each other. Estimates — ask Coach to personalise them with your weight and schedule.`;
  } else if (goalLabels.length === 1) {
    focusNote = `Focused on ${goalLabels[0].toLowerCase()} with estimated targets — ask Coach to personalise them with your weight and schedule.`;
  } else {
    focusNote = "General health plan with estimated targets — ask Coach to personalise them.";
  }

  const now = new Date().toISOString();
  return {
    version: PLAN_VERSION,
    createdAt: now,
    updatedAt: now,
    goalIds: validGoals.map((goal) => goal.id),
    goalLabels,
    habitIds,
    nutrition: { calories, proteinG, carbsG, fatG },
    sleepHours,
    stepsPerDay,
    trainingDays: sanitizeTrainingDays(trainingDays),
    activityLevel,
    focusNote,
    generatedBy: "draft",
  };
}

/** Applies the plan's habits to the journal habit tab. */
export async function applyPlanHabits(plan: CoachPlan): Promise<string[]> {
  const ids = validateHabitIds(plan.habitIds);
  if (ids.length) await saveActiveHabitIds(ids);
  return ids;
}

export async function applyCurrentPlanHabits(): Promise<string[]> {
  const plan = await loadPlan();
  if (!plan) return [];
  return applyPlanHabits(plan);
}

// ── Nutrition progress ────────────────────────────────────────

export interface NutritionProgressRow {
  key: "calories" | "proteinG" | "carbsG" | "fatG";
  label: string;
  unit: string;
  target: number;
  current: number;
  percent: number;
  achieved: boolean;
}

export function getNutritionProgress(
  meals: MealEntry[],
  targets: NutritionTargets | null
): NutritionProgressRow[] {
  if (!targets) return [];
  const current = {
    calories: meals.reduce((sum, meal) => sum + meal.calories, 0),
    proteinG: meals.reduce((sum, meal) => sum + meal.protein, 0),
    carbsG: meals.reduce((sum, meal) => sum + meal.carbs, 0),
    fatG: meals.reduce((sum, meal) => sum + meal.fat, 0),
  };

  const rows: NutritionProgressRow[] = [
    {
      key: "calories",
      label: "Calories",
      unit: "kcal",
      target: targets.calories,
      current: Math.round(current.calories),
      percent: targets.calories ? Math.min(100, Math.round((current.calories / targets.calories) * 100)) : 0,
      // Calories count as achieved within ±10% of target.
      achieved: Math.abs(current.calories - targets.calories) <= targets.calories * 0.1,
    },
    {
      key: "proteinG",
      label: "Protein",
      unit: "g",
      target: targets.proteinG,
      current: Math.round(current.proteinG * 10) / 10,
      percent: targets.proteinG ? Math.min(100, Math.round((current.proteinG / targets.proteinG) * 100)) : 0,
      achieved: current.proteinG >= targets.proteinG * 0.9,
    },
    {
      key: "carbsG",
      label: "Carbs",
      unit: "g",
      target: targets.carbsG,
      current: Math.round(current.carbsG * 10) / 10,
      percent: targets.carbsG ? Math.min(100, Math.round((current.carbsG / targets.carbsG) * 100)) : 0,
      achieved: current.carbsG >= targets.carbsG * 0.9,
    },
    {
      key: "fatG",
      label: "Fat",
      unit: "g",
      target: targets.fatG,
      current: Math.round(current.fatG * 10) / 10,
      percent: targets.fatG ? Math.min(100, Math.round((current.fatG / targets.fatG) * 100)) : 0,
      achieved: current.fatG >= targets.fatG * 0.9,
    },
  ];
  return rows;
}

// ── Chat plan tools (AI coach can still adjust an existing plan) ─

function getAllGoalIdsForPrompt(): string {
  return GOAL_DOCS.map((goal) => goal.id).join(", ");
}

function buildPlanToolHandlers(
  input: PlanInput,
  isCancelled: () => boolean = () => false
): Record<string, ToolHandler> {
  const { goalIds, trainingDays, activityLevel } = input;

  return {
    get_goal_guidance: async (args) => {
      const goalId = String(args.goalId || "");
      const topic = String(args.topic || "targets");

      const goal = getGoalById(goalId);
      if (!goal) {
        // No exact id: keyword-retrieve across the whole library (RAG fallback).
        const hits = searchGoalChunks(goalId || topic, 4);
        if (!hits.length) {
          return {
            toolResult: JSON.stringify({
              tool: "get_goal_guidance",
              error: `Unknown goal "${goalId}". Known goals: ${getAllGoalIdsForPrompt()}.`,
            }),
          };
        }
        return {
          toolResult: JSON.stringify({
            tool: "get_goal_guidance",
            fuzzy: true,
            matches: hits.map((hit) => ({
              goalId: hit.goalId,
              sectionId: hit.sectionId,
              title: hit.title,
              snippet: hit.snippet,
            })),
            hint: "Call again with a goalId from the matches and a sectionId to expand.",
          }),
        };
      }

      const sectionIds = goal.sections.map((section) => section.id);
      if (sectionIds.includes(topic)) {
        const text = getGoalChunkText(goal.id, [topic], 2200);
        return {
          toolResult: JSON.stringify({
            tool: "get_goal_guidance",
            goalId: goal.id,
            goalLabel: goal.label,
            topic,
            habits: goal.habits,
            sleepHours: goal.sleepHours,
            stepsPerDay: goal.stepsPerDay,
            guidance: text,
          }),
        };
      }

      // Topic phrased loosely (e.g. "protein intake"): retrieve relevant chunks.
      const hits = searchGoalChunks(topic, 3).filter((hit) => hit.goalId === goal.id);
      if (!hits.length) {
        const text = getGoalChunkText(goal.id, ["targets"], 2200);
        return {
          toolResult: JSON.stringify({
            tool: "get_goal_guidance",
            goalId: goal.id,
            goalLabel: goal.label,
            topic: "targets",
            habits: goal.habits,
            sleepHours: goal.sleepHours,
            stepsPerDay: goal.stepsPerDay,
            guidance: text,
          }),
        };
      }
      const text = getGoalChunkText(goal.id, hits.map((hit) => hit.sectionId), 2200);
      return {
        toolResult: JSON.stringify({
          tool: "get_goal_guidance",
          goalId: goal.id,
          goalLabel: goal.label,
          topic: hits.map((hit) => hit.sectionId).join(", "),
          habits: goal.habits,
          sleepHours: goal.sleepHours,
          stepsPerDay: goal.stepsPerDay,
          guidance: text,
        }),
      };
    },

    get_plan: async () => {
      const plan = await loadPlan();
      return {
        toolResult: JSON.stringify({
          tool: "get_plan",
          plan: plan
            ? {
                goalIds: plan.goalIds,
                habitIds: plan.habitIds,
                nutrition: plan.nutrition,
                sleepHours: plan.sleepHours,
                stepsPerDay: plan.stepsPerDay,
                trainingDays: plan.trainingDays,
                focusNote: plan.focusNote,
              }
            : null,
        }),
      };
    },

    update_plan: async (args) => {
      if (isCancelled()) {
        return {
          toolResult: JSON.stringify({
            tool: "update_plan",
            success: false,
            error: "Plan generation was cancelled.",
          }),
        };
      }

      const habitIds = validateHabitIds(args.habitIds);
      const nutrition = sanitizeNutrition(args.nutrition);
      const sleepHours = sanitizeSleepHours(args.sleepHours);
      const stepsPerDay = sanitizeStepsPerDay(args.stepsPerDay);

      // In chat, defaults come from the existing plan so partial edits keep
      // everything else intact. Onboarding passes the fresh selection instead.
      const existing = await loadPlan();
      const effectiveGoalIds = existing?.goalIds?.length ? existing.goalIds : goalIds;
      const effectiveTrainingDays =
        sanitizeTrainingDays(args.trainingDays) ?? existing?.trainingDays ?? trainingDays;
      const effectiveActivityLevel: ActivityLevel =
        existing?.activityLevel ?? activityLevel;

      const validGoals = effectiveGoalIds.map(getGoalById).filter(Boolean);

      const now = new Date().toISOString();
      const plan: CoachPlan = {
        version: PLAN_VERSION,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        goalIds: validGoals.map((goal) => goal.id),
        goalLabels: validGoals.map((goal) => goal.label),
        habitIds,
        nutrition: nutrition ?? existing?.nutrition ?? null,
        sleepHours: sleepHours ?? existing?.sleepHours ?? null,
        stepsPerDay: stepsPerDay ?? existing?.stepsPerDay ?? null,
        trainingDays: effectiveTrainingDays,
        activityLevel: effectiveActivityLevel,
        focusNote: String(args.focusNote || existing?.focusNote || ""),
        generatedBy: "ai",
      };
      await savePlan(plan);
      await applyPlanHabits(plan);

      return {
        toolResult: JSON.stringify({
          tool: "update_plan",
          success: true,
          habitCount: habitIds.length,
          habitNote: habitIds.length
            ? undefined
            : "No valid habit ids received — existing journal habits were left unchanged.",
          nutrition: plan.nutrition,
          sleepHours: plan.sleepHours,
          stepsPerDay: plan.stepsPerDay,
          trainingDays: plan.trainingDays,
        }),
      };
    },
  };
}

/** Chat-ready coach tools that merge into whatever plan already exists. */
export function buildCoachChatToolHandlers(): Record<string, ToolHandler> {
  return buildPlanToolHandlers({ goalIds: [], trainingDays: null, activityLevel: "light" });
}

/** Onboarding entry point: a fully deterministic plan — no AI involved. */
export async function createPlan(input: PlanInput): Promise<{ plan: CoachPlan; usedAi: boolean }> {
  const plan = await buildDraftPlan(input);
  await savePlan(plan);
  await applyPlanHabits(plan);
  return { plan, usedAi: false };
}
