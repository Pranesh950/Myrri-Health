// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../src/theme";
import { useGoBack } from "../src/hooks/useGoBack";
import {  getFoodByFdcId, searchFood, logMeal, deleteMeal, getServingUnits, estimateServing, getFoodDatabaseAttribution, FoodItem, MealEntry } from "../src/services/foodDatabase";
import type { ServingUnit } from "../src/services/foodDatabase";

export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const handleBack = useGoBack();
  const { fdcId, foodName, serving: presetServing, mealId, date: mealDate } = useLocalSearchParams<{
    fdcId: string;
    foodName?: string;
    serving?: string;
    mealId?: string;
    date?: string;
  }>();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState(presetServing || "100");
  const [logging, setLogging] = useState(false);
  const [activeUnit, setActiveUnit] = useState<ServingUnit | null>(null);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const isEditing = !!mealId;

  const servingUnits = useMemo(() => food ? getServingUnits(food.description) : [], [food]);

  useEffect(() => {
    (async () => {
      if (!fdcId) return;
      try {
        let item = await getFoodByFdcId(fdcId);
        // Legacy meal logs may contain a USDA numeric ID that is not present
        // in OpenNutrition. Resolve those entries by their stored food name.
        if (!item && mealId && foodName) {
          const matches = await searchFood(foodName);
          item = matches.find((match) => match.description.toLowerCase() === foodName.toLowerCase()) ?? matches[0] ?? null;
        }
        setFood(item);
        if (!presetServing && item) {
          const estimated = estimateServing(item.description);
          setServing(String(estimated));
        }
      } catch (e) {
        console.warn("[FoodDetail] Load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [fdcId, foodName, mealId, presetServing]);

  // The typed number is grams when no unit is selected, otherwise a count of
  // the active unit (e.g. 2 oranges). gramsPerUnit converts either to grams.
  const rawCount = Number(serving) || 0;
  const grams = activeUnit
    ? Math.max(1, Math.round(rawCount * activeUnit.gramsPerUnit))
    : Math.max(1, rawCount);
  const multiplier = grams / 100;
  const currentUnitCount = activeUnit ? grams / activeUnit.gramsPerUnit : 0;
  const displayCount = activeUnit ? Math.round(currentUnitCount * 100) / 100 : 0;

  const unitWord = (unit: ServingUnit | null, count: number): string => {
    if (!unit) return count === 1 ? "gram" : "grams";
    return count === 1 ? unit.label : unit.plural;
  };

  const handleServingChange = (text: string) => {
    setServing(text);
  };

  const selectUnit = (unit: ServingUnit | null) => {
    if (!unit || unit.label === "g") {
      // Back to grams: convert the current count to its gram equivalent.
      if (activeUnit) setServing(String(grams));
      setActiveUnit(null);
    } else {
      // Convert the current amount into the newly chosen unit. Keep the exact
      // gram weight (fractional counts allowed, e.g. 0.5 serving) instead of
      // rounding up to a whole unit and inflating the amount.
      const count = grams / unit.gramsPerUnit;
      setServing(String(Math.max(0.01, Math.round(count * 100) / 100)));
      setActiveUnit(unit);
    }
    setUnitPickerVisible(false);
  };

  const macros = useMemo(() => {
    if (!food) return null;
    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      fiber: Math.round(food.fiber * multiplier * 10) / 10,
    };
  }, [food, multiplier]);

  const handleLog = async () => {
    if (!food || !macros || logging) return;

    setLogging(true);
    const today = new Date().toISOString().split("T")[0];
    const entry: MealEntry = {
      id: isEditing && mealId ? mealId : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: isEditing && mealDate ? mealDate : today,
      timestamp: new Date().toISOString(),
      fdcId: food.fdcId,
      foodName: food.description,
      servingGrams: grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
    };

    try {
      if (isEditing && mealDate) {
        await deleteMeal(mealDate, entry.id);
      }
      await logMeal(entry);
      handleBack();
    } catch (e) {
      console.warn("[FoodDetail] Log failed:", e);
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (!food) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food not found</Text>
          <View style={styles.backBtn} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{food.description}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.content}>
        <Text style={styles.category}>{food.category}</Text>
        <Text style={styles.attribution}>{getFoodDatabaseAttribution()}</Text>

        <View style={styles.servingCard}>
          {/* Amount input row: number + unit dropdown */}
          <View style={styles.servingRow}>
            <View style={styles.servingInputWrap}>
              <TextInput
                style={styles.servingInput}
                value={serving}
                onChangeText={handleServingChange}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
              />
              <TouchableOpacity
                style={styles.unitSelect}
                onPress={() => setUnitPickerVisible(true)}
                activeOpacity={0.7}
                accessibilityLabel="Choose unit"
              >
                <Text style={styles.unitSelectText}>
                  {activeUnit ? unitWord(activeUnit, displayCount) : "grams"}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.macrosCard}>
          <Text style={styles.macrosTitle}>
            Nutrition for{" "}
            {activeUnit
              ? `${displayCount} ${unitWord(activeUnit, displayCount)} (${grams}g)`
              : `${grams}g`}
          </Text>
          <View style={styles.macroRow}>
            <View style={[styles.macroBadge, { backgroundColor: "#FEF3C7" }]}>
              <Text style={styles.macroValue}>{macros?.calories ?? 0}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={[styles.macroBadge, { backgroundColor: "#DBEAFE" }]}>
              <Text style={styles.macroValue}>{macros?.protein ?? 0}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={[styles.macroBadge, { backgroundColor: "#FCE7F3" }]}>
              <Text style={styles.macroValue}>{macros?.carbs ?? 0}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
          </View>
          <View style={styles.macroRow}>
            <View style={[styles.macroBadge, { backgroundColor: "#E0E7FF" }]}>
              <Text style={styles.macroValue}>{macros?.fat ?? 0}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
            <View style={[styles.macroBadge, { backgroundColor: "#D1FAE5" }]}>
              <Text style={styles.macroValue}>{macros?.fiber ?? 0}g</Text>
              <Text style={styles.macroLabel}>Fiber</Text>
            </View>
            <View style={[styles.macroBadge, { backgroundColor: "#F3E8FF" }]}>
              <Text style={styles.macroValue}>{food.calories}</Text>
              <Text style={styles.macroLabel}>Per 100g</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logBtn, logging && styles.logBtnDisabled]}
          onPress={handleLog}
          disabled={logging || !grams}
          activeOpacity={0.8}
        >
          {logging ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name={isEditing ? "pencil" : "check"} size={20} color="#FFFFFF" />
              <Text style={styles.logBtnText}>{isEditing ? "Update" : "Log"} {macros?.calories ?? 0} cal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Unit picker sheet */}
      <Modal
        visible={unitPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setUnitPickerVisible(false)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Choose unit</Text>
            <Text style={styles.pickerSub}>{food.description}</Text>

            <TouchableOpacity
              style={[styles.pickerRow, !activeUnit && styles.pickerRowActive]}
              onPress={() => selectUnit(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerRowLabel, !activeUnit && styles.pickerRowLabelActive]}>
                grams
              </Text>
              <Text style={styles.pickerRowMeta}>exact weight</Text>
              {!activeUnit && (
                <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            {servingUnits
              .filter((u) => u.label !== "g")
              .map((unit) => {
                const isActive = activeUnit?.label === unit.label;
                return (
                  <TouchableOpacity
                    key={unit.label}
                    style={[styles.pickerRow, isActive && styles.pickerRowActive]}
                    onPress={() => selectUnit(unit)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pickerRowLabel,
                        isActive && styles.pickerRowLabelActive,
                      ]}
                    >
                      {unit.plural}
                    </Text>
                    <Text style={styles.pickerRowMeta}>≈ {unit.gramsPerUnit} g each</Text>
                    {isActive && (
                      <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  category: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  attribution: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  servingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  servingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  servingInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    minWidth: 180,
    height: 60,
  },
  servingInput: {
    fontSize: 28,
    color: theme.colors.ink,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    textAlign: "center",
    minWidth: 80,
    padding: 0,
  },
  unitSelect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  unitSelectText: {
    fontSize: 15,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pickerSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: 40,
    ...theme.shadows.elevated,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginBottom: theme.spacing.lg,
  },
  pickerTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  pickerSub: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.md,
    marginBottom: 2,
  },
  pickerRowActive: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  pickerRowLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    textTransform: "capitalize",
    flex: 1,
  },
  pickerRowLabelActive: {
    color: theme.colors.primary,
  },
  pickerRowMeta: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  macrosCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  macrosTitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  macroRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  macroBadge: {
    flex: 1,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 18,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  macroLabel: {
    fontSize: 11,
    color: theme.colors.ink,
    marginTop: 2,
    opacity: 0.7,
  },
  logBtn: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  logBtnDisabled: {
    opacity: 0.5,
  },
  logBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
});
