import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  average?: number;
  averageLabel?: string;
  height?: number;
}

export function BarChart({ data, average, averageLabel, height = 160 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={[styles.container, { height }]}>
      {average !== undefined && (
        <View
          style={[
            styles.averageLine,
            { bottom: `${(average / maxValue) * 100}%` },
          ]}
        >
          <Text style={styles.averageLabel}>{averageLabel ?? `Avg ${Math.round(average)}%`}</Text>
        </View>
      )}
      <View style={styles.barsRow}>
        {data.map((item, index) => (
          <View key={index} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                {
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color ?? theme.colors.success,
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "flex-end",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
    gap: 6,
  },
  barCol: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  averageLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.muted,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: theme.colors.muted,
    zIndex: 1,
  },
  averageLabel: {
    position: "absolute",
    right: 0,
    top: -14,
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
});
