import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { HealthService } from "../../src/services/health";
import { theme } from "../../src/theme";

type Brand = "garmin" | "fitbit";

const brandConfig: Record<
  Brand,
  {
    title: string;
    app_name: string;
    app_id: string;
    package: string;
    direct_steps: { title: string; description: string }[];
    system_steps: { title: string; description: string }[];
  }
> = {
  garmin: {
    title: "Connect Garmin",
    app_name: "Garmin Connect",
    app_id: "576556635",
    package: "com.garmin.android.apps.connectmobile",
    direct_steps: [
      {
        title: "Open Garmin Connect",
        description:
          "Tap the button below to launch Garmin Connect on your device.",
      },
      {
        title: "Go to More > Settings > Connected Apps",
        description:
          "In Garmin Connect, open the menu (top-left) and choose Settings, then Connected Apps.",
      },
      {
        title: "Select Health Connect",
        description:
          "Tap 'Health Connect'. If it doesn't appear, your device may have it under Android Settings > Apps > Health Connect.",
      },
      {
        title: "Sign in and grant permissions",
        description:
          "Sign in to Garmin Connect and choose the data types you want shared (Steps, Heart Rate, Sleep, etc.).",
      },
    ],
    system_steps: [
      {
        title: "Open Health Connect settings",
        description:
          "Use the 'Open Health Connect' button below to jump straight there.",
      },
      {
        title: "Allow access for this app",
        description:
          "In Health Connect, find this app ('health-app') under 'App permissions' or 'Data sources and access', and turn on read access for Steps, HR, Sleep, Distance, and Calories.",
      },
    ],
  },
  fitbit: {
    title: "Connect Fitbit",
    app_name: "Fitbit",
    app_id: "460127926",
    package: "com.fitbit.FitbitMobile",
    direct_steps: [
      {
        title: "Open Fitbit",
        description: "Tap the button below to launch Fitbit on your device.",
      },
      {
        title: "Tap your Profile",
        description: "Top-left avatar icon.",
      },
      {
        title: "Go to Settings > App Settings",
        description: "Within your Fitbit profile, find the Settings entry.",
      },
      {
        title: "Link Health Connect",
        description:
          "Open Health Connect in the linked apps area. Sign in and choose which metrics sync to Health Connect.",
      },
    ],
    system_steps: [
      {
        title: "Open Health Connect settings",
        description:
          "Use the 'Open Health Connect' button below to jump straight there.",
      },
      {
        title: "Allow access for this app",
        description:
          "In Health Connect, find this app ('health-app') under 'App permissions' or 'Data sources and access', and turn on read access for Steps, HR, Sleep, Activity, and any other relevant metrics.",
      },
    ],
  },
};

async function openSystemHealthConnect() {
  if (Platform.OS === "android") {
    try {
      const hc = require("react-native-health-connect");
      if (hc && typeof hc.openHealthConnectSettings === "function") {
        hc.openHealthConnectSettings();
        return;
      }
    } catch {}
    try {
      await Linking.sendIntent("android.settings.HEALTH_CONNECT_SETTINGS");
      return;
    } catch {}
    try {
      await Linking.openURL("market://details?id=com.google.android.apps.healthdata");
      return;
    } catch {}
    await Linking.openSettings();
  } else {
    Linking.openSettings();
  }
}

export default function WearablesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ brand: Brand }>();
  const brand: Brand = (params.brand as Brand) ?? "garmin";
  const config = brandConfig[brand] ?? brandConfig.garmin;

  const openApp = async () => {
    if (Platform.OS === "android") {
      try {
        await Linking.sendIntent("android.intent.action.MAIN", [
          { key: "android.intent.category.LAUNCHER", value: config.package } as any,
        ]);
        return;
      } catch {}
      try {
        await Linking.openURL(`market://details?id=${config.package}`);
        return;
      } catch {}
      await Linking.openURL(
        `https://play.google.com/store/apps/details?id=${config.package}`
      );
      return;
    }

    try {
      await Linking.openURL(`itms-apps://apps.apple.com/app/id${config.app_id}`);
      return;
    } catch {}
    try {
      await Linking.openURL(`https://apps.apple.com/app/id${config.app_id}`);
      return;
    } catch {}
    Alert.alert(
      "App not found",
      `Please install ${config.app_name} first, then return to this screen.`,
      [{ text: "OK" }]
    );
  };

  const openHealthConnectOnPhone = () => {
    openSystemHealthConnect();
  };

  const complete = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    await AsyncStorage.setItem("device_type", brand);
    try {
      const granted = await HealthService.initialize();
      if (!granted && Platform.OS === "android") {
        Alert.alert(
          "Grant Health Connect access",
          "Please allow this app to read your health data so it shows up in Health Connect.",
          [{ text: "OK", onPress: () => router.replace("/onboarding/complete") }]
        );
        return;
      }
    } catch {}
    router.replace("/onboarding/complete");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.step}>CONNECT</Text>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>
          Sync your {brand === "garmin" ? "Garmin" : "Fitbit"} data to Health
          Connect, and we'll pull it in automatically.
        </Text>
      </View>

      <View style={styles.methodHeader}>
        <View style={[styles.dot, { backgroundColor: theme.colors.ink }]} />
        <Text style={styles.methodTitle}>Method 1 · Inside {config.app_name}</Text>
      </View>

      <View style={styles.stepsContainer}>
        {config.direct_steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={openApp}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="open-in-new" size={18} color={theme.colors["on-primary"]} />
        <Text style={styles.primaryButtonText}>Open {config.app_name}</Text>
      </TouchableOpacity>

      <View style={[styles.methodHeader, { marginTop: 28 }]}>
        <View style={[styles.dot, { backgroundColor: theme.colors.ink }]} />
        <Text style={styles.methodTitle}>
          Method 2 · If you can't find Health Connect inside the app
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {config.system_steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View
              style={[
                styles.stepNumber,
                { backgroundColor: theme.colors["signature-cream"] },
              ]}
            >
              <Text
                style={[styles.stepNumberText, { color: theme.colors.ink }]}
              >
                {i + 1}
              </Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={openHealthConnectOnPhone}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name="cellphone-cog"
          size={18}
          color={theme.colors.ink}
        />
        <Text style={styles.secondaryButtonText}>
          Open Health Connect in Settings
        </Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons
          name="information-outline"
          size={20}
          color={theme.colors.ink}
        />
        <Text style={styles.infoText}>
          Once enabled, your {brand === "garmin" ? "Garmin" : "Fitbit"} data
          will flow into Health Connect automatically, and this app will read it
          from there.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={complete}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>Done — Finish Setup</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 60,
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
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  methodTitle: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    textTransform: "uppercase",
  },
  stepsContainer: {
    gap: theme.spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors["surface-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    ...theme.typography.caption,
    color: theme.colors.ink,
  },
  stepTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  stepDesc: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    lineHeight: 18,
  },
  stepContent: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  primaryButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  secondaryButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: theme.colors["surface-soft"],
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginTop: theme.spacing.xxl,
  },
  infoText: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    lineHeight: 18,
  },
  footer: {
    marginTop: theme.spacing.xxl,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  doneButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
});
