// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { HealthService } from "../src/services/health";
import { ensureMorningBriefScheduled } from "../src/services/morningBrief";

// Present notifications while the app is in the foreground. Without this
// handler, expo-notifications silently drops every notification when the app
// is open — which is exactly why "Send a test brief" appeared to do nothing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const onboardingFlag = await AsyncStorage.getItem("onboarding_complete");
      const isOnboardingComplete = onboardingFlag === "true";
      const inOnboardingGroup = segments[0] === "onboarding";

      // If the user already finished onboarding, warm up the health SDK so
      // the first tab load has permissions + connection ready. If health
      // access is missing later (revoked, Health Connect uninstalled, etc.)
      // the Overview tab shows a connect banner — onboarding is never
      // restarted on its own.
      if (isOnboardingComplete) {
        try {
          await HealthService.initialize(false);
        } catch (e) {
          console.warn("[RootLayout] Health init failed:", e);
        }

        // Keep the morning brief scheduled with fresh content (no-op unless enabled).
        ensureMorningBriefScheduled().catch(() => {});
      } else if (!inOnboardingGroup) {
        // First launch (or incomplete onboarding) → device picker.
        router.replace("/onboarding/device");
      }

      if (cancelled) return;
      if (!fontsLoaded && !fontError) return;
      if (fontError) {
        console.warn("[RootLayout] Failed to load Nunito fonts:", fontError);
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
        <Stack.Screen
          name="food-chat"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="meal-options"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="barcode-scan" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
