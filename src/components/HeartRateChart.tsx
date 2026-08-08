import { View, StyleSheet } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import { theme } from "../theme";

interface HeartRateChartProps {
  data: number[];
  width?: number;
  height?: number;
}

export function HeartRateChart({ data, width = 320, height = 160 }: HeartRateChartProps) {
  if (data.length === 0) {
    data = [60, 62, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 149];
  }

  const minValue = Math.min(...data) - 10;
  const maxValue = Math.max(...data) + 10;
  const range = maxValue - minValue;

  const padding = { top: 10, right: 10, bottom: 10, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xForIndex = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const yForValue = (v: number) => padding.top + chartHeight - ((v - minValue) / range) * chartHeight;

  const pathD = data
    .map((value, i) => {
      const x = xForIndex(i);
      const y = yForValue(value);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const zoneLines = [100, 130];

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {zoneLines.map((lineValue, i) => {
          const y = yForValue(lineValue);
          return (
            <Line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={theme.colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}
        <Path
          d={pathD}
          stroke={theme.colors.success}
          strokeWidth={2}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    overflow: "hidden",
  },
});
