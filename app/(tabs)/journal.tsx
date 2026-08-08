import { useCallback, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import {
  HabitLog,
  getHabitLog,
  saveHabitLog,
  updateHabitValue,
  setHabitCounter,
  formatDateKey,
  HABIT_LIBRARY,
  LibraryHabit,
  getActiveHabitIds,
  saveActiveHabitIds,
  addActiveHabit,
  removeActiveHabit,
} from "../../src/services/journal";
import { getMeals, deleteMeal, getFoodDatabaseAttribution, MealEntry } from "../../src/services/foodDatabase";
import { HealthService } from "../../src/services/health";
import { getDistanceUnit, getWeightUnit, kgToLbs, lbsToKg, type DistanceUnit, type WeightUnit } from "../../src/services/units";
import AmountModal from "../../src/components/AmountModal";
import { DailyEatingCard } from "../../src/components/DailyEatingCard";
import { NutritionGoalsCard } from "../../src/components/NutritionGoalsCard";
import { loadPlan, updateNutritionTargets, type NutritionTargets } from "../../src/services/coachPlan";
import {
  getBriefSettings,
  enableMorningBrief,
  disableMorningBrief,
  sendTestBrief,
  formatBriefTime,
  ensureMorningBriefScheduled,
} from "../../src/services/morningBrief";

const SHORT_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function buildWeekDays(anchor: Date = new Date()) {
  // Center today in the middle (index 3), showing 3 days before and 3 after
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  start.setDate(start.getDate() - 3);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

interface AmountConfig {
  visible: boolean;
  key: "hydration" | "mood";
  title: string;
  emoji: string;
  unit: string;
  initialValue: number;
}

function MacroField({
  label,
  unit,
  value,
  onChangeText,
  onBump,
  color,
}: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (text: string) => void;
  onBump: (delta: number) => void;
  color: string;
}) {
  return (
    <View style={styles.macroField}>
      <View style={styles.macroFieldLabelRow}>
        <View style={[styles.macroFieldDot, { backgroundColor: color }]} />
        <Text style={styles.macroFieldLabel}>{label}</Text>
      </View>
      <View style={styles.macroFieldControl}>
        <TouchableOpacity
          style={styles.macroStepBtn}
          onPress={() => onBump(-1)}
          activeOpacity={0.7}
          accessibilityLabel={`Decrease ${label}`}
        >
          <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
        </TouchableOpacity>
        <View style={styles.macroInputWrap}>
          <TextInput
            style={styles.macroInput}
            value={value}
            onChangeText={onChangeText}
            keyboardType="number-pad"
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.macroUnit}>{unit}</Text>
        </View>
        <TouchableOpacity
          style={styles.macroStepBtn}
          onPress={() => onBump(1)}
          activeOpacity={0.7}
          accessibilityLabel={`Increase ${label}`}
        >
          <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Animated press wrapper — scales down on touch */
function AnimatedPress({
  children,
  onPress,
  style = {},
  disabled,
  activeOpacity,
  ...rest
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  activeOpacity?: number;
  [key: string]: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      damping: 12,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={activeOpacity ?? 0.7}
        disabled={disabled}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface EntryRowProps {
  emoji: string;
  label: string;
  rightControl: "triState" | "arrow";
  value?: string;
  arrowLabel?: string;
  state?: "yes" | "no" | "skip";
  onTriState?: (state: "yes" | "no" | "skip") => void;
  onArrow?: () => void;
}

function EntryRow({ emoji, label, rightControl, value, arrowLabel, state, onTriState, onArrow }: EntryRowProps) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryEmoji}>{emoji}</Text>
        <Text style={styles.entryLabel}>{label}</Text>
      </View>
      {rightControl === "triState" ? (
        <TriStateControl state={state ?? "skip"} onChange={onTriState ?? (() => {})} />
      ) : (
        <AnimatedPress onPress={onArrow}>
          <View style={styles.arrowButton}>
            <Text style={styles.arrowValue}>{value ?? "—"}</Text>
            {arrowLabel ? <Text style={styles.arrowLabel}>{arrowLabel}</Text> : null}
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.muted} />
          </View>
        </AnimatedPress>
      )}
    </View>
  );
}

interface TriStateControlProps {
  state: "yes" | "no" | "skip";
  onChange: (state: "yes" | "no" | "skip") => void;
  small?: boolean;
}

interface CounterControlProps {
  value: number;
  target?: number;
  onChange: (delta: number) => void;
}

function CounterControl({ value, target, onChange }: CounterControlProps) {
  return (
    <View style={styles.counterControl}>
      <TouchableOpacity
        style={styles.counterButton}
        onPress={() => onChange(Math.max(0, value - 1))}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
      </TouchableOpacity>
      <View style={styles.counterValueWrap}>
        <Text style={styles.counterValue}>{value}</Text>
        {target ? <Text style={styles.counterTarget}>/{target}</Text> : null}
      </View>
      <TouchableOpacity
        style={styles.counterButton}
        onPress={() => onChange(value + 1)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
      </TouchableOpacity>
    </View>
  );
}

interface HabitItemProps {
  habit: LibraryHabit;
  state: "yes" | "no" | "skip";
  count: number;
  onTriState: (state: "yes" | "no" | "skip") => void;
  onCounter: (nextValue: number) => void;
  onMeasureTap: () => void;
  /** Pre-formatted value/unit for measure habits (unit conversion). */
  displayValue?: string;
  displayUnit?: string;
  /** Marks the value as auto-filled from health data. */
  auto?: boolean;
}

function HabitItem({
  habit,
  state,
  count,
  onTriState,
  onCounter,
  onMeasureTap,
  displayValue,
  displayUnit,
  auto,
}: HabitItemProps) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryEmoji}>{habit.emoji}</Text>
        <Text style={styles.entryLabel}>{habit.label}</Text>
      </View>
      {habit.type === "counter" ? (
        <CounterControl
          value={count}
          target={habit.target}
          onChange={onCounter}
        />
      ) : habit.type === "measure" ? (
        <TouchableOpacity
          style={styles.measureButton}
          onPress={onMeasureTap}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.measureValue}>
            {count > 0 ? displayValue ?? count.toFixed(habit.decimals ?? 0) : "—"}
          </Text>
          {count > 0 ? (
            <Text style={styles.measureUnit}>{displayUnit ?? habit.unit}</Text>
          ) : null}
          {auto && count > 0 ? (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>auto</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.muted} />
        </TouchableOpacity>
      ) : (
        <TriStateControl state={state} onChange={onTriState} />
      )}
    </View>
  );
}

function TriStateControl({ state, onChange, small }: TriStateControlProps) {
  return (
    <View style={[styles.triState, small && styles.triStateSmall]}>
      <TouchableOpacity
        style={[styles.triOption, state === "no" && styles.triOptionActive]}
        onPress={() => onChange("no")}
        activeOpacity={0.7}
      >
        <Text style={[styles.triText, state === "no" && styles.triTextActive]}>
          ✕
        </Text>
      </TouchableOpacity>
      <View style={styles.triDivider} />
      <TouchableOpacity
        style={[styles.triOption, state === "skip" && styles.triOptionActive]}
        onPress={() => onChange("skip")}
        activeOpacity={0.7}
      >
        <Text style={[styles.triText, state === "skip" && styles.triTextActive]}>
          —
        </Text>
      </TouchableOpacity>
      <View style={styles.triDivider} />
      <TouchableOpacity
        style={[styles.triOption, state === "yes" && styles.triOptionActive]}
        onPress={() => onChange("yes")}
        activeOpacity={0.7}
      >
        <Text style={[styles.triText, state === "yes" && styles.triTextActive]}>
          ✓
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const MOOD_LABELS = ["😞", "🙁", "😐", "🙂", "😊"];

/** Quick-select chips for measure habits, keyed by unit. */
const MEASURE_PRESETS: Record<string, number[]> = {
  kg: [],
  lbs: [120, 140, 160, 180, 200],
  cm: [70, 80, 90],
  min: [15, 30, 45, 60],
  h: [6, 7, 8, 9],
  km: [3, 5, 10],
};

function calculateCompletionScore(
  log: HabitLog,
  activeHabitIds: string[]
): number {
  if (activeHabitIds.length === 0) return 0;
  let total = 0;
  for (const habitId of activeHabitIds) {
    const habit = HABIT_LIBRARY.find((h) => h.id === habitId);
    if (!habit) continue;
    if (habit.type === "counter") {
      const value = log.counters?.[habitId] || 0;
      const target = habit.target || 1;
      total += Math.min(Math.max(value / target, 0), 1);
    } else if (habit.type === "measure") {
      total += (log.counters?.[habitId] || 0) > 0 ? 1 : 0;
    } else {
      total += log.completed?.[habitId] === true ? 1 : 0;
    }
  }
  return total / activeHabitIds.length;
}

function getCompletionColor(score: number): string {
  // Keep completion meaningful, but use soft pastel fills instead of saturated status colors.
  const hue = Math.round(Math.max(0, Math.min(1, score)) * 120);
  return `hsl(${hue}, 60%, 92%)`;
}

export default function JournalScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [log, setLog] = useState<HabitLog | null>(null);
  const weekDays = useMemo(() => buildWeekDays(), []);
  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [dayScores, setDayScores] = useState<Record<string, number>>({});
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets | null>(null);
  const [activeHabitIds, setActiveHabitIds] = useState<string[]>([]);
  const [autoFilled, setAutoFilled] = useState<Record<string, boolean>>({});
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("kg");
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("km");
  const [editGoalsVisible, setEditGoalsVisible] = useState(false);
  const [habitSearch, setHabitSearch] = useState("");
  // Measure-habit popup (weight, waist, reading minutes, sleep, run km…)
  const [measureHabit, setMeasureHabit] = useState<LibraryHabit | null>(null);

  // Morning brief settings
  const [briefVisible, setBriefVisible] = useState(false);
  const [briefEnabled, setBriefEnabled] = useState(false);
  const [briefHour, setBriefHour] = useState(7);
  const [briefMinute, setBriefMinute] = useState(0);
  const [briefBusy, setBriefBusy] = useState(false);

  // Macro editor state
  const [macroEditorVisible, setMacroEditorVisible] = useState(false);
  const [macroDraft, setMacroDraft] = useState({
    calories: "0",
    proteinG: "0",
    carbsG: "0",
    fatG: "0",
  });

  // Amount modal state
  const [amountModal, setAmountModal] = useState<AmountConfig>({
    visible: false,
    key: "hydration",
    title: "Water",
    emoji: "💧",
    unit: "cups",
    initialValue: 0,
  });

  const monthLabel = today.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const [dayLog, weightPref, distancePref] = await Promise.all([
      getHabitLog(selectedKey),
      getWeightUnit(),
      getDistanceUnit(),
    ]);
    setWeightUnitState(weightPref);
    setDistanceUnitState(distancePref);
    // Clean old false values from completed (legacy data used false for both "no" and "skip")
    if (dayLog.completed) {
      const cleaned: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(dayLog.completed)) {
        if (val === true) cleaned[key] = true;
      }
      dayLog.completed = cleaned;
    }
    setLog(dayLog);
    const dayMeals = await getMeals(selectedKey);
    setMeals(dayMeals);

    const plan = await loadPlan();
    setNutritionTargets(plan?.nutrition ?? null);

    // Load active habits
    let ids = await getActiveHabitIds();
    // Seed defaults on first launch so the journal isn't empty
    if (ids.length === 0) {
      ids = ["sugar", "keto", "low_carbs", "device_bed"];
      await saveActiveHabitIds(ids);
    }
    setActiveHabitIds(ids);

    // Auto-fill health-backed measure habits (run distance, weight) when the
    // value hasn't been logged for the selected day yet.
    const auto: Record<string, boolean> = {};
    try {
      const needsRun = ids.includes("run_km") && !(dayLog.counters["run_km"] > 0);
      const needsWeight = ids.includes("weight_kg") && !(dayLog.counters["weight_kg"] > 0);
      const [workouts, weightHistory] = await Promise.all([
        needsRun ? HealthService.getWorkouts(7) : Promise.resolve([]),
        needsWeight ? HealthService.getMetricHistory("weight", 30) : Promise.resolve([]),
      ]);
      if (needsRun) {
        const target = new Date(selectedKey + "T00:00:00");
        const totalMeters = workouts
          .filter((w) => {
            const d = new Date(w.startTime);
            return (
              d.getFullYear() === target.getFullYear() &&
              d.getMonth() === target.getMonth() &&
              d.getDate() === target.getDate()
            );
          })
          .reduce((sum, w) => sum + (w.distance ?? 0), 0);
        if (totalMeters > 0) {
          dayLog.counters["run_km"] = Math.round((totalMeters / 1000) * 10) / 10;
          auto["run_km"] = true;
        }
      }
      if (needsWeight) {
        const sample = weightHistory.find((s) => s.date === selectedKey);
        if (sample && sample.value > 0) {
          dayLog.counters["weight_kg"] = Math.round(sample.value * 10) / 10;
          auto["weight_kg"] = true;
        }
      }
    } catch {
      // Health fill is best-effort; never block the journal on it.
    }
    if (Object.keys(auto).length > 0) {
      await saveHabitLog(dayLog);
      setLog({ ...dayLog });
    }
    setAutoFilled(auto);

    // Compute habit completion score for each calendar day
    const scores: Record<string, number> = {};
    await Promise.all(
      weekDays.map(async (d) => {
        const key = formatDateKey(d);
        const l = await getHabitLog(key);
        scores[key] = calculateCompletionScore(l, ids);
      })
    );
    setDayScores(scores);
    setRefreshing(false);

    // Keep the morning brief's content fresh (no-op unless enabled).
    ensureMorningBriefScheduled().catch(() => {});
  }, [selectedKey, weekDays]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const habitState = (id: string): "yes" | "no" | "skip" => {
    if (!log) return "skip";
    if (log.completed[id] === true) return "yes";
    if (id in (log.completed || {})) return "no";
    return "skip";
  };

  const handleTriState = async (habitId: string, state: "yes" | "no" | "skip") => {
    const updated = await getHabitLog(selectedKey);
    if (state === "yes") {
      updated.completed[habitId] = true;
    } else if (state === "no") {
      updated.completed[habitId] = false;
    } else {
      delete updated.completed[habitId];
    }
    await saveHabitLog(updated);
    setLog({ ...updated });
  };

  const handleCounter = async (habitId: string, nextValue: number) => {
    const updated = await setHabitCounter(selectedKey, habitId, nextValue);
    setLog({ ...updated });
  };

  /** Converts a stored measure value to the display unit preference. */
  const measureDisplay = (
    habit: LibraryHabit,
    count: number
  ): { value?: string; unit?: string } => {
    if (count <= 0) return {};
    if (habit.id === "weight_kg" && weightUnit === "lb") {
      return { value: kgToLbs(count).toFixed(1), unit: "lbs" };
    }
    if (habit.id === "run_km" && distanceUnit === "mi") {
      return { value: (count / 1.609344).toFixed(1), unit: "mi" };
    }
    return { value: count.toFixed(habit.decimals ?? 0), unit: habit.unit };
  };

  const openMeasureHabit = (habit: LibraryHabit) => {
    setMeasureHabit(habit);
  };

  const handleMeasureHabitSave = async (value: number) => {
    if (!measureHabit) return;
    const decimals = measureHabit.decimals ?? 0;
    const factor = Math.pow(10, decimals);
    // The modal shows the user's preferred unit; store in the habit's unit.
    const stored =
      measureHabit.id === "weight_kg" && weightUnit === "lb"
        ? lbsToKg(value)
        : measureHabit.id === "run_km" && distanceUnit === "mi"
          ? value * 1.609344
          : value;
    const rounded = Math.round(stored * factor) / factor;
    const updated = await setHabitCounter(selectedKey, measureHabit.id, rounded);
    setLog({ ...updated });
    setMeasureHabit(null);
  };

  const openMacroEditor = () => {
    const t = nutritionTargets;
    if (!t) return;
    setMacroDraft({
      calories: String(t.calories),
      proteinG: String(t.proteinG),
      carbsG: String(t.carbsG),
      fatG: String(t.fatG),
    });
    setMacroEditorVisible(true);
  };

  const bumpMacro = (key: keyof typeof macroDraft, delta: number) => {
    setMacroDraft((prev) => {
      const current = parseInt(prev[key], 10);
      const next = Math.max(0, (isNaN(current) ? 0 : current) + delta);
      return { ...prev, [key]: String(next) };
    });
  };

  const setMacroValue = (key: keyof typeof macroDraft, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setMacroDraft((prev) => ({ ...prev, [key]: cleaned }));
  };

  const handleMacroSave = async () => {
    if (!nutritionTargets) return;
    const toInt = (s: string, fallback: number) => {
      const n = parseInt(s, 10);
      return isNaN(n) ? fallback : n;
    };
    const updated = await updateNutritionTargets({
      calories: toInt(macroDraft.calories, nutritionTargets.calories),
      proteinG: toInt(macroDraft.proteinG, nutritionTargets.proteinG),
      carbsG: toInt(macroDraft.carbsG, nutritionTargets.carbsG),
      fatG: toInt(macroDraft.fatG, nutritionTargets.fatG),
    });
    if (updated) setNutritionTargets(updated.nutrition);
    setMacroEditorVisible(false);
  };

  const openAmountModal = (
    key: "hydration" | "mood",
    title: string,
    emoji: string,
    unit: string
  ) => {
    const initialValue = log ? log[key] : 0;
    setAmountModal({
      visible: true,
      key,
      title,
      emoji,
      unit,
      initialValue: typeof initialValue === "number" ? initialValue : 0,
    });
  };

  const handleAmountSave = async (value: number) => {
    const updated = await updateHabitValue(selectedKey, amountModal.key, value);
    setLog({ ...updated });
  };

  const handleMoodSelect = async (value: number) => {
    const updated = await updateHabitValue(selectedKey, "mood", value);
    setLog({ ...updated });
  };

  const formatAmount = (key: "hydration" | "mood"): string => {
    if (!log) return "—";
    const val = log[key];
    if (typeof val !== "number") return "—";
    if (key === "mood") return MOOD_LABELS[Math.round(val)] ?? "—";
    return val > 0 ? val.toString() : "—";
  };

  const formatUnit = (key: "hydration" | "mood"): string => {
    if (!log) return "";
    const val = log[key];
    if (typeof val !== "number" || val <= 0) return "";
    if (key === "hydration") return "cups";
    return "";
  };

  // Build active habits list from library
  const activeHabits = useMemo(() => {
    return activeHabitIds
      .map((id) => HABIT_LIBRARY.find((h) => h.id === id))
      .filter(Boolean) as LibraryHabit[];
  }, [activeHabitIds]);

  const daytimeHabits = activeHabits.filter((h) => h.category === "daytime");
  const nighttimeHabits = activeHabits.filter((h) => h.category === "nighttime");

  // Search-filtered library for the edit modal
  const filteredLibrary = useMemo(() => {
    const q = habitSearch.toLowerCase().trim();
    if (!q) return HABIT_LIBRARY;
    return HABIT_LIBRARY.filter(
      (h) => h.label.toLowerCase().includes(q) || h.id.toLowerCase().includes(q)
    );
  }, [habitSearch]);

  // Handle adding a habit
  const handleAddHabit = async (id: string) => {
    const updated = await addActiveHabit(id);
    setActiveHabitIds(updated);
  };

  // Handle removing a habit
  const handleRemoveHabit = async (id: string) => {
    const updated = await removeActiveHabit(id);
    setActiveHabitIds(updated);
  };

  // Open edit modal + reset search
  const openEditGoals = () => {
    setHabitSearch("");
    setEditGoalsVisible(true);
  };

  // ── Morning brief handlers ───────────────────────────────
  const openBriefSettings = async () => {
    const settings = await getBriefSettings();
    setBriefEnabled(settings.enabled);
    setBriefHour(settings.hour);
    setBriefMinute(settings.minute);
    setBriefVisible(true);
  };

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

  const handleBriefSave = async () => {
    if (briefBusy) return;
    setBriefBusy(true);
    if (briefEnabled) {
      const ok = await enableMorningBrief(briefHour, briefMinute);
      setBriefEnabled(ok);
    }
    setBriefBusy(false);
    setBriefVisible(false);
  };

  const selectedDate = weekDays.find((d) => formatDateKey(d) === selectedKey) ?? today;
  const isSelectedToday = selectedKey === todayKey;
  const entriesLabel = isSelectedToday
    ? "Today's entries"
    : selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

  const nightEnd = new Date(selectedDate);
  nightEnd.setDate(nightEnd.getDate() + 1);
  const nightRange = `${selectedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${nightEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <View style={styles.container}>
      {/* Header buttons */}
      <View style={styles.headerButtons}>
        <AnimatedPress onPress={() => router.push("/journal/data")}>
          <View style={styles.insightsButton}>
            <MaterialCommunityIcons name="chart-box-outline" size={16} color={theme.colors.ink} />
            <Text style={styles.insightsButtonText}>Data</Text>
          </View>
        </AnimatedPress>
        <AnimatedPress onPress={openBriefSettings}>
          <View style={styles.moreButton}>
            <MaterialCommunityIcons name="bell-outline" size={19} color={theme.colors.ink} />
          </View>
        </AnimatedPress>
      </View>

      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal</Text>
        <Text style={styles.headerMonth}>{monthLabel}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.muted} />
        }
      >
        {/* Week calendar strip */}
        <View style={styles.calendarStrip}>
          {weekDays.map((date) => {
            const key = formatDateKey(date);
            const isSelected = key === selectedKey;
            const isToday =
              date.getFullYear() === today.getFullYear() &&
              date.getMonth() === today.getMonth() &&
              date.getDate() === today.getDate();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isFuture = date.getTime() > todayStart.getTime();
            const score = dayScores[key] ?? 0;
            const pillColor = isFuture ? theme.colors.surfaceElevated : getCompletionColor(score);
            const textColor = isFuture ? theme.colors.muted : theme.colors.ink;

            return (
              <AnimatedPress
                key={key}
                onPress={() => {
                  if (!isFuture) setSelectedKey(key);
                }}
                disabled={isFuture}
              >
                <View
                  style={[
                    styles.calendarRing,
                    isSelected && styles.calendarRingSelected,
                    isToday && styles.calendarRingToday,
                  ]}
                >
                  <View
                    style={[
                      styles.calendarPill,
                      { backgroundColor: pillColor },
                      isFuture && styles.calendarPillFuture,
                    ]}
                  >
                    <Text style={[styles.calendarDayName, { color: textColor }]}>
                      {SHORT_DAYS[date.getDay()]}
                    </Text>
                    <Text style={[styles.calendarDate, { color: textColor }]}>
                      {date.getDate()}
                    </Text>
                  </View>
                </View>
              </AnimatedPress>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{entriesLabel}</Text>
          <TouchableOpacity
            style={styles.editHabitsBtn}
            activeOpacity={0.7}
            onPress={openEditGoals}
          >
            <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.primary} />
            <Text style={styles.editHabitsText}>Edit Habits</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.daytimeLabel}>
          <Text style={styles.daytimeText}>Daytime</Text>
        </View>

        <View style={styles.entriesCard}>
          {daytimeHabits.map((habit, i) => (
            <View key={habit.id}>
              {i > 0 && <View style={styles.entryDivider} />}
              <HabitItem
                habit={habit}
                state={habitState(habit.id)}
                count={log?.counters[habit.id] ?? 0}
                onTriState={(s) => handleTriState(habit.id, s)}
                onCounter={(next) => handleCounter(habit.id, next)}
                onMeasureTap={() => openMeasureHabit(habit)}
                {...measureDisplay(habit, log?.counters[habit.id] ?? 0)}
                auto={autoFilled[habit.id]}
              />
            </View>
          ))}
          {/* Tracked metrics — always shown */}
          {daytimeHabits.length > 0 && <View style={styles.entryDivider} />}
          {/* Daily mood — inline emoji picker */}
          <View style={styles.entryRow}>
            <View style={styles.entryLeft}>
              <Text style={styles.entryEmoji}>😊</Text>
              <Text style={styles.entryLabel}>Daily mood</Text>
            </View>
            <View style={styles.moodPicker}>
              {MOOD_LABELS.map((emoji, i) => {
                const currentMood = log && typeof log.mood === "number" ? Math.round(log.mood) : 2;
                const isActive = currentMood === i;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleMoodSelect(i)}
                    style={[
                      styles.moodOption,
                      isActive && styles.moodOptionActive,
                    ]}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.moodEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.entryDivider} />
          <EntryRow
            emoji="💧"
            label="Hydration"
            rightControl="arrow"
            value={formatAmount("hydration")}
            arrowLabel={formatUnit("hydration")}
            onArrow={() => openAmountModal("hydration", "Water", "💧", "cups")}
          />
        </View>

        {nighttimeHabits.length > 0 && (
          <>
            <View style={styles.nighttimeHeader}>
              <Text style={styles.sectionTitle}>Nighttime</Text>
              <Text style={styles.nighttimeDate}>{nightRange}</Text>
            </View>

            <View style={styles.entriesCard}>
              {nighttimeHabits.map((habit, i) => (
                <View key={habit.id}>
                  {i > 0 && <View style={styles.entryDivider} />}
                  <HabitItem
                    habit={habit}
                    state={habitState(habit.id)}
                    count={log?.counters[habit.id] ?? 0}
                    onTriState={(s) => handleTriState(habit.id, s)}
                    onCounter={(next) => handleCounter(habit.id, next)}
                    onMeasureTap={() => openMeasureHabit(habit)}
                    {...measureDisplay(habit, log?.counters[habit.id] ?? 0)}
                    auto={autoFilled[habit.id]}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Meals section */}
        <View style={styles.mealsSection}>
          <View style={styles.mealsHeader}>
            <Text style={styles.sectionTitle}>Meals</Text>
            <TouchableOpacity
              style={styles.addMealBtn}
              onPress={() => router.push("/meal-options")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.foodAttribution}>{getFoodDatabaseAttribution()}</Text>
          {meals.length === 0 ? (
            <View style={styles.mealsEmpty}>
              <Text style={styles.mealsEmptyText}>No meals logged</Text>
            </View>
          ) : (
            <View style={styles.mealsCard}>
              {meals.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <View style={styles.entryDivider} />}
                  <View style={styles.mealRow}>
                    <View style={styles.mealRowLeft}>
                      <MaterialCommunityIcons name="food-apple" size={16} color={theme.colors.success} />
                      <View style={styles.mealRowText}>
                        <Text style={styles.mealRowName}>{m.foodName}</Text>
                        <Text style={styles.mealRowTime}>
                          {new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" · "}{m.servingGrams}g
                        </Text>
                      </View>
                    </View>
                    <View style={styles.mealRowRight}>
                      <Text style={styles.mealRowCals}>{m.calories} cal</Text>
                      <View style={styles.mealActions}>
                        <TouchableOpacity
                          style={styles.mealActionBtn}
                          onPress={() => router.push(`/food-detail?fdcId=${encodeURIComponent(m.fdcId)}&foodName=${encodeURIComponent(m.foodName)}&serving=${m.servingGrams}&mealId=${m.id}&date=${m.date}`)}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={14} color={theme.colors.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.mealActionBtn}
                          onPress={async () => {
                            await deleteMeal(selectedKey, m.id);
                            const dayMeals = await getMeals(selectedKey);
                            setMeals(dayMeals);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color={theme.colors.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {meals.length > 0 && (
            <View style={styles.mealsTotal}>
              <Text style={styles.mealsTotalText}>
                Total: {meals.reduce((s, m) => s + m.calories, 0)} cal ·{" "}
                {meals.reduce((s, m) => s + m.protein, 0).toFixed(1)}g P ·{" "}
                {meals.reduce((s, m) => s + m.carbs, 0).toFixed(1)}g C ·{" "}
                {meals.reduce((s, m) => s + m.fat, 0).toFixed(1)}g F
              </Text>
            </View>
          )}
          <DailyEatingCard meals={meals} />
          <NutritionGoalsCard
            meals={meals}
            targets={nutritionTargets}
            onEdit={openMacroEditor}
          />
        </View>
      </ScrollView>

      {/* Amount modal */}
      <AmountModal
        visible={amountModal.visible}
        title={amountModal.title}
        emoji={amountModal.emoji}
        unit={amountModal.unit}
        initialValue={amountModal.initialValue}
        onSave={handleAmountSave}
        onClose={() => setAmountModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Measure habit modal — tap a value to type it in */}
      <AmountModal
        visible={measureHabit != null}
        title={measureHabit?.label ?? ""}
        emoji={measureHabit?.emoji ?? "📏"}
        unit={
          measureHabit?.id === "weight_kg" && weightUnit === "lb"
            ? "lbs"
            : measureHabit?.id === "run_km" && distanceUnit === "mi"
              ? "mi"
              : measureHabit?.unit ?? ""
        }
        initialValue={
          measureHabit
            ? measureHabit.id === "weight_kg" && weightUnit === "lb"
              ? kgToLbs(log?.counters[measureHabit.id] ?? 0)
              : measureHabit.id === "run_km" && distanceUnit === "mi"
                ? (log?.counters[measureHabit.id] ?? 0) / 1.609344
                : log?.counters[measureHabit.id] ?? 0
            : 0
        }
        presets={
          measureHabit?.unit
            ? MEASURE_PRESETS[
                measureHabit.id === "weight_kg" && weightUnit === "lb"
                  ? "lbs"
                  : measureHabit.unit
              ] ?? []
            : []
        }
        onSave={handleMeasureHabitSave}
        onClose={() => setMeasureHabit(null)}
      />

      {/* ── Nutrition Goals Modal ────────────────────────────── */}
      <Modal
        visible={macroEditorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMacroEditorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setMacroEditorVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nutrition Goals</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.macroContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.macroIntro}>
              Set your daily calorie and macro targets. These drive the goals
              card on this screen and the coach chat.
            </Text>

            <MacroField
              label="Calories"
              unit="kcal"
              value={macroDraft.calories}
              onChangeText={(t) => setMacroValue("calories", t)}
              onBump={(d) => bumpMacro("calories", d)}
              color="#202126"
            />
            <MacroField
              label="Protein"
              unit="g"
              value={macroDraft.proteinG}
              onChangeText={(t) => setMacroValue("proteinG", t)}
              onBump={(d) => bumpMacro("proteinG", d)}
              color="#5D8793"
            />
            <MacroField
              label="Carbs"
              unit="g"
              value={macroDraft.carbsG}
              onChangeText={(t) => setMacroValue("carbsG", t)}
              onBump={(d) => bumpMacro("carbsG", d)}
              color="#D69A43"
            />
            <MacroField
              label="Fat"
              unit="g"
              value={macroDraft.fatG}
              onChangeText={(t) => setMacroValue("fatG", t)}
              onBump={(d) => bumpMacro("fatG", d)}
              color="#C96D63"
            />

            <TouchableOpacity
              style={styles.macroSaveBtn}
              onPress={handleMacroSave}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Save nutrition goals"
            >
              <MaterialCommunityIcons name="check" size={18} color={theme.colors["on-primary"]} />
              <Text style={styles.macroSaveBtnText}>Save goals</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Morning Brief Modal ──────────────────────────────── */}
      <Modal
        visible={briefVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBriefVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setBriefVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Morning Brief</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.briefContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.briefHero}>
              <View style={styles.briefHeroIcon}>
                <MaterialCommunityIcons name="weather-sunset-up" size={28} color={theme.colors.warning} />
              </View>
              <Text style={styles.briefHeroTitle}>Start your day informed</Text>
              <Text style={styles.briefHeroText}>
                Each morning you'll get a notification with how yesterday went —
                goals, steps, sleep, calories — and what today needs from your
                plan. Everything stays on your device.
              </Text>
            </View>

            <View style={styles.briefToggleRow}>
              <View style={styles.briefToggleCopy}>
                <Text style={styles.briefToggleTitle}>Daily morning brief</Text>
                <Text style={styles.briefToggleSub}>
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
              <>
                <Text style={styles.briefSectionTitle}>Time</Text>
                <View style={styles.briefTimeRow}>
                  <View style={styles.briefTimeBlock}>
                    <Text style={styles.briefTimeLabel}>Hour</Text>
                    <View style={styles.briefStepper}>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefHour((h) => (h > 5 ? h - 1 : 5))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                      <Text style={styles.briefTimeValue}>
                        {briefHour % 12 === 0 ? 12 : briefHour % 12}
                      </Text>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefHour((h) => (h < 11 ? h + 1 : 11))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.briefTimeBlock}>
                    <Text style={styles.briefTimeLabel}>Minute</Text>
                    <View style={styles.briefStepper}>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefMinute((m) => (m > 0 ? m - 15 : 45))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                      <Text style={styles.briefTimeValue}>
                        {String(briefMinute).padStart(2, "0")}
                      </Text>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefMinute((m) => (m < 45 ? m + 15 : 0))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.briefAmpm}>
                    <Text style={styles.briefTimeValue}>
                      {briefHour < 12 ? "AM" : "PM"}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.briefTestBtn}
              onPress={() => sendTestBrief()}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="bell-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.briefTestText}>Send a test brief now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.briefSaveBtn}
              onPress={handleBriefSave}
              disabled={briefBusy}
              activeOpacity={0.85}
            >
              <Text style={styles.briefSaveText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Edit Goals Modal ─────────────────────────────────── */}
      <Modal
        visible={editGoalsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditGoalsVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setEditGoalsVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Goals</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Search bar */}
          <View style={styles.modalSearchBar}>
            <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.muted} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search habits..."
              placeholderTextColor={theme.colors.muted}
              value={habitSearch}
              onChangeText={setHabitSearch}
              autoFocus={false}
            />
            {habitSearch.length > 0 && (
              <TouchableOpacity onPress={() => setHabitSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Active habits — with delete */}
            {!habitSearch && activeHabits.length > 0 && (
              <>
                <Text style={styles.modalSectionTitle}>Your Goals</Text>
                <View style={styles.modalListCard}>
                  {activeHabits.map((habit, i) => (
                    <View key={habit.id}>
                      {i > 0 && <View style={styles.entryDivider} />}
                      <View style={styles.modalHabitRow}>
                        <View style={styles.modalHabitInfo}>
                          <Text style={styles.modalHabitEmoji}>{habit.emoji}</Text>
                          <Text style={styles.modalHabitLabel}>{habit.label}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.modalDeleteBtn}
                          onPress={() => handleRemoveHabit(habit.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Library — add habits */}
            <Text style={styles.modalSectionTitle}>
              {habitSearch ? `Results (${filteredLibrary.length})` : "Library"}
            </Text>
            <View style={styles.modalListCard}>
              {filteredLibrary.length === 0 ? (
                <View style={styles.modalEmptyLibrary}>
                  <Text style={styles.modalEmptyText}>No matching habits found</Text>
                </View>
              ) : (
                filteredLibrary.map((habit, i) => {
                  const isActive = activeHabitIds.includes(habit.id);
                  return (
                    <View key={habit.id}>
                      {i > 0 && <View style={styles.entryDivider} />}
                      <View style={styles.modalHabitRow}>
                        <View style={styles.modalHabitInfo}>
                          <Text style={styles.modalHabitEmoji}>{habit.emoji}</Text>
                          <View>
                            <Text style={styles.modalHabitLabel}>{habit.label}</Text>
                            <Text style={styles.modalHabitCategory}>
                              {habit.category === "daytime" ? "Daytime" : "Nighttime"}
                            </Text>
                          </View>
                        </View>
                        {isActive ? (
                          <View style={styles.modalAddedBadge}>
                            <MaterialCommunityIcons name="check" size={14} color={theme.colors.success} />
                            <Text style={styles.modalAddedText}>Added</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.modalAddBtn}
                            onPress={() => handleAddHabit(habit.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={theme.colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  headerButtons: {
    position: "absolute",
    top: 54,
    right: theme.spacing.xl,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  insightsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  insightsButtonText: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    paddingTop: 54,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.bg,
    paddingBottom: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  headerMonth: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 3 + theme.spacing.xxl,
  },
  calendarStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  calendarRing: {
    padding: 4,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "transparent",
  },
  calendarRingSelected: {
    borderColor: theme.colors.danger,
  },
  calendarRingToday: {
    borderStyle: "dashed",
    borderColor: theme.colors.muted,
  },
  calendarPill: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 60,
    borderRadius: 24,
    gap: 3,
    backgroundColor: theme.colors.surfaceElevated,
  },
  calendarPillFuture: {
    opacity: 0.7,
  },
  calendarDayName: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  calendarDate: {
    ...theme.typography.bodyMd,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  editHabitsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  editHabitsText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  daytimeLabel: {
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  daytimeText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  entriesCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 0,
    borderColor: "transparent",
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.module,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  entryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  entryEmoji: {
    fontSize: 18,
  },
  entryLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  entryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.xl,
  },
  triState: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  triStateSmall: {
    borderRadius: theme.radii.sm,
  },
  triOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 40,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  triOptionActive: {
    backgroundColor: theme.colors.border,
  },
  triDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  triText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  triTextActive: {
    color: theme.colors.ink,
  },
  counterControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  counterButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValueWrap: {
    minWidth: 40,
    paddingHorizontal: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  counterValue: {
    ...theme.typography.bodyMd,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: theme.colors.ink,
    minWidth: 20,
    textAlign: "center",
  },
  counterTarget: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginLeft: 1,
  },
  measureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  measureValue: {
    ...theme.typography.bodyMd,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: theme.colors.ink,
    minWidth: 34,
    textAlign: "right",
  },
  measureUnit: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  autoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.info}15`,
  },
  autoBadgeText: {
    ...theme.typography.legal,
    fontSize: 9,
    color: theme.colors.info,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  arrowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  arrowValue: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  arrowLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  moodPicker: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
  },
  moodOption: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  moodOptionActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moodEmoji: {
    fontSize: 17,
  },
  nighttimeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  nighttimeDate: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  mealsSection: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  addMealBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.lime,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  foodAttribution: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  mealsEmpty: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.xl,
    borderWidth: 0,
    borderColor: "transparent",
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  mealsEmptyText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  mealsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 0,
    borderColor: "transparent",
    paddingHorizontal: theme.spacing.xl,
    ...theme.shadows.module,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  mealRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  mealRowText: {
    flex: 1,
  },
  mealRowName: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  mealRowTime: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  mealRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: theme.spacing.xs,
  },
  mealActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mealRowCals: {
    ...theme.typography.labelMd,
    color: theme.colors.body,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  mealsTotal: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  mealsTotalText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  // ── Edit Goals Modal ───────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 20,
    paddingBottom: theme.spacing.sm,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
  },
  modalSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.cardSoft,
  },
  modalSearchInput: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    paddingVertical: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  modalSectionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  modalListCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  modalHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  modalHabitInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
  },
  modalHabitEmoji: {
    fontSize: 20,
  },
  modalHabitLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  modalHabitCategory: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  modalDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${theme.colors.danger}12`,
  },
  modalAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${theme.colors.primary}10`,
  },
  modalAddedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.success}12`,
    borderWidth: 1,
    borderColor: `${theme.colors.success}30`,
  },
  modalAddedText: {
    ...theme.typography.legal,
    color: theme.colors.success,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  modalEmptyLibrary: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  modalEmptyText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  // ── Morning Brief Modal ────────────────────────────────
  briefContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  briefHero: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  briefHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: `${theme.colors.warning}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  briefHeroTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  briefHeroText: {
    ...theme.typography.legal,
    color: theme.colors.body,
    textAlign: "center",
    lineHeight: 17,
  },
  briefToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  briefToggleCopy: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  briefToggleTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  briefToggleSub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 3,
  },
  briefSectionTitle: {
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
  briefTimeLabel: {
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
  briefTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.md,
  },
  briefTestText: {
    ...theme.typography.labelMd,
    color: theme.colors.primary,
  },
  briefSaveBtn: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.elevated,
  },
  briefSaveText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },

  // ── Nutrition Goals Modal ────────────────────────────
  macroContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  macroIntro: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    lineHeight: 16,
    marginBottom: theme.spacing.lg,
  },
  macroField: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  macroFieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  macroFieldDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  macroFieldLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  macroFieldControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  macroStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  macroInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  macroInput: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    textAlign: "center",
    minWidth: 60,
    padding: 0,
  },
  macroUnit: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  macroSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  macroSaveBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.card,
  },
});
