// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, type Href } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../src/theme";
import { useGoBack } from "../src/hooks/useGoBack";

type Option = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: Href;
};

const OPTIONS: Option[] = [
  {
    id: "manual",
    title: "Manual log",
    subtitle: "Search the food database and pick serving size",
    icon: "format-list-bulleted",
    iconColor: theme.colors.info,
    iconBg: `${theme.colors.info}14`,
    route: "/food-chat?mode=search",
  },
  {
    id: "ai",
    title: "AI assistant",
    subtitle: "Describe what you ate and the AI logs it",
    icon: "robot-outline",
    iconColor: theme.colors.primary,
    iconBg: `${theme.colors.primary}14`,
    route: "/food-chat",
  },
  {
    id: "barcode",
    title: "Scan barcode",
    subtitle: "Point the camera at a product's barcode",
    icon: "barcode-scan",
    iconColor: theme.colors.success,
    iconBg: `${theme.colors.success}14`,
    route: "/barcode-scan",
  },
];

export default function MealOptionsScreen() {
  const router = useRouter();
  const handleBack = useGoBack();

  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>Add a meal</Text>
        <Text style={styles.subtitle}>How would you like to log it?</Text>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.option}
            onPress={() => router.replace(option.route)}
            activeOpacity={0.75}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.iconBg }]}>
              <MaterialCommunityIcons name={option.icon} size={24} color={option.iconColor} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={handleBack}
        activeOpacity={0.8}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.spacing.xl,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    marginTop: 4,
  },
  list: {
    gap: theme.spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  optionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 3,
    lineHeight: 17,
  },
  cancelBtn: {
    marginTop: "auto",
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cancelText: {
    ...theme.typography.labelMd,
    color: theme.colors.muted,
  },
});
