// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Svg, {
  Path,
  Defs,
  Stop,
  LinearGradient as SvgLinearGradient,
  Circle as SvgCircle,
  Rect as SvgRect,
} from "react-native-svg";
import {
  HealthService,
  HealthData,
  MetricSample,
} from "../../src/services/health";
import { theme, formatAsOf } from "../../src/theme";
import { calculateBiologicalAge } from "../../src/services/biology";
import { getHealthProfile, HealthProfile } from "../../src/services/profile";

interface BiomarkerCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  subtitle: string;
  hasData: boolean;
  samples?: MetricSample[];
  sparklineColor?: string;
}

function buildSparkPath(samples: MetricSample[], w = 60, h = 24): string {
  if (samples.length < 2) return "";
  const values = samples.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (samples.length - 1);
  return samples
    .map((s, i) => {
      const x = i * step;
      const y = h - 3 - ((s.value - min) / range) * (h - 6);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function BiomarkerCard({
  icon,
  label,
  subtitle,
  hasData,
  samples = [],
  sparklineColor,
}: BiomarkerCardProps) {
  const path = hasData && samples.length >= 2 ? buildSparkPath(samples) : "";
  const lastPoint =
    hasData && samples.length >= 2
      ? (() => {
          const values = samples.map((s) => s.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min || 1;
          const w = 60;
          const h = 24;
          const step = w / (samples.length - 1);
          const last = samples[samples.length - 1];
          return {
            x: (samples.length - 1) * step,
            y: h - 3 - ((last.value - min) / range) * (h - 6),
          };
        })()
      : null;

  return (
    <View style={[styles.biomarkerCard, !hasData && styles.biomarkerCardEmpty]}>
      <View style={styles.biomarkerLeft}>
        <View style={[styles.biomarkerIcon, !hasData && styles.biomarkerIconEmpty]}>
          <MaterialCommunityIcons
            name={icon}
            size={16}
            color={hasData ? theme.colors.ink : theme.colors.muted}
          />
        </View>
        <View style={styles.biomarkerTextCol}>
          <Text style={[styles.biomarkerLabel, !hasData && styles.biomarkerTextEmpty]}>
            {label}
          </Text>
          <Text
            style={[styles.biomarkerSubtitle, !hasData && styles.biomarkerTextEmpty]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.biomarkerRight}>
        {path ? (
          <Svg width={60} height={24} viewBox="0 0 60 24">
            <Defs>
              <SvgLinearGradient id={`spark-${label}`} x1="0" y1="0" x2="1" y2="0">
                <Stop
                  offset="0%"
                  stopColor={sparklineColor ?? theme.colors.ink}
                  stopOpacity={0.25}
                />
                <Stop
                  offset="100%"
                  stopColor={sparklineColor ?? theme.colors.ink}
                  stopOpacity={1}
                />
              </SvgLinearGradient>
            </Defs>
            <Path
              d={path}
              stroke={`url(#spark-${label})`}
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {lastPoint && (
              <SvgCircle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={2.5}
                fill={sparklineColor ?? theme.colors.ink}
              />
            )}
          </Svg>
        ) : (
          <View style={styles.emptySparkline}>
            <View style={styles.emptySparklineLine} />
            <View style={styles.emptySparklineDot} />
          </View>
        )}
      </View>
    </View>
  );
}

function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export default function BiologyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<HealthData | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bioAge, setBioAge] = useState<number | null>(null);
  const [bioLabel, setBioLabel] = useState<string>("");
  const [bioReliability, setBioReliability] = useState<number | null>(null);
  const [bioConfidenceLabel, setBioConfidenceLabel] = useState<string>("");
  const [bioBaselineDays, setBioBaselineDays] = useState<number | null>(null);
  const [rhrHistory, setRhrHistory] = useState<MetricSample[]>([]);
  const [hrvHistory, setHrvHistory] = useState<MetricSample[]>([]);
  const [weightHistory, setWeightHistory] = useState<MetricSample[]>([]);
  const [fatHistory, setFatHistory] = useState<MetricSample[]>([]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await HealthService.initialize(false);
      const [today, rhr, hrv, sleep, activity, weight, fat, healthProfile] = await Promise.all([
        HealthService.getTodayData(),
        HealthService.getMetricHistory("restingHeartRate", 30),
        HealthService.getMetricHistory("heartRateVariability", 30),
        HealthService.getSleepHistory(30),
        HealthService.getDailyActivity(30),
        HealthService.getMetricHistory("weight", 30),
        HealthService.getMetricHistory("bodyFat", 30),
        getHealthProfile(),
      ]);
      setData(today);
      setProfile(healthProfile);
      setRhrHistory(rhr);
      setHrvHistory(hrv);
      setWeightHistory(weight);
      setFatHistory(fat);

      const hasSignals =
        rhr.length > 0 ||
        hrv.length > 0 ||
        sleep.length > 0 ||
        activity.some((day) => day.hasData === true) ||
        (today.vo2Max != null && today.vo2Max > 0) ||
        (today.bodyFat != null && today.bodyFat > 0) ||
        (today.bloodPressure != null &&
          today.bloodPressure.systolic > 0 &&
          today.bloodPressure.diastolic > 0);
      if (healthProfile && hasSignals) {
        const ageResult = calculateBiologicalAge(
          healthProfile.chronologicalAge,
          today,
          healthProfile.biologicalSex,
          {
            restingHeartRate: rhr,
            heartRateVariability: hrv,
            sleep,
            activity,
          }
        );
        setBioAge(ageResult.biologicalAge);
        setBioLabel(ageResult.label);
        setBioReliability(ageResult.dataReliability);
        setBioConfidenceLabel(ageResult.confidenceLabel);
        setBioBaselineDays(ageResult.baselineDays);
      } else {
        setBioAge(null);
        setBioLabel("");
        setBioReliability(null);
        setBioConfidenceLabel("");
        setBioBaselineDays(null);
      }
    } catch (e) {
      console.warn("[Biology] load failed:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const weightLbs =
    data?.weight != null ? kgToLbs(data.weight) : null;
  const leanLbs =
    data?.leanBodyMass != null ? kgToLbs(data.leanBodyMass) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.gradientWash} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#D8E4EA" stopOpacity={0.55} />
              <Stop offset="100%" stopColor={theme.colors.bg} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#heroGrad)" />
        </Svg>
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
        <View style={styles.heroArea}>
          <Text style={styles.heroTitle}>Physiological Age</Text>
          <Text style={styles.heroDate}>{formatAsOf()}</Text>
          <Text style={styles.bioAgeValue}>{bioAge != null ? bioAge : "—"}</Text>
          {bioLabel ? (
            <>
              <View style={styles.bioLabelPill}>
                <Text style={styles.bioLabelText}>{bioLabel}</Text>
              </View>
              {bioReliability != null && (
                <Text style={styles.bioConfidence}>
                  {bioReliability}% {bioConfidenceLabel} data reliability · {bioBaselineDays ?? 0} baseline days
                </Text>
              )}
            </>
          ) : profile == null ? (
            <TouchableOpacity
              style={styles.profilePrompt}
              onPress={() => router.push({ pathname: "/onboarding/profile", params: { from: "biology" } })}
              activeOpacity={0.8}
            >
              <Text style={styles.profilePromptHint}>Set up your profile to personalize this estimate</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.bioHintDark}>
              Connect more health data to improve this physiological-age index
            </Text>
          )}
        </View>

        <View style={styles.biomarkerHeader}>
          <View>
            <Text style={styles.biomarkerHeaderTitle}>Biomarkers</Text>
            <Text style={styles.biomarkerHeaderHint}>
              Consumer health signals · not a medical measurement
            </Text>
          </View>
        </View>

        <View style={styles.biomarkersSection}>
          <BiomarkerCard
            icon="scale-bathroom"
            label="Weight"
            subtitle={
              weightLbs != null
                ? `${weightLbs.toFixed(1)} lbs`
                : "No data · — lbs"
            }
            hasData={weightLbs != null}
            samples={weightHistory}
            sparklineColor={theme.colors.info}
          />
          <BiomarkerCard
            icon="waveform"
            label="HRV"
            subtitle={
              data?.heartRateVariability != null
                ? data.hrvEstimated
                  ? `Est. ${Math.round(data.heartRateVariability)} ms`
                  : `${Math.round(data.heartRateVariability)} ms`
                : "No data · — ms"
            }
            hasData={data?.heartRateVariability != null}
            samples={hrvHistory}
            sparklineColor={theme.colors.primary}
          />
          <BiomarkerCard
            icon="heart-pulse"
            label="Resting heart rate"
            subtitle={
              data?.restingHeartRate != null
                ? `${Math.round(data.restingHeartRate)} bpm`
                : "No data · — bpm"
            }
            hasData={data?.restingHeartRate != null}
            samples={rhrHistory}
            sparklineColor={theme.colors.danger}
          />
          <BiomarkerCard
            icon="percent-outline"
            label="Body fat"
            subtitle={
              data?.bodyFat != null
                ? `${data.bodyFat.toFixed(1)} %`
                : "No data · — %"
            }
            hasData={data?.bodyFat != null}
            samples={fatHistory}
            sparklineColor={theme.colors.warning}
          />
          <BiomarkerCard
            icon="human"
            label="Lean body mass"
            subtitle={
              leanLbs != null
                ? `${leanLbs.toFixed(1)} lbs`
                : "No data · — lbs"
            }
            hasData={leanLbs != null}
          />
          <BiomarkerCard
            icon="lungs"
            label="Blood oxygen"
            subtitle={
              data?.bloodOxygen != null
                ? `${Math.round(data.bloodOxygen)} %`
                : "No data · — %"
            }
            hasData={data?.bloodOxygen != null}
          />
          {data?.vo2Max != null && (
            <BiomarkerCard
              icon="run-fast"
              label="VO₂ max"
              subtitle={`${data.vo2Max.toFixed(1)} mL/kg/min`}
              hasData
            />
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
  gradientWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxxl * 2.5 + theme.spacing.xxl,
  },
  heroArea: {
    marginHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  heroTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    textAlign: "center",
  },
  heroDate: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  bioAgeValue: {
    ...theme.typography.displayXl,
    fontSize: 76,
    lineHeight: 80,
    color: theme.colors.info,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  bioLabelPill: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bioLabelText: {
    ...theme.typography.caption,
    color: theme.colors.ink,
  },
  profilePromptHint: {
    ...theme.typography.legal,
    color: theme.colors.primary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xs,
  },
  bioHintDark: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xs,
  },
  profilePrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceElevated,
  },
  bioConfidence: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  biomarkerHeader: {
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.sm,
  },
  biomarkerHeaderTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  biomarkerHeaderHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 3,
  },
  biomarkersSection: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  biomarkerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 0,
    borderColor: "transparent",
    padding: theme.spacing.md,
    ...theme.shadows.module,
  },
  biomarkerCardEmpty: {
    opacity: 0.75,
  },
  biomarkerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  biomarkerIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  biomarkerIconEmpty: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  biomarkerTextCol: {
    flex: 1,
  },
  biomarkerLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  biomarkerSubtitle: {
    ...theme.typography.legal,
    color: theme.colors.body,
    marginTop: 2,
  },
  biomarkerTextEmpty: {
    color: theme.colors.muted,
  },
  biomarkerRight: {
    marginLeft: theme.spacing.sm,
  },
  emptySparkline: {
    width: 60,
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 0,
  },
  emptySparklineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.border,
  },
  emptySparklineLine: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
});
