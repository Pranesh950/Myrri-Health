import { useState } from "react";
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
import {
  HealthService,
  HealthConnectionStatus,
  isConnectedStatus,
} from "../../src/services/health";
import { theme } from "../../src/theme";
import { useGoBack } from "../../src/hooks/useGoBack";

type Brand =
  | "garmin"
  | "fitbit"
  | "samsung"
  | "googlefit"
  | "xiaomi"
  | "huawei"
  | "oura"
  | "whoop"
  | "amazfit";

interface Step {
  title: string;
  description: string;
}

interface BrandConfig {
  title: string;
  app_name: string;
  /** Android package name, used to launch the app / Play Store fallback. */
  package: string;
  /** iOS App Store numeric id, used for the App Store fallback. */
  app_id: string;
  /** Steps inside the vendor app to connect the platform health store. */
  android_steps: Step[];
  ios_steps: Step[];
}

const brandConfig: Record<Brand, BrandConfig> = {
  garmin: {
    title: "Connect Garmin",
    app_name: "Garmin Connect",
    app_id: "576556635",
    package: "com.garmin.android.apps.connectmobile",
    android_steps: [
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
    ios_steps: [
      {
        title: "Open Garmin Connect",
        description:
          "Tap the button below to launch Garmin Connect on your device.",
      },
      {
        title: "Go to More > Settings > Connected Apps",
        description:
          "Open the menu (bottom right), choose Settings, then Connected Apps.",
      },
      {
        title: "Select Apple Health",
        description:
          "Tap Apple Health, then Connect with Apple Health.",
      },
      {
        title: "Choose what to share",
        description:
          "Toggle on the metrics you want synced (Steps, Heart Rate, Sleep, etc.).",
      },
    ],
  },
  fitbit: {
    title: "Connect Fitbit",
    app_name: "Fitbit",
    app_id: "462638897",
    package: "com.fitbit.FitbitMobile",
    android_steps: [
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
    ios_steps: [
      {
        title: "Open Fitbit",
        description: "Tap the button below to launch Fitbit on your device.",
      },
      {
        title: "Tap your Profile",
        description: "Top-left avatar icon.",
      },
      {
        title: "Go to Settings > Health",
        description: "Within your Fitbit profile, find the Settings entry, then open Health.",
      },
      {
        title: "Connect Apple Health",
        description:
          "Tap Connect and choose which metrics sync to Apple Health.",
      },
    ],
  },
  samsung: {
    title: "Connect Samsung Galaxy Watch",
    app_name: "Samsung Health",
    app_id: "",
    package: "com.sec.android.app.shealth",
    android_steps: [
      {
        title: "Open Samsung Health",
        description:
          "Tap the button below to launch Samsung Health on your device.",
      },
      {
        title: "Go to Settings",
        description:
          "Tap the ⋮ menu (top right), then choose Settings.",
      },
      {
        title: "Select Health Connect",
        description:
          "Tap Health Connect, then Get started if it's your first time.",
      },
      {
        title: "Choose what to share",
        description:
          "Toggle on the data types you want synced (Steps, Heart Rate, Sleep, etc.).",
      },
    ],
    ios_steps: [],
  },
  googlefit: {
    title: "Connect Pixel Watch",
    app_name: "Google Fit",
    app_id: "",
    package: "com.google.android.apps.fitness",
    android_steps: [
      {
        title: "Open Google Fit",
        description:
          "Tap the button below to launch Google Fit on your device.",
      },
      {
        title: "Go to Profile > Settings",
        description:
          "Tap the Profile tab (bottom right), then the Settings gear (top right).",
      },
      {
        title: "Turn on Health Connect sync",
        description:
          "Under 'Health Connect', toggle Sync Fit with Health Connect to on.",
      },
      {
        title: "Grant permissions",
        description:
          "Follow the prompts to allow Steps, Heart Rate, and Sleep.",
      },
    ],
    ios_steps: [],
  },
  xiaomi: {
    title: "Connect Xiaomi",
    app_name: "Mi Fitness",
    app_id: "1493500777",
    package: "com.xiaomi.wearable",
    android_steps: [
      {
        title: "Open Mi Fitness",
        description:
          "Tap the button below to launch Mi Fitness on your device.",
      },
      {
        title: "Go to Profile > Third-party data",
        description:
          "Tap the Profile tab (bottom right), then Third-party data (or Settings > Connected apps).",
      },
      {
        title: "Select Health Connect",
        description:
          "Tap Health Connect and authorize the connection.",
      },
      {
        title: "Choose what to share",
        description:
          "Turn on the data types you want synced (Steps, Heart Rate, Sleep).",
      },
    ],
    ios_steps: [
      {
        title: "Open Mi Fitness",
        description:
          "Tap the button below to launch Mi Fitness on your device.",
      },
      {
        title: "Go to Profile > Third-party data",
        description:
          "Tap the Profile tab (bottom right), then Third-party data.",
      },
      {
        title: "Connect Apple Health",
        description: "Tap Apple Health and enable sync.",
      },
      {
        title: "Allow access",
        description:
          "Approve the permission prompt with the data types you want.",
      },
    ],
  },
  huawei: {
    title: "Connect Huawei",
    app_name: "HUAWEI Health",
    app_id: "1325481372",
    package: "com.huawei.health",
    android_steps: [
      {
        title: "Open HUAWEI Health",
        description:
          "Tap the button below to launch HUAWEI Health on your device.",
      },
      {
        title: "Go to Me > Settings",
        description:
          "Tap the Me tab (bottom right), then Settings (or Privacy management).",
      },
      {
        title: "Select Data sharing & authorization",
        description:
          "Tap Data sharing & authorization, then Health Connect.",
      },
      {
        title: "Turn on sharing",
        description:
          "Enable the data types you want synced (Steps, Heart Rate, Sleep).",
      },
    ],
    ios_steps: [
      {
        title: "Open HUAWEI Health",
        description:
          "Tap the button below to launch HUAWEI Health on your device.",
      },
      {
        title: "Go to Me > Settings",
        description:
          "Tap the Me tab (bottom right), then Settings or Privacy management.",
      },
      {
        title: "Select Apple Health",
        description:
          "Tap Third-party services (or Health Service Kit) and choose Apple Health.",
      },
      {
        title: "Allow access",
        description:
          "Grant permission for the data types you want.",
      },
    ],
  },
  oura: {
    title: "Connect Oura Ring",
    app_name: "Oura",
    app_id: "1043837948",
    package: "com.ouraring.oura",
    android_steps: [
      {
        title: "Open Oura",
        description:
          "Tap the button below to launch the Oura app on your device.",
      },
      {
        title: "Go to Menu > Settings",
        description: "Tap the menu (top left), then Settings.",
      },
      {
        title: "Tap Health Connect",
        description: "Under Data sharing, tap Health Connect.",
      },
      {
        title: "Choose what to share",
        description:
          "Toggle on the data types you want (Steps, Heart Rate, Sleep, etc.).",
      },
    ],
    ios_steps: [
      {
        title: "Open Oura",
        description:
          "Tap the button below to launch the Oura app on your device.",
      },
      {
        title: "Go to Menu > Settings",
        description: "Tap the menu (top left), then Settings.",
      },
      {
        title: "Tap Apple Health",
        description:
          "Under Data sharing, tap Apple Health, then Connect to Health.",
      },
      {
        title: "Choose what to share",
        description:
          "Toggle on the data types you want (Steps, Heart Rate, Sleep, etc.).",
      },
    ],
  },
  whoop: {
    title: "Connect WHOOP",
    app_name: "WHOOP",
    app_id: "933944389",
    package: "com.whoop.android",
    android_steps: [
      {
        title: "Open WHOOP",
        description:
          "Tap the button below to launch WHOOP on your device.",
      },
      {
        title: "Go to More > Account & Settings",
        description:
          "Tap the More tab (bottom right), then Account & Settings.",
      },
      {
        title: "Tap Integrations > Health Connect",
        description: "Tap Integrations, then Health Connect.",
      },
      {
        title: "Allow permissions",
        description:
          "Follow the prompts to share Steps, Heart Rate, and Sleep.",
      },
    ],
    ios_steps: [
      {
        title: "Open WHOOP",
        description:
          "Tap the button below to launch WHOOP on your device.",
      },
      {
        title: "Go to More > App Settings",
        description:
          "Tap the More tab (bottom right), then App Settings (or Integrations).",
      },
      {
        title: "Tap Apple Health > Connect",
        description: "Tap Apple Health, then Connect.",
      },
      {
        title: "Allow permissions",
        description: "Approve the prompt with the data types you want.",
      },
    ],
  },
  amazfit: {
    title: "Connect Amazfit",
    app_name: "Zepp",
    app_id: "1127269366",
    package: "com.huami.watch.hmwatchmanager",
    android_steps: [
      {
        title: "Open Zepp",
        description:
          "Tap the button below to launch the Zepp app on your device.",
      },
      {
        title: "Go to Profile > Third-party account linking",
        description:
          "Tap the Profile tab (bottom right), then Third-Party Account Linking.",
      },
      {
        title: "Select Health Connect",
        description: "Tap Health Connect, then Add / Connect.",
      },
      {
        title: "Grant permissions",
        description:
          "Allow the data types you want synced (Steps, Heart Rate, Sleep).",
      },
    ],
    ios_steps: [
      {
        title: "Open Zepp",
        description:
          "Tap the button below to launch the Zepp app on your device.",
      },
      {
        title: "Go to Profile > Third-party account linking",
        description:
          "Tap the Profile tab (bottom right), then Third-Party Account Linking.",
      },
      {
        title: "Select Apple Health",
        description: "Tap Apple Health, then Turn on.",
      },
      {
        title: "Grant permissions",
        description: "Allow the data types you want synced.",
      },
    ],
  },
};

// Method 2 system-level steps. On Android the vendor app writes to Health
// Connect, and the user grants this app read access inside Health Connect.
// On iOS everything flows through Apple Health instead.
const ANDROID_SYSTEM_STEPS: Step[] = [
  {
    title: "Open Health Connect settings",
    description:
      "Use the 'Open Health Connect' button below to jump straight there.",
  },
  {
    title: "Allow access for this app",
    description:
      "In Health Connect, find this app ('Myrri') under 'App permissions' or 'Data sources and access', and turn on read access for Steps, HR, Sleep, Distance, and Calories.",
  },
];

const IOS_SYSTEM_STEPS: Step[] = [
  {
    title: "Open Settings",
    description:
      "Tap the button below to open Myrri's Settings page, or open the Health app directly.",
  },
  {
    title: "Health > Data Access & Devices",
    description:
      "In Settings, open Health > Data Access & Devices. In the Health app, tap your profile picture (top right) > Apps instead.",
  },
  {
    title: "Find Myrri",
    description:
      "Tap Myrri and turn on the categories you want to share (Steps, Heart Rate, Sleep, etc.).",
  },
];

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
  const handleBack = useGoBack();
  const params = useLocalSearchParams<{ brand: Brand }>();
  const brand: Brand = (params.brand as Brand) ?? "garmin";
  const config = brandConfig[brand] ?? brandConfig.garmin;
  const [connecting, setConnecting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState<HealthConnectionStatus | null>(null);

  const isAndroid = Platform.OS === "android";
  const healthStoreName = isAndroid ? "Health Connect" : "Apple Health";
  const appSteps = isAndroid ? config.android_steps : config.ios_steps;
  const systemSteps = isAndroid ? ANDROID_SYSTEM_STEPS : IOS_SYSTEM_STEPS;

  // Success states = access confirmed, whether or not the wearable has synced
  // records yet. Anything else is treated as not connected.
  const isConnectedOk = verified && status != null && isConnectedStatus(status);

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

    if (!config.app_id) return;
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
    setConnecting(true);
    await AsyncStorage.setItem("device_type", brand);
    try {
      const granted = await HealthService.initialize(true);
      const conn = await HealthService.getConnectionStatus();
      setStatus(conn);
      setVerified(true);

      const ok = granted && isConnectedStatus(conn);
      if (ok) {
        // Access confirmed — show the inline result card and let the user
        // tap Continue, instead of silently moving on.
        return;
      }

      Alert.alert(
        "Health access not enabled",
        `This app cannot show your ${config.app_name} data until read access is allowed. You can try again, open ${healthStoreName} settings, or continue without connecting.`,
        [
          { text: "Try Again", onPress: complete },
          { text: "Open Settings", onPress: openHealthConnectOnPhone },
          {
            text: "Continue Without It",
            style: "cancel",
            onPress: async () => {
              await HealthService.markSetupLater();
              router.replace("/onboarding/profile");
            },
          },
        ]
      );
    } catch {
      Alert.alert(
        "Could not check health access",
        "You can continue setup and connect your wearable later from the Overview tab.",
        [
          {
            text: "Continue",
            onPress: async () => {
              await HealthService.markSetupLater();
              router.replace("/onboarding/profile");
            },
          },
        ]
      );
    } finally {
      setConnecting(false);
    }
  };

  const continueLater = async () => {
    await HealthService.markSetupLater();
    await AsyncStorage.setItem("device_type", brand);
    router.replace("/onboarding/profile");
  };

  const continueToProfile = async () => {
    await AsyncStorage.setItem("device_type", brand);
    router.replace("/onboarding/profile");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.step}>CONNECT</Text>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>
          Sync your {config.app_name} data to {healthStoreName}, and we'll pull
          it in automatically.
        </Text>
      </View>

      <View style={styles.methodHeader}>
        <View style={[styles.dot, { backgroundColor: theme.colors.ink }]} />
        <Text style={styles.methodTitle}>Method 1 · Inside {config.app_name}</Text>
      </View>

      <View style={styles.stepsContainer}>
        {appSteps.map((step, i) => (
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
          Method 2 · If you can't find {healthStoreName} inside the app
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {systemSteps.map((step, i) => (
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
          {isAndroid ? "Open Health Connect in Settings" : "Open Health Settings"}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons
          name="information-outline"
          size={20}
          color={theme.colors.ink}
        />
        <Text style={styles.infoText}>
          Once enabled, your {config.app_name} data will flow into{" "}
          {healthStoreName} automatically, and this app will read it from there.
        </Text>
      </View>

      {verified && isConnectedOk && (
        <View style={[styles.verifyCard, styles.verifyOk]}>
          <MaterialCommunityIcons
            name={status === "connected" ? "check-circle" : "check-decagram"}
            size={22}
            color={theme.colors.success}
          />
          <View style={styles.verifyText}>
            <Text style={styles.verifyTitle}>
              {status === "connected"
                ? "Connected"
                : "Access granted"}
            </Text>
            <Text style={styles.verifySub}>
              {status === "connected"
                ? "Health data is linked and reading — it will show up on your Overview."
                : "Access is on, but no records have synced yet. Your wearable data will appear automatically once it syncs."}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={isConnectedOk ? continueToProfile : complete}
          disabled={connecting}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>
            {connecting
              ? "Checking health access..."
              : isConnectedOk
                ? "Continue"
                : "Check Access & Continue"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.laterButton} onPress={continueLater} disabled={connecting}>
          <Text style={styles.laterButtonText}>Continue Without Connecting</Text>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 56,
    marginBottom: theme.spacing.lg,
  },
  header: {
    marginTop: 40,
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
    flex: 1,
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
  verifyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xxl,
  },
  verifyOk: {
    backgroundColor: `${theme.colors.success}12`,
    borderColor: `${theme.colors.success}55`,
  },
  verifyText: {
    flex: 1,
  },
  verifyTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  verifySub: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
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
  laterButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  laterButtonText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
  },
});
