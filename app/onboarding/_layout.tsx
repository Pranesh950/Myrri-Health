// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="device" />
      <Stack.Screen name="apple" />
      <Stack.Screen name="wearables" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="ai-choice" />
      <Stack.Screen name="byok" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
