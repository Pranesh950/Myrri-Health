// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme";

interface ZoneSegment {
  label: string;
  value: number;
  color: string;
}

interface HorizontalStackedBarProps {
  segments: ZoneSegment[];
  total: number;
  markerValue?: number;
  markerLabel?: string;
}

const ZONE_COLORS = [
  "#7BAE7F",
  "#8FC97A",
  "#D4A24C",
  "#D47A4C",
  "#BF4B4B",
];

export function HorizontalStackedBar({
  segments,
  total,
  markerValue,
  markerLabel,
}: HorizontalStackedBarProps) {
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  const maxVal = Math.max(total, markerValue ?? 0, 1);

  if (segments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No heart rate data yet today</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={styles.bar}>
          {segments.map((seg, i) => {
            const widthPercent = maxVal > 0 ? (seg.value / maxVal) * 100 : 0;
            return (
              <TouchableOpacity
                key={seg.label}
                style={[
                  styles.segment,
                  {
                    flex: seg.value,
                    backgroundColor: ZONE_COLORS[i] || seg.color,
                    minWidth: widthPercent > 0 ? 4 : 0,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() =>
                  setExpandedSet(expandedSet === seg.label ? null : seg.label)
                }
              />
            );
          })}
        </View>
        {markerValue != null && maxVal > 0 && (
          <View
            style={[
              styles.marker,
              { left: `${(markerValue / maxVal) * 100}%` },
            ]}
          >
            <View style={styles.markerDot} />
            {markerLabel && (
              <Text style={styles.markerLabel}>{markerLabel}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <TouchableOpacity
            key={seg.label}
            style={styles.legendItem}
            activeOpacity={0.7}
            onPress={() =>
              setExpandedSet(expandedSet === seg.label ? null : seg.label)
            }
          >
            <View
              style={[
                styles.legendDot,
                { backgroundColor: ZONE_COLORS[i] || seg.color },
              ]}
            />
            <Text style={styles.legendLabel}>{seg.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {expandedSet && (
        <View style={styles.tooltip}>
          {segments
            .filter((s) => s.label === expandedSet)
            .map((s) => (
              <Text key={s.label} style={styles.tooltipText}>
                Zone {s.label}: {Math.round(s.value)} min
              </Text>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
  },
  barContainer: {
    position: "relative",
    height: 32,
    justifyContent: "center",
  },
  bar: {
    flexDirection: "row",
    height: 28,
    borderRadius: theme.radii.pill,
    overflow: "hidden",
    backgroundColor: theme.colors.border,
  },
  segment: {
    height: "100%",
  },
  marker: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 2,
    alignItems: "center",
    marginLeft: -1,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.ink,
    borderWidth: 2,
    borderColor: theme.colors.card,
    position: "absolute",
    top: -16,
  },
  markerLabel: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    position: "absolute",
    top: -36,
    fontSize: 10,
    textAlign: "center",
    width: 60,
    marginLeft: -30,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...theme.typography.legal,
    color: theme.colors.body,
  },
  tooltip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tooltipText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
  },
});
