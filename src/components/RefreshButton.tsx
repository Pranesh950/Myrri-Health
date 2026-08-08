// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../theme";

interface RefreshButtonProps {
  refreshing: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function RefreshButton({
  refreshing,
  onPress,
  disabled,
  accessibilityLabel = "Refresh data",
}: RefreshButtonProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      spin.setValue(0);
      const anim = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    }
    spin.setValue(0);
  }, [refreshing, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || refreshing}
      style={styles.button}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: refreshing, disabled: disabled || refreshing }}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <MaterialCommunityIcons
          name="refresh"
          size={20}
          color={refreshing ? theme.colors.primary : theme.colors.ink}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginLeft: theme.spacing.sm,
  },
});
