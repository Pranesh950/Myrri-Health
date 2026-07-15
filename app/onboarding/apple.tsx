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
import { theme } from "../../src/theme";

const permissions = [
  { icon: "shoe-print", label: "Steps & Distance", color: theme.colors.success },
  { icon: "heart", label: "Heart Rate", color: theme.colors.danger },
  { icon: "sleep", label: "Sleep Analysis", color: theme.colors.info },
  { icon: "fire", label: "Active Calories", color: theme.colors.warning },
  { icon: "water-opacity", label: "Blood Oxygen", color: theme.colors.info },
  { icon: "thermometer", label: "Body Temperature", color: theme.colors.info },
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
            <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.hairline} />
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
          <MaterialCommunityIcons name="shield-lock" size={20} color={theme.colors["on-primary"]} />
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
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    marginTop: 100,
    marginBottom: theme.spacing.xxl,
  },
  step: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
    textTransform: "uppercase",
  },
  title: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    lineHeight: 22,
  },
  permissionsList: {
    gap: theme.spacing.sm,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionLabel: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: 60,
    gap: theme.spacing.md,
  },
  connectButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  connectButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
  skipButton: {
    alignItems: "center",
    padding: theme.spacing.md,
  },
  skipButtonText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
  },
});
