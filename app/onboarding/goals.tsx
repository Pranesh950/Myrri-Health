import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { useGoBack } from "../../src/hooks/useGoBack";
import { getAllGoalsForPicker } from "../../src/services/goalLibrary";
import { createPlan, type ActivityLevel } from "../../src/services/coachPlan";

const GOALS = getAllGoalsForPicker();

const TRAINING_OPTIONS = [
  { value: 1, label: "1–2" },
  { value: 3, label: "3–4" },
  { value: 5, label: "5+" },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
];

export default function GoalsScreen() {
  const router = useRouter();
  const handleBack = useGoBack();
  const [selected, setSelected] = useState<string[]>([]);
  const [trainingDays, setTrainingDays] = useState<number | null>(3);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("light");
  const [building, setBuilding] = useState(false);

  const toggleGoal = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleBuild = async () => {
    if (selected.length === 0 || building) return;
    setBuilding(true);
    try {
      await createPlan({
        goalIds: selected,
        trainingDays,
        activityLevel,
      });
      router.push("/onboarding/complete");
    } catch (e) {
      console.warn("[Goals] Plan build failed:", e);
      setBuilding(false);
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
            <Text style={styles.eyebrow}>YOUR COACH PLAN</Text>
          </View>
          <Text style={styles.title}>What are your goals?</Text>
          <Text style={styles.subtitle}>
            Pick one or two and we'll build a personalised plan — habits,
            nutrition targets, and sleep goals that show up across the app.
          </Text>
        </View>

        <View style={styles.goalGrid}>
          {GOALS.map((goal) => {
            const isSelected = selected.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                onPress={() => toggleGoal(goal.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.goalEmojiWrap, isSelected && styles.goalEmojiWrapSelected]}>
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                </View>
                <Text style={styles.goalLabel}>{goal.label}</Text>
                <Text style={styles.goalTagline} numberOfLines={2}>
                  {goal.tagline}
                </Text>
                {isSelected && (
                  <View style={styles.goalCheck}>
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>How often can you train each week?</Text>
          <View style={styles.segmentedRow}>
            {TRAINING_OPTIONS.map((opt) => {
              const isActive = trainingDays === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, isActive && styles.segmentActive]}
                  onPress={() => setTrainingDays(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.segmentSub, isActive && styles.segmentSubActive]}>
                    days / wk
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>Your overall activity level</Text>
          <View style={styles.chipWrap}>
            {ACTIVITY_OPTIONS.map((opt) => {
              const isActive = activityLevel === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setActivityLevel(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.activityHint}>
            Used to estimate your calorie targets. You can tune everything with
            your coach later.
          </Text>
        </View>

        <View style={styles.estimateCard}>
          <MaterialCommunityIcons name="creation-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.estimateText}>
            Your plan is built from our goal library and can be changed anytime
            — just ask Coach to adjust it.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (selected.length === 0 || building) && styles.buttonDisabled]}
          onPress={handleBuild}
          disabled={selected.length === 0 || building}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {selected.length === 0
              ? "Select a goal"
              : `Build my plan${selected.length > 1 ? ` (${selected.length})` : ""}`}
          </Text>
          {!building && selected.length > 0 && (
            <MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors["on-primary"]} />
          )}
        </TouchableOpacity>
      </View>

      {building && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <View style={styles.overlayIcon}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
            <Text style={styles.overlayTitle}>Building your plan…</Text>
            <Text style={styles.overlaySub}>
              Consulting the goal library and personalising your habits,
              nutrition, and sleep targets.
            </Text>
          </View>
        </View>
      )}
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
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  goalCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  goalCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}06`,
  },
  goalEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  goalEmojiWrapSelected: {
    backgroundColor: `${theme.colors.primary}12`,
  },
  goalEmoji: {
    fontSize: 20,
  },
  goalLabel: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  goalTagline: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 3,
    lineHeight: 15,
  },
  goalCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  questionSection: {
    marginTop: theme.spacing.xl,
  },
  questionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
  },
  segmentActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  segmentText: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  segmentTextActive: {
    color: theme.colors.primary,
  },
  segmentSub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  segmentSubActive: {
    color: theme.colors.body,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.body,
  },
  chipTextActive: {
    color: theme.colors["on-primary"],
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  activityHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
  estimateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  estimateText: {
    ...theme.typography.legal,
    color: theme.colors.body,
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
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(247,247,249,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  overlayCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    ...theme.shadows.elevated,
  },
  overlayIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  overlayTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  overlaySub: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
