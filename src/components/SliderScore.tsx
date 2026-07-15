import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

interface SliderScoreProps {
  score: number;
  label: string;
  color?: string;
  invert?: boolean;
}

function getScoreColor(score: number, invert = false) {
  const value = invert ? 100 - score : score;
  if (value >= 80) return theme.colors.success;
  if (value >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

function getStatusLabel(score: number, invert = false) {
  const value = invert ? 100 - score : score;
  if (value >= 80) return "Good";
  if (value >= 50) return "Ok";
  return "Bad";
}

export function SliderScore({
  score,
  label,
  color,
  invert = false,
}: SliderScoreProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const statusColor = color ?? getScoreColor(clampedScore, invert);
  const statusLabel = getStatusLabel(clampedScore, invert);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <Text style={[styles.score, { color: statusColor }]}>
        {Math.round(clampedScore)}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: statusColor,
              width: `${clampedScore}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.body,
    textTransform: "uppercase",
  },
  badge: {
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    ...theme.typography.caption,
  },
  score: {
    ...theme.typography.displayMd,
    marginBottom: theme.spacing.sm,
  },
  track: {
    width: "100%",
    height: 6,
    backgroundColor: theme.colors["surface-soft"],
    borderRadius: theme.radii.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.radii.full,
  },
});
