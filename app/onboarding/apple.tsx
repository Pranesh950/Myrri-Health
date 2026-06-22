import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService } from "../../src/services/health";

const permissions = [
  { icon: "shoe-print", label: "Steps & Distance", color: "#2e7d32" },
  { icon: "heart", label: "Heart Rate", color: "#e53935" },
  { icon: "sleep", label: "Sleep Analysis", color: "#7b1fa2" },
  { icon: "fire", label: "Active Calories", color: "#e65100" },
  { icon: "water-opacity", label: "Blood Oxygen", color: "#1565c0" },
  { icon: "thermometer", label: "Body Temperature", color: "#00838f" },
];

export default function AppleScreen() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const handleConnect = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert(
        "HealthKit Not Available",
        "Apple HealthKit is only available on iOS devices.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }

    setRequesting(true);
    try {
      const granted = await HealthService.initialize();
      if (granted) {
        await AsyncStorage.setItem("onboarding_complete", "true");
        await AsyncStorage.setItem("device_type", "apple");
        router.push("/onboarding/complete");
      } else {
        Alert.alert(
          "Permission Denied",
          "HealthKit access was denied. You can enable it later in Settings > Privacy > Health.",
          [{ text: "Skip", onPress: () => router.push("/onboarding/complete") }]
        );
      }
    } catch {
      Alert.alert(
        "Error",
        "Could not connect to HealthKit. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    await AsyncStorage.setItem("device_type", "apple");
    router.push("/onboarding/complete");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>2 of 2</Text>
        <Text style={styles.title}>Connect to HealthKit</Text>
        <Text style={styles.subtitle}>
          Allow access to your health data so we can show your daily metrics.
        </Text>
      </View>

      <View style={styles.permissionsList}>
        {permissions.map((p, i) => (
          <View key={i} style={styles.permissionRow}>
            <View style={[styles.permissionIcon, { backgroundColor: `${p.color}15` }]}>
              <MaterialCommunityIcons name={p.icon as any} size={22} color={p.color} />
            </View>
            <Text style={styles.permissionLabel}>{p.label}</Text>
            <MaterialCommunityIcons name="check-circle" size={20} color="#c7c7cc" />
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnect}
          disabled={requesting}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="shield-lock" size={20} color="#fff" />
          <Text style={styles.connectButtonText}>
            {requesting ? "Requesting Access..." : "Allow HealthKit Access"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Set Up Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 100,
    marginBottom: 32,
  },
  step: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5e5ce6",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#6e6e73",
    lineHeight: 22,
  },
  permissionsList: {
    gap: 4,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a2e",
  },
  footer: {
    marginTop: "auto",
    paddingBottom: 60,
    gap: 12,
  },
  connectButton: {
    flexDirection: "row",
    backgroundColor: "#5e5ce6",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  skipButton: {
    alignItems: "center",
    padding: 14,
  },
  skipButtonText: {
    fontSize: 15,
    color: "#8e8e93",
    fontWeight: "500",
  },
});
