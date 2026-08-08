// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService } from "../../src/services/health";
import { useGoBack } from "../../src/hooks/useGoBack";
import { theme } from "../../src/theme";

const permissions = [
  { icon: "shoe-print", label: "Steps & Distance", color: theme.colors.success },
  { icon: "heart", label: "Heart Rate", color: theme.colors.danger },
  { icon: "sleep", label: "Sleep Analysis", color: theme.colors.info },
  { icon: "fire", label: "Active Calories", color: theme.colors.warning },
  { icon: "water-opacity", label: "Blood Oxygen", color: theme.colors.info },
  { icon: "thermometer", label: "Body Temperature", color: theme.colors.info },
];

export default function AppleScreen() {
  const router = useRouter();
  const handleBack = useGoBack();
  const [requesting, setRequesting] = useState(false);

  const handleConnect = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert(
        "HealthKit Not Available",
        "Apple HealthKit is only available on iOS devices.",
        [{ text: "OK", onPress: handleBack }]
      );
      return;
    }

    setRequesting(true);
    try {
      const granted = await HealthService.initialize();
      if (!granted) {
        Alert.alert(
          "Health access could not be requested",
          "HealthKit is unavailable in this build or on this device. You can continue and connect later from the Overview tab.",
          [
            {
              text: "Continue",
              onPress: async () => {
                await HealthService.markSetupLater();
                router.push("/onboarding/profile");
              },
            },
          ]
        );
        return;
      }

      // Apple reports that authorization completed, but intentionally does not
      // reveal which read types the user allowed. The app will explain this
      // honestly on the Overview tab if no samples are available yet.
      await AsyncStorage.setItem("device_type", "apple");
      router.push("/onboarding/profile");
    } catch {
      Alert.alert(
        "Error",
        "Could not connect to HealthKit. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleSkip = async () => {
    await HealthService.markSetupLater();
    await AsyncStorage.setItem("device_type", "apple");
    router.push("/onboarding/profile");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.step}>2 of 3</Text>
        <Text style={styles.title}>Connect to HealthKit</Text>
        <Text style={styles.subtitle}>
          Apple will show the permission sheet next. Choose the categories you want to share; you can change them later in Settings.
        </Text>
      </View>

      <View style={styles.permissionsList}>
        {permissions.map((p, i) => (
          <View key={i} style={styles.permissionRow}>
            <View style={[styles.permissionIcon, { backgroundColor: `${p.color}15` }]}>
              <MaterialCommunityIcons name={p.icon as any} size={22} color={p.color} />
            </View>
            <Text style={styles.permissionLabel}>{p.label}</Text>
            <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.hairline} />
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnect}
          disabled={requesting}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="shield-lock" size={20} color={theme.colors["on-primary"]} />
          <Text style={styles.connectButtonText}>
            {requesting ? "Opening Apple Health..." : "Review Health Access"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Set Up Later</Text>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 56,
    marginBottom: theme.spacing.lg,
  },
  header: {
    marginTop: 40,
    marginBottom: theme.spacing.xxl,
  },
  step: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
    textTransform: "uppercase",
  },
  title: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    lineHeight: 22,
  },
  permissionsList: {
    gap: theme.spacing.sm,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionLabel: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: 60,
    gap: theme.spacing.md,
  },
  connectButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  connectButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
  skipButton: {
    alignItems: "center",
    padding: theme.spacing.md,
  },
  skipButtonText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
  },
});
