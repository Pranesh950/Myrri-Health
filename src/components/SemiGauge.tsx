import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { theme } from "../theme";

interface SemiGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function SemiGauge({
  score,
  size = 160,
  strokeWidth = 12,
  color,
  label,
}: SemiGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const ringColor = color ?? getRingColor(clampedScore);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [clampedScore]);

  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - clampedScore / 100)],
  });

  return (
    <View style={[styles.container, { width: size, height: size * 0.55 }]}>
      <Svg width={size} height={size * 0.55} viewBox={`0 0 ${size} ${size * 0.55}`}>
        <Circle
          cx={size / 2}
          cy={size * 0.55}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size * 0.55}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={180}
          originX={size / 2}
          originY={size * 0.55}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.scoreText, { color: ringColor }]}>
          {Math.round(clampedScore)}
        </Text>
        <Text style={styles.percentLabel}>%</Text>
        {label && <Text style={styles.labelText}>{label}</Text>}
      </View>
    </View>
  );
}

function getRingColor(score: number): string {
  if (score >= 76) return theme.colors.success;
  if (score >= 51) return "#D4A24C";
  if (score >= 26) return "#E07A3A";
  return "#BF4B4B";
}

function AnimatedCircle(props: {
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  strokeLinecap: "round";
  strokeDasharray: number;
  strokeDashoffset: Animated.AnimatedInterpolation<number>;
  rotation: number;
  originX: number;
  originY: number;
}) {
  const { strokeDashoffset, ...rest } = props;
  return (
    <Circle
      {...rest}
      strokeDashoffset={strokeDashoffset as any}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
  },
  scoreText: {
    fontSize: 40,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    letterSpacing: -1,
  },
  percentLabel: {
    fontSize: 14,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    color: theme.colors.muted,
    marginTop: -4,
  },
  labelText: {
    fontSize: 14,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    color: theme.colors.ink,
    marginTop: theme.spacing.xs,
  },
});
