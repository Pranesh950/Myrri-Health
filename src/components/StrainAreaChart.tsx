// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { View, StyleSheet } from "react-native";
import { theme } from "../theme";
import { InteractiveAreaChart } from "./InteractiveAreaChart";

interface StrainAreaChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fallbackData?: number[];
}

export function StrainAreaChart({
  data,
  width = 320,
  height = 160,
  color = "#C45C52",
  fallbackData,
}: StrainAreaChartProps) {
  const sourceData = data.length > 0
    ? data
    : fallbackData ?? [0, 2, 5, 8, 12, 15, 18, 20, 22, 24, 26];

  return (
    <View
      style={[styles.container, { width }]}
      accessibilityLabel="Interactive heart rate chart"
    >
      <InteractiveAreaChart
        values={sourceData}
        color={color}
        height={height}
        decimals={0}
        unit="bpm"
        accessibilityLabel="Interactive heart rate chart — drag along the line to explore"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    justifyContent: "center",
  },
});
