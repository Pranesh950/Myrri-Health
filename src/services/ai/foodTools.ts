// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Phase 1 of the AI-harness migration (see AI_CHAT_REBUILD_PLAN.md §5).
 *
 * The five food tools the chat currently declares as hand-written JSON actions in
 * `app/food-chat.tsx` (`buildFoodToolHandlers`), expressed instead as typed AI SDK
 * `tool()`s. Arguments are validated by a Zod `inputSchema` rather than parsed out of
 * free text, and destructive tools declare `needsApproval` instead of the old
 * `earlyExit` + `pendingApproval` convention.
 *
 * This module is ADDITIVE and gated behind `FOOD_AGENT_ENABLED` (default off), so the
 * shipping chat screen is untouched. Once Phase 0's device spike validates streaming
 * and the approval round-trip, Phase 2 points the food screen at `createFoodAgent()`
 * and the legacy handler factory is deleted.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  deleteMeal,
  estimateServing,
  getFoodByFdcId,
  getMeals,
  logMeal,
  searchFood,
  updateMeal,
  type FoodItem,
  type MealEntry,
} from "../foodDatabase";
import { formatDateKey } from "../journal";

/**
 * Master switch for the migrated food agent. Defaults to OFF so nothing about the
 * current chat changes until a native dev build passes the Phase 0 spike.
 * Enable with `EXPO_PUBLIC_MYRRI_FOOD_AGENT=1` (Expo inlines EXPO_PUBLIC_* at build time).
 */
export const FOOD_AGENT_ENABLED = process.env.EXPO_PUBLIC_MYRRI_FOOD_AGENT === "1";

/** Whole calories, one decimal for macros — matches the legacy handlers exactly. */
const round1 = (value: number) => Math.round(value * 10) / 10;

const catalogRow = (food: FoodItem) => ({
  fdcId: food.fdcId,
  description: food.description,
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat,
  fiber: food.fiber,
});

const mealRow = (meal: MealEntry) => ({
  mealId: meal.id,
  foodName: meal.foodName,
  servingGrams: meal.servingGrams,
  calories: meal.calories,
  protein: meal.protein,
  carbs: meal.carbs,
  fat: meal.fat,
});

/** Per-100g catalog values scaled to a serving. */
function macrosFor(food: FoodItem, servingGrams: number) {
  const multiplier = servingGrams / 100;
  return {
    calories: Math.round(food.calories * multiplier),
    protein: round1(food.protein * multiplier),
    carbs: round1(food.carbs * multiplier),
    fat: round1(food.fat * multiplier),
    fiber: round1(food.fiber * multiplier),
  };
}

/**
 * Resolve a model-supplied reference to a real catalog row.
 *
 * Same resolution order as the legacy `log_meal` handler (id → name → id-as-text), but the
 * caller can see which lookup actually matched, so a substitution is never silent.
 * The legacy handler returned only the resolved row, which let a bad `fdcId` quietly log
 * the top text-search hit (see AI_CHAT_HARNESS.md §11).
 */
async function resolveFood(
  fdcId: string,
  foodName: string
): Promise<{ food: FoodItem; matchedBy: "fdcId" | "foodName" | "fdcIdAsText" } | null> {
  if (fdcId) {
    const byId = await getFoodByFdcId(fdcId);
    if (byId) return { food: byId, matchedBy: "fdcId" };
  }
  if (foodName) {
    const results = await searchFood(foodName);
    if (results.length > 0) return { food: results[0], matchedBy: "foodName" };
  }
  if (fdcId) {
    const results = await searchFood(fdcId);
    if (results.length > 0) return { food: results[0], matchedBy: "fdcIdAsText" };
  }
  return null;
}

async function logFoodEntry(input: {
  fdcId?: string;
  foodName?: string;
  servingGrams?: number;
  calorieTarget?: number;
}) {
  const fdcId = input.fdcId ?? "";
  const foodName = input.foodName ?? "";
  const resolved = await resolveFood(fdcId, foodName);
  if (!resolved) {
    return { ok: false as const, error: `Food not found: ${foodName || fdcId}` };
  }

  const { food, matchedBy } = resolved;
  let servingGrams = input.servingGrams && input.servingGrams > 0 ? input.servingGrams : 0;
  if (servingGrams <= 0) {
    const target = input.calorieTarget ?? 0;
    servingGrams = target > 0 && food.calories > 0
      ? Math.round((target / food.calories) * 100)
      : estimateServing(food.description);
  }

  const now = new Date();
  const entry: MealEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: formatDateKey(now),
    timestamp: now.toISOString(),
    fdcId: food.fdcId,
    foodName: food.description,
    servingGrams,
    ...macrosFor(food, servingGrams),
  };

  await logMeal(entry);
  return { ok: true as const, entry, matchedBy };
}

export const foodTools = {
  search_food: tool({
    description:
      "Search the nutrition database by text. Returns up to 8 matches with per-100g values. Search one food at a time (e.g. eggs, then avocado).",
    inputSchema: z.object({
      query: z.string().min(1).describe("Food name to look up, e.g. 'greek yogurt'."),
    }),
    execute: async ({ query }) => {
      const results = await searchFood(query);
      return {
        query,
        found: results.length,
        results: results.slice(0, 8).map(catalogRow),
      };
    },
  }),

  log_meal: tool({
    description:
      "Log one food to today's log. Provide the exact serving in grams, or a calorieTarget to have the serving computed. Use the fdcId returned by search_food so the right catalog row is logged.",
    inputSchema: z.object({
      fdcId: z.string().optional().describe("Catalog id from search_food."),
      foodName: z.string().optional().describe("Name as returned by search_food."),
      servingGrams: z.number().positive().optional().describe("Serving size in grams."),
      calorieTarget: z
        .number()
        .positive()
        .optional()
        .describe("Desired calories; the serving is derived from the per-100g value."),
    }),
    execute: async (input) => {
      const result = await logFoodEntry(input);
      if (!result.ok) return { logged: false, error: result.error };
      const { entry, matchedBy } = result;
      return {
        logged: true,
        matchedBy,
        fdcId: entry.fdcId,
        foodName: entry.foodName,
        servingGrams: entry.servingGrams,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        // Flagged so a name-based substitution is visible rather than silently accepted.
        substituted: matchedBy !== "fdcId",
      };
    },
  }),

  get_meals: tool({
    description:
      "List every meal logged today, with ids. Call this before editing or deleting anything so you have the correct mealId.",
    inputSchema: z.object({}),
    execute: async () => {
      const date = formatDateKey(new Date());
      const meals = await getMeals(date);
      return { date, count: meals.length, meals: meals.map(mealRow) };
    },
  }),

  delete_meal: tool({
    description:
      "Delete a meal from today's log. Requires the user's approval, and the mealId from get_meals. Do not call this from the chat's manual confirm flow.",
    inputSchema: z.object({
      mealId: z.string().min(1).describe("Meal id from get_meals."),
      foodName: z.string().min(1).describe("Food name, shown in the approval prompt."),
    }),
    needsApproval: true,
    execute: async ({ mealId, foodName }) => {
      const date = formatDateKey(new Date());
      await deleteMeal(date, mealId);
      return { deleted: true, mealId, foodName, date };
    },
  }),

  edit_meal: tool({
    description:
      "Change a meal's serving size. Requires the user's approval, and the mealId from get_meals. Calories and macros are recomputed for the new serving.",
    inputSchema: z.object({
      mealId: z.string().min(1).describe("Meal id from get_meals."),
      foodName: z.string().min(1).describe("Food name, shown in the approval prompt."),
      newServingGrams: z.number().positive().describe("New serving size in grams."),
    }),
    needsApproval: true,
    execute: async ({ mealId, foodName, newServingGrams }) => {
      const date = formatDateKey(new Date());
      const meals = await getMeals(date);
      const target = meals.find((meal) => meal.id === mealId);
      if (!target) return { updated: false, error: `No meal with id ${mealId} in today's log.` };

      // Recompute macros for the new serving. The legacy handler wrote only servingGrams,
      // leaving calories/macros stale (see AI_CHAT_HARNESS.md §11).
      const food = await getFoodByFdcId(target.fdcId);
      const updated = await updateMeal(date, mealId, {
        servingGrams: newServingGrams,
        ...(food ? macrosFor(food, newServingGrams) : {}),
      });
      if (!updated) return { updated: false, error: `Could not update meal ${mealId}.` };

      return {
        updated: true,
        mealId,
        foodName: foodName || target.foodName,
        servingGrams: updated.servingGrams,
        calories: updated.calories,
        protein: updated.protein,
        carbs: updated.carbs,
        fat: updated.fat,
        macrosRecomputed: food !== null,
      };
    },
  }),
} satisfies ToolSet;
