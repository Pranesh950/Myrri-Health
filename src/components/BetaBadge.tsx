// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { View, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../theme";

/** Small "BETA" pill shown next to a chat header title. */
export function BetaBadge({ label = "BETA" }: { label?: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

/** Inline beta warning chip used in chat welcome states. */
export function BetaChip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons
        name="flask-outline"
        size={11}
        color={theme.colors.warning}
      />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: `${theme.colors.warning}1A`,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: `${theme.colors.warning}55`,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: theme.colors.warning,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: theme.spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.warning}12`,
    borderWidth: 1,
    borderColor: `${theme.colors.warning}33`,
  },
  chipText: {
    fontSize: 10,
    color: theme.colors.warning,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
});
