// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import {
  ByokProviderId,
  BYOK_DEFAULTS,
  BYOK_PROVIDER_IDS,
  getByokConfig,
  saveByokConfig,
  testByokConnection,
  ByokConfig,
} from "../../src/services/providers/byok";
import { setLLMChoice } from "../../src/services/localLLM";
import { useGoBack } from "../../src/hooks/useGoBack";

const PROVIDER_COLORS: Record<ByokProviderId, { bg: string; fg: string }> = {
  openai: { bg: "#E8F0FB", fg: "#0E7C66" },
  anthropic: { bg: "#F6EDE4", fg: "#B05A2A" },
  gemini: { bg: "#E8F2FF", fg: "#3B6FE0" },
  openrouter: { bg: "#F1EEFC", fg: "#6B4FD1" },
};

function providerInitial(provider: ByokProviderId): string {
  if (provider === "openrouter") return "OR";
  return BYOK_DEFAULTS[provider].label[0];
}

export default function ByokScreen() {
  const router = useRouter();
  const handleBack = useGoBack();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromOnboarding = params.from === "onboarding";

  const [provider, setProvider] = useState<ByokProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getByokConfig().then((config) => {
      if (config) {
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setModel(config.model);
      }
    });
  }, []);

  const effectiveModel = model.trim() || BYOK_DEFAULTS[provider].model;

  const handleProviderChange = (next: ByokProviderId) => {
    setProvider(next);
    setModel("");
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    const result = await testByokConnection({
      provider,
      apiKey: apiKey.trim(),
      model: effectiveModel,
    });
    setTestResult(result);
    setTesting(false);
  };

  const handleContinue = async () => {
    if (!apiKey.trim() || saving) return;
    setSaving(true);
    try {
      const config: ByokConfig = {
        provider,
        apiKey: apiKey.trim(),
        model: effectiveModel,
      };
      await saveByokConfig(config);
      await setLLMChoice("byok");
      if (fromOnboarding) {
        router.replace("/onboarding/goals");
      } else {
        handleBack();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>BRING YOUR OWN KEY</Text>
          </View>
          <Text style={styles.title}>Use your own AI account</Text>
          <Text style={styles.subtitle}>
            Pick a provider and paste your API key. Your key stays on this
            device and is sent only to the provider you choose — we never see
            it and earn nothing from it.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Provider</Text>
        <View style={styles.providerGrid}>
          {BYOK_PROVIDER_IDS.map((id) => {
            const meta = BYOK_DEFAULTS[id];
            const selected = provider === id;
            const colors = PROVIDER_COLORS[id];
            return (
              <TouchableOpacity
                key={id}
                style={[styles.providerCard, selected && styles.providerCardSelected]}
                onPress={() => handleProviderChange(id)}
                activeOpacity={0.85}
              >
                <View style={[styles.providerAvatar, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.providerAvatarText, { color: colors.fg }]}>
                    {providerInitial(id)}
                  </Text>
                </View>
                <Text style={styles.providerLabel}>{meta.label}</Text>
                {selected && (
                  <View style={styles.providerCheck}>
                    <MaterialCommunityIcons name="check" size={11} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>API key</Text>
        <View style={styles.keyInputWrap}>
          <MaterialCommunityIcons name="key-outline" size={18} color={theme.colors.muted} />
          <TextInput
            style={styles.keyInput}
            placeholder={`Paste your ${BYOK_DEFAULTS[provider].label} API key`}
            placeholderTextColor={theme.colors.muted}
            value={apiKey}
            onChangeText={(text) => {
              setApiKey(text);
              setTestResult(null);
            }}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setShowKey((prev) => !prev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={showKey ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={theme.colors.muted}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Model</Text>
        <TextInput
          style={styles.modelInput}
          placeholder={BYOK_DEFAULTS[provider].model}
          placeholderTextColor={theme.colors.muted}
          value={model}
          onChangeText={(text) => {
            setModel(text);
            setTestResult(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.modelHint}>{BYOK_DEFAULTS[provider].modelHint}</Text>

        <TouchableOpacity
          style={[styles.testBtn, !apiKey.trim() && styles.testBtnDisabled]}
          onPress={handleTest}
          disabled={!apiKey.trim() || testing}
          activeOpacity={0.85}
        >
          {testing ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <MaterialCommunityIcons name="flash-outline" size={18} color={theme.colors.primary} />
          )}
          <Text style={styles.testBtnText}>{testing ? "Testing…" : "Test connection"}</Text>
        </TouchableOpacity>

        {testResult && (
          <View style={[styles.testResult, testResult.ok ? styles.testResultOk : styles.testResultFail]}>
            <MaterialCommunityIcons
              name={testResult.ok ? "check-circle" : "alert-circle-outline"}
              size={18}
              color={testResult.ok ? theme.colors.success : theme.colors.danger}
            />
            <Text style={styles.testResultText}>{testResult.message}</Text>
          </View>
        )}

        <View style={styles.privacyCard}>
          <MaterialCommunityIcons name="shield-lock-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.privacyText}>
            Your key is stored encrypted in your device's secure storage and is
            sent only to the provider you choose — we never see it and earn
            nothing from it. Before sending anything, the app scrubs common
            personal identifiers — best-effort, not a guarantee.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (!apiKey.trim() || saving) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!apiKey.trim() || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{saving ? "Saving…" : "Save & continue"}</Text>
          {!saving && (
            <MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors["on-primary"]} />
          )}
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
    paddingTop: 20,
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
    marginBottom: theme.spacing.xl,
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
  sectionLabel: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  providerCard: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  providerCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}06`,
  },
  providerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 14,
  },
  providerLabel: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    flex: 1,
  },
  providerCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  keyInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  keyInput: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    paddingVertical: 4,
  },
  modelInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  modelHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  testBtnDisabled: {
    opacity: 0.5,
  },
  testBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.primary,
  },
  testResult: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
  },
  testResultOk: {
    backgroundColor: `${theme.colors.success}12`,
  },
  testResultFail: {
    backgroundColor: `${theme.colors.danger}12`,
  },
  testResultText: {
    ...theme.typography.legal,
    color: theme.colors.body,
    flex: 1,
    lineHeight: 16,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  privacyText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    flex: 1,
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
    opacity: 0.4,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
});
