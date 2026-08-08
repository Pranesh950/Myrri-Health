import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { useGoBack } from "../../src/hooks/useGoBack";
import { saveJournalEntry, JournalEntry } from "../../src/services/journal";

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

export default function AddJournalScreen() {
  const handleBack = useGoBack();
  const [text, setText] = useState("");
  const [selectedMood, setSelectedMood] = useState<JournalEntry["mood"]>("good");
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    const now = new Date();
    await saveJournalEntry({
      id: Date.now().toString(),
      time: `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
      text: text.trim(),
      mood: selectedMood,
    });
    handleBack();
  };

  const canSave = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>New Entry</Text>
          <Text style={styles.subtitle}>How are you feeling right now?</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.sectionTitle}>Mood</Text>
          <View style={styles.moodGrid}>
            {moodOptions.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.moodChip,
                  {
                    backgroundColor: m.bg,
                    borderColor: m.color,
                    borderWidth: m.key === selectedMood ? 2 : 0,
                  },
                ]}
                onPress={() => setSelectedMood(m.key)}
              >
                <Text style={[styles.moodText, { color: m.color }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.saveButton, { opacity: canSave ? 1 : 0.5 }]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={!canSave || saving}
        >
          <MaterialCommunityIcons name="check" size={22} color={theme.colors["on-primary"]} />
          <Text style={styles.saveButtonText}>Save Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scroll: {
    flex: 1,
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
  card: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  input: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    minHeight: 120,
    textAlignVertical: "top",
  },
  sectionTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  moodChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  moodText: {
    ...theme.typography.bodyMd,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  saveButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
  cancelButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
  },
});
