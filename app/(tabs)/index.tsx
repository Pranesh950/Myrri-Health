import { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData } from "../../src/services/health";
import { theme } from "../../src/theme";
import { SliderScore } from "../../src/components/SliderScore";

type Status = { color: string; label: string };
type StatType = "rr" | "sleep" | "rhr" | "hrv";

function getStatus(type: StatType, value: number | null): Status {
  if (value == null) return { color: theme.colors.muted, label: "--" };
  switch (type) {
    case "rr":
      return value >= 12 && value <= 20
        ? { color: theme.colors.success, label: "Good" }
        : value >= 10 && value <= 24
        ? { color: theme.colors.warning, label: "Ok" }
        : { color: theme.colors.danger, label: "Bad" };
    case "sleep":
      return value >= 7
        ? { color: theme.colors.success, label: "Good" }
        : value >= 5
        ? { color: theme.colors.warning, label: "Ok" }
        : { color: theme.colors.danger, label: "Bad" };
    case "rhr":
      return value >= 60 && value <= 80
        ? { color: theme.colors.success, label: "Good" }
        : value >= 50 && value <= 90
        ? { color: theme.colors.warning, label: "Ok" }
        : { color: theme.colors.danger, label: "Bad" };
    case "hrv":
      return value >= 60
        ? { color: theme.colors.success, label: "Good" }
        : value >= 40
        ? { color: theme.colors.warning, label: "Ok" }
        : { color: theme.colors.danger, label: "Bad" };
    default:
      return { color: theme.colors.muted, label: "--" };
  }
}

export default function OverviewScreen() {
  const [data, setData] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasHealthAccess, setHasHealthAccess] = useState(false);
  const [hasReadAccess, setHasReadAccess] = useState(false);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const available = await HealthService.isAvailable();
    setHasHealthAccess(available);
    if (available) {
      const readAccess = await HealthService.hasReadPermissions();
      setHasReadAccess(readAccess);
      if (readAccess) {
        const today = await HealthService.getTodayData();
        setData(today);
      }
    }
    setRefreshing(false);
  }, []);

  const handleGrantAccess = useCallback(async () => {
    setRefreshing(true);
    try {
      await HealthService.initialize();
    } catch {}
    await loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const sleepHours = data?.sleepHours ?? 0;
  const heartRates = data?.heartRate ?? [];
  const avgHR =
    heartRates.length > 0
      ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length)
      : 0;

  const sleepScore = Math.min(100, (sleepHours / 8) * 100);
  const hrLoad = avgHR > 0 ? (avgHR / 180) * 100 : 0;
  const activityLoad = Math.min(100, (data?.steps ?? 0) / 100);
  const strainScore = Math.min(100, hrLoad * 0.7 + activityLoad * 0.3);

  const topStats = [
    { label: "RR", value: data?.respiratoryRate ? `${data.respiratoryRate} bpm` : "--", status: getStatus("rr", data?.respiratoryRate ?? null) },
    { label: "Sleep", value: sleepHours > 0 ? `${sleepHours.toFixed(1)} h` : "--", status: getStatus("sleep", sleepHours) },
  ];

  const bottomStats = [
    { label: "RHR", value: data?.restingHeartRate ? `${data.restingHeartRate} bpm` : "--", status: getStatus("rhr", data?.restingHeartRate ?? null) },
    { label: "HRV", value: data?.heartRateVariability ? `${data.heartRateVariability} ms` : "--", status: getStatus("hrv", data?.heartRateVariability ?? null) },
  ];

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.ink} />
      }
    >
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.date}>
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </Animated.View>

      {!hasHealthAccess && (
        <TouchableOpacity
          style={styles.alert}
          onPress={() => router.push("/onboarding/device")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color={theme.colors.warning}
          />
          <Text style={styles.alertText}>
            Health data not available. Tap to set up your device.
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.warning} />
        </TouchableOpacity>
      )}

      {hasHealthAccess && !hasReadAccess && (
        <TouchableOpacity
          style={styles.alert}
          onPress={handleGrantAccess}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="shield-link-variant"
            size={20}
            color={theme.colors.warning}
          />
          <Text style={styles.alertText}>
            Tap to grant this app read access to Health Connect.
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.warning} />
        </TouchableOpacity>
      )}

      <Animated.View
        style={[
          styles.scoresCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity
          style={styles.scoreButton}
          onPress={() => router.push("/sleep/detail")}
          activeOpacity={0.8}
        >
          <SliderScore score={sleepScore} label="Sleep" />
        </TouchableOpacity>
        <View style={styles.scoreDivider} />
        <TouchableOpacity
          style={styles.scoreButton}
          onPress={() => router.push("/strain/detail")}
          activeOpacity={0.8}
        >
          <SliderScore score={strainScore} label="Strain" invert />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.statsCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.statsTitle}>Health Stats</Text>
        <View style={styles.statsGrid}>
          {topStats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: stat.status.color }]} />
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.status.color }]}>{stat.value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statsRowSpacer} />
        <View style={styles.statsGrid}>
          {bottomStats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: stat.status.color }]} />
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.status.color }]}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  header: {
    marginTop: 60,
    marginBottom: theme.spacing.xxl,
  },
  greeting: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  date: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    marginTop: theme.spacing.sm,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors["signature-cream"],
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  alertText: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    flex: 1,
  },
  scoresCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  scoreButton: {
    flex: 1,
  },
  scoreDivider: {
    width: 1,
    height: 60,
    backgroundColor: theme.colors.hairline,
  },
  statsCard: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.xl,
  },
  statsTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsRowSpacer: {
    height: theme.spacing.lg,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radii.full,
    marginBottom: theme.spacing.sm,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  statValue: {
    ...theme.typography.labelMd,
  },
});
