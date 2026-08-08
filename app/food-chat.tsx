// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

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
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
import {
  searchFood,
  getFoodByFdcId,
  logMeal,
  estimateServing,
  getMeals,
  deleteMeal as dbDeleteMeal,
  updateMeal as dbUpdateMeal,
  FoodItem,
  MealEntry,
  getFoodDatabaseAttribution,
} from "../src/services/foodDatabase";
import { formatDateKey } from "../src/services/journal";
import type { LlamaModel } from "../src/services/providers/llamaProvider";

const FOOD_SYSTEM_PROMPT = `You are a nutrition assistant for a mobile app. Help users log food they ate.

You have these tools, one action per response:

1. search_food: {"action": "search", "query": "food name"}
   - Returns up to 8 matches with nutrition per 100g
   - Search one food at a time (e.g. search "eggs", then search "avocado")

2. log_meal: {"action": "log", "fdcId": string, "foodName": string, "servingG": number}
   - Log a food with the exact serving in grams
   - Instead of servingG you can use "calorieTarget": number to specify desired calories
   - Example: {"action": "log", "fdcId": "fd_example", "foodName": "Oatmeal, cooked", "calorieTarget": 180}

3. get_meals: {"action": "get_meals"}
   - Returns all meals logged today with their IDs, names, and nutrition
   - Use this when the user asks what they ate or wants to review their log

4. delete_meal: {"action": "delete_meal", "mealId": "xxx", "foodName": "Chicken breast"}
   - Proposes deleting a meal from today's log (requires user approval)
   - You MUST call get_meals first to find the correct mealId

5. edit_meal: {"action": "edit_meal", "mealId": "xxx", "foodName": "Chicken breast", "newServingG": 200}
   - Proposes changing a meal's serving size (requires user approval)
   - You MUST call get_meals first to find the correct mealId

6. reply — respond to the user. Output {"action": "reply", "message": "<your reply text>"}
   - Optional: add "mealList" to show a structured meal summary
   - Example: {"action": "reply", "message": "You ate 3 items today:", "mealList": [{"foodName": "Scrambled eggs", "servingGrams": 100, "calories": 155, "protein": 13, "carbs": 1, "fat": 11}]}

RULES:
- NEVER make up nutrition data. Only use data returned by search_food.
- For multi-food meals (e.g. "chicken burrito bowl with rice and guac"), search every ingredient, then log each one with its fdcId.
- You may output MULTIPLE actions in one response — one complete JSON object per line. Use this to search or log several foods at once.
- If a response contains multiple actions, do NOT add a reply action — after the tools run you will get a fresh turn to reply with a summary.
- If search returns no matches or unclear matches, ask the user.
- Serving size estimates: 1 egg ≈ 50g, 1 banana ≈ 120g, 1 apple ≈ 180g, 1 slice bread ≈ 30g
- For "X calories of Y": search Y, get calories per 100g, then servingG = (X / caloriesPer100g) × 100
- When user asks to delete/edit, ALWAYS call get_meals first.
- When you are done and need no more tools, ALWAYS end with a reply action: a brief plain-text summary of what you logged (optionally with mealList to show the items).
- Never reply with raw JSON or tool syntax — the user only ever sees reply messages.
- Keep replies brief and friendly.`;

export default function FoodChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = useGoBack();
  const params = useLocalSearchParams<{ mode?: string }>();
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

  const [showSearchFallback, setShowSearchFallback] = useState(params.mode === "search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Model picker
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [availableModels, setAvailableModels] = useState<LlamaModel[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [modelDownloadStates, setModelDownloadStates] = useState<Record<string, "not_downloaded" | "downloading" | "ready">>({});
  const [modelProgress, setModelProgress] = useState<Record<string, number>>({});

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

        // Create food-specific chat session
        const session = createChatSession({
          systemPrompt: FOOD_SYSTEM_PROMPT,
          toolHandlers: buildFoodToolHandlers(),
        });
        sessionRef.current = session;

        setInitState("ready");
        const history = extractMessages(session.getHistory());
        setMessages(history);

        // Load available models
        const provider = getStatus();
        if (provider.name.includes("Llama")) {
          const models = getAvailableLlamaModels();
          setAvailableModels(models);
          const currentId = getLlamaModelId();
          setCurrentModelId(currentId);
          const states: Record<string, "not_downloaded" | "downloading" | "ready"> = {};
          for (const m of models) {
            states[m.id] = (await checkModelDownloaded(m.id)) ? "ready" : "not_downloaded";
          }
          setModelDownloadStates(states);
        }
      } catch (e) {
        console.warn("[FoodChat] Init failed:", e);
        setAiDisabled(!(await isAIEnabled()));
        setInitState("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (initState === "downloading") {
      const interval = setInterval(() => {
        setDownloadProgress(getQwenDownloadProgress());
      }, 500);
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
                systemPrompt: FOOD_SYSTEM_PROMPT,
                toolHandlers: buildFoodToolHandlers(),
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
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  useEffect(() => {
    if (!showSearchFallback || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchFood(searchQuery.trim());
        setSearchResults(results);
      } catch (e) {
        console.warn("[FoodChat] Search failed:", e);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearchFallback]);

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
      console.warn("[FoodChat] Send failed:", e);
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

  const handleReset = useCallback(async () => {
    await sessionRef.current?.resetChat();
    setMessages([]);
    setPendingQueue([]);
  }, []);

  const logFood = useCallback(
    async (food: FoodItem, servingGrams: number) => {
      const multiplier = servingGrams / 100;
      const now = new Date();
      const entry: MealEntry = {
        id: `${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
        date: formatDateKey(now),
        timestamp: now.toISOString(),
        fdcId: food.fdcId,
        foodName: food.description,
        servingGrams,
        calories: Math.round(food.calories * multiplier),
        protein: Math.round(food.protein * multiplier * 10) / 10,
        carbs: Math.round(food.carbs * multiplier * 10) / 10,
        fat: Math.round(food.fat * multiplier * 10) / 10,
        fiber: Math.round(food.fiber * multiplier * 10) / 10,
      };
      try {
        await logMeal(entry);
        handleBack();
      } catch (e) {
        console.warn("[FoodChat] Log failed:", e);
      }
    },
    [router]
  );

  const handleApprove = useCallback(
    async (approval: { type: "delete" | "edit"; mealId: string; foodName: string; date: string; newServingG?: number }) => {
      try {
        if (approval.type === "delete") {
          await dbDeleteMeal(approval.date, approval.mealId);
        } else if (approval.type === "edit" && approval.newServingG) {
          await dbUpdateMeal(approval.date, approval.mealId, { servingGrams: approval.newServingG });
        }
        setMessages((prev) =>
          prev.map((m) =>
            (m as any).pendingApproval?.mealId === approval.mealId
              ? {
                  sender: "assistant" as const,
                  text: approval.type === "delete"
                    ? `Deleted "${approval.foodName}"`
                    : `Updated "${approval.foodName}" to ${approval.newServingG}g`,
                  isAction: true,
                  pendingApproval: undefined,
                }
              : m
          )
        );
      } catch (e) {
        console.warn("[FoodChat] Approve failed:", e);
      }
    },
    []
  );

  const handleReject = useCallback(
    (approval: { type: "delete" | "edit"; mealId: string; foodName: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          (m as any).pendingApproval?.mealId === approval.mealId
            ? {
                sender: "assistant" as const,
                text: approval.type === "delete"
                  ? `Keeping "${approval.foodName}"`
                  : `Keeping "${approval.foodName}" as-is`,
                isAction: true,
                pendingApproval: undefined,
              }
            : m
        )
      );
    },
    []
  );

  const handleQuickLog = useCallback(
    (food: FoodItem) => logFood(food, estimateServing(food.description)),
    [logFood]
  );

  const handleSwitchModel = async (modelId: string) => {
    if (modelId === currentModelId) return;
    try {
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "downloading" }));
      await switchLlamaModel(modelId);
      setCurrentModelId(modelId);
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "ready" }));
    } catch (e) {
      console.warn("[FoodChat] Model switch failed:", e);
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "not_downloaded" }));
    }
  };

  const providerName = getStatus().name;
  const isLlama = providerName.includes("Llama");

  // ── Search fallback view ─────────────────────────────────────
  if (showSearchFallback) {
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSearchFallback(false)} style={styles.headerIconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Food</Text>
          <View style={styles.headerIconBtn} />
        </View>
        <Text style={styles.attribution}>{getFoodDatabaseAttribution()}</Text>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.muted} />
          <TextInput style={styles.searchInput} placeholder="Search foods..." placeholderTextColor={theme.colors.muted} value={searchQuery} onChangeText={setSearchQuery} autoFocus returnKeyType="search" />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}><MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.muted} /></TouchableOpacity>
          )}
        </View>
        {searchLoading && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 24 }} />}
        <FlatList
          data={searchResults} keyExtractor={(item) => String(item.fdcId)} contentContainerStyle={styles.searchList} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={searchQuery.trim().length >= 2 && !searchLoading ? (
            <View style={styles.searchEmpty}><MaterialCommunityIcons name="food-off" size={36} color={theme.colors.muted} /><Text style={styles.searchEmptyText}>No foods found</Text></View>
          ) : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.foodRow} onPress={() => router.push(`/food-detail?fdcId=${item.fdcId}`)} activeOpacity={0.7}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.description}</Text>
                <Text style={styles.foodCategory}>{item.category}</Text>
                <Text style={styles.foodMacros}>{item.calories} cal · {item.protein}g P · {item.carbs}g C · {item.fat}g F</Text>
              </View>
              <TouchableOpacity style={styles.foodQuickAdd} onPress={() => handleQuickLog(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </KeyboardAvoidingView>
    );
  }

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
            {initState === "downloading" && isLlamaDownload
              ? `Downloading model (${Math.round(downloadProgress * 100)}%)...`
              : "This should only take a moment..."}
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
              ? "You chose to skip the AI assistant. Food search, barcode scanning, and logging still work — turn AI on anytime."
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
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowSearchFallback(true)}>
            <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.ink} style={{ marginRight: 6 }} />
            <Text style={styles.outlineBtnText}>Search foods instead</Text>
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
            <MaterialCommunityIcons name="food-apple" size={18} color={theme.colors.primary} />
          </View>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Food Log</Text>
              <BetaBadge />
            </View>
            <TouchableOpacity onPress={() => isLlama && setShowModelPicker(true)} disabled={!isLlama} activeOpacity={isLlama ? 0.7 : 1} style={isLlama ? styles.headerModelRow : undefined}>
              <Text style={styles.headerSubtitle}>{providerName}</Text>
              {isLlama && <MaterialCommunityIcons name="chevron-down" size={12} color={theme.colors.muted} />}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearchFallback(true)} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="delete-sweep-outline" size={19} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList ref={flatRef} data={messages} keyExtractor={(_, i) => String(i)} contentContainerStyle={[styles.messageList, messages.length === 0 && !streamingText && styles.messageListEmpty]} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.welcomeWrap}><Text style={styles.welcomeEmoji}>🥗</Text><Text style={styles.welcomeTitle}>Nutrition Assistant</Text><Text style={styles.welcomeBody}>Tell me what you ate and I'll log it for you.{"\n"}Try "I had 2 eggs and a banana" or ask{"\n"}"what did I eat today?"</Text><BetaChip text="AI food logging is in beta — always double-check servings." /></View>
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
          <ChatBubble sender={item.sender} text={item.text} mealInfo={null} isAction={item.isAction} pendingApproval={(item as any).pendingApproval} mealList={(item as any).mealList} onApprove={handleApprove} onReject={handleReject} />
        )}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })} onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="What did you eat?" placeholderTextColor={theme.colors.muted} value={input} onChangeText={setInput} multiline maxLength={500} returnKeyType="send" onSubmitEditing={handleSend} editable={initState === "ready"} />
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
            <Text style={styles.modelSheetSub}>Models run locally on your device. Larger models are smarter but slower.</Text>
            {availableModels.map((m) => {
              const isCurrent = m.id === currentModelId;
              const dlState = modelDownloadStates[m.id] ?? "not_downloaded";
              const progress = modelProgress[m.id] ?? 0;
              return (
                <TouchableOpacity key={m.id} style={[styles.modelRow, isCurrent && styles.modelRowActive]} onPress={() => handleSwitchModel(m.id)} disabled={dlState === "downloading"} activeOpacity={0.7}>
                  <View style={styles.modelRowInfo}><Text style={styles.modelRowName}>{m.name}</Text><Text style={styles.modelRowSize}>{m.size}</Text></View>
                  {dlState === "downloading" ? (
                    <View style={styles.modelProgressWrap}><View style={styles.modelProgressTrack}><View style={[styles.modelProgressFill, { width: `${Math.max(4, progress * 100)}%` }]} /></View></View>
                  ) : isCurrent ? (
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

// ── Food tool handlers factory ─────────────────────────────────

function buildFoodToolHandlers(): Record<string, ToolHandler> {
  return {
    search_food: async (args) => {
      const query = String(args.query || "");
      const results = await searchFood(query);
      return {
        toolResult: JSON.stringify({
          tool: "search_food", query, found: results.length,
          results: results.map((f) => ({ fdcId: f.fdcId, description: f.description, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber })),
        }),
      };
    },

    log_meal: async (args) => {
      const fdcId = String(args.fdcId || "");
      const foodName = String(args.foodName || "");
      let servingG = Number(args.servingG || args.serving_grams || 0);

      let food: FoodItem | null = null;
      if (fdcId) food = await getFoodByFdcId(fdcId);
      if (!food && foodName) {
        const results = await searchFood(foodName);
        if (results.length > 0) food = results[0];
      }
      if (!food && fdcId) {
        const results = await searchFood(fdcId);
        if (results.length > 0) food = results[0];
      }

      if (food) {
        if (servingG <= 0) {
          const calorieTarget = Number(args.calorieTarget || args.calories_target || 0);
          if (calorieTarget > 0 && food.calories > 0) servingG = Math.round((calorieTarget / food.calories) * 100);
          else servingG = estimateServing(food.description);
        }
        const multiplier = servingG / 100;
        const now = new Date();
        const entry: MealEntry = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          date: formatDateKey(now), timestamp: now.toISOString(),
          fdcId: food.fdcId, foodName: food.description, servingGrams: servingG,
          calories: Math.round(food.calories * multiplier),
          protein: Math.round(food.protein * multiplier * 10) / 10,
          carbs: Math.round(food.carbs * multiplier * 10) / 10,
          fat: Math.round(food.fat * multiplier * 10) / 10,
          fiber: Math.round(food.fiber * multiplier * 10) / 10,
        };
        await logMeal(entry);
        return { toolResult: JSON.stringify({ tool: "log_meal", success: true, fdcId: food.fdcId, foodName: food.description, servingGrams: servingG, calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat }) };
      }
      return { toolResult: JSON.stringify({ tool: "log_meal", success: false, error: `Food not found: ${foodName || fdcId}` }) };
    },

    get_meals: async () => {
      const today = formatDateKey(new Date());
      const meals = await getMeals(today);
      return {
        toolResult: JSON.stringify({
          tool: "get_meals", date: today, count: meals.length,
          meals: meals.map((m) => ({ mealId: m.id, foodName: m.foodName, servingGrams: m.servingGrams, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat })),
        }),
      };
    },

    delete_meal: async (args) => {
      const mealId = String(args.mealId || "");
      const foodName = String(args.foodName || "");
      const today = formatDateKey(new Date());
      if (!mealId) return { toolResult: JSON.stringify({ tool: "delete_meal", success: false, error: "No mealId" }) };
      return {
        toolResult: JSON.stringify({ tool: "delete_meal", pending: true }),
        earlyExit: JSON.stringify({ action: "reply", message: `Delete "${foodName}"?`, pendingApproval: { type: "delete", mealId, foodName, date: today } }),
      };
    },

    edit_meal: async (args) => {
      const mealId = String(args.mealId || "");
      const foodName = String(args.foodName || "");
      const newServingG = Number(args.newServingG || 0);
      const today = formatDateKey(new Date());
      if (!mealId || newServingG <= 0) return { toolResult: JSON.stringify({ tool: "edit_meal", success: false, error: "Missing mealId or newServingG" }) };
      return {
        toolResult: JSON.stringify({ tool: "edit_meal", pending: true }),
        earlyExit: JSON.stringify({ action: "reply", message: `Change "${foodName}" to ${newServingG}g?`, pendingApproval: { type: "edit", mealId, foodName, date: today, newServingG } }),
      };
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
  attribution: { fontSize: 10, lineHeight: 14, color: theme.colors.muted, textAlign: "center", marginHorizontal: theme.spacing.xl, marginTop: theme.spacing.md },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.card, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.md, height: 48, gap: theme.spacing.sm, ...theme.shadows.card },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.ink, height: 48, fontFamily: "Nunito_400Regular", fontWeight: "400" },
  searchList: { padding: theme.spacing.lg, paddingTop: theme.spacing.md, flexGrow: 1 },
  searchEmpty: { alignItems: "center", paddingTop: 48, gap: theme.spacing.sm },
  searchEmptyText: { ...theme.typography.bodyMd, color: theme.colors.muted },
  foodRow: { flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.card, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  foodInfo: { flex: 1 },
  foodName: { ...theme.typography.bodyMd, color: theme.colors.ink, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  foodCategory: { ...theme.typography.legal, color: theme.colors.muted, marginTop: 2 },
  foodMacros: { ...theme.typography.legal, color: theme.colors.body, marginTop: 4 },
  foodQuickAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
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
