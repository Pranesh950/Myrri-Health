import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { HealthService } from "../src/services/health";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // App open: probe Health Connect / HealthKit for any data within the
      // last week. We only use this as a **first-launch** gating signal —
      // have we ever seen this user complete onboarding? — so a user who
      // already finished setup is never bounced back into onboarding just
      // because their permissions were revoked or HC sync broke later.
      // They can re-trigger the flow from the in-app "Health data not
      // available" alert on the Overview tab.
      //
      // We deliberately skip HealthService.initialize() here, because on
      // Android it pops the system HC settings screen and would race with
      // our own onboarding redirect. The onboarding flows already call
      // initialize() themselves.

      const HEALTH_DATA_LOOKBACK_DAYS = 7;

      const onboardingFlag = await AsyncStorage.getItem("onboarding_complete");
      const isOnboardingComplete = onboardingFlag === "true";

      let noDataInHealthConnect = false;
      if (!isOnboardingComplete) {
        const available = await HealthService.isAvailable();
        if (!available) {
          noDataInHealthConnect = true;
        } else {
          try {
            noDataInHealthConnect = !(await HealthService.hasAnyData(
              HEALTH_DATA_LOOKBACK_DAYS
            ));
          } catch {
            // readRecords throws when our app has no read permission yet;
            // treat that the same as "no data" so first-launch users get a
            // chance to walk through the wearables flow and grant access.
            noDataInHealthConnect = true;
          }
        }
      }

      if (cancelled) return;

      const inOnboardingGroup = segments[0] === "onboarding";

      if (
        !isOnboardingComplete &&
        noDataInHealthConnect &&
        !inOnboardingGroup
      ) {
        await AsyncStorage.removeItem("onboarding_complete");
        router.replace("/onboarding/device");
      }

      if (!fontsLoaded && !fontError) return;
      if (fontError) {
        console.warn("[RootLayout] Failed to load Inter fonts:", fontError);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, fontError]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="journal" />
        <Stack.Screen name="sleep/detail" />
        <Stack.Screen name="strain/detail" />
      </Stack>
    </>
  );
}
