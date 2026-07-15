import AsyncStorage from "@react-native-async-storage/async-storage";

export interface JournalEntry {
  id: string;
  time: string;
  text: string;
  mood: "great" | "good" | "okay" | "bad";
}

export interface DailyHabits {
  date: string;
  hydration: number; // cups of water
  caffeine: number; // mg
  weight: number | null; // kg
}

const ENTRIES_KEY = "journal_entries";
const HABITS_KEY = "daily_habits";

export async function getJournalEntries(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const entries = await getJournalEntries();
  entries.unshift(entry);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

function habitsKey(date: string) {
  return `${HABITS_KEY}_${date}`;
}

export async function getDailyHabits(date: string): Promise<DailyHabits> {
  try {
    const raw = await AsyncStorage.getItem(habitsKey(date));
    if (!raw) return { date, hydration: 0, caffeine: 0, weight: null };
    const parsed = JSON.parse(raw);
    return { date, hydration: 0, caffeine: 0, weight: null, ...parsed };
  } catch {
    return { date, hydration: 0, caffeine: 0, weight: null };
  }
}

export async function saveDailyHabits(habits: DailyHabits): Promise<void> {
  await AsyncStorage.setItem(habitsKey(habits.date), JSON.stringify(habits));
}

export async function updateDailyHabit(
  date: string,
  key: keyof Omit<DailyHabits, "date">,
  value: number
): Promise<DailyHabits> {
  const habits = await getDailyHabits(date);
  const updated = { ...habits, [key]: value };
  await saveDailyHabits(updated);
  return updated;
}
