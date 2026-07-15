import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";

type Device = "apple" | "garmin" | "fitbit" | "other";

const devices: {
  id: Device;
  label: string;
  icon: string;
  description: string;
}[] = [
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
    description: "Syncs via Health Connect on Android",
  },
  {
    id: "fitbit",
    label: "Fitbit",
    icon: "watch-variant",
    description: "Syncs via Health Connect on Android",
  },
  {
    id: "other",
    label: "No Device",
    icon: "cellphone",
    description: "Track manually",
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
            activeOpacity={0.75}
          >
            <View style={styles.optionIcon}>
              <MaterialCommunityIcons
                name={device.icon as any}
                size={28}
                color={theme.colors["on-primary"]}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>{device.label}</Text>
              <Text style={styles.optionDesc}>{device.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
          </TouchableOpacity>
        ))}
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
  options: {
    gap: theme.spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  optionDesc: {
    ...theme.typography.caption,
    color: theme.colors.body,
    marginTop: 2,
  },
});
