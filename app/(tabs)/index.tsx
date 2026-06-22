import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData } from "../../src/services/health";

export default function OverviewScreen() {
  const [data, setData] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasHealthAccess, setHasHealthAccess] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const available = await HealthService.isAvailable();
    setHasHealthAccess(available);
    if (available) {
      const today = await HealthService.getTodayData();
      setData(today);
    }
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const steps = data?.steps ?? 0;
  const calories = data?.activeCalories ?? 0;
  const distance = data?.distance ?? 0;
  const sleepHours = data?.sleepHours ?? 0;
  const heartRates = data?.heartRate ?? [];
  const avgHR = heartRates.length > 0
    ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>

      {!hasHealthAccess && (
        <View style={styles.alert}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#ff9500" />
          <Text style={styles.alertText}>
            Health data not available. Grant permissions in your device settings.
          </Text>
        </View>
      )}

      <View style={styles.scoreRow}>
        <View style={[styles.scoreCard, { backgroundColor: "#e8f5e9" }]}>
          <MaterialCommunityIcons name="shoe-print" size={28} color="#2e7d32" />
          <Text style={styles.scoreValue}>{steps.toLocaleString()}</Text>
          <Text style={styles.scoreLabel}>Steps</Text>
        </View>
        <View style={[styles.scoreCard, { backgroundColor: "#fff3e0" }]}>
          <MaterialCommunityIcons name="fire" size={28} color="#e65100" />
          <Text style={styles.scoreValue}>{Math.round(calories)}</Text>
          <Text style={styles.scoreLabel}>Calories</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View style={[styles.scoreCard, { backgroundColor: "#e3f2fd" }]}>
          <MaterialCommunityIcons name="map-marker-distance" size={28} color="#1565c0" />
          <Text style={styles.scoreValue}>{(distance / 1000).toFixed(1)} km</Text>
          <Text style={styles.scoreLabel}>Distance</Text>
        </View>
        <View style={[styles.scoreCard, { backgroundColor: "#f3e5f5" }]}>
          <MaterialCommunityIcons name="sleep" size={28} color="#7b1fa2" />
          <Text style={styles.scoreValue}>{sleepHours.toFixed(1)} h</Text>
          <Text style={styles.scoreLabel}>Sleep</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Heart Rate</Text>
        <View style={styles.hrContainer}>
          <MaterialCommunityIcons name="heart" size={24} color="#e53935" />
          <Text style={styles.hrValue}>{avgHR > 0 ? `${avgHR} bpm` : "--"}</Text>
          <Text style={styles.hrSub}>
            {heartRates.length > 0 ? `${heartRates.length} readings today` : "No data yet"}
          </Text>
        </View>
      </View>

      {data?.bloodPressure && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Pressure</Text>
          <Text style={styles.bpValue}>
            {data.bloodPressure.systolic}/{data.bloodPressure.diastolic} mmHg
          </Text>
        </View>
      )}

      {data?.bloodOxygen != null && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Oxygen</Text>
          <Text style={styles.bpValue}>{data.bloodOxygen}%</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  greeting: { fontSize: 28, fontWeight: "700", color: "#1a1a2e", marginTop: 60 },
  date: { fontSize: 15, color: "#6e6e73", marginTop: 4, marginBottom: 24 },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8e1",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  alertText: { fontSize: 13, color: "#795548", flex: 1 },
  scoreRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  scoreCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  scoreValue: { fontSize: 22, fontWeight: "700", color: "#1a1a2e" },
  scoreLabel: { fontSize: 12, color: "#6e6e73", fontWeight: "500" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#6e6e73", marginBottom: 8 },
  hrContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  hrValue: { fontSize: 22, fontWeight: "700", color: "#1a1a2e" },
  hrSub: { fontSize: 12, color: "#6e6e73", marginLeft: "auto" },
  bpValue: { fontSize: 22, fontWeight: "700", color: "#1a1a2e" },
});
