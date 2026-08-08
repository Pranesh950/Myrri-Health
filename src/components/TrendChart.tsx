// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";
import { InteractiveAreaChart } from "./InteractiveAreaChart";

interface TrendLineChartProps {
  values: number[];
  color?: string;
  unit?: string;
  decimals?: number;
  height?: number;
  /** Optional per-index date labels (YYYY-MM-DD) shown in the scrub tooltip. */
  dates?: string[];
}

function formatScrubDate(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface BinaryStripProps {
  values: number[];
}

export function TrendLineChart({
  values,
  color = "#5B7BE1",
  unit = "",
  decimals = 0,
  height = 140,
  dates,
}: TrendLineChartProps) {
  const hasData = values.some((value) => value > 0);
  if (!hasData || values.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No entries in this period yet</Text>
      </View>
    );
  }

  return (
    <InteractiveAreaChart
      values={values}
      color={color}
      unit={unit}
      decimals={decimals}
      height={height}
      labels={dates?.map(formatScrubDate)}
      accessibilityLabel="Interactive trend chart — drag along the line to explore each day"
    />
  );
}

export function BinaryStrip({ values }: BinaryStripProps) {
  const filled = values.filter((value) => value > 0).length;
  const pct = values.length ? Math.round((filled / values.length) * 100) : 0;
  const hasAny = filled > 0;

  return (
    <View style={styles.binaryWrap}>
      <View style={styles.binaryDots}>
        {values.map((value, index) => (
          <View
            key={index}
            style={[
              styles.binaryDot,
              value > 0 && styles.binaryDotFilled,
              value === 0 && hasAny && styles.binaryDotMissed,
            ]}
          />
        ))}
      </View>
      <View style={styles.binaryMeta}>
        <Text style={styles.binaryPct}>{pct}%</Text>
        <Text style={styles.binaryLabel}>
          {filled} of {values.length} days
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
  },
  emptyText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  binaryWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  binaryDots: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  binaryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  binaryDotFilled: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  binaryDotMissed: {
    opacity: 0.7,
  },
  binaryMeta: {
    alignItems: "flex-end",
  },
  binaryPct: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  binaryLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
});
