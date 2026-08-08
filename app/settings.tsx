import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../src/theme";
import { useGoBack } from "../src/hooks/useGoBack";
import { getLLMChoice, type LLMChoice } from "../src/services/localLLM";
import {
  HealthService,
  isConnectedStatus,
  type HealthConnectionStatus,
} from "../src/services/health";
import {
  getBriefSettings,
  enableMorningBrief,
  disableMorningBrief,
  sendTestBrief,
  formatBriefTime,
} from "../src/services/morningBrief";
import {
  getDistanceUnit,
  setDistanceUnit,
  getWeightUnit,
  setWeightUnit,
  type DistanceUnit,
  type WeightUnit,
} from "../src/services/units";

const PROVIDER_LABELS: Record<LLMChoice, string> = {
  local: "On-device",
  byok: "Your own key",
  none: "Off",
};

function providerLabel(choice: LLMChoice): string {
  return PROVIDER_LABELS[choice] ?? "Off";
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = useGoBack();

  // ── AI assistant ─────────────────────────────────────────────
  const [aiChoice, setAiChoice] = useState<LLMChoice>("byok");

  // ── Morning brief ────────────────────────────────────────────
  const [briefEnabled, setBriefEnabled] = useState(false);
  const [briefHour, setBriefHour] = useState(7);
  const [briefMinute, setBriefMinute] = useState(0);
  const [briefBusy, setBriefBusy] = useState(false);

  // ── Units ────────────────────────────────────────────────────
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("km");
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("kg");

  // ── Health connection ────────────────────────────────────────
  const [healthStatus, setHealthStatus] =
    useState<HealthConnectionStatus>("needs_permission");
  const [healthBusy, setHealthBusy] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setAiChoice(await getLLMChoice());
    } catch {}
    try {
      const brief = await getBriefSettings();
      setBriefEnabled(brief.enabled);
      setBriefHour(brief.hour);
      setBriefMinute(brief.minute);
    } catch {}
    try {
      const status = await HealthService.getConnectionStatus();
      setHealthStatus(status);
    } catch {
      setHealthStatus("error");
    }
    try {
      setDistanceUnitState(await getDistanceUnit());
    } catch {}
    try {
      setWeightUnitState(await getWeightUnit());
    } catch {}
  }, []);

  // Refresh on every focus so provider/health changes made elsewhere (e.g.
  // the AI setup screen) show up immediately when returning to Settings.
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // ── Morning brief handlers (mirror the Journal modal) ────────
  const handleBriefToggle = async (value: boolean) => {
    if (briefBusy) return;
    setBriefBusy(true);
    if (value) {
      const ok = await enableMorningBrief(briefHour, briefMinute);
      setBriefEnabled(ok);
    } else {
      await disableMorningBrief();
      setBriefEnabled(false);
    }
    setBriefBusy(false);
  };

  const handleBriefTimeChange = async (hour: number, minute: number) => {
    setBriefHour(hour);
    setBriefMinute(minute);
    if (briefEnabled) {
      const ok = await enableMorningBrief(hour, minute);
      setBriefEnabled(ok);
    }
  };

  // ── Health handlers ──────────────────────────────────────────
  const handleManageHealth = async () => {
    if (healthBusy) return;
    setHealthBusy(true);
    try {
      if (
        healthStatus === "unavailable" ||
        healthStatus === "access_requested"
      ) {
        await HealthService.openSettings();
      } else {
        await HealthService.initialize(true);
      }
      const status = await HealthService.getConnectionStatus();
      setHealthStatus(status);
    } catch {
      setHealthStatus("error");
    } finally {
      setHealthBusy(false);
    }
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const healthConnected = isConnectedStatus(healthStatus);
  const healthLabel =
    healthStatus === "connected"
      ? "Connected"
      : healthStatus === "connected_no_data"
        ? "Connected · waiting for data"
        : healthStatus === "needs_permission"
          ? "Not connected"
          : healthStatus === "access_requested"
            ? "Check access"
            : healthStatus === "not_connected"
              ? "Set up later"
              : healthStatus === "unavailable"
                ? "Unavailable"
                : "Error";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AI Assistant ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>AI ASSISTANT</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/onboarding/ai-choice?from=settings")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change AI assistant"
        >
          <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.primary}14` }]}>
            <MaterialCommunityIcons name="robot-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>AI Assistant</Text>
            <Text style={styles.rowSub}>{providerLabel(aiChoice)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.muted} />
        </TouchableOpacity>
        <Text style={styles.hint}>
          Chat, food logging, and plan building use this AI. Switch anytime — or turn it off entirely.
        </Text>

        {/* ── Morning brief ────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xl }]}>MORNING BRIEF</Text>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.warning}18` }]}>
            <MaterialCommunityIcons name="weather-sunset-up" size={20} color={theme.colors.warning} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Daily morning brief</Text>
            <Text style={styles.rowSub}>
              {briefEnabled
                ? `Scheduled for ${formatBriefTime(briefHour, briefMinute)}`
                : "Off — tap to enable"}
            </Text>
          </View>
          <Switch
            value={briefEnabled}
            onValueChange={handleBriefToggle}
            disabled={briefBusy}
            trackColor={{ true: theme.colors.success, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>

        {briefEnabled && (
          <View style={styles.briefPanel}>
            <Text style={styles.briefTimeLabel}>Time</Text>
            <View style={styles.briefTimeRow}>
              <View style={styles.briefTimeBlock}>
                <Text style={styles.briefTimeHint}>Hour</Text>
                <View style={styles.briefStepper}>
                  <TouchableOpacity
                    style={styles.briefStepBtn}
                    onPress={() => handleBriefTimeChange(Math.max(5, briefHour - 1), briefMinute)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                  </TouchableOpacity>
                  <Text style={styles.briefTimeValue}>
                    {briefHour % 12 === 0 ? 12 : briefHour % 12}
                  </Text>
                  <TouchableOpacity
                    style={styles.briefStepBtn}
                    onPress={() => handleBriefTimeChange(Math.min(11, briefHour + 1), briefMinute)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.briefTimeBlock}>
                <Text style={styles.briefTimeHint}>Minute</Text>
                <View style={styles.briefStepper}>
                  <TouchableOpacity
                    style={styles.briefStepBtn}
                    onPress={() => handleBriefTimeChange(briefHour, briefMinute > 0 ? briefMinute - 15 : 45)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                  </TouchableOpacity>
                  <Text style={styles.briefTimeValue}>
                    {String(briefMinute).padStart(2, "0")}
                  </Text>
                  <TouchableOpacity
                    style={styles.briefStepBtn}
                    onPress={() => handleBriefTimeChange(briefHour, briefMinute < 45 ? briefMinute + 15 : 0)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.briefAmpm}>
                <Text style={styles.briefTimeValue}>{briefHour < 12 ? "AM" : "PM"}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.testBtn} onPress={() => sendTestBrief()} activeOpacity={0.8}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.testBtnText}>Send a test brief now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Units ─────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xl }]}>UNITS</Text>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.info}18` }]}>
            <MaterialCommunityIcons name="ruler" size={20} color={theme.colors.info} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Distance</Text>
            <Text style={styles.rowSub}>
              {distanceUnit === "km" ? "Kilometers (km)" : "Miles (mi)"}
            </Text>
          </View>
          <Switch
            value={distanceUnit === "mi"}
            onValueChange={async (value) => {
              const unit: DistanceUnit = value ? "mi" : "km";
              setDistanceUnitState(unit);
              await setDistanceUnit(unit);
            }}
            trackColor={{ true: theme.colors.success, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.hint}>
          Distances from steps, workouts, and strain are shown in this unit.
        </Text>

        <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
          <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.warning}18` }]}>
            <MaterialCommunityIcons name="scale-bathroom" size={20} color={theme.colors.warning} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Weight</Text>
            <Text style={styles.rowSub}>
              {weightUnit === "kg" ? "Kilograms (kg)" : "Pounds (lbs)"}
            </Text>
          </View>
          <Switch
            value={weightUnit === "lb"}
            onValueChange={async (value) => {
              const unit: WeightUnit = value ? "lb" : "kg";
              setWeightUnitState(unit);
              await setWeightUnit(unit);
            }}
            trackColor={{ true: theme.colors.success, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.hint}>
          Body weight entries in the journal are shown in this unit.
        </Text>

        {/* ── Health & Devices ─────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xl }]}>HEALTH & DEVICES</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={handleManageHealth}
          activeOpacity={0.7}
          disabled={healthBusy}
          accessibilityRole="button"
          accessibilityLabel="Manage health data access"
        >
          <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.success}15` }]}>
            <MaterialCommunityIcons
              name={Platform.OS === "ios" ? "apple" : "heart-pulse"}
              size={20}
              color={theme.colors.success}
            />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Health data</Text>
            <Text style={styles.rowSub}>
              {healthBusy ? "Checking…" : healthLabel}
            </Text>
          </View>
          {healthBusy ? (
            <ActivityIndicator size="small" color={theme.colors.muted} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: healthConnected ? theme.colors.success : theme.colors.warning }]} />
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>
          {Platform.OS === "ios"
            ? "Reads from Apple Health (HealthKit)."
            : "Reads from Google Health Connect."}{" "}
          Everything stays on your device.
        </Text>

        {/* ── About ────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xl }]}>ABOUT</Text>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceElevated }]}>
            <MaterialCommunityIcons name="dna" size={20} color={theme.colors.ink} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Myrri</Text>
            <Text style={styles.rowSub}>Version {version} · PolyForm Noncommercial</Text>
          </View>
        </View>
        <Text style={styles.hint}>
          Free forever. No account, no ads, no data selling. Source-available
          under the PolyForm Noncommercial License 1.0.0.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  sectionLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    letterSpacing: 1.1,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  rowSub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    lineHeight: 16,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  briefPanel: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    ...theme.shadows.cardSoft,
  },
  briefTimeLabel: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  briefTimeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  briefTimeBlock: {
    flex: 1,
  },
  briefTimeHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginBottom: 6,
  },
  briefStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  briefStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
  },
  briefTimeValue: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  briefAmpm: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  testBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.primary,
  },
});
