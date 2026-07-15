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
import { useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData } from "../../src/services/health";
import { theme } from "../../src/theme";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ActivityScreen() {
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

  const steps = data?.steps ?? 0;
  const stepGoal = 10000;
  const stepProgress = Math.min(steps / stepGoal, 1);

  const calories = data?.activeCalories ?? 0;
  const calGoal = 500;
  const calProgress = Math.min(calories / calGoal, 1);

  const distance = data?.distance ?? 0;
  const distGoal = 8000;
  const distProgress = Math.min(distance / distGoal, 1);

  const workouts = [
    { type: "Run", duration: "32 min", calories: 320, time: "07:15" },
    { type: "Strength", duration: "45 min", calories: 280, time: "Yesterday" },
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
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Today's movement and training</Text>
      </Animated.View>

      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ProgressRow
          icon="shoe-print"
          iconColor={theme.colors.success}
          label="Steps"
          value={`${steps.toLocaleString()} / ${stepGoal.toLocaleString()}`}
          progress={stepProgress}
          goal={stepGoal.toLocaleString()}
        />
        <View style={styles.divider} />
        <ProgressRow
          icon="fire"
          iconColor={theme.colors.warning}
          label="Calories"
          value={Math.round(calories).toString()}
          progress={calProgress}
          goal={`${calGoal} kcal`}
        />
        <View style={styles.divider} />
        <ProgressRow
          icon="map-marker-distance"
          iconColor={theme.colors.info}
          label="Distance"
          value={`${(distance / 1000).toFixed(1)} km`}
          progress={distProgress}
          goal={`${(distGoal / 1000).toFixed(0)} km`}
        />
      </Animated.View>

      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      {workouts.map((w, i) => (
        <TouchableOpacity key={i} style={styles.workoutCard} activeOpacity={0.8}>
          <View style={styles.workoutIcon}>
            <MaterialCommunityIcons
              name={w.type === "Run" ? "run" : "dumbbell"}
              size={24}
              color={theme.colors.ink}
            />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutType}>{w.type}</Text>
            <Text style={styles.workoutMeta}>{w.duration} · {w.calories} kcal</Text>
          </View>
          <Text style={styles.workoutTime}>{w.time}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logButton} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus" size={20} color={theme.colors["on-primary"]} />
        <Text style={styles.logButtonText}>Log Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ProgressRow({
  icon,
  iconColor,
  label,
  value,
  progress,
  goal,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  progress: number;
  goal: string;
}) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
      </View>
      <View style={styles.fill}>
        <Text style={styles.rowValue}>{value}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: iconColor, width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
          ]}
        />
      </View>
      <Text style={styles.goalText}>{goal}</Text>
    </View>
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
  card: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    minWidth: 70,
  },
  rowValue: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  rowLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors["surface-soft"],
    borderRadius: theme.radii.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: theme.radii.full,
  },
  goalText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    width: 60,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.hairline,
    marginVertical: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
  },
  workoutCard: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors["surface-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  workoutInfo: {
    flex: 1,
  },
  workoutType: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  workoutMeta: {
    ...theme.typography.caption,
    color: theme.colors.body,
    marginTop: 2,
  },
  workoutTime: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  logButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xxl,
  },
  logButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
});
