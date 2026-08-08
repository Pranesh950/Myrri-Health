// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useGoBack } from "../../src/hooks/useGoBack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData, computeStrainScore } from "../../src/services/health";
import { AnimatedScoreRing } from "../../src/components/AnimatedScoreRing";
import { StrainAreaChart } from "../../src/components/StrainAreaChart";
import { RefreshButton } from "../../src/components/RefreshButton";
import { theme, formatFriendlyDate } from "../../src/theme";
import { getDistanceUnit, formatDistance, type DistanceUnit } from "../../src/services/units";

function fmt(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function strainLabel(score: number): string {
  if (score >= 80) return "High strain";
  if (score >= 55) return "Moderate";
  if (score >= 30) return "Light";
  return "Rest day";
}

function strainColor(score: number): string {
  if (score >= 80) return theme.colors.danger;
  if (score >= 55) return theme.colors.warning;
  if (score >= 30) return theme.colors.success;
  return theme.colors.muted;
}

interface SnapshotCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

function SnapshotCard({ label, value, unit, icon, color }: SnapshotCardProps) {
  return (
    <View style={styles.snapshotCard}>
      <View style={styles.snapshotTop}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
        <Text style={styles.snapshotLabel}>{label}</Text>
      </View>
      <View style={styles.snapshotValueRow}>
        <Text style={styles.snapshotValue}>{value}</Text>
        {unit ? <Text style={styles.snapshotUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function StrainDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [data, setData] = useState<HealthData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    await HealthService.initialize(false);
    const d = await HealthService.getTodayData();
    setData(d);
    setLoaded(true);
    setDistanceUnit(await getDistanceUnit());
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadData().catch((e) => console.warn("[Strain] load failed:", e));
  }, [fadeAnim, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    try {
      await loadData();
    } catch (e) {
      console.warn("[Strain] refresh failed:", e);
    } finally {
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [fadeAnim, loadData]);

  // Custom back buttons must use the screen-level navigation object —
  // router.back() silently no-ops in this expo-router version.
  const handleBack = useGoBack();

  const strainScore = data ? computeStrainScore(data) : 0;
  const hasActivity = (data?.steps ?? 0) > 0 || (data?.activeCalories ?? 0) > 0;

  const heartRates = data?.heartRate ?? [];
  const avgHR = heartRates.length > 0
    ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length)
    : null;
  const maxHR = heartRates.length > 0 ? Math.max(...heartRates) : null;
  const minHR = heartRates.length > 0 ? Math.min(...heartRates) : null;

  const insights: string[] = [];
  if (hasActivity) {
    if (strainScore >= 80) {
      insights.push("Your body worked hard today — prioritize recovery with quality sleep and hydration.");
    } else if (strainScore >= 55) {
      insights.push("A solid effort today. You're building fitness without overreaching.");
    } else if (strainScore >= 30) {
      insights.push("Light day — a good opportunity for mobility work or a relaxing walk.");
    } else {
      insights.push("Rest day. These are essential for long-term progress — enjoy it.");
    }
    if (data?.steps != null && data.steps > 0) {
      insights.push(
        `${data.steps.toLocaleString()} steps today — ${data.steps >= 10000 ? "you hit the 10K mark!" : data.steps >= 7500 ? "close to the recommended 10K." : "consider a short walk to boost your count."}`
      );
    }
  } else {
    insights.push("No activity data yet. Connect your wearable or phone to start tracking strain.");
  }

  const distDisplay = data?.distance ? formatDistance(data.distance, distanceUnit) : null;
  const [distValue, distUnit] = distDisplay ? distDisplay.split(" ") : [null, null];
  const strainChartWidth = Math.max(
    160,
    screenWidth - theme.spacing.xl * 2 - theme.spacing.lg * 2
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Strain</Text>
        <Text style={styles.headerDate}>{loaded ? formatFriendlyDate() : ""}</Text>
        <RefreshButton refreshing={refreshing} onPress={handleRefresh} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <AnimatedScoreRing
            score={hasActivity ? strainScore : 0}
            size={180}
            strokeWidth={8}
            color={hasActivity ? strainColor(strainScore) : theme.colors.border}
            unit=""
          />
          <View style={styles.heroText}>
            <Text
              style={[
                styles.heroLabel,
                { color: hasActivity ? strainColor(strainScore) : theme.colors.muted },
              ]}
            >
              {hasActivity ? strainLabel(strainScore) : "No data"}
            </Text>
            <Text style={styles.heroValue}>{hasActivity ? strainScore : "—"}</Text>
            <Text style={styles.heroSub}>{hasActivity ? "out of 100" : "No activity recorded"}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Activity Snapshot</Text>
          <View style={styles.snapshotRow}>
            <SnapshotCard
              label="Steps"
              value={data?.steps ? data.steps.toLocaleString() : "—"}
              icon="shoe-print"
              color={theme.colors.success}
            />
            <SnapshotCard
              label="Active cal"
              value={data?.activeCalories ? Math.round(data.activeCalories).toString() : "—"}
              unit="kcal"
              icon="fire"
              color={theme.colors.warning}
            />
            <SnapshotCard
              label="Distance"
              value={distValue ?? "—"}
              unit={distUnit ?? undefined}
              icon="map-marker-distance"
              color={theme.colors.info}
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.chartCard, { opacity: fadeAnim }]}>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons name="heart-pulse" size={18} color={theme.colors.danger} />
            <Text style={styles.chartTitle}>Heart Rate</Text>
          </View>
          {heartRates.length > 0 ? (
            <StrainAreaChart
              data={heartRates}
              width={strainChartWidth}
              height={160}
              color={theme.colors.danger}
            />
          ) : (
            <View style={styles.chartEmpty}>
              <MaterialCommunityIcons name="heart-outline" size={28} color={theme.colors.muted} />
              <Text style={styles.chartEmptyTitle}>No heart rate data found</Text>
              <Text style={styles.chartEmptySub}>
                Make sure Heart Rate access is enabled in Health Connect and your wearable has synced.
              </Text>
            </View>
          )}
          <View style={styles.hrRow}>
            <View style={styles.hrItem}>
              <Text style={styles.hrLabel}>Avg</Text>
              <Text style={styles.hrValue}>{avgHR != null ? `${avgHR} bpm` : "—"}</Text>
            </View>
            <View style={styles.hrItem}>
              <Text style={styles.hrLabel}>Max</Text>
              <Text style={styles.hrValue}>{maxHR != null ? `${maxHR} bpm` : "—"}</Text>
            </View>
            <View style={styles.hrItem}>
              <Text style={styles.hrLabel}>Min</Text>
              <Text style={styles.hrValue}>{minHR != null ? `${minHR} bpm` : "—"}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.muted} />
            <Text style={styles.cardTitle}>How strain is calculated</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: theme.colors.warning }]} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Active calories</Text>
              <Text style={styles.infoDesc}>50% of score — calories burned through movement</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: theme.colors.success }]} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Steps</Text>
              <Text style={styles.infoDesc}>30% of score — total steps vs 10K goal</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: theme.colors.danger }]} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Heart rate load</Text>
              <Text style={styles.infoDesc}>20% of score — time spent at elevated HR</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.insightsCard, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="star-outline" size={18} color={strainColor(strainScore)} />
            <Text style={styles.cardTitle}>Insights</Text>
          </View>
          {insights.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View
                style={[
                  styles.insightDot,
                  { backgroundColor: hasActivity ? strainColor(strainScore) : theme.colors.muted },
                ]}
              />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </Animated.View>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
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
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    flex: 1,
  },
  headerDate: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
    paddingTop: theme.spacing.lg,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  heroText: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  heroLabel: {
    ...theme.typography.titleLg,
    marginBottom: theme.spacing.xs,
  },
  heroValue: {
    ...theme.typography.displayLg,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  heroSub: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  snapshotRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  snapshotTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  snapshotLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textTransform: "uppercase",
  },
  snapshotValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  snapshotValue: {
    ...theme.typography.metricValue,
    fontSize: 22,
    color: theme.colors.ink,
  },
  snapshotUnit: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  chartCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  chartTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  hrRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: theme.spacing.md,
  },
  hrItem: {
    alignItems: "center",
  },
  hrLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  hrValue: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  chartEmpty: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xxs,
  },
  chartEmptyTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.body,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  chartEmptySub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  infoRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  infoDesc: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  insightsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  insightText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    flex: 1,
    lineHeight: 22,
  },
});
