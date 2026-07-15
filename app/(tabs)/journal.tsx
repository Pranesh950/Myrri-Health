import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Modal,
  TextInput,
  Keyboard,
} from "react-native";
import { useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import {
  getJournalEntries,
  JournalEntry,
  DailyHabits,
  getDailyHabits,
  updateDailyHabit,
} from "../../src/services/journal";
import { HealthService, HealthData } from "../../src/services/health";

const moodOptions: {
  key: JournalEntry["mood"];
  label: string;
  color: string;
  bg: string;
}[] = [
  { key: "great", label: "Great", color: "#059669", bg: "#ECFDF5" },
  { key: "good", label: "Good", color: "#D97706", bg: "#FFFBEB" },
  { key: "okay", label: "Okay", color: "#6B7280", bg: "#F9FAFB" },
  { key: "bad", label: "Bad", color: "#DC2626", bg: "#FEF2F2" },
];

function HabitRow({
  icon,
  iconColor,
  iconBg,
  name,
  value,
  onPress,
  controls,
  auto,
  isFirst,
  isLast,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  name: string;
  value: string;
  onPress?: () => void;
  controls?: React.ReactNode;
  auto?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const content = (
    <View
      style={[
        styles.habitRow,
        isFirst && styles.habitRowFirst,
        isLast && styles.habitRowLast,
      ]}
    >
      <View style={[styles.habitIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.habitInfo}>
        <Text style={styles.habitName}>{name}</Text>
        <Text style={styles.habitValue}>{value}</Text>
      </View>
      {auto ? (
        <View style={styles.autoFillBadge}>
          <Text style={styles.autoFillText}>Auto</Text>
        </View>
      ) : controls ? (
        controls
      ) : (
        <View style={[styles.habitButton, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="plus" size={18} color={theme.colors["on-primary"]} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [habits, setHabits] = useState<DailyHabits>({
    date: formatDateKey(new Date()),
    hydration: 0,
    caffeine: 0,
    weight: null,
  });
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [caffeineModalVisible, setCaffeineModalVisible] = useState(false);
  const [caffeineInput, setCaffeineInput] = useState("");
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const confirmSlide = useRef(new Animated.Value(-10)).current;
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const todayKey = formatDateKey(new Date());
    const [loadedEntries, loadedHabits, loadedHealth] = await Promise.all([
      getJournalEntries(),
      getDailyHabits(todayKey),
      HealthService.getTodayData(),
    ]);
    setEntries(loadedEntries);
    setHabits(loadedHabits);
    setHealthData(loadedHealth);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleHydrationIncrement = async () => {
    const todayKey = formatDateKey(new Date());
    const updated = await updateDailyHabit(todayKey, "hydration", habits.hydration + 1);
    setHabits(updated);
  };

  const handleHydrationDecrement = async () => {
    const todayKey = formatDateKey(new Date());
    const updated = await updateDailyHabit(todayKey, "hydration", Math.max(0, habits.hydration - 1));
    setHabits(updated);
  };

  const showConfirmation = (message: string) => {
    if (confirmTimeout.current) {
      clearTimeout(confirmTimeout.current);
    }
    setConfirmation(message);
    Animated.parallel([
      Animated.timing(confirmOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(confirmSlide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    confirmTimeout.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(confirmOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(confirmSlide, { toValue: -10, duration: 200, useNativeDriver: true }),
      ]).start(() => setConfirmation(null));
    }, 2000);
  };

  const handleCaffeineSave = async () => {
    const mg = parseInt(caffeineInput, 10);
    if (Number.isNaN(mg)) return;
    const todayKey = formatDateKey(new Date());
    const updated = await updateDailyHabit(todayKey, "caffeine", habits.caffeine + mg);
    setHabits(updated);
    setCaffeineInput("");
    setCaffeineModalVisible(false);
    Keyboard.dismiss();
    showConfirmation(`Logged ${mg} mg caffeine`);
  };

  const handleWeightSave = async () => {
    const kg = parseFloat(weightInput);
    if (Number.isNaN(kg)) return;
    const todayKey = formatDateKey(new Date());
    const updated = await updateDailyHabit(todayKey, "weight", kg);
    setHabits(updated);
    setWeightInput("");
    setWeightModalVisible(false);
    Keyboard.dismiss();
    showConfirmation(`Logged weight ${kg} kg`);
  };

  const getMoodStyle = (mood: JournalEntry["mood"]) =>
    moodOptions.find((m) => m.key === mood)!;

  const steps = healthData?.steps ?? 0;
  const sleepHours = healthData?.sleepHours ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={loadData}
          tintColor={theme.colors.ink}
        />
      }
    >
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>Your habits and reflections</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.summaryCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{entries.length}</Text>
          <Text style={styles.summaryLabel}>Entries</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {entries.filter((e) => e.mood === "great" || e.mood === "good").length}
          </Text>
          <Text style={styles.summaryLabel}>Good days</Text>
        </View>
      </Animated.View>

      <Text style={styles.sectionTitle}>Today's Habits</Text>
      <Animated.View
        style={[
          styles.habitsCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.habitList}>
          <HabitRow
            icon="water"
            iconColor={theme.colors.info}
            iconBg="#E0F2FE"
            name="Hydration"
            value={`${habits.hydration} cups`}
            isFirst
            controls={
              <View style={styles.habitControls}>
                <TouchableOpacity
                  style={[styles.habitButton, { backgroundColor: theme.colors["surface-soft"] }]}
                  onPress={handleHydrationDecrement}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.habitButton}
                  onPress={handleHydrationIncrement}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={theme.colors["on-primary"]} />
                </TouchableOpacity>
              </View>
            }
          />
          <HabitRow
            icon="coffee"
            iconColor={theme.colors.warning}
            iconBg="#FEF3C7"
            name="Caffeine"
            value={`${habits.caffeine} mg`}
            onPress={() => setCaffeineModalVisible(true)}
          />
          <HabitRow
            icon="scale-bathroom"
            iconColor={theme.colors["signature-coral"]}
            iconBg="#F3E8FF"
            name="Weight"
            value={habits.weight != null ? `${habits.weight} kg` : "--"}
            onPress={() => setWeightModalVisible(true)}
          />
          <HabitRow
            icon="shoe-print"
            iconColor={theme.colors.success}
            iconBg="#ECFDF5"
            name="Steps"
            value={steps.toLocaleString()}
            auto
          />
          <HabitRow
            icon="sleep"
            iconColor={theme.colors["signature-forest"]}
            iconBg="#F3E8FF"
            name="Sleep"
            value={`${sleepHours.toFixed(1)} h`}
            auto
          />
          <HabitRow
            icon="meditation"
            iconColor={theme.colors["signature-mint"]}
            iconBg="#E0E7FF"
            name="Mindfulness"
            value="--"
            isLast
            auto
          />
        </View>
      </Animated.View>

      {confirmation && (
        <Animated.View
          style={[
            styles.confirmationToast,
            { opacity: confirmOpacity, transform: [{ translateY: confirmSlide }] },
          ]}
        >
          <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.success} />
          <Text style={styles.confirmationText}>{confirmation}</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>Entries</Text>
      {entries.length === 0 ? (
        <Animated.View
          style={[
            styles.emptyCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <MaterialCommunityIcons
            name="notebook-outline"
            size={48}
            color={theme.colors.muted}
          />
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.emptyText}>
            Tap the + button to write your first journal entry.
          </Text>
        </Animated.View>
      ) : (
        entries.map((entry) => {
          const m = getMoodStyle(entry.mood);
          return (
            <Animated.View
              key={entry.id}
              style={[
                styles.entryCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.entryHeader}>
                <Text style={styles.entryTime}>{entry.time}</Text>
                <View style={[styles.moodBadge, { backgroundColor: m.bg }]}>
                  <Text style={[styles.moodBadgeText, { color: m.color }]}>
                    {m.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.entryText}>{entry.text}</Text>
            </Animated.View>
          );
        })
      )}

      <Modal
        visible={caffeineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCaffeineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Caffeine</Text>
            <Text style={styles.modalSubtitle}>Enter amount in milligrams</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={caffeineInput}
              onChangeText={setCaffeineInput}
              placeholder="e.g. 80"
              placeholderTextColor={theme.colors.muted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setCaffeineInput("");
                  setCaffeineModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { opacity: caffeineInput.trim() ? 1 : 0.5 }]}
                onPress={handleCaffeineSave}
                activeOpacity={0.8}
                disabled={!caffeineInput.trim()}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={weightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <Text style={styles.modalSubtitle}>Enter your weight in kilograms</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="e.g. 72.5"
              placeholderTextColor={theme.colors.muted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setWeightInput("");
                  setWeightModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { opacity: weightInput.trim() ? 1 : 0.5 }]}
                onPress={handleWeightSave}
                activeOpacity={0.8}
                disabled={!weightInput.trim()}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  header: {
    marginTop: 60,
    marginBottom: theme.spacing.xxl,
  },
  title: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    marginTop: theme.spacing.sm,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: theme.colors["surface-soft"],
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
    textTransform: "uppercase",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.hairline,
    marginHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  habitsCard: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  habitList: {
    borderRadius: theme.radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors["surface-soft"],
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  habitRowFirst: {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
  },
  habitRowLast: {
    borderBottomLeftRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomWidth: 0,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  habitInfo: {
    flex: 1,
    justifyContent: "center",
  },
  habitName: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textTransform: "uppercase",
  },
  habitValue: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginTop: 2,
  },
  habitButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  habitControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  confirmationToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors["surface-soft"],
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  confirmationText: {
    ...theme.typography.bodyMd,
    color: theme.colors.success,
  },
  habitDivider: {
    height: 1,
    backgroundColor: theme.colors.hairline,
    marginVertical: theme.spacing.sm,
  },
  autoFillBadge: {
    backgroundColor: theme.colors["surface-soft"],
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  autoFillText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  emptyCard: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.xxl,
    alignItems: "center",
  },
  emptyTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.body,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  entryCard: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  entryTime: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  moodBadge: {
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  moodBadgeText: {
    ...theme.typography.caption,
  },
  entryText: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    width: "100%",
  },
  modalTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.body,
    marginBottom: theme.spacing.lg,
  },
  modalInput: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  modalCancel: {
    flex: 1,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  modalCancelText: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  modalSave: {
    flex: 1,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  modalSaveText: {
    ...theme.typography.bodyMd,
    color: theme.colors["on-primary"],
  },
});
