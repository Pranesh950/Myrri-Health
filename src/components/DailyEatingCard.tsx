// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { MealEntry } from "../services/foodDatabase";
import { theme } from "../theme";

interface DailyEatingCardProps {
  meals: MealEntry[];
}

const MACRO_COLORS = {
  protein: "#5D8793",
  carbs: "#D69A43",
  fat: "#C96D63",
};

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getDayPart(timestamp: string): "morning" | "midday" | "evening" {
  const hour = new Date(timestamp).getHours();
  if (hour < 11) return "morning";
  if (hour < 16) return "midday";
  return "evening";
}

function getPatternLabel(meals: MealEntry[]): string {
  if (meals.length === 1) return "Just getting started";
  const parts = new Set(meals.map((meal) => getDayPart(meal.timestamp)));
  if (parts.size >= 3) return "A nicely spread-out day";
  if (parts.size === 2) return "A couple of eating windows";
  return "A focused eating window";
}

function getPatternDescription(meals: MealEntry[]): string {
  if (meals.length === 1) return "Add more as you go to see your full-day pattern.";
  const parts = new Set(meals.map((meal) => getDayPart(meal.timestamp)));
  if (parts.size >= 3) return "Your logged meals are spread across morning, midday, and evening.";
  if (parts.size === 2) return "You logged food in two different parts of the day.";
  return "Most of your logged food was in the same part of the day.";
}

function MacroRow({ label, grams, percent, color }: { label: string; grams: number; percent: number; color: string }) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelWrap}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${Math.max(percent, grams > 0 ? 3 : 0)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>{round(grams, 1)}g</Text>
    </View>
  );
}

export function DailyEatingCard({ meals }: DailyEatingCardProps) {
  const summary = useMemo(() => {
    const calories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const protein = meals.reduce((sum, meal) => sum + meal.protein, 0);
    const carbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
    const fat = meals.reduce((sum, meal) => sum + meal.fat, 0);
    const macroCalories = { protein: protein * 4, carbs: carbs * 4, fat: fat * 9 };
    const macroTotal = macroCalories.protein + macroCalories.carbs + macroCalories.fat;
    const parts = new Set(meals.map((meal) => getDayPart(meal.timestamp)));

    return {
      calories,
      protein,
      carbs,
      fat,
      parts,
      percentages: {
        protein: macroTotal ? (macroCalories.protein / macroTotal) * 100 : 0,
        carbs: macroTotal ? (macroCalories.carbs / macroTotal) * 100 : 0,
        fat: macroTotal ? (macroCalories.fat / macroTotal) * 100 : 0,
      },
    };
  }, [meals]);

  if (meals.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>How you ate</Text>
            <Text style={styles.subtitle}>A gentle snapshot from your food log</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyPlate}>
            <MaterialCommunityIcons name="food-apple-outline" size={24} color={theme.colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>Your day is still unwritten</Text>
          <Text style={styles.emptyText}>Log a meal to see timing, variety, and nutrition patterns here.</Text>
        </View>
        <Text style={styles.disclaimer}>Based only on what you log — not a grade.</Text>
      </View>
    );
  }

  const patternLabel = getPatternLabel(meals);
  const patternDescription = getPatternDescription(meals);
  const hasMultipleWindows = summary.parts.size > 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>How you ate</Text>
          <Text style={styles.subtitle}>A gentle snapshot from your food log</Text>
        </View>
        <View style={styles.loggedBadge}>
          <Text style={styles.loggedBadgeText}>{meals.length} {meals.length === 1 ? "item" : "items"}</Text>
        </View>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.calorieOrb}>
          <Text style={styles.calorieValue}>{Math.round(summary.calories).toLocaleString()}</Text>
          <Text style={styles.calorieUnit}>cal logged</Text>
        </View>
        <View style={styles.patternCopy}>
          <Text style={styles.patternEyebrow}>TODAY'S RHYTHM</Text>
          <Text style={styles.patternTitle}>{patternLabel}</Text>
          <Text style={styles.patternDescription}>{patternDescription}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.macroSection}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Macro mix</Text>
          <Text style={styles.sectionHint}>calorie share</Text>
        </View>
        <View style={styles.macroStack}>
          {summary.percentages.protein + summary.percentages.carbs + summary.percentages.fat > 0 ? (
            <>
              <View style={[styles.stackSegment, { flex: summary.percentages.protein, backgroundColor: MACRO_COLORS.protein }]} />
              <View style={[styles.stackSegment, { flex: summary.percentages.carbs, backgroundColor: MACRO_COLORS.carbs }]} />
              <View style={[styles.stackSegment, { flex: summary.percentages.fat, backgroundColor: MACRO_COLORS.fat }]} />
            </>
          ) : <View style={styles.stackEmpty} />}
        </View>
        <MacroRow label="Protein" grams={summary.protein} percent={summary.percentages.protein} color={MACRO_COLORS.protein} />
        <MacroRow label="Carbs" grams={summary.carbs} percent={summary.percentages.carbs} color={MACRO_COLORS.carbs} />
        <MacroRow label="Fat" grams={summary.fat} percent={summary.percentages.fat} color={MACRO_COLORS.fat} />
      </View>

      <Text style={styles.disclaimer}>
        {hasMultipleWindows ? "A snapshot of your logged meals — not a prescription or a score." : "Add more meals to make this snapshot more complete."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadows.module,
  },
  header: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  headerIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: `${theme.colors.primary}09`, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { ...theme.typography.titleMd, color: theme.colors.ink },
  subtitle: { ...theme.typography.legal, color: theme.colors.muted, marginTop: 2 },
  loggedBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceElevated },
  loggedBadgeText: { ...theme.typography.legal, color: theme.colors.body, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg, marginTop: theme.spacing.lg },
  calorieOrb: { width: 92, height: 92, borderRadius: 46, backgroundColor: `${theme.colors.lime}18`, borderWidth: 7, borderColor: `${theme.colors.lime}35`, alignItems: "center", justifyContent: "center" },
  calorieValue: { ...theme.typography.titleLg, color: theme.colors.ink, fontSize: 20 },
  calorieUnit: { ...theme.typography.legal, color: theme.colors.muted, marginTop: 1 },
  patternCopy: { flex: 1 },
  patternEyebrow: { ...theme.typography.legal, color: theme.colors.muted, letterSpacing: 1, marginBottom: 4 },
  patternTitle: { ...theme.typography.titleMd, color: theme.colors.ink },
  patternDescription: { ...theme.typography.legal, color: theme.colors.body, lineHeight: 16, marginTop: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: theme.spacing.lg },
  sectionLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.sm },
  sectionLabel: { ...theme.typography.labelMd, color: theme.colors.ink },
  sectionHint: { ...theme.typography.legal, color: theme.colors.muted },
  timingSection: {},
  timeline: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 8 },
  timelineItem: { alignItems: "center", flex: 1 },
  timelinePointRow: { width: "100%", height: 16, flexDirection: "row", alignItems: "center" },
  timelineLine: { flex: 1, height: 2, backgroundColor: theme.colors.border },
  timelineLinePlaceholder: { flex: 1, height: 2, backgroundColor: "transparent" },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: theme.colors.border, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  timelineDotActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  timelineDotInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.card },
  timelineLabel: { ...theme.typography.legal, color: theme.colors.muted, marginTop: 5 },
  timelineLabelActive: { color: theme.colors.ink, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  macroSection: { marginTop: theme.spacing.lg },
  macroStack: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: theme.colors.surfaceElevated, marginBottom: theme.spacing.md },
  stackSegment: { height: "100%" },
  stackEmpty: { flex: 1 },
  macroRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 7 },
  macroLabelWrap: { flexDirection: "row", alignItems: "center", gap: 5, width: 62 },
  macroDot: { width: 7, height: 7, borderRadius: 4 },
  macroLabel: { ...theme.typography.legal, color: theme.colors.body },
  macroTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.colors.surfaceElevated, overflow: "hidden" },
  macroFill: { height: "100%", borderRadius: 3 },
  macroValue: { ...theme.typography.legal, color: theme.colors.ink, width: 38, textAlign: "right", fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  disclaimer: { ...theme.typography.legal, color: theme.colors.muted, lineHeight: 15, marginTop: theme.spacing.md },
  emptyState: { alignItems: "center", paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.md },
  emptyPlate: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.surfaceElevated, alignItems: "center", justifyContent: "center", marginBottom: theme.spacing.sm },
  emptyTitle: { ...theme.typography.labelMd, color: theme.colors.ink },
  emptyText: { ...theme.typography.legal, color: theme.colors.muted, textAlign: "center", lineHeight: 16, marginTop: 4 },
});
