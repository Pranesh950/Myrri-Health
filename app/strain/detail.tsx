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

export default function StrainDetailScreen() {
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

  const heartRates = data?.heartRate ?? [];
  const avgHR =
    heartRates.length > 0
      ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length)
      : 0;
  const maxHR = heartRates.length > 0 ? Math.max(...heartRates) : 0;

  const hrLoad = avgHR > 0 ? (avgHR / 180) * 100 : 0;
  const activityLoad = Math.min(100, (data?.steps ?? 0) / 100);
  const strainScore = Math.min(100, Math.round(hrLoad * 0.7 + activityLoad * 0.3));

  const metrics = [
    {
      label: "Avg HR",
      value: avgHR > 0 ? `${avgHR} bpm` : "--",
      icon: "heart-pulse",
      color: theme.colors.danger,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Max HR",
      value: maxHR > 0 ? `${maxHR} bpm` : "--",
      icon: "heart",
      color: theme.colors.danger,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Steps",
      value: data?.steps ? data.steps.toLocaleString() : "--",
      icon: "shoe-print",
      color: theme.colors.success,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Distance",
      value: data?.distance ? `${(data.distance / 1000).toFixed(1)} km` : "--",
      icon: "map-marker-distance",
      color: theme.colors.info,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Calories",
      value: data?.activeCalories ? `${Math.round(data.activeCalories)} kcal` : "--",
      icon: "fire",
      color: theme.colors.warning,
      bg: theme.colors["surface-soft"],
    },
    {
      label: "Resting HR",
      value: data?.restingHeartRate ? `${data.restingHeartRate} bpm` : "--",
      icon: "sleep",
      color: theme.colors.success,
      bg: theme.colors["surface-soft"],
    },
  ];

  const insights = [
    strainScore >= 80
      ? "High strain today. Your cardiovascular and muscular systems have worked hard — prioritize recovery."
      : strainScore >= 50
      ? "Moderate strain. You maintained a healthy activity level without overdoing it."
      : "Low strain today. A good day for active recovery or a longer walk.",
    avgHR > 0
      ? `Your average heart rate was ${avgHR} bpm, contributing to today's cardiovascular load.`
      : "Heart rate data will appear here once Health Connect shares it.",
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
        <Text style={styles.title}>Strain</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={[
            styles.scoreCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.scoreValue}>{strainScore}</Text>
          <Text style={styles.scoreLabel}>Strain Score</Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreFill,
                { width: `${strainScore}%`, backgroundColor: theme.colors.danger },
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
                style={[styles.insightDot, { backgroundColor: theme.colors.danger }]}
              />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </Animated.View>

        <Text style={styles.sectionTitle}>Exertion Metrics</Text>
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
    color: theme.colors.danger,
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
