import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { theme } from "../theme";

interface AnimatedScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  unit?: string;
}

export function AnimatedScoreRing({
  score,
  size = 160,
  strokeWidth = 6,
  color,
  unit = "%",
}: AnimatedScoreRingProps) {
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

  const innerSize = size - strokeWidth * 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - clampedScore / 100)],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        <Text style={[styles.scoreText, { color: ringColor }]}>
          {Math.round(clampedScore)}
        </Text>
        <Text style={styles.percentLabel}>{unit}</Text>
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
  inner: {
    position: "absolute",
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 48,
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
});
