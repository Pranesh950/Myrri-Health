import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const brandConfig = {
  garmin: {
    title: "Connect Garmin",
    app_name: "Garmin Connect",
    app_id: Platform.OS === "ios" ? "576556635" : "com.garmin.android.apps.connectmobile",
    steps: [
      {
        title: "Open Garmin Connect",
        description: "Make sure your Garmin device is paired and syncing data.",
      },
      {
        title: "Go to More > Settings",
        description: "Tap the hamburger menu, then Settings gear icon.",
      },
      {
        title: "Tap Connected Apps",
        description: "Find the section for third-party app connections.",
      },
      {
        title: "Enable Health Connect (Android) or Apple Health (iOS)",
        description:
          Platform.OS === "android"
            ? "Toggle on 'Health Connect' to allow data sharing."
            : "Toggle on 'Apple Health' to allow data sharing.",
      },
      {
        title: "Grant Permissions",
        description: "Allow access to steps, heart rate, sleep, and activities.",
      },
    ],
  },
  fitbit: {
    title: "Connect Fitbit",
    app_name: "Fitbit",
    app_id: Platform.OS === "ios" ? "460127926" : "com.fitbit.FitbitMobile",
    steps: [
      {
        title: "Open Fitbit App",
        description: "Make sure your Fitbit device is paired and syncing.",
      },
      {
        title: "Tap Your Profile",
        description: "Tap your profile picture in the top-left corner.",
      },
      {
        title: "Go to App Settings",
        description: "Scroll down and tap 'Settings' then 'Applications'.",
      },
      {
        title: "Enable Health Connect (Android) or Apple Health (iOS)",
        description:
          Platform.OS === "android"
            ? "Toggle on 'Health Connect' and select data types to share."
            : "Toggle on 'Apple Health' and select data types to share.",
      },
      {
        title: "Confirm Data Types",
        description: "Enable: Steps, Heart Rate, Sleep, Calories, Distance.",
      },
    ],
  },
};

export default function WearablesScreen() {
  const router = useRouter();
  const { brand } = useLocalSearchParams<{ brand: "garmin" | "fitbit" }>();
  const config = brandConfig[brand || "garmin"];

  const handleOpenApp = async () => {
    const url =
      Platform.OS === "ios"
        ? `itms-apps://apps.apple.com/app/id${config.app_id}`
        : `market://details?id=${config.app_id}`;
    try {
      await Linking.openURL(url);
    } catch {}
  };

  const handleDone = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    await AsyncStorage.setItem("device_type", brand || "garmin");
    router.push("/onboarding/complete");
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    await AsyncStorage.setItem("device_type", brand || "garmin");
    router.push("/onboarding/complete");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.step}>2 of 2</Text>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>
          Sync your {brand === "garmin" ? "Garmin" : "Fitbit"} data to{" "}
          {Platform.OS === "android" ? "Health Connect" : "Apple Health"}, and
          we'll pull it in automatically.
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {config.steps.map((step, i) => (
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

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#5e5ce6" />
        <Text style={styles.infoText}>
          Once enabled, your {brand === "garmin" ? "Garmin" : "Fitbit"} data
          will sync to{" "}
          {Platform.OS === "android" ? "Health Connect" : "Apple Health"} and
          appear in this app automatically.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.openButton} onPress={handleOpenApp} activeOpacity={0.8}>
          <Text style={styles.openButtonText}>Open {config.app_name}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>I've Enabled Sync</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Set Up Later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 60,
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
  stepsContainer: {
    gap: 4,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5e5ce6",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: "#6e6e73",
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f0f0ff",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#5e5ce6",
    lineHeight: 18,
  },
  footer: {
    gap: 12,
  },
  openButton: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  openButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  doneButton: {
    backgroundColor: "#5e5ce6",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  doneButtonText: {
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
