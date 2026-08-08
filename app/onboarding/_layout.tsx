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
