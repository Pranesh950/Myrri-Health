import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

type Device = "apple" | "garmin" | "fitbit" | "other";

const devices: { id: Device; label: string; icon: string; description: string }[] = [
  {
    id: "apple",
    label: "Apple Watch",
    icon: "watch",
    description: "Syncs directly with HealthKit",
  },
  {
    id: "garmin",
    label: "Garmin",
    icon: "watch-variant",
    description: "Connect via Garmin Connect",
  },
  {
    id: "fitbit",
    label: "Fitbit",
    icon: "watch-variant",
    description: "Connect via Fitbit app",
  },
  {
    id: "other",
    label: "No Device",
    icon: "cellphone",
    description: "Manual tracking only",
  },
];

export default function DeviceScreen() {
  const router = useRouter();

  const handleSelect = (device: Device) => {
    if (device === "apple") {
      router.push("/onboarding/apple");
    } else if (device === "garmin" || device === "fitbit") {
      router.push({ pathname: "/onboarding/wearables", params: { brand: device } });
    } else {
      router.push("/onboarding/complete");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>1 of 2</Text>
        <Text style={styles.title}>What do you wear?</Text>
        <Text style={styles.subtitle}>
          We'll connect your device to pull in health data automatically.
        </Text>
      </View>

      <View style={styles.options}>
        {devices.map((device) => (
          <TouchableOpacity
            key={device.id}
            style={styles.option}
            onPress={() => handleSelect(device.id)}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <MaterialCommunityIcons
                name={device.icon as any}
                size={28}
                color="#5e5ce6"
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>{device.label}</Text>
              <Text style={styles.optionDesc}>{device.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#c7c7cc" />
          </TouchableOpacity>
        ))}
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
    marginBottom: 40,
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
  options: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f0f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  optionDesc: {
    fontSize: 13,
    color: "#8e8e93",
    marginTop: 2,
  },
});
