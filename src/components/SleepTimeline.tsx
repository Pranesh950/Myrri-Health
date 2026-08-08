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

export interface SleepStage {
  type: "REM" | "Deep" | "Light" | "Awake";
  startMinute: number;
  durationMinutes: number;
  color: string;
}

const STAGE_STYLES: Record<string, { color: string; label: string }> = {
  REM: { color: "#7BAE7F", label: "REM" },
  Deep: { color: "#3B6B8A", label: "Deep" },
  Light: { color: "#8FC97A", label: "Light" },
  Awake: { color: "#BF4B4B", label: "Awake" },
};

interface SleepTimelineProps {
  stages: SleepStage[];
  totalMinutes: number;
}

export function SleepTimeline({ stages, totalMinutes }: SleepTimelineProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  if (stages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sleep stage data available</Text>
      </View>
    );
  }

  const scale = totalMinutes > 0 ? 100 / totalMinutes : 0;

  const grouped = stages.reduce<Record<string, number>>((acc, s) => {
    const key = s.type;
    acc[key] = (acc[key] || 0) + s.durationMinutes;
    return acc;
  }, {});

  const selectedDuration = selectedStage ? grouped[selectedStage] : null;

  return (
    <View style={styles.container}>
      <View style={styles.timelineBar}>
        {stages.map((stage, i) => {
          const width = Math.max(stage.durationMinutes * scale, 1);
          const style = STAGE_STYLES[stage.type] || STAGE_STYLES.Light;
          return (
            <TouchableOpacity
              key={`${stage.type}-${i}`}
              style={[
                styles.stageBlock,
                {
                  width: `${width}%`,
                  backgroundColor: style.color,
                  borderTopLeftRadius: i === 0 ? theme.radii.sm : 0,
                  borderBottomLeftRadius: i === 0 ? theme.radii.sm : 0,
                  borderTopRightRadius: i === stages.length - 1 ? theme.radii.sm : 0,
                  borderBottomRightRadius: i === stages.length - 1 ? theme.radii.sm : 0,
                },
              ]}
              activeOpacity={0.7}
              onPress={() =>
                setSelectedStage(
                  selectedStage === stage.type ? null : stage.type
                )
              }
            />
          );
        })}
      </View>

      <View style={styles.legend}>
        {Object.entries(STAGE_STYLES).map(([key, val]) => {
          const dur = grouped[key] || 0;
          return (
            <View key={key} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: val.color }]}
              />
              <Text style={styles.legendLabel}>
                {val.label} — {dur > 0 ? `${Math.round(dur)} min` : "—"}
              </Text>
            </View>
          );
        })}
      </View>

      {selectedStage && selectedDuration != null && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{STAGE_STYLES[selectedStage]?.label ?? selectedStage}</Text>
          <Text style={styles.tooltipText}>
            {Math.round(selectedDuration)} minutes (
            {totalMinutes > 0
              ? `${Math.round((selectedDuration / totalMinutes) * 100)}%`
              : "0%"}
            )
          </Text>
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
  timelineBar: {
    flexDirection: "row",
    height: 24,
    borderRadius: theme.radii.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.border,
  },
  stageBlock: {
    height: "100%",
    minWidth: 2,
  },
  legend: {
    gap: theme.spacing.xs,
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
  tooltipTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xxs,
  },
  tooltipText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
  },
});
