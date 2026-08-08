import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../src/theme";
import { useGoBack } from "../src/hooks/useGoBack";
import { ChatBubble } from "../src/components/ChatBubble";
import { ThinkingBubble } from "../src/components/ThinkingBubble";
import { BetaBadge, BetaChip } from "../src/components/BetaBadge";
import {
  initializeLLM,
  getStatus,
  extractMessages,
  getQwenDownloadProgress,
  getLlamaModelId,
  getAvailableLlamaModels,
  switchLlamaModel,
  checkModelDownloaded,
  createChatSession,
  isAIEnabled,
  type ChatSession,
  type ToolHandler,
  type DisplayMessage,
} from "../src/services/localLLM";
import { HealthService, computeStrainScore, computeSleepScore } from "../src/services/health";
import { getHabitLog, formatDateKey } from "../src/services/journal";
import { getMeals, getFoodDatabaseAttribution } from "../src/services/foodDatabase";
import { calculateReadiness } from "../src/services/readiness";
import { getReadinessHistory } from "../src/services/insights";
import { buildCoachChatToolHandlers } from "../src/services/coachPlan";
import type { LlamaModel } from "../src/services/providers/llamaProvider";

const HEALTH_SYSTEM_PROMPT = `You are a health coach AI. You have access to the user's health data through tools. ALWAYS call the right tool before answering — never make up numbers.

Available tools (one per response, JSON format):

ACTIVITY:
  get_steps     — {"action":"get_steps", "period":"today"|"week"|"month"}  → steps, distance, active calories
  get_heart     — {"action":"get_heart", "period":"today"|"week"}             → heart rate, resting HR, HRV
  get_workouts  — {"action":"get_workouts", "period":"week"|"month"}          → recent workout sessions
  get_activity_trends — {"action":"get_activity_trends", "period":"week"|"month"} → daily activity over time

BODY & VITALS:
  get_vitals    — {"action":"get_vitals"}                  → blood oxygen, respiratory rate, body temp, blood pressure
  get_body      — {"action":"get_body"}                    → weight, body fat, lean mass, VO2 max, height

RECOVERY:
  get_sleep     — {"action":"get_sleep", "period":"today"|"week"}  → sleep hours, sleep score
  get_recovery  — {"action":"get_recovery"}                          → strain score, sleep score, readiness score, 7-day readiness trend

LIFESTYLE:
  get_journal   — {"action":"get_journal", "date":"today"|"yesterday"|"YYYY-MM-DD"}  → habits completed, caffeine, hydrationCups, alcohol, mood
  get_meals     — {"action":"get_meals", "date":"today"|"yesterday"|"YYYY-MM-DD"}     → meals with nutrition breakdown

COACH PLANNING:
  get_goal_guidance — {"action":"get_goal_guidance", "goalId":"weight_loss"|"muscle_gain"|... , "topic":"targets"|"nutrition"|...} → knowledge chunk from the goal library
  get_plan          — {"action":"get_plan"}                                              → the user's current saved plan
  update_plan       — {"action":"update_plan","habitIds":[...],"nutrition":{"calories":..,"proteinG":..,"carbsG":..,"fatG":..},"sleepHours":..,"stepsPerDay":..,"trainingDays":..,"focusNote":"..."} → saves a new/updated plan and applies habits to the journal

  When the user asks to make, change, or personalise a plan: call get_goal_guidance (at least the "targets" chunk) for their goal(s), then update_plan with concrete numbers, then reply. Habit ids must be real ids from the goal guidance's habits list. Only change what the user asked to change.

reply — {"action":"reply", "message":"<your reply>"}

RULES:
- NEVER guess data. If the user asks about sleep, call get_sleep first. Steps? get_steps. Recovery? get_recovery.
- Pick the most specific tool. Don't call get_recovery if the user only asked about steps.
- Call ONE tool at a time. The result comes back, then you can call another or reply.
- For questions about trends or history, use period "week" or "month".
- For today's data use period "today" (or omit period).
- Connect dots between sleep, activity, nutrition, and vitals in your reply.
- Be warm, encouraging, concise (2-4 sentences). Mention actual numbers.
- If data is missing, acknowledge it and suggest how to get it.`;

export default function HealthChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = useGoBack();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);
  const [initState, setInitState] = useState<"init" | "downloading" | "ready" | "error">("init");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [aiDisabled, setAiDisabled] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const sessionRef = useRef<ChatSession | null>(null);

  // Model picker
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [availableModels, setAvailableModels] = useState<LlamaModel[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [modelDownloadStates, setModelDownloadStates] = useState<Record<string, "not_downloaded" | "downloading" | "ready">>({});
  useEffect(() => {
    (async () => {
      try {
        // "No AI" is a first-class choice — skip the setup overlay entirely.
        if (!(await isAIEnabled())) {
          setAiDisabled(true);
          setInitState("error");
          return;
        }
        setInitState("downloading");
        await initializeLLM();

        const session = createChatSession({
          systemPrompt: HEALTH_SYSTEM_PROMPT,
          toolHandlers: buildHealthToolHandlers(),
        });
        sessionRef.current = session;

        setInitState("ready");
        setMessages(extractMessages(session.getHistory()));

        const provider = getStatus();
        if (provider.name.includes("Llama")) {
          const models = getAvailableLlamaModels();
          setAvailableModels(models);
          setCurrentModelId(getLlamaModelId());
          const states: Record<string, "not_downloaded" | "downloading" | "ready"> = {};
          for (const m of models) {
            states[m.id] = (await checkModelDownloaded(m.id)) ? "ready" : "not_downloaded";
          }
          setModelDownloadStates(states);
        }
      } catch (e) {
        console.warn("[HealthChat] Init failed:", e);
        setAiDisabled(!(await isAIEnabled()));
        setInitState("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (initState === "downloading") {
      const interval = setInterval(() => setDownloadProgress(getQwenDownloadProgress()), 500);
      return () => clearInterval(interval);
    }
  }, [initState]);

  // Re-init if the provider was reset while away (e.g. BYOK set up from
  // Settings), so the header name and next send use the new choice.
  useFocusEffect(
    useCallback(() => {
      const status = getStatus();
      if (status.status === "unavailable") {
        initializeLLM()
          .then(() => {
            // Rebuild the session if it was never created (e.g. AI was off and
            // the user just enabled it), so handleSend never drops a message
            // against a null sessionRef.
            if (!sessionRef.current) {
              sessionRef.current = createChatSession({
                systemPrompt: HEALTH_SYSTEM_PROMPT,
                toolHandlers: buildHealthToolHandlers(),
              });
            }
            setAiDisabled(false);
            setInitState("ready");
          })
          .catch(async () => {
            // AI may have been switched off while this screen was away.
            if (!(await isAIEnabled())) {
              setAiDisabled(true);
              setInitState("error");
            }
          });
      }
    }, [])
  );

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!sessionRef.current) return;
    setLoading(true);
    setStreamingText("");
    try {
      const history = await sessionRef.current.sendMessage(text, (partial) => {
        setStreamingText(partial);
      });
      setMessages(extractMessages(history));
    } catch (e) {
      console.warn("[HealthChat] Send failed:", e);
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "Sorry, something went wrong. Check your AI provider in Settings and try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setStreamingText(null);
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !sessionRef.current) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text }]);

    if (loading) {
      setPendingQueue((prev) => [...prev, text]);
      return;
    }

    sendMessage(text);
  }, [input, loading, sendMessage]);

  // Process any messages queued while the LLM was generating
  useEffect(() => {
    if (!loading && pendingQueue.length > 0) {
      const [next, ...rest] = pendingQueue;
      setPendingQueue(rest);
      sendMessage(next);
    }
  }, [loading, pendingQueue, sendMessage]);

  const handleStop = () => sessionRef.current?.cancelGeneration();
  const handleReset = useCallback(async () => { await sessionRef.current?.resetChat(); setMessages([]); setPendingQueue([]); }, []);

  const handleSwitchModel = async (modelId: string) => {
    if (modelId === currentModelId) return;
    try {
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "downloading" }));
      await switchLlamaModel(modelId);
      setCurrentModelId(modelId);
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "ready" }));
    } catch (e) {
      console.warn("[HealthChat] Model switch failed:", e);
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "not_downloaded" }));
    }
  };

  const providerName = getStatus().name;
  const isLlama = providerName.includes("Llama");

  // ── Download overlay ─────────────────────────────────────────
  if (initState === "init" || initState === "downloading") {
    const isLlamaDownload = getStatus().name.includes("Llama");
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.statusOverlay}>
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons name="download" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.statusTitle}>Setting up {getStatus().name}</Text>
          <Text style={styles.statusSub}>
            {initState === "downloading" && isLlamaDownload ? `Downloading model (${Math.round(downloadProgress * 100)}%)...` : "This should only take a moment..."}
          </Text>
          {isLlamaDownload && initState === "downloading" && (
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, downloadProgress * 100)}%` }]} /></View>
          )}
          <ActivityIndicator size="small" color={theme.colors.muted} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  // ── Error overlay ────────────────────────────────────────────
  if (initState === "error") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.statusOverlay}>
          <View style={[styles.statusIconWrap, aiDisabled ? { backgroundColor: `${theme.colors.success}15` } : { backgroundColor: "#FDF0ED" }]}>
            <MaterialCommunityIcons
              name={aiDisabled ? "robot-off-outline" : "alert-circle-outline"}
              size={32}
              color={aiDisabled ? theme.colors.success : theme.colors.danger}
            />
          </View>
          <Text style={styles.statusTitle}>{aiDisabled ? "AI is off" : "Setup Failed"}</Text>
          <Text style={styles.statusSub}>
            {aiDisabled
              ? "You chose to skip the AI assistant. Everything else — health, journal, food, barcode scanning — works fine. Turn AI on anytime."
              : "Could not initialize the AI model. Please try again later."}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              if (aiDisabled) {
                router.push("/onboarding/ai-choice?from=chat");
                return;
              }
              setInitState("init");
              initializeLLM().then(() => setInitState("ready")).catch(() => setInitState("error"));
            }}
          >
            <Text style={styles.primaryBtnText}>{aiDisabled ? "Enable AI" : "Retry"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={16} color={theme.colors.ink} style={{ marginRight: 6 }} />
            <Text style={styles.outlineBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main chat ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : insets.bottom}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
          </TouchableOpacity>
          <View style={styles.headerIconCircle}>
            <MaterialCommunityIcons name="brain" size={18} color={theme.colors.info} />
          </View>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Ask AI</Text>
              <BetaBadge />
            </View>
            <TouchableOpacity onPress={() => isLlama && setShowModelPicker(true)} disabled={!isLlama} activeOpacity={isLlama ? 0.7 : 1} style={isLlama ? styles.headerModelRow : undefined}>
              <Text style={styles.headerSubtitle}>{providerName}</Text>
              {isLlama && <MaterialCommunityIcons name="chevron-down" size={12} color={theme.colors.muted} />}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleReset} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="delete-sweep-outline" size={19} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList ref={flatRef} data={messages} keyExtractor={(_, i) => String(i)} contentContainerStyle={[styles.messageList, messages.length === 0 && !streamingText && styles.messageListEmpty]} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.welcomeWrap}><Text style={styles.welcomeEmoji}>🧠</Text><Text style={styles.welcomeTitle}>Health AI</Text><Text style={styles.welcomeBody}>Ask me anything about your health.{"\n\n"}Try "How did I sleep last night?" or{"\n"}"Build me a plan" or{"\n"}"Analyze my recovery."</Text><BetaChip text="AI answers are in beta — double-check before acting on health advice." /></View>
        }
        ListFooterComponent={
          loading && !streamingText ? (
            <ThinkingBubble />
          ) : streamingText != null ? (
            <View style={styles.streamingRow}>
              <View style={styles.streamingAvatar}>
                <MaterialCommunityIcons name="robot-outline" size={15} color={theme.colors.primary} />
              </View>
              <View style={styles.streamingBubble}>
                <Text style={styles.streamingText}>
                  {streamingText}
                  <Text style={styles.streamingCursor}> ▌</Text>
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ChatBubble sender={item.sender} text={item.text} mealInfo={null} isAction={item.isAction} />
        )}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })} onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="Ask about your health..." placeholderTextColor={theme.colors.muted} value={input} onChangeText={setInput} multiline maxLength={500} returnKeyType="send" onSubmitEditing={handleSend} editable={initState === "ready"} />
          </View>
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && !loading && styles.sendBtnDisabled, loading && styles.sendBtnStop]} onPress={loading ? handleStop : handleSend} disabled={!loading && !input.trim()} activeOpacity={0.8}>
            {loading ? <MaterialCommunityIcons name="stop" size={20} color="#FFFFFF" /> : <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Model picker modal */}
      {showModelPicker && (
        <View style={styles.modelOverlay}>
          <View style={styles.modelSheet}>
            <View style={styles.modelSheetHeader}>
              <Text style={styles.modelSheetTitle}>Choose Model</Text>
              <TouchableOpacity onPress={() => setShowModelPicker(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modelSheetSub}>Models run locally on your device.</Text>
            {availableModels.map((m) => {
              const isCurrent = m.id === currentModelId;
              const dlState = modelDownloadStates[m.id] ?? "not_downloaded";
              return (
                <TouchableOpacity key={m.id} style={[styles.modelRow, isCurrent && styles.modelRowActive]} onPress={() => handleSwitchModel(m.id)} disabled={dlState === "downloading"} activeOpacity={0.7}>
                  <View style={styles.modelRowInfo}><Text style={styles.modelRowName}>{m.name}</Text><Text style={styles.modelRowSize}>{m.size}</Text></View>
                  {isCurrent ? (
                    <View style={styles.modelActiveBadge}><MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.success} /></View>
                  ) : dlState === "ready" ? (
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color={theme.colors.muted} />
                  ) : (
                    <View style={styles.modelDownloadBtn}><MaterialCommunityIcons name="download" size={16} color={theme.colors.primary} /></View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function resolvePeriod(raw?: unknown): { days: number; label: string; dateOffset: number } {
  const p = String(raw ?? "today").toLowerCase();
  if (p === "today") return { days: 1, label: "today", dateOffset: 0 };
  if (p === "yesterday") return { days: 1, label: "yesterday", dateOffset: -1 };
  if (p === "week") return { days: 7, label: "last 7 days", dateOffset: 0 };
  if (p === "month") return { days: 30, label: "last 30 days", dateOffset: 0 };
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return { days: n, label: `last ${n} days`, dateOffset: 0 };
  return { days: 1, label: "today", dateOffset: 0 };
}

function resolveDate(raw?: unknown): string {
  const p = String(raw ?? "today").toLowerCase();
  if (p === "today") return formatDateKey(new Date());
  if (p === "yesterday") {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return formatDateKey(d);
  }
  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  return formatDateKey(new Date());
}

// ── Health tool handlers ──────────────────────────────────────

function buildHealthToolHandlers(): Record<string, ToolHandler> {
  return {
    // ── Coach planning ────────────────────────────────────
    ...buildCoachChatToolHandlers(),

    // ── Activity ──────────────────────────────────────────
    get_steps: async (args) => {
      const { days, label } = resolvePeriod(args.period as string);
      try {
        await HealthService.initialize(false);

        if (days === 1) {
          const data = await HealthService.getTodayData();
          const steps = data.steps ?? 0;
          return {
            toolResult: JSON.stringify({
              tool: "get_steps", period: label,
              steps,
              distanceMeters: Math.round(data.distance),
              activeCalories: Math.round(data.activeCalories),
            }),
          };
        }

        const daily = await HealthService.getDailyActivity(days);
        const totalSteps = daily.reduce((s, d) => s + d.steps, 0);
        const avgSteps = daily.length ? Math.round(totalSteps / daily.length) : 0;
        return {
          toolResult: JSON.stringify({
            tool: "get_steps", period: label, days: daily.length,
            totalSteps, avgSteps,
            daily: daily.slice(-7).map((d) => ({ date: d.date, steps: d.steps })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_steps", error: "Could not access step data" }) };
      }
    },

    get_heart: async (args) => {
      const { days, label } = resolvePeriod(args.period as string);
      try {
        await HealthService.initialize(false);
        const data = await HealthService.getTodayData();
        const hr = data.heartRate?.length
          ? { avg: Math.round(data.heartRate.reduce((a, b) => a + b, 0) / data.heartRate.length), max: Math.max(...data.heartRate), min: Math.min(...data.heartRate), readings: data.heartRate.length }
          : null;

        const result: any = {
          tool: "get_heart", period: label,
          heartRate: hr,
          restingHeartRate: data.restingHeartRate,
          heartRateVariability: data.heartRateVariability,
        };

        if (days > 1) {
          const [rhrHistory, hrvHistory] = await Promise.all([
            HealthService.getMetricHistory("restingHeartRate", days),
            HealthService.getMetricHistory("heartRateVariability", days),
          ]);
          if (rhrHistory.length) result.rhrHistory = rhrHistory.slice(-7);
          if (hrvHistory.length) result.hrvHistory = hrvHistory.slice(-7);
        }

        return { toolResult: JSON.stringify(result) };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_heart", error: "Could not access heart data" }) };
      }
    },

    get_workouts: async (args) => {
      const { days, label } = resolvePeriod(args.period || "week");
      try {
        await HealthService.initialize(false);
        const workouts = await HealthService.getWorkouts(days);
        const totalMin = workouts.reduce((s, w) => s + w.durationMin, 0);
        return {
          toolResult: JSON.stringify({
            tool: "get_workouts", period: label, count: workouts.length, totalMinutes: Math.round(totalMin),
            workouts: workouts.slice(0, 10).map((w) => ({
              name: w.name, type: w.type, durationMin: Math.round(w.durationMin),
              calories: w.calories ? Math.round(w.calories) : null,
              date: w.startTime.toISOString().split("T")[0],
            })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_workouts", error: "Could not access workouts" }) };
      }
    },

    get_activity_trends: async (args) => {
      const { days, label } = resolvePeriod(args.period || "week");
      try {
        await HealthService.initialize(false);
        const daily = await HealthService.getDailyActivity(days);
        const totalSteps = daily.reduce((s, d) => s + d.steps, 0);
        const totalCals = daily.reduce((s, d) => s + d.activeCalories, 0);
        return {
          toolResult: JSON.stringify({
            tool: "get_activity_trends", period: label, days: daily.length,
            totalSteps, totalActiveCalories: Math.round(totalCals),
            avgSteps: daily.length ? Math.round(totalSteps / daily.length) : 0,
            daily: daily.map((d) => ({ date: d.date, steps: d.steps, activeCalories: Math.round(d.activeCalories), workouts: d.workoutCount })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_activity_trends", error: "Could not access activity trends" }) };
      }
    },

    // ── Body & Vitals ─────────────────────────────────────
    get_vitals: async () => {
      try {
        await HealthService.initialize(false);
        const data = await HealthService.getTodayData();
        return {
          toolResult: JSON.stringify({
            tool: "get_vitals",
            bloodOxygen: data.bloodOxygen != null ? Math.round(data.bloodOxygen) : null,
            respiratoryRate: data.respiratoryRate,
            bodyTemperature: data.bodyTemperature,
            bloodPressure: data.bloodPressure,
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_vitals", error: "Could not access vitals" }) };
      }
    },

    get_body: async () => {
      try {
        await HealthService.initialize(false);
        const data = await HealthService.getTodayData();
        return {
          toolResult: JSON.stringify({
            tool: "get_body",
            weightKg: data.weight,
            heightCm: data.height,
            bodyFatPercent: data.bodyFat,
            leanBodyMassKg: data.leanBodyMass,
            vo2Max: data.vo2Max,
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_body", error: "Could not access body metrics" }) };
      }
    },

    // ── Recovery ──────────────────────────────────────────
    get_sleep: async (args) => {
      try {
        await HealthService.initialize(false);
        const data = await HealthService.getTodayData();
        const sleepHours = data.sleepHours ?? 0;
        const sleepScore = computeSleepScore(data);

        const result: any = {
          tool: "get_sleep", period: "today",
          sleepHours: sleepHours ? sleepHours.toFixed(1) : "0.0",
          sleepScore,
          // Explicit stage availability so the model answers honestly about
          // REM/deep when the device/wearable doesn't provide stage data,
          // instead of guessing or going quiet.
          hasSleepStages: !!data.sleepHasStages,
        };
        if (data.sleepHasStages) {
          result.sleepStages = {
            deepHours: +(data.sleepDeepHours ?? 0).toFixed(1),
            remHours: +(data.sleepRemHours ?? 0).toFixed(1),
            awakeMinutes: Math.round((data.sleepAwakeHours ?? 0) * 60),
          };
        }

        const { days } = resolvePeriod(args.period as string);
        if (days > 1) {
          const history = await getReadinessHistory(days);
          // Readiness history includes dates; we can show recent sleep trends via snapshots
          result.note = "Historical sleep data is limited. For trends, check get_recovery for readiness over time.";
        }

        return { toolResult: JSON.stringify(result) };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_sleep", error: "Could not access sleep data" }) };
      }
    },

    get_recovery: async () => {
      try {
        await HealthService.initialize(false);
        const data = await HealthService.getTodayData();
        const strainScore = computeStrainScore(data);
        const sleepScore = computeSleepScore(data);
        const readiness = await calculateReadiness(data.heartRateVariability, data.restingHeartRate, data.sleepHours);
        const history = await getReadinessHistory(7);

        return {
          toolResult: JSON.stringify({
            tool: "get_recovery",
            strainScore,
            sleepScore,
            readinessScore: readiness.score,
            readinessSummary: readiness.summary,
            hrvDeviation: readiness.hrvDeviation,
            rhrDeviation: readiness.rhrDeviation,
            recentReadiness: history.slice(-7).map((h) => ({ date: h.date, score: h.score })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_recovery", error: "Could not access recovery data" }) };
      }
    },

    // ── Lifestyle ─────────────────────────────────────────
    get_journal: async (args) => {
      const date = resolveDate(args.date as string);
      try {
        const log = await getHabitLog(date);
        const completed = Object.entries(log.completed || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k);
        return {
          toolResult: JSON.stringify({
            tool: "get_journal", date,
            habitsCompleted: completed,
            habitsTotal: Object.keys(log.completed || {}).length,
            caffeine: log.caffeine,
            hydrationCups: log.hydration,
            alcohol: log.alcohol,
            mood: log.mood,
            hasData: completed.length > 0 || log.caffeine > 0 || log.hydration > 0 || log.alcohol > 0,
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_journal", error: "Could not access journal" }) };
      }
    },

    get_meals: async (args) => {
      const date = resolveDate(args.date as string);
      try {
        const meals = await getMeals(date);
        return {
          toolResult: JSON.stringify({
            tool: "get_meals", date, count: meals.length,
            totalCalories: meals.reduce((s, m) => s + m.calories, 0),
            totalProtein: +meals.reduce((s, m) => s + m.protein, 0).toFixed(1),
            totalCarbs: +meals.reduce((s, m) => s + m.carbs, 0).toFixed(1),
            totalFat: +meals.reduce((s, m) => s + m.fat, 0).toFixed(1),
            meals: meals.map((m) => ({ foodName: m.foodName, servingGrams: m.servingGrams, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat })),
            nutritionSource: getFoodDatabaseAttribution(),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_meals", error: "Could not access meals" }) };
      }
    },
  };
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  statusOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.xxl },
  statusIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surfaceElevated, alignItems: "center", justifyContent: "center", marginBottom: theme.spacing.lg },
  statusTitle: { ...theme.typography.titleLg, color: theme.colors.ink, marginBottom: theme.spacing.xs },
  statusSub: { ...theme.typography.bodyMd, color: theme.colors.muted, textAlign: "center", lineHeight: 20 },
  progressTrack: { width: 220, height: 6, backgroundColor: theme.colors.border, borderRadius: 3, marginTop: theme.spacing.lg, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 3 },
  primaryBtn: { marginTop: theme.spacing.xl, paddingHorizontal: 32, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: theme.radii.md },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  outlineBtn: { marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md },
  outlineBtnText: { color: theme.colors.ink, fontSize: 14, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.lg, paddingVertical: 14, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, ...theme.shadows.header },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { ...theme.typography.titleSm, color: theme.colors.ink },
  headerSubtitle: { fontSize: 11, color: theme.colors.muted, fontFamily: "Nunito_500Medium", fontWeight: "500", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceElevated },
  messageList: { padding: theme.spacing.lg, flexGrow: 1, justifyContent: "flex-end" },
  messageListEmpty: { justifyContent: "center" },
  welcomeWrap: { alignItems: "center", paddingHorizontal: theme.spacing.xl },
  welcomeEmoji: { fontSize: 48, marginBottom: theme.spacing.lg },
  welcomeTitle: { ...theme.typography.titleLg, color: theme.colors.ink, marginBottom: theme.spacing.sm },
  welcomeBody: { ...theme.typography.bodyMd, color: theme.colors.muted, textAlign: "center", lineHeight: 22 },
  inputBar: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, backgroundColor: "transparent" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, backgroundColor: theme.colors.card, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.border, padding: 6, ...theme.shadows.card },
  inputWrap: { flex: 1, paddingLeft: 12 },
  input: { fontSize: 15, lineHeight: 20, color: theme.colors.ink, maxHeight: 100, paddingVertical: 8, fontFamily: "Nunito_400Regular", fontWeight: "400" },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.lime, alignItems: "center", justifyContent: "center", ...theme.shadows.elevated },
  sendBtnDisabled: { opacity: 0.4, elevation: 0, shadowOpacity: 0 },
  sendBtnStop: { backgroundColor: theme.colors.danger },
  headerModelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  modelOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end", zIndex: 999 },
  modelSheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.lg, maxHeight: "75%" },
  modelSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.xs },
  modelSheetTitle: { ...theme.typography.titleLg, color: theme.colors.ink },
  modelSheetSub: { ...theme.typography.caption, color: theme.colors.muted, marginBottom: theme.spacing.lg, lineHeight: 18 },
  modelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.bg, marginBottom: theme.spacing.sm },
  modelRowActive: { borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}08` },
  modelRowInfo: { flex: 1 },
  modelRowName: { ...theme.typography.bodyMd, color: theme.colors.ink, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  modelRowSize: { ...theme.typography.legal, color: theme.colors.muted, marginTop: 2 },
  modelActiveBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${theme.colors.success}15`, alignItems: "center", justifyContent: "center" },
  modelDownloadBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${theme.colors.primary}10`, alignItems: "center", justifyContent: "center" },
  modelProgressWrap: { width: 80 },
  modelProgressTrack: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: "hidden" },
  modelProgressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 3 },
  // ── Streaming bubble ─────────────────────────────────────────
  streamingRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  streamingAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  streamingBubble: { maxWidth: "78%", backgroundColor: theme.colors.card, borderRadius: 22, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 16, paddingVertical: 12, ...theme.shadows.cardSoft },
  streamingText: { fontSize: 15, lineHeight: 22, color: theme.colors.ink, fontFamily: "Nunito_400Regular", fontWeight: "400" },
  streamingCursor: { color: theme.colors.danger, fontFamily: "Nunito_700Bold", fontWeight: "700" },
});
