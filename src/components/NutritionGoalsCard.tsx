import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { MealEntry } from "../services/foodDatabase";
import { getNutritionProgress, NutritionTargets, NutritionProgressRow } from "../services/coachPlan";
import { theme } from "../theme";

interface NutritionGoalsCardProps {
  meals: MealEntry[];
  targets: NutritionTargets | null;
  onEdit?: () => void;
}

const ROW_COLORS: Record<NutritionProgressRow["key"], string> = {
  calories: "#202126",
  proteinG: "#5D8793",
  carbsG: "#D69A43",
  fatG: "#C96D63",
};

function GoalRow({ row }: { row: NutritionProgressRow }) {
  const color = ROW_COLORS[row.key];
  const achieved = row.achieved && row.current > 0;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowLabelWrap}>
          <View style={[styles.rowDot, { backgroundColor: color }]} />
          <Text style={styles.rowLabel}>{row.label}</Text>
          {achieved && (
            <View style={styles.achievedBadge}>
              <MaterialCommunityIcons name="check" size={11} color={theme.colors.success} />
              <Text style={styles.achievedText}>hit</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowValue}>
          <Text style={styles.rowCurrent}>{row.key === "calories" ? row.current.toLocaleString() : row.current}</Text>
          <Text style={styles.rowTarget}> / {row.target.toLocaleString()} {row.unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(row.current > 0 ? 3 : 0, row.percent)}%`,
              backgroundColor: achieved ? theme.colors.success : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function NutritionGoalsCard({ meals, targets, onEdit }: NutritionGoalsCardProps) {
  const rows = useMemo(() => getNutritionProgress(meals, targets), [meals, targets]);

  if (!targets || rows.length === 0) return null;

  const hitCount = rows.filter((row) => row.achieved && row.current > 0).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="target" size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Daily nutrition goals</Text>
          <Text style={styles.subtitle}>From your coach plan</Text>
        </View>
        {onEdit && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={onEdit}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit nutrition goals"
          >
            <MaterialCommunityIcons name="pencil-outline" size={15} color={theme.colors.ink} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
        <View style={styles.hitBadge}>
          <Text style={styles.hitBadgeText}>
            {hitCount}/{rows.length} hit
          </Text>
        </View>
      </View>

      <View style={styles.rows}>
        {rows.map((row) => (
          <GoalRow key={row.key} row={row} />
        ))}
      </View>

      <Text style={styles.footnote}>
        Logged against what you ate today. "Hit" for calories means within ±10% —
        the others count when you reach 90% of target. Ask Coach to adjust the
        targets anytime.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadows.module,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: `${theme.colors.primary}09`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  subtitle: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  hitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.success}12`,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editBtnText: {
    ...theme.typography.legal,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  hitBadgeText: {
    ...theme.typography.legal,
    color: theme.colors.success,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  rows: {
    gap: theme.spacing.md,
  },
  row: {},
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rowLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rowLabel: {
    ...theme.typography.caption,
    color: theme.colors.body,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  achievedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.success}14`,
  },
  achievedText: {
    ...theme.typography.legal,
    color: theme.colors.success,
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  rowValue: {
    ...theme.typography.legal,
    color: theme.colors.body,
  },
  rowCurrent: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: theme.colors.ink,
    fontSize: 13,
  },
  rowTarget: {
    color: theme.colors.muted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  footnote: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    lineHeight: 15,
    marginTop: theme.spacing.md,
  },
});
