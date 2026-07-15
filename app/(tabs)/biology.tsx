import { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData } from "../../src/services/health";
import { theme } from "../../src/theme";

export default function BiologyScreen() {
  const [data, setData] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const today = await HealthService.getTodayData();
    setData(today);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const biomarkers = [
    {
      icon: "heart",
      label: "Resting Heart Rate",
      value: data?.heartRate?.length
        ? `${Math.round(Math.min(...data.heartRate))} bpm`
        : "--",
    },
    {
      icon: "water-opacity",
      label: "Blood Oxygen",
      value: data?.bloodOxygen != null ? `${data.bloodOxygen}%` : "--",
    },
    {
      icon: "thermometer",
      label: "Body Temperature",
      value: data?.bodyTemperature != null ? `${data.bodyTemperature}°C` : "--",
    },
    {
      icon: "heart-pulse",
      label: "Blood Pressure",
      value: data?.bloodPressure != null
        ? `${data.bloodPressure.systolic}/${data.bloodPressure.diastolic} mmHg`
        : "--",
    },
    {
      icon: "scale-bathroom",
      label: "Weight",
      value: data?.weight != null ? `${data.weight} kg` : "--",
    },
    {
      icon: "human-male-height",
      label: "Height",
      value: data?.height != null ? `${data.height} cm` : "--",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.ink} />
      }
    >
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.title}>Biology</Text>
        <Text style={styles.subtitle}>Your body's vital signs and biomarkers</Text>
      </Animated.View>

      <Animated.View style={[styles.heroCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="dna" size={32} color={theme.colors["on-primary"]} />
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroLabel}>Biological Age</Text>
          <Text style={styles.heroValue}>28</Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>-2.3 yrs</Text>
        </View>
      </Animated.View>

      <Text style={styles.sectionTitle}>Biomarkers</Text>
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {biomarkers.map((b, i) => (
          <View key={i}>
            <View style={styles.biomarkerRow}>
              <MaterialCommunityIcons name={b.icon as any} size={20} color={theme.colors.ink} />
              <Text style={styles.biomarkerLabel}>{b.label}</Text>
              <Text style={styles.biomarkerValue}>{b.value}</Text>
            </View>
            {i < biomarkers.length - 1 && <View style={styles.biomarkerDivider} />}
          </View>
        ))}
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
  title: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    marginTop: theme.spacing.sm,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors["signature-coral"],
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.radii.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.lg,
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    ...theme.typography.caption,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
  },
  heroValue: {
    ...theme.typography.displayLg,
    color: theme.colors["on-primary"],
    marginTop: theme.spacing.xs,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  heroBadgeText: {
    ...theme.typography.bodyMd,
    color: theme.colors["on-primary"],
  },
  sectionTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.xl,
  },
  biomarkerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  biomarkerLabel: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  biomarkerValue: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  biomarkerDivider: {
    height: 1,
    backgroundColor: theme.colors.hairline,
    marginVertical: theme.spacing.sm,
  },
});
