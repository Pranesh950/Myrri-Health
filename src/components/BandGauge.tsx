import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "../theme";

interface BandGaugeProps {
  score: number;
  color: string;
  label: string;
  size?: number;
  dark?: boolean;
}

const NUM_SEGMENTS = 10;

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function BandGauge({ score, color, label, size = 160, dark = false }: BandGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const filledSegments = Math.round((clampedScore / 100) * NUM_SEGMENTS);

  const cx = size / 2;
  const cy = size * 0.4;
  const radius = size * 0.38;
  const strokeWidth = 6;

  // Top-opening arch spanning 170 degrees (centered at 0°/360° = top)
  const totalArcDegrees = 170;
  const startAngle = 360 - totalArcDegrees / 2; // 275 (left-upper)
  const segmentSpan = totalArcDegrees / NUM_SEGMENTS; // 17
  const gap = 2; // gap between segments in degrees

  const scoreSize = size >= 140 ? 34 : size >= 120 ? 28 : 24;

  return (
    <View style={[styles.container, { width: size }]}>
      {/* Single segmented arch */}
      <Svg width={size} height={size * 0.5}>
        {Array.from({ length: NUM_SEGMENTS }).map((_, i) => {
          const segStart = startAngle + i * segmentSpan;
          const segEnd = segStart + segmentSpan - gap;
          const isFilled = i < filledSegments;

          // Only draw if the segment angle range is valid
          if (segEnd <= segStart) return null;

          const pathD = describeArc(cx, cy, radius, segStart, segEnd);

          return (
            <Path
              key={i}
              d={pathD}
              stroke={isFilled ? color : dark ? theme.colors.deepMuted : theme.colors.border}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
              opacity={isFilled ? 1 : 0.5}
            />
          );
        })}
      </Svg>

      {/* Score overlapping the bottom of the arch */}
      <Text style={[styles.scoreText, { color, fontSize: scoreSize }]}>{clampedScore}</Text>

      {/* Label below the score */}
      {label ? <Text style={[styles.labelText, dark && styles.labelTextDark]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  scoreText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    letterSpacing: -1.4,
    marginTop: -28,
  },
  labelText: {
    ...theme.typography.caption,
    color: theme.colors.body,
    marginTop: -2,
    letterSpacing: 0.3,
  },
  labelTextDark: {
    color: theme.colors.deepMuted,
  },
});
