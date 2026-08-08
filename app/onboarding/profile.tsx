// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { useGoBack } from "../../src/hooks/useGoBack";
import { BiologicalSex, saveHealthProfile } from "../../src/services/profile";

const sexOptions: { value: BiologicalSex; label: string; description: string }[] = [
  { value: "female", label: "Female", description: "Use female reference ranges" },
  { value: "male", label: "Male", description: "Use male reference ranges" },
  { value: "unspecified", label: "Prefer not to say", description: "Use sex-neutral ranges" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const handleBack = useGoBack();
  const params = useLocalSearchParams<{ from?: string }>();
  const [ageText, setAgeText] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>("unspecified");

  const age = Number.parseInt(ageText, 10);
  const ageIsValid = Number.isFinite(age) && age >= 18 && age <= 100;
  const ageMessage = useMemo(() => {
    if (!ageText) return "Used to compare your metrics with age-matched reference ranges.";
    if (!ageIsValid) return "Enter an age between 18 and 100.";
    return "Your age is stored only on this device.";
  }, [ageText, ageIsValid]);

  const handleContinue = async () => {
    if (!ageIsValid) return;
    await saveHealthProfile({ chronologicalAge: age, biologicalSex });
    if (params.from === "biology") {
      handleBack();
    } else {
      // Tell ai-choice it is part of onboarding so Continue advances to the
      // goals step. Without this param it treats the flow as a chat/settings
      // entry and calls router.back(). Push so the back button returns here.
      router.push("/onboarding/ai-choice?from=onboarding");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>PERSONALIZE</Text>
          </View>
          <Text style={styles.title}>A little about you</Text>
          <Text style={styles.subtitle}>
            We use this to make your biological-age estimate more meaningful. It is a wellness index, not a medical diagnosis.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Chronological age</Text>
          <View style={[styles.ageInputWrap, ageText.length > 0 && !ageIsValid && styles.inputInvalid]}>
            <TextInput
              value={ageText}
              onChangeText={(text) => setAgeText(text.replace(/[^0-9]/g, "").slice(0, 3))}
              keyboardType="number-pad"
              placeholder="Your age"
              placeholderTextColor={theme.colors.muted}
              style={styles.ageInput}
              maxLength={3}
              returnKeyType="done"
            />
            <Text style={styles.ageUnit}>years</Text>
          </View>
          <Text style={[styles.helper, ageText.length > 0 && !ageIsValid && styles.helperInvalid]}>
            {ageMessage}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Biological sex</Text>
          <Text style={styles.sectionHint}>Optional · helps us choose more appropriate reference ranges.</Text>
          <View style={styles.options}>
            {sexOptions.map((option) => {
              const selected = biologicalSex === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => setBiologicalSex(option.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                    <MaterialCommunityIcons
                      name={selected ? "check" : "circle-outline"}
                      size={18}
                      color={selected ? theme.colors["on-primary"] : theme.colors.muted}
                    />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.note}>
          <MaterialCommunityIcons name="lock-outline" size={17} color={theme.colors.primary} />
          <Text style={styles.noteText}>
            Your profile stays on this device and can be changed later.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !ageIsValid && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!ageIsValid}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors["on-primary"]} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 84,
    paddingBottom: theme.spacing.xxl,
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
    marginBottom: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    letterSpacing: 1.3,
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
  section: {
    marginBottom: theme.spacing.xxl,
  },
  label: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  sectionHint: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
  },
  ageInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  inputInvalid: {
    borderColor: theme.colors.danger,
  },
  ageInput: {
    flex: 1,
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    paddingVertical: theme.spacing.md,
  },
  ageUnit: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
  },
  helper: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  helperInvalid: {
    color: theme.colors.danger,
  },
  options: {
    gap: theme.spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
  },
  optionIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionCopy: {
    flex: 1,
  },
  optionLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  optionDescription: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  noteText: {
    flex: 1,
    ...theme.typography.legal,
    color: theme.colors.body,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 36,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.bg,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.elevated,
  },
  buttonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
});
