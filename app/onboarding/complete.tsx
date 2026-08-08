// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { loadPlan } from "../../src/services/coachPlan";
import { isAIEnabled } from "../../src/services/localLLM";

export default function CompleteScreen() {
  const router = useRouter();
  const [goalLabels, setGoalLabels] = useState<string[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);

  useEffect(() => {
    loadPlan()
      .then((plan) => setGoalLabels(plan?.goalLabels ?? []))
      .catch(() => {});
    isAIEnabled().then(setAiEnabled).catch(() => {});
  }, []);

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <MaterialCommunityIcons name="check" size={48} color={theme.colors["on-primary"]} />
        </View>

        <Text style={styles.title}>You're all set</Text>
        <Text style={styles.subtitle}>
          Your health data will appear on the Overview tab. You can change your
          device settings anytime in Profile.
        </Text>

        {goalLabels.length > 0 && (
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <MaterialCommunityIcons name="creation" size={18} color={theme.colors.primary} />
              <Text style={styles.planTitle}>Your coach plan</Text>
            </View>
            <Text style={styles.planGoals}>
              {goalLabels.join(" + ")}
            </Text>
            <Text style={styles.planBody}>
              Your habits are ready in the Journal, nutrition targets appear
              below your food log, and your sleep goal shows on the Home sleep
              dial.
              {aiEnabled && " Ask Coach anything to adjust the plan."}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleGetStarted} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  planCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    alignItems: "center",
    ...theme.shadows.cardSoft,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  planTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  planGoals: {
    ...theme.typography.titleMd,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  planBody: {
    ...theme.typography.legal,
    color: theme.colors.body,
    textAlign: "center",
    lineHeight: 17,
  },
  footer: {
    paddingBottom: 60,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  buttonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
});
