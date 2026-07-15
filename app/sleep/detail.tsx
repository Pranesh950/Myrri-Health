import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData } from "../../src/services/health";
import { theme } from "../../src/theme";

export default function SleepDetailScreen() {
  const router = useRouter();
  const [data, setData] = useState<HealthData | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    HealthService.getTodayData().then(setData);
  }, []);

  const sleepHours = data?.sleepHours ?? 0;
  const sleepScore = Math.min(100, Math.round((sleepHours / 8) * 100));

  const metrics = [
    {
      label: "Total Sleep",
      value: sleepHours > 0 ? `${sleepHours.toFixed(1)} h` : "--",
      icon: "bed",
      color: theme.colors.info,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Resting HR",
      value: data?.restingHeartRate ? `${data.restingHeartRate} bpm` : "--",
      icon: "heart-pulse",
      color: theme.colors.danger,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "HRV",
      value: data?.heartRateVariability ? `${data.heartRateVariability} ms` : "--",
      icon: "waveform",
      color: theme.colors.info,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Blood Oxygen",
      value: data?.bloodOxygen ? `${data.bloodOxygen}%` : "--",
      icon: "water-percent",
      color: theme.colors.info,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Body Temp",
      value: data?.bodyTemperature ? `${data.bodyTemperature.toFixed(1)}°C` : "--",
      icon: "thermometer",
      color: theme.colors.warning,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Resp Rate",
      value: data?.respiratoryRate ? `${data.respiratoryRate} /min` : "--",
      icon: "lungs",
      color: theme.colors.success,
      bg: theme.colors["surface-soft"],
    },
  ];

  const insights = [
    sleepScore >= 80
      ? "Your sleep score looks great. You likely woke up well-recovered."
      : sleepScore >= 50
      ? "Moderate sleep. A consistent bedtime could push this higher."
      : "Your sleep score is low. Prioritize an earlier bedtime tonight.",
    data?.restingHeartRate && data.restingHeartRate < 60
      ? "Your resting heart rate is in a healthy range."
      : data?.restingHeartRate && data.restingHeartRate > 80
      ? "Resting HR is elevated — recovery may benefit from extra rest."
      : "Resting HR will appear here once Health Connect shares it.",
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.ink}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Sleep</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={[
            styles.scoreCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.scoreValue}>{sleepScore}</Text>
          <Text style={styles.scoreLabel}>Sleep Score</Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreFill,
                { width: `${sleepScore}%`, backgroundColor: theme.colors.info },
              ]}
            />
          </View>
          <View style={styles.scoreMarkers}>
            <View style={styles.scoreMarker} />
            <View style={styles.scoreMarker} />
            <View style={styles.scoreMarker} />
            <View style={styles.scoreMarker} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.insightsCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.sectionTitle}>Insights</Text>
          {insights.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View
                style={[styles.insightDot, { backgroundColor: theme.colors.info }]}
              />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </Animated.View>

        <Text style={styles.sectionTitle}>Recovery Metrics</Text>
        <Animated.View
          style={[
            styles.grid,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {metrics.map((metric, i) => (
            <View key={i} style={styles.card}>
              <View
                style={[styles.iconCircle, { backgroundColor: metric.bg }]}
              >
                <MaterialCommunityIcons
                  name={metric.icon as any}
                  size={22}
                  color={metric.color}
                />
              </View>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
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
    backgroundColor: theme.colors.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  title: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  scoreCard: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  scoreValue: {
    ...theme.typography.displayXl,
    color: theme.colors.info,
  },
  scoreLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    marginTop: theme.spacing.xs,
  },
  scoreBar: {
    width: "100%",
    height: 16,
    backgroundColor: theme.colors["surface-soft"],
    borderRadius: theme.radii.full,
    marginTop: theme.spacing.lg,
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: theme.radii.full,
  },
  scoreMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: theme.spacing.sm,
    paddingHorizontal: 2,
  },
  scoreMarker: {
    width: 4,
    height: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.hairline,
  },
  insightsCard: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radii.full,
    marginTop: 6,
  },
  insightText: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    flex: 1,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.body,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  metricValue: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
});
