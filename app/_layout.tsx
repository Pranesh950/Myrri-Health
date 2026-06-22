import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HealthService } from "../src/services/health";

export default function RootLayout() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const value = await AsyncStorage.getItem("onboarding_complete");
      setOnboardingComplete(value === "true");
    })();
  }, []);

  useEffect(() => {
    if (onboardingComplete === null) return;

    const inOnboardingGroup = segments[0] === "onboarding";

    if (!onboardingComplete && !inOnboardingGroup) {
      router.replace("/onboarding/device");
    } else if (onboardingComplete && inOnboardingGroup) {
      router.replace("/");
    }
  }, [onboardingComplete, segments]);

  useEffect(() => {
    HealthService.initialize();
  }, []);

  if (onboardingComplete === null) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
