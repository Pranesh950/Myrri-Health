// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Defs, Stop, LinearGradient, Circle as SvgCircle } from "react-native-svg";
import { HealthService, DailyActivity } from "../../src/services/health";
import { theme, formatMonthYear } from "../../src/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDE_PADDING = theme.spacing.xl * 2;

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CALENDAR_GAP = 8;
const CALENDAR_CELL_SIZE = Math.max(
  24,
  (SCREEN_WIDTH - SIDE_PADDING - 40 - CALENDAR_GAP * 6) / 7
);

function getActivityColor(count: number): string {
  if (count === 0) return "#F0F1F4";
  if (count === 1) return "#E4F0E5";
  if (count === 2) return "#BFDCC6";
  return "#79B88A";
}

function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function buildCumulativePath(
  daily: DailyActivity[],
  width: number,
  height: number
): {
  path: string;
  maxHours: number;
  endY: number;
  points: { x: number; y: number; hours: number }[];
} {
  if (!daily.length) return { path: "", maxHours: 1, endY: height, points: [] };

  let cumMin = 0;
  const totals = daily.map((d) => {
    cumMin += d.activeMinutes || (d.steps > 3000 ? 20 : d.steps > 0 ? 5 : 0);
    return cumMin / 60;
  });
  const maxHours = Math.max(1, ...totals) * 1.1;
  const step = daily.length > 1 ? width / (daily.length - 1) : width;

  const points = totals.map((hours, i) => ({
    x: i * step,
    y: height - (hours / maxHours) * (height - 8) - 4,
    hours,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const endY = points[points.length - 1]?.y ?? height;
  return { path, maxHours, endY, points };
}

function formatShortDate(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Highlighted point + tooltip shown while scrubbing the cumulative curve. */
function ScrubOverlay({
  point,
  day,
  width,
}: {
  point: { x: number; y: number; hours: number };
  day?: DailyActivity;
  width: number;
}) {
  const tooltipWidth = 132;
  const tooltipLeft = Math.max(
    4,
    Math.min(point.x - tooltipWidth / 2, width - tooltipWidth - 4)
  );
  const tooltipTop = Math.max(2, point.y - 44);

  return (
    <>
      <View style={[styles.scrubGuide, { left: point.x - 0.5 }]} />
      <View style={[styles.scrubDotOuter, { left: point.x - 8, top: point.y - 8 }]} />
      <View style={[styles.scrubDot, { left: point.x - 4, top: point.y - 4 }]} />
      <View style={[styles.scrubTooltip, { left: tooltipLeft, top: tooltipTop }]}>
        <Text style={styles.scrubTooltipDate}>
          {day ? formatShortDate(day.date) : ""}
        </Text>
        <Text style={styles.scrubTooltipValue}>
          {point.hours.toFixed(1)}h cumulative
        </Text>
        {day && day.workoutCount > 0 && (
          <Text style={styles.scrubTooltipSub}>
            {day.workoutCount} workout{day.workoutCount === 1 ? "" : "s"}
          </Text>
        )}
      </View>
    </>
  );
}

export default function FitnessScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [daily, setDaily] = useState<DailyActivity[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await HealthService.initialize(false);
      const d = await HealthService.getDailyActivity(30);
      setDaily(d);
      setSelectedDay(null);
    } catch (e) {
      console.warn("[Fitness] load failed:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const todayKey = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }, []);

  const totalMinutes = useMemo(
    () =>
      daily.reduce(
        (sum, d) =>
          sum +
          (d.activeMinutes ||
            (d.workoutCount > 0 ? d.workoutCount * 30 : d.steps > 5000 ? 25 : 0)),
        0
      ),
    [daily]
  );

  const totalWorkouts = useMemo(
    () => daily.reduce((sum, d) => sum + d.workoutCount, 0),
    [daily]
  );

  const dateRangeLabel = useMemo(() => {
    if (daily.length < 2) return "Last 30 days";
    const first = new Date(daily[0].date + "T12:00:00");
    const last = new Date(daily[daily.length - 1].date + "T12:00:00");
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(first)} – ${fmt(last)}`;
  }, [daily]);

  const chartGeomWidth =
    chartWidth > 0 ? chartWidth : Math.max(280, SCREEN_WIDTH - SIDE_PADDING - 32);

  const chart = useMemo(
    () => buildCumulativePath(daily, chartGeomWidth, 100),
    [daily, chartGeomWidth]
  );

  const handleScrub = (evt: any) => {
    const n = chart.points.length;
    if (n < 1) return;
    const step = n > 1 ? chartGeomWidth / (n - 1) : chartGeomWidth;
    const x = evt.nativeEvent.locationX;
    const index = Math.max(0, Math.min(n - 1, Math.round(x / step)));
    setSelectedDay(index);
  };

  const monthLabel = formatMonthYear();

  // Render the current month as a familiar Sunday–Saturday calendar.
  const calendarCells = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const activityByDate = new Map(daily.map((d) => [d.date, d]));
    const leadingPads = firstDate.getDay();

    const cells: {
      key: string;
      count: number;
      isToday: boolean;
    }[] = Array.from({ length: leadingPads }, (_, i) => ({
      key: `pad-start-${i}`,
      count: -1,
      isToday: false,
    }));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const activity = activityByDate.get(dateKey);
      cells.push({
        key: dateKey,
        count: activity
          ? activity.workoutCount > 0
            ? activity.workoutCount
            : activity.steps >= 7500
              ? 1
              : 0
          : 0,
        isToday: dateKey === todayKey,
      });
    }

    const trailingCount = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < trailingCount; i += 1) {
      cells.push({
        key: `pad-end-${i}`,
        count: -1,
        isToday: false,
      });
    }

    return cells;
  }, [daily, todayKey]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fitness</Text>
        <Text style={styles.headerDate}>Last 30 days</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor={theme.colors.muted}
          />
        }
      >
        {/* Calendar heatmap */}
        <View style={styles.heatmapCard}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) =>
              cell.count < 0 ? (
                <View key={cell.key} style={[styles.calCell, styles.calCellEmpty]} />
              ) : (
                <View
                  key={cell.key}
                  style={[
                    styles.calCell,
                    { backgroundColor: getActivityColor(cell.count) },
                    cell.isToday && styles.todayCell,
                  ]}
                />
              )
            )}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.colors.surfaceElevated }]}
              />
              <Text style={styles.legendText}>No activity</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#E4F0E5" }]} />
              <Text style={styles.legendText}>1 activity</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#BFDCC6" }]} />
              <Text style={styles.legendText}>2 activities</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#79B88A" }]}
              />
              <Text style={styles.legendText}>3+ activities</Text>
            </View>
          </View>
        </View>

        {/* Activity summary */}
        <View style={styles.activitySummaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Activity summary</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View>
              <Text style={styles.summaryStatValue}>
                {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
              </Text>
              <Text style={styles.summaryStatRange}>{dateRangeLabel}</Text>
            </View>
            <View style={styles.summaryDelta}>
              <Text style={styles.summaryDeltaText}>
                {totalWorkouts > 0
                  ? `${totalWorkouts} workout${totalWorkouts === 1 ? "" : "s"}`
                  : "No workouts"}
              </Text>
            </View>
          </View>

          {chart.path ? (
            <View style={styles.dualChartContainer}>
              <Text style={styles.axisLabel}>{Math.ceil(chart.maxHours)}</Text>
              <Text style={styles.axisLabelBottom}>0</Text>

              <View
                style={styles.chartTouchArea}
                onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onResponderGrant={handleScrub}
                onResponderMove={handleScrub}
                onResponderRelease={() => {}}
                accessibilityLabel="Cumulative activity chart — drag along the line to explore each day"
              >
                <Svg
                  width="100%"
                  height={110}
                  viewBox={`0 0 ${chartGeomWidth} 110`}
                >
                  <Defs>
                    <LinearGradient id="currentLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#C4892A" />
                      <Stop offset="100%" stopColor="#C45C52" />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d={chart.path}
                    stroke="url(#currentLineGrad)"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgCircle
                    cx={chartGeomWidth}
                    cy={chart.endY}
                    r={4}
                    fill="#C45C52"
                  />
                </Svg>

                {selectedDay != null && chart.points[selectedDay] && (
                  <ScrubOverlay
                    point={chart.points[selectedDay]}
                    day={daily[selectedDay]}
                    width={chartGeomWidth}
                  />
                )}
              </View>

              {selectedDay == null && chart.points.length > 0 && (
                <Text style={styles.scrubHint}>
                  Drag along the line to explore
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.emptyChartNote}>
              Move more this month to see your cumulative activity curve.
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  headerDate: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2.5 + theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
  },
  heatmapCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  monthLabel: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: CALENDAR_GAP,
    marginBottom: theme.spacing.xs,
  },
  weekdayLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    fontSize: 10,
    width: CALENDAR_CELL_SIZE,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CALENDAR_GAP,
  },
  calCell: {
    width: CALENDAR_CELL_SIZE,
    height: CALENDAR_CELL_SIZE,
    borderRadius: CALENDAR_CELL_SIZE / 2,
  },
  calCellEmpty: {
    backgroundColor: "transparent",
  },
  todayCell: {
    borderWidth: 2,
    borderColor: theme.colors.ink,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: theme.spacing.md,
    rowGap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  activitySummaryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  summaryHeader: {
    marginBottom: theme.spacing.sm,
  },
  summaryTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  summaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  summaryStatValue: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
  },
  summaryStatRange: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  summaryDelta: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
  },
  summaryDeltaText: {
    ...theme.typography.legal,
    color: theme.colors.body,
  },
  dualChartContainer: {
    marginTop: theme.spacing.sm,
    position: "relative",
  },
  chartTouchArea: {
    position: "relative",
    // Paints above the corner axis labels (zIndex 10) so the scrub tooltip
    // is never covered by them.
    zIndex: 12,
  },
  scrubGuide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: theme.colors.ink,
    opacity: 0.25,
    zIndex: 2,
  },
  scrubDotOuter: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#C45C52",
    opacity: 0.25,
    zIndex: 3,
  },
  scrubDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C45C52",
    borderWidth: 2,
    borderColor: theme.colors.card,
    zIndex: 4,
  },
  scrubTooltip: {
    position: "absolute",
    width: 132,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: "center",
    zIndex: 20,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },
  scrubTooltipDate: {
    color: "#C9CBD1",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
  },
  scrubTooltipValue: {
    color: theme.colors.card,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 1,
  },
  scrubTooltipSub: {
    color: "#C9CBD1",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    marginTop: 1,
  },
  scrubHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  axisLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    ...theme.typography.legal,
    color: theme.colors.muted,
    zIndex: 10,
  },
  axisLabelBottom: {
    position: "absolute",
    bottom: 4,
    left: 0,
    ...theme.typography.legal,
    color: theme.colors.muted,
    zIndex: 10,
  },
  emptyChartNote: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
  },
});
