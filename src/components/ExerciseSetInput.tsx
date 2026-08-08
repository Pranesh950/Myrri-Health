import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../theme";

interface ExerciseSetInputProps {
  exerciseName: string;
  onSave: (reps: number, weight: number) => void;
  onCancel: () => void;
}

export function ExerciseSetInput({
  exerciseName,
  onSave,
  onCancel,
}: ExerciseSetInputProps) {
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(50);

  const adjust = (
    setter: (v: number) => void,
    value: number,
    delta: number,
    min: number,
    step: number
  ) => {
    const next = value + delta * step;
    if (next >= min) setter(Math.round(next * 10) / 10);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.exerciseName}>{exerciseName}</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reps</Text>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjust(setReps, reps, -1, 1, 1)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="minus"
                size={24}
                color={theme.colors.ink}
              />
            </TouchableOpacity>
            <Text style={styles.inputValue}>{reps}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjust(setReps, reps, 1, 1, 1)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={theme.colors.ink}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjust(setWeight, weight, -2.5, 0, 2.5)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="minus"
                size={24}
                color={theme.colors.ink}
              />
            </TouchableOpacity>
            <Text style={styles.inputValue}>{weight}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjust(setWeight, weight, 2.5, 0, 2.5)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={theme.colors.ink}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onSave(reps, weight)}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>Log Set</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.lg,
  },
  exerciseName: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  inputGroup: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textTransform: "uppercase",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputValue: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    minWidth: 60,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: {
    ...theme.typography.button,
    color: theme.colors.body,
  },
  saveButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  saveText: {
    ...theme.typography.button,
    color: theme.colors["on-primary"],
  },
});
