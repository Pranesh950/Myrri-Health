// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../theme";

/**
 * Assistant typing state shown while the local model is preparing a response.
 * Uses React Native's built-in Animated API so the chat UI does not require
 * an additional native animation dependency.
 */
export function ThinkingBubble() {
  const dotAnimations = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;

  useEffect(() => {
    const animations = dotAnimations.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(value, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.35,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 120),
        ])
      )
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dotAnimations]);

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons
          name="robot-outline"
          size={15}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.bubble}>
        <Text style={styles.label}>Thinking</Text>
        <View style={styles.indicator} accessibilityLabel="Assistant is thinking">
          {dotAnimations.map((animation, index) => (
            <Animated.View
              key={index}
              style={[styles.dot, { opacity: animation }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "78%",
    minHeight: 48,
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.cardSoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 9,
    height: 24,
    width: 30,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.danger,
  },
});
