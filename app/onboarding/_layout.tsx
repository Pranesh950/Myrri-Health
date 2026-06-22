import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="device" />
      <Stack.Screen name="apple" />
      <Stack.Screen name="wearables" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
