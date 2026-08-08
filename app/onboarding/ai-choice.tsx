// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { useGoBack } from "../../src/hooks/useGoBack";
import { setLLMChoice, type LLMChoice } from "../../src/services/localLLM";

const choices: {
  id: LLMChoice;
  title: string;
  eyebrow: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  badge: "recommended" | "warn" | "neutral";
  badgeLabel: string;
}[] = [
  {
    id: "byok",
    title: "Your own key",
    eyebrow: "OPENAI · ANTHROPIC · GEMINI · OPENROUTER",
    badge: "recommended",
    badgeLabel: "RECOMMENDED",
    description: "Bring your own API key from OpenAI, Anthropic, Google Gemini, or OpenRouter. You pick the model and pay the provider directly — we never see or store your key outside secure storage.",
    icon: "key-outline",
  },
  {
    id: "local",
    title: "Local",
    eyebrow: "ON-DEVICE",
    badge: "warn",
    badgeLabel: "NOT RECOMMENDED",
    description: "Runs a small model on your phone so prompts never leave the device, but it's less capable, slower, and needs a recent high-end phone with lots of free storage.",
    icon: "cellphone-lock",
  },
  {
    id: "none",
    title: "No AI",
    eyebrow: "OFFLINE · PRIVACY MAX",
    badge: "neutral",
    badgeLabel: "PRIVATE",
    description: "Skip the assistant entirely. Every health, journal, and food feature — including barcode scanning — still works on your device. You can turn AI on anytime later.",
    icon: "robot-off-outline",
  },
];

export default function AIChoiceScreen() {
  const router = useRouter();
  const handleBack = useGoBack();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromOnboarding = params.from === "onboarding";
  const [choice, setChoice] = useState<LLMChoice>("byok");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      if (choice === "byok") {
        // The BYOK screen saves the key, sets the choice, and continues.
        const url = `/onboarding/byok?from=${fromOnboarding ? "onboarding" : "chat"}`;
        if (fromOnboarding) {
          router.push(url);
        } else {
          router.replace(url);
        }
        return;
      }
      await setLLMChoice(choice);
      if (fromOnboarding) {
        router.push("/onboarding/goals");
      } else {
        // Reached from a chat screen ("Enable AI"): return to the chat.
        handleBack();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>YOUR AI</Text>
          </View>
          <Text style={styles.title}>Choose how your assistant runs</Text>
          <Text style={styles.subtitle}>
            Bring your own key from a major provider, run a small model on your
            device, or skip the assistant entirely. This choice is saved on
            your device and can be changed later.
          </Text>
        </View>

        <View style={styles.choiceList}>
          {choices.map((item) => {
            const selected = choice === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.choiceCard, selected && styles.choiceCardSelected]}
                onPress={() => setChoice(item.id)}
                activeOpacity={0.85}
              >
                <View style={styles.choiceTop}>
                  <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={selected ? theme.colors["on-primary"] : theme.colors.ink}
                    />
                  </View>
                  <View style={styles.choiceHeading}>
                    <View style={styles.choiceTitleRow}>
                      <Text style={styles.choiceTitle}>{item.title}</Text>
                      {item.badge === "recommended" ? (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>{item.badgeLabel}</Text>
                        </View>
                      ) : item.badge === "warn" ? (
                        <View style={styles.notRecommendedBadge}>
                          <Text style={styles.notRecommendedText}>{item.badgeLabel}</Text>
                        </View>
                      ) : (
                        <View style={styles.byokBadge}>
                          <Text style={styles.byokText}>{item.badgeLabel}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.choiceEyebrow}>{item.eyebrow}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={styles.choiceDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {choice === "byok" ? (
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.info}14` }]}>
              <MaterialCommunityIcons name="key-outline" size={20} color={theme.colors.info} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>How your key is handled</Text>
              <Text style={styles.infoText}>
                Your key is stored encrypted in your device's secure storage
                and sent directly from your phone to the provider you choose —
                we never see it and earn nothing from it. Usage is billed by
                the provider at their rates; you can change or remove the key
                anytime.
              </Text>
            </View>
          </View>
        ) : choice === "none" ? (
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.success}14` }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>What still works without AI</Text>
              <Text style={styles.infoText}>
                Readiness, strain, biological age, the morning brief, journaling,
                and the full offline food database (including barcode scanning)
                all run entirely on your phone with no AI. If you change your
                mind, the chat screens can turn AI on anytime.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.success}14` }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Before choosing local</Text>
              <Text style={styles.infoText}>
                Local AI runs without sending prompts to a cloud service, but it
                has limited features, can be slower, and may need to download
                hundreds of megabytes. Choose it only if your phone has a
                recent high-performance chip, at least 4 GB of free storage,
                and enough memory for on-device AI.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.primary}0F` }]}>
            <MaterialCommunityIcons name="hand-coin-outline" size={20} color={theme.colors.ink} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>We don't earn money from any of them</Text>
            <Text style={styles.infoText}>
              Bring-your-own-key, local AI, and going fully offline are all free
              to set up and we make nothing from your choice — no commission,
              referral fee, or payment from any model provider. If you ever pay
              for a provider's API or usage, that money goes directly to that
              provider, not to us.
            </Text>
          </View>
        </View>

        <View style={styles.privacyCard}>
          <MaterialCommunityIcons name="fingerprint" size={19} color={theme.colors.primary} />
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>We scrub before cloud requests</Text>
            <Text style={styles.privacyText}>
              Before anything goes to the cloud AI service, our app removes common
              unnecessary identifiers such as email addresses, phone numbers,
              links, network addresses, government-ID patterns, and address or
              name phrases. This is best-effort scrubbing—not a guarantee that
              every identifying detail is removed. Cloud AI still means text
              leaves your phone, so do not include anything you need kept
              completely offline. If you bring your own key, it is stored only
              on this device and sent only to the provider you choose.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{saving ? "Saving..." : "Continue"}</Text>
          {!saving && (
            <MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors["on-primary"]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 72,
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
  choiceList: {
    gap: theme.spacing.sm,
  },
  choiceCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  choiceCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}06`,
  },
  choiceTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  choiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
  },
  choiceIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  choiceHeading: {
    flex: 1,
  },
  choiceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  choiceTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  choiceEyebrow: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  recommendedBadge: {
    backgroundColor: `${theme.colors.success}18`,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  recommendedText: {
    ...theme.typography.legal,
    color: theme.colors.success,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  notRecommendedBadge: {
    backgroundColor: `${theme.colors.warning}18`,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  notRecommendedText: {
    ...theme.typography.legal,
    color: theme.colors.warning,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  byokBadge: {
    backgroundColor: `${theme.colors.info}18`,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  byokText: {
    ...theme.typography.legal,
    color: theme.colors.info,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  choiceDescription: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    lineHeight: 20,
    marginTop: theme.spacing.md,
    paddingLeft: 46 + theme.spacing.md,
  },
  infoCard: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  infoText: {
    ...theme.typography.legal,
    color: theme.colors.body,
    lineHeight: 17,
    marginBottom: 7,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  privacyCopy: {
    flex: 1,
  },
  privacyTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  privacyText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    lineHeight: 17,
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
  buttonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
});
