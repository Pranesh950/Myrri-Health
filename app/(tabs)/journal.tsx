import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface JournalEntry {
  id: string;
  time: string;
  text: string;
  mood: "great" | "good" | "okay" | "bad";
}

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([
    { id: "1", time: "08:30", text: "Morning walk with the dog", mood: "great" },
    { id: "2", time: "12:15", text: "Healthy lunch - salad and grilled chicken", mood: "good" },
  ]);
  const [newEntry, setNewEntry] = useState("");
  const [selectedMood, setSelectedMood] = useState<JournalEntry["mood"]>("good");

  const addEntry = () => {
    if (!newEntry.trim()) return;
    const now = new Date();
    setEntries([
      {
        id: Date.now().toString(),
        time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
        text: newEntry.trim(),
        mood: selectedMood,
      },
      ...entries,
    ]);
    setNewEntry("");
  };

  const moodEmoji: Record<JournalEntry["mood"], string> = {
    great: "😄",
    good: "🙂",
    okay: "😐",
    bad: "😔",
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>Track your daily habits and mood</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="How was your day?"
          placeholderTextColor="#8e8e93"
          value={newEntry}
          onChangeText={setNewEntry}
          multiline
        />
        <View style={styles.moodRow}>
          {(Object.keys(moodEmoji) as Array<JournalEntry["mood"]>).map((mood) => (
            <TouchableOpacity
              key={mood}
              style={[
                styles.moodButton,
                selectedMood === mood && styles.moodButtonActive,
              ]}
              onPress={() => setSelectedMood(mood)}
            >
              <Text style={styles.moodText}>{moodEmoji[mood]}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addEntry}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.habitsSection}>
        <Text style={styles.sectionTitle}>Today's Habits</Text>
        {[
          { icon: "water", label: "Hydration", value: "6/8 glasses" },
          { icon: "weather-sunny", label: "Sunlight", value: "30 min" },
          { icon: "cellphone", label: "Screen Time", value: "2.5 hrs" },
          { icon: "bed", label: "In Bed by", value: "11:00 PM" },
        ].map((habit, i) => (
          <View key={i} style={styles.habitRow}>
            <MaterialCommunityIcons name={habit.icon as any} size={20} color="#5e5ce6" />
            <Text style={styles.habitLabel}>{habit.label}</Text>
            <Text style={styles.habitValue}>{habit.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Entries</Text>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTime}>{entry.time}</Text>
            <Text style={styles.entryMood}>{moodEmoji[entry.mood]}</Text>
          </View>
          <Text style={styles.entryText}>{entry.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a2e", marginTop: 60 },
  subtitle: { fontSize: 15, color: "#6e6e73", marginTop: 4, marginBottom: 24 },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    color: "#1a1a2e",
    minHeight: 60,
    textAlignVertical: "top",
  },
  moodRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
  moodButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f5",
    alignItems: "center",
    justifyContent: "center",
  },
  moodButtonActive: {
    backgroundColor: "#e8e8ff",
    borderWidth: 2,
    borderColor: "#5e5ce6",
  },
  moodText: { fontSize: 20 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#5e5ce6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  habitsSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6e6e73",
    marginBottom: 12,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  habitLabel: { fontSize: 15, color: "#1a1a2e", flex: 1 },
  habitValue: { fontSize: 14, color: "#6e6e73" },
  entryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  entryTime: { fontSize: 13, color: "#8e8e93" },
  entryMood: { fontSize: 18 },
  entryText: { fontSize: 15, color: "#1a1a2e" },
});
