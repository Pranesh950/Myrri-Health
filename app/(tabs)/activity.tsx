import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData } from "../../src/services/health";

export default function ActivityScreen() {
  const [data, setData] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
  const distanceGoal = 8000;
  const distProgress = Math.min(distance / distanceGoal, 1);

  const heartRates = data?.heartRate ?? [];
  const maxHR = heartRates.length > 0 ? Math.max(...heartRates) : 0;
  const avgHR = heartRates.length > 0
    ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length)
    : 0;

  const workouts = [
    { type: "Run", duration: "32 min", calories: 320, time: "07:15" },
    { type: "Strength", duration: "45 min", calories: 280, time: "Yesterday" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>Today's movement and training</Text>

      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Daily Goals</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressCircle}>
            <MaterialCommunityIcons name="shoe-print" size={24} color="#2e7d32" />
            <Text style={styles.progressValue}>{steps.toLocaleString()}</Text>
            <Text style={styles.progressLabel}>steps</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${stepProgress * 100}%`, backgroundColor: "#2e7d32" }]} />
            </View>
            <Text style={styles.barTarget}>Goal: {stepGoal.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressCircle}>
            <MaterialCommunityIcons name="fire" size={24} color="#e65100" />
            <Text style={styles.progressValue}>{Math.round(calories)}</Text>
            <Text style={styles.progressLabel}>kcal</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${calProgress * 100}%`, backgroundColor: "#e65100" }]} />
            </View>
            <Text style={styles.barTarget}>Goal: {calGoal}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressCircle}>
            <MaterialCommunityIcons name="map-marker-distance" size={24} color="#1565c0" />
            <Text style={styles.progressValue}>{(distance / 1000).toFixed(1)}</Text>
            <Text style={styles.progressLabel}>km</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${distProgress * 100}%`, backgroundColor: "#1565c0" }]} />
            </View>
            <Text style={styles.barTarget}>Goal: {(distanceGoal / 1000).toFixed(0)} km</Text>
          </View>
        </View>
      </View>

      <View style={styles.hrSection}>
        <Text style={styles.sectionTitle}>Heart Rate</Text>
        <View style={styles.hrGrid}>
          <View style={styles.hrStat}>
            <Text style={styles.hrStatValue}>{avgHR || "--"}</Text>
            <Text style={styles.hrStatLabel}>Avg BPM</Text>
          </View>
          <View style={styles.hrStat}>
            <Text style={styles.hrStatValue}>{maxHR || "--"}</Text>
            <Text style={styles.hrStatLabel}>Max BPM</Text>
          </View>
          <View style={styles.hrStat}>
            <Text style={styles.hrStatValue}>{heartRates.length}</Text>
            <Text style={styles.hrStatLabel}>Readings</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      {workouts.map((w, i) => (
        <View key={i} style={styles.workoutCard}>
          <View style={styles.workoutIcon}>
            <MaterialCommunityIcons
              name={w.type === "Run" ? "run" : "dumbbell"}
              size={24}
              color="#5e5ce6"
            />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutType}>{w.type}</Text>
            <Text style={styles.workoutMeta}>{w.duration} · {w.calories} kcal</Text>
          </View>
          <Text style={styles.workoutTime}>{w.time}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.logButton}>
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.logButtonText}>Log Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a2e", marginTop: 60 },
  subtitle: { fontSize: 15, color: "#6e6e73", marginTop: 4, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#6e6e73", marginBottom: 12 },
  progressSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 14,
  },
  progressCircle: { alignItems: "center", width: 60 },
  progressValue: { fontSize: 18, fontWeight: "700", color: "#1a1a2e", marginTop: 4 },
  progressLabel: { fontSize: 11, color: "#8e8e93" },
  progressBar: { flex: 1 },
  barBg: {
    height: 8,
    backgroundColor: "#f0f0f5",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  barTarget: { fontSize: 11, color: "#8e8e93", marginTop: 4 },
  hrSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  hrGrid: { flexDirection: "row", justifyContent: "space-around" },
  hrStat: { alignItems: "center" },
  hrStatValue: { fontSize: 22, fontWeight: "700", color: "#1a1a2e" },
  hrStatLabel: { fontSize: 11, color: "#8e8e93", marginTop: 2 },
  workoutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f0f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  workoutInfo: { flex: 1 },
  workoutType: { fontSize: 16, fontWeight: "600", color: "#1a1a2e" },
  workoutMeta: { fontSize: 13, color: "#6e6e73", marginTop: 2 },
  workoutTime: { fontSize: 13, color: "#8e8e93" },
  logButton: {
    flexDirection: "row",
    backgroundColor: "#5e5ce6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  logButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
