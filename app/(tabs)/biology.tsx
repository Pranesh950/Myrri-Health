import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService, HealthData } from "../../src/services/health";

export default function BiologyScreen() {
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

  const biomarkers = [
    {
      icon: "heart",
      label: "Resting Heart Rate",
      value: data?.heartRate?.length
        ? `${Math.round(Math.min(...data.heartRate))} bpm`
        : "--",
      status: "normal",
    },
    {
      icon: "water-opacity",
      label: "Blood Oxygen",
      value: data?.bloodOxygen != null ? `${data.bloodOxygen}%` : "--",
      status: "normal",
    },
    {
      icon: "thermometer",
      label: "Body Temperature",
      value: data?.bodyTemperature != null ? `${data.bodyTemperature}°C` : "--",
      status: "normal",
    },
    {
      icon: "scale-bathroom",
      label: "Weight",
      value: data?.weight != null ? `${data.weight} kg` : "--",
      status: "normal",
    },
    {
      icon: "human-male-height",
      label: "Height",
      value: data?.height != null ? `${data.height} cm` : "--",
      status: "normal",
    },
  ];

  const bp = data?.bloodPressure;

  const weeklyMetrics = [
    { label: "Avg Steps", value: "8,432", change: "+12%" },
    { label: "Avg Sleep", value: "7.2 hrs", change: "+5%" },
    { label: "Avg HR", value: "68 bpm", change: "-3%" },
    { label: "Active Days", value: "5/7", change: "" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      <Text style={styles.title}>Biology</Text>
      <Text style={styles.subtitle}>Your body's vital signs and biomarkers</Text>

      <View style={styles.bioAgeCard}>
        <MaterialCommunityIcons name="dna" size={32} color="#5e5ce6" />
        <View style={styles.bioAgeInfo}>
          <Text style={styles.bioAgeLabel}>Biological Age</Text>
          <Text style={styles.bioAgeValue}>28</Text>
        </View>
        <Text style={styles.bioAgeDelta}>-2.3 yrs</Text>
      </View>

      <Text style={styles.sectionTitle}>Biomarkers</Text>
      {biomarkers.map((b, i) => (
        <View key={i} style={styles.biomarkerRow}>
          <View style={styles.biomarkerIcon}>
            <MaterialCommunityIcons name={b.icon as any} size={20} color="#5e5ce6" />
          </View>
          <Text style={styles.biomarkerLabel}>{b.label}</Text>
          <Text style={styles.biomarkerValue}>{b.value}</Text>
        </View>
      ))}

      {bp && (
        <View style={styles.bpCard}>
          <Text style={styles.sectionTitle}>Blood Pressure</Text>
          <View style={styles.bpRow}>
            <View style={styles.bpStat}>
              <Text style={styles.bpStatValue}>{bp.systolic}</Text>
              <Text style={styles.bpStatLabel}>Systolic</Text>
            </View>
            <Text style={styles.bpSlash}>/</Text>
            <View style={styles.bpStat}>
              <Text style={styles.bpStatValue}>{bp.diastolic}</Text>
              <Text style={styles.bpStatLabel}>Diastolic</Text>
            </View>
            <View style={styles.bpStatus}>
              <Text style={styles.bpStatusLabel}>Normal</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Weekly Summary</Text>
      <View style={styles.weeklyGrid}>
        {weeklyMetrics.map((m, i) => (
          <View key={i} style={styles.weeklyCard}>
            <Text style={styles.weeklyValue}>{m.value}</Text>
            <Text style={styles.weeklyLabel}>{m.label}</Text>
            {m.change ? (
              <Text
                style={[
                  styles.weeklyChange,
                  { color: m.change.startsWith("+") ? "#2e7d32" : "#e53935" },
                ]}
              >
                {m.change}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a2e", marginTop: 60 },
  subtitle: { fontSize: 15, color: "#6e6e73", marginTop: 4, marginBottom: 24 },
  bioAgeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0ff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 14,
  },
  bioAgeInfo: { flex: 1 },
  bioAgeLabel: { fontSize: 13, color: "#6e6e73" },
  bioAgeValue: { fontSize: 32, fontWeight: "700", color: "#1a1a2e" },
  bioAgeDelta: { fontSize: 16, fontWeight: "600", color: "#2e7d32" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#6e6e73", marginBottom: 12 },
  biomarkerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  biomarkerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  biomarkerLabel: { flex: 1, fontSize: 15, color: "#1a1a2e" },
  biomarkerValue: { fontSize: 15, fontWeight: "600", color: "#1a1a2e" },
  bpCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  bpRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bpStat: { alignItems: "center" },
  bpStatValue: { fontSize: 28, fontWeight: "700", color: "#1a1a2e" },
  bpStatLabel: { fontSize: 11, color: "#8e8e93" },
  bpSlash: { fontSize: 28, fontWeight: "300", color: "#8e8e93" },
  bpStatus: {
    marginLeft: "auto",
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bpStatusLabel: { fontSize: 12, fontWeight: "600", color: "#2e7d32" },
  weeklyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  weeklyCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  weeklyValue: { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  weeklyLabel: { fontSize: 12, color: "#6e6e73", marginTop: 2 },
  weeklyChange: { fontSize: 12, fontWeight: "600", marginTop: 4 },
});
