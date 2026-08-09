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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useGoBack } from "../../src/hooks/useGoBack";
import { HealthService, HealthData, computeSleepScore } from "../../src/services/health";
import { BandGauge } from "../../src/components/BandGauge";
import { RefreshButton } from "../../src/components/RefreshButton";
import { theme, formatFriendlyDate } from "../../src/theme";
import { loadPlan } from "../../src/services/coachPlan";

function fmt(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}${suffix}`;
}

function fmtFloat(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}${suffix}`;
}

function fmtMinutes(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function sleepLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 35) return "Poor";
  return "Low";
}

function sleepColor(score: number): string {
  if (score >= 75) return theme.colors.success;
  if (score >= 55) return theme.colors.warning;
  return theme.colors.danger;
}

interface RecoveryRowProps {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  subtext?: string;
}

function RecoveryRow({ label, value, icon, color, subtext }: RecoveryRowProps) {
  return (
    <View style={styles.recoveryRow}>
      <View style={[styles.recoveryIcon, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.recoveryText}>
        <Text style={styles.recoveryLabel}>{label}</Text>
        {subtext ? <Text style={styles.recoverySub}>{subtext}</Text> : null}
      </View>
      <Text style={styles.recoveryValue}>{value}</Text>
    </View>
  );
}

export default function SleepDetailScreen() {
  const insets = useSafeAreaInsets();
  const handleBack = useGoBack();
  const [data, setData] = useState<HealthData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sleepGoal, setSleepGoal] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    await HealthService.initialize(false);
    const d = await HealthService.getTodayData();
    setData(d);
    setLoaded(true);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadData().catch((e) => console.warn("[Sleep] load failed:", e));
    loadPlan()
      .then((plan) => setSleepGoal(plan?.sleepHours ?? null))
      .catch(() => {});
  }, [fadeAnim, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    try {
      await loadData();
    } catch (e) {
      console.warn("[Sleep] refresh failed:", e);
    } finally {
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [fadeAnim, loadData]);

  const sleepHours = data?.sleepHours ?? 0;
  const sleepScore = computeSleepScore(data ?? 0);
  const hasSleep = sleepHours > 0;
  const goal = sleepGoal ?? 8;
  const goalPct = goal > 0 ? Math.round((sleepHours / goal) * 100) : 0;
  const hasStages = !!data?.sleepHasStages;
  // sleepHours already excludes awake time when stages are present, so the
  // asleep base is sleepHours itself; the full night adds awake back on top.
  const asleepForStages = Math.max(0, sleepHours);
  const stageBase = Math.max(sleepHours + (data?.sleepAwakeHours ?? 0), 0.01);
  const stageRows = hasStages
    ? [
        { label: "Deep", hours: data?.sleepDeepHours ?? 0, color: "#3B6B8A" },
        { label: "REM", hours: data?.sleepRemHours ?? 0, color: "#7BAE7F" },
        {
          label: "Light",
          hours: Math.max(
            0,
            asleepForStages - (data?.sleepDeepHours ?? 0) - (data?.sleepRemHours ?? 0)
          ),
          color: "#8FC97A",
        },
        { label: "Awake", hours: data?.sleepAwakeHours ?? 0, color: "#BF4B4B" },
      ]
    : [];

  const insights: string[] = [];
  if (hasSleep) {
    if (sleepScore >= 85) {
      insights.push(
        hasStages
          ? "Your sleep was restorative last night — duration and stage quality look excellent."
          : "Your sleep duration was excellent. Deep/REM/awake data isn't synced, so quality isn't scored yet."
      );
    } else if (sleepScore >= 70) {
      insights.push("You got decent rest. A consistent bedtime could push this into the excellent range.");
    } else if (sleepScore >= 50) {
      insights.push("Your sleep was below optimal. Try winding down 30 minutes earlier tonight.");
    } else {
      insights.push("Sleep was significantly shorter than ideal. Prioritize an early bedtime to recover.");
    }
    if (hasStages) {
      const awakeMin = Math.round((data?.sleepAwakeHours ?? 0) * 60);
      const deepPct = asleepForStages > 0 ? ((data?.sleepDeepHours ?? 0) / asleepForStages) * 100 : 0;
      const remPct = asleepForStages > 0 ? ((data?.sleepRemHours ?? 0) / asleepForStages) * 100 : 0;
      if (awakeMin > 25) {
        insights.push(`Awake ${awakeMin} min during the night — wake-ups fragment deep sleep.`);
      } else if (deepPct < 10) {
        insights.push(`Deep sleep was only ${Math.round(deepPct)}% — physical recovery suffered.`);
      } else if (remPct < 15) {
        insights.push(`REM was a bit low (${Math.round(remPct)}%) — cognitive recovery could improve.`);
      } else {
        insights.push(`Good stage balance: ${Math.round(deepPct)}% deep, ${Math.round(remPct)}% REM.`);
      }
    }
    if (data?.restingHeartRate != null) {
      insights.push(`Resting HR of ${data.restingHeartRate} bpm reflects your overnight recovery.`);
    }
    if (data?.heartRateVariability != null) {
      insights.push(`HRV of ${data.heartRateVariability} ms indicates your body's readiness today.`);
    }
  } else {
    insights.push("No sleep data available yet. Wear your watch or connect a sleep tracker to see insights here.");
  }

  const recoveryMetrics: RecoveryRowProps[] = [
    {
      label: "Resting Heart Rate",
      value: data?.restingHeartRate ? `${data.restingHeartRate} bpm` : "—",
      icon: "heart-pulse",
      color: theme.colors.danger,
      subtext: "Lower is generally better",
    },
    {
      label: "Heart Rate Variability",
      value: data?.heartRateVariability ? `${data.heartRateVariability} ms` : "—",
      icon: "waveform",
      color: theme.colors.info,
      subtext: "Higher suggests better recovery",
    },
    {
      label: "Blood Oxygen",
      value: data?.bloodOxygen ? `${Math.round(data.bloodOxygen)}%` : "—",
      icon: "water-percent",
      color: theme.colors.success,
      subtext: "Average during sleep",
    },
    {
      label: "Respiratory Rate",
      value: fmtFloat(data?.respiratoryRate, " rpm"),
      icon: "lungs",
      color: theme.colors.info,
      subtext: "Breaths per minute",
    },
    {
      label: "Body Temperature",
      value: fmtFloat(data?.bodyTemperature, "°C"),
      icon: "thermometer",
      color: theme.colors.warning,
      subtext: "Overnight baseline",
    },
  ];

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
        <Text style={styles.headerTitle}>Sleep</Text>
        <Text style={styles.headerDate}>{loaded ? formatFriendlyDate() : ""}</Text>
        <RefreshButton refreshing={refreshing} onPress={handleRefresh} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <BandGauge
            score={hasSleep ? sleepScore : 0}
            color={hasSleep ? theme.colors.sleep : theme.colors.muted}
            label="Sleep"
            size={170}
          />
          <View style={styles.heroText}>
            <Text style={[styles.heroLabel, { color: hasSleep ? sleepColor(sleepScore) : theme.colors.muted }]}>
              {hasSleep ? sleepLabel(sleepScore) : "No data"}
            </Text>
            <Text style={styles.heroValue}>{hasSleep ? `${sleepHours.toFixed(1)}h` : "—"}</Text>
            <Text style={styles.heroSub}>{hasSleep ? "Total sleep" : "Wear a tracker to see sleep data"}</Text>
          </View>
        </Animated.View>

        {hasSleep && (
          <Animated.View style={[styles.durationCard, { opacity: fadeAnim }]}>
            <View style={styles.durationHeader}>
              <MaterialCommunityIcons name="sleep" size={20} color={theme.colors.sleep} />
              <Text style={styles.durationTitle}>Sleep Duration</Text>
            </View>
            <View style={styles.durationBarBg}>
              <View
                style={[
                  styles.durationBarFill,
                  {
                    width: `${Math.min(100, (sleepHours / 10) * 100)}%`,
                    backgroundColor:
                      sleepHours >= goal - 0.5 ? theme.colors.success : sleepHours >= 5 ? theme.colors.warning : theme.colors.danger,
                  },
                ]}
              />
              {goal < 10 && (
                <View
                  style={[
                    styles.durationGoalMark,
                    { left: `${(goal / 10) * 100}%` },
                  ]}
                />
              )}
            </View>
            <View style={styles.durationMarkers}>
              <Text style={styles.durationMarkerText}>0h</Text>
              <Text style={styles.durationMarkerTarget}>
                {goal}h goal
              </Text>
              <Text style={styles.durationMarkerText}>10h</Text>
            </View>
            <View
              style={[
                styles.goalChip,
                goalPct >= 100 ? styles.goalChipHit : styles.goalChipMiss,
              ]}
            >
              <MaterialCommunityIcons
                name={goalPct >= 100 ? "check-circle" : "sleep-off"}
                size={16}
                color={goalPct >= 100 ? theme.colors.success : theme.colors.warning}
              />
              <Text style={styles.goalChipText}>
                {goalPct >= 100
                  ? `Sleep goal met — ${goalPct}% of ${goal}h`
                  : `${sleepHours.toFixed(1)}h of ${goal}h goal (${goalPct}%) — ${Math.max(0, goal - sleepHours).toFixed(1)}h to go`}
              </Text>
            </View>
          </Animated.View>
        )}

        {hasSleep && hasStages && (
          <Animated.View style={[styles.durationCard, { opacity: fadeAnim }]}>
            <View style={styles.durationHeader}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={theme.colors.sleep} />
              <Text style={styles.durationTitle}>Sleep Stages</Text>
            </View>
            {stageRows.map((row) => {
              const pct = row.hours > 0 ? (row.hours / stageBase) * 100 : 0;
              return (
                <View key={row.label} style={styles.stageRow}>
                  <View style={[styles.stageDot, { backgroundColor: row.color }]} />
                  <Text style={styles.stageLabel}>{row.label}</Text>
                  <View style={styles.stageBarTrack}>
                    <View
                      style={[
                        styles.stageBarFill,
                        { width: `${Math.min(100, pct)}%`, backgroundColor: row.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.stageValue}>
                    {row.hours > 0 ? `${fmtMinutes(row.hours)} · ${Math.round(pct)}%` : "—"}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        )}

        {hasSleep && !hasStages && (
          <View style={styles.stageNoteWrap}>
            <MaterialCommunityIcons name="information-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.stageNoteText}>
              This score reflects sleep duration only. Sync sleep stages (deep, REM, awake) with your
              wearable to score sleep quality too.
            </Text>
          </View>
        )}

        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Recovery Vitals</Text>
          <View style={styles.recoveryCard}>
            {recoveryMetrics.map((metric, i) => (
              <RecoveryRow key={i} {...metric} />
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.insightsCard, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="star-outline" size={18} color={theme.colors.sleep} />
            <Text style={styles.cardTitle}>Insights</Text>
          </View>
          {insights.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: hasSleep ? theme.colors.sleep : theme.colors.muted }]} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={[styles.tipsCard, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lightbulb-outline" size={18} color={theme.colors.warning} />
            <Text style={styles.cardTitle}>Sleep Hygiene</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>1</Text>
            <Text style={styles.tipText}>Keep a consistent wake-up time, even on weekends.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>2</Text>
            <Text style={styles.tipText}>Avoid screens 30–60 minutes before bed.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>3</Text>
            <Text style={styles.tipText}>Keep your bedroom cool, dark, and quiet.</Text>
          </View>
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
  durationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  durationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  durationTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  durationBarBg: {
    height: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: theme.spacing.xs,
  },
  durationGoalMark: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: theme.colors.ink,
    borderRadius: 1,
    opacity: 0.55,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  goalChipHit: {
    backgroundColor: `${theme.colors.success}12`,
  },
  goalChipMiss: {
    backgroundColor: `${theme.colors.warning}12`,
  },
  goalChipText: {
    ...theme.typography.legal,
    color: theme.colors.body,
    flex: 1,
    lineHeight: 16,
  },
  durationBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  durationMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  durationMarkerText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  durationMarkerTarget: {
    ...theme.typography.legal,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: theme.colors.body,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  recoveryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  recoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: theme.spacing.lg,
  },
  recoveryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  recoveryText: {
    flex: 1,
  },
  recoveryLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  recoverySub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  recoveryValue: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  insightsCard: {
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
  tipsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  tipNumber: {
    ...theme.typography.caption,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: theme.colors.sleep,
    width: 18,
    textAlign: "center",
    marginTop: 1,
  },
  tipText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    flex: 1,
    lineHeight: 22,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageLabel: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    width: 44,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  stageBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  stageBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  stageValue: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    minWidth: 78,
    textAlign: "right",
  },
  stageNoteWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  stageNoteText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    flex: 1,
    lineHeight: 16,
  },
});
