// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../theme";

interface PendingApproval {
  type: "delete" | "edit";
  mealId: string;
  foodName: string;
  date: string;
  newServingG?: number;
}

interface MealListItem {
  foodName: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ChatBubbleProps {
  sender: "user" | "assistant";
  text: string;
  isAction?: boolean;
  pendingApproval?: PendingApproval;
  onApprove?: (approval: PendingApproval) => void;
  onReject?: (approval: PendingApproval) => void;
  mealList?: MealListItem[];
  mealInfo?: {
    foodName: string;
    servingGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
}

export function ChatBubble({
  sender,
  text,
  isAction,
  pendingApproval,
  onApprove,
  onReject,
  mealList,
  mealInfo,
}: ChatBubbleProps) {
  const isUser = sender === "user";

  // ── Approval card ─────────────────────────────────────────────
  if (pendingApproval) {
    const isDelete = pendingApproval.type === "delete";
    const icon = isDelete ? "alert-circle-outline" : "pencil-outline";
    const iconColor = isDelete ? theme.colors.danger : theme.colors.warning;
    const label = isDelete
      ? `Delete "${pendingApproval.foodName}"?`
      : `Change "${pendingApproval.foodName}" to ${pendingApproval.newServingG}g?`;

    return (
      <View style={styles.approvalCard}>
        <View style={styles.approvalIconWrap}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>
        <Text style={styles.approvalTitle}>Confirm action</Text>
        <Text style={styles.approvalText}>{label}</Text>
        <View style={styles.approvalActions}>
          <TouchableOpacity
            style={styles.approvalReject}
            onPress={() => onReject?.(pendingApproval)}
            activeOpacity={0.75}
          >
            <Text style={styles.approvalRejectText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approvalAccept}
            onPress={() => onApprove?.(pendingApproval)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="check"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.approvalAcceptText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Action pill ────────────────────────────────────────────────
  if (isAction) {
    return (
      <View style={styles.actionPill}>
        <Text style={styles.actionText}>{text}</Text>
      </View>
    );
  }

  // ── Regular message bubble ────────────────────────────────────
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <MaterialCommunityIcons
            name="robot-outline"
            size={15}
            color={theme.colors.primary}
          />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {mealList && mealList.length > 0 ? (
          <View style={styles.mealListWrap}>
            {text ? (
              <Text style={styles.bubbleTextAssistant}>{text}</Text>
            ) : null}
            {mealList.map((meal, i) => {
              const isLast = i === mealList.length - 1;
              return (
                <View
                  key={i}
                  style={[styles.mealListItem, isLast && styles.mealListItemLast]}
                >
                  <View style={styles.mealListItemLeft}>
                    <MaterialCommunityIcons
                      name="food-apple"
                      size={14}
                      color={theme.colors.success}
                    />
                    <Text
                      style={[styles.mealListItemName, !isUser && styles.mealListItemNameDark]}
                      numberOfLines={1}
                    >
                      {meal.foodName}
                    </Text>
                  </View>
                  <View style={styles.mealListItemRight}>
                    <Text style={[styles.mealListItemGrams, !isUser && styles.mealListItemGramsDark]}>
                      {meal.servingGrams}g
                    </Text>
                    <Text style={[styles.mealListItemCals, !isUser && styles.mealListItemCalsDark]}>
                      {meal.calories} cal
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : mealInfo ? (
          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <MaterialCommunityIcons
                name="food-apple"
                size={16}
                color={theme.colors.success}
              />
              <Text style={[styles.mealName, !isUser && styles.mealNameDark]}>
                {mealInfo.foodName}
              </Text>
            </View>
            <Text style={[styles.mealServing, !isUser && styles.mealServingDark]}>
              {mealInfo.servingGrams}g
            </Text>
            <View style={styles.macroRow}>
              <MacroBadge
                label="Cal"
                value={mealInfo.calories}
                color={theme.colors.danger}
                dark={!isUser}
              />
              <MacroBadge
                label="P"
                value={mealInfo.protein}
                color={theme.colors.primary}
                dark={!isUser}
              />
              <MacroBadge
                label="C"
                value={mealInfo.carbs}
                color={theme.colors.warning}
                dark={!isUser}
              />
              <MacroBadge
                label="F"
                value={mealInfo.fat}
                color={theme.colors.info}
                dark={!isUser}
              />
            </View>
          </View>
        ) : (
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}
          >
            {text}
          </Text>
        )}
      </View>
    </View>
  );
}

function MacroBadge({
  label,
  value,
  color,
  dark = false,
}: {
  label: string;
  value: number;
  color: string;
  dark?: boolean;
}) {
  return (
    <View style={[styles.macroBadge, dark && styles.macroBadgeDark, { borderColor: color }]}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Text style={[styles.macroValue, dark && styles.macroValueDark]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Bubble row ─────────────────────────────────────────────────
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  bubbleRowAssistant: {
    justifyContent: "flex-start",
    gap: 10,
  },

  // ── Avatar ─────────────────────────────────────────────────────
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 2,
  },

  // ── Bubble ─────────────────────────────────────────────────────
  bubble: {
    maxWidth: "78%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
    ...theme.shadows.elevated,
  },
  bubbleAssistant: {
    backgroundColor: theme.colors.card,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.cardSoft,
  },

  // ── Bubble text ────────────────────────────────────────────────
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
  },
  bubbleTextUser: {
    color: "#FFFFFF",
  },
  bubbleTextAssistant: {
    color: theme.colors.ink,
  },

  // ── Action pill ────────────────────────────────────────────────
  actionPill: {
    alignSelf: "center",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionText: {
    fontSize: 11,
    color: theme.colors.muted,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",

  },

  // ── Meal card (inline in bubble) ───────────────────────────────
  mealCard: {
    gap: 6,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mealName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    flex: 1,
  },
  mealNameDark: {
    color: theme.colors.ink,
  },
  mealServing: {
    fontSize: 12,
    color: theme.colors.muted,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
  },
  mealServingDark: {
    color: theme.colors.muted,
  },
  macroRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  macroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceElevated,
  },
  macroBadgeDark: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  macroValue: {
    fontSize: 11,
    color: theme.colors.ink,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  macroValueDark: {
    color: theme.colors.ink,
  },

  // ── Approval card ──────────────────────────────────────────────
  approvalCard: {
    alignSelf: "center",

    backgroundColor: theme.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    ...theme.shadows.elevated,
  },
  approvalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  approvalTitle: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: theme.colors.ink,
    marginBottom: 6,
  },
  approvalText: {
    fontSize: 15,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    color: theme.colors.body,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 22,
  },
  approvalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  approvalReject: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  approvalRejectText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: theme.colors.muted,
  },
  approvalAccept: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
  },
  approvalAcceptText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ── Meal list ──────────────────────────────────────────────────
  mealListWrap: {
    gap: 0,
  },
  mealListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  mealListItemLast: {
    borderBottomWidth: 0,
  },
  mealListItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  mealListItemName: {
    fontSize: 14,
    color: theme.colors.ink,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    flex: 1,
  },
  mealListItemNameDark: {
    color: theme.colors.ink,
  },
  mealListItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 8,
  },
  mealListItemGrams: {
    fontSize: 12,
    color: theme.colors.muted,
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
  },
  mealListItemGramsDark: {
    color: theme.colors.muted,
  },
  mealListItemCals: {
    fontSize: 13,
    color: theme.colors.body,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    minWidth: 48,
    textAlign: "right",
  },
  mealListItemCalsDark: {
    color: theme.colors.body,
  },
});
