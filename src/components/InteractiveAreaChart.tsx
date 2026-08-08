// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useId, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder, type LayoutChangeEvent } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle as SvgCircle,
} from "react-native-svg";
import { theme } from "../theme";

interface InteractiveAreaChartProps {
  /** Numeric series to plot (length >= 2). */
  values: number[];
  color?: string;
  height?: number;
  decimals?: number;
  unit?: string;
  /** Optional per-index label shown in the scrub tooltip (e.g. a date). */
  labels?: string[];
  /** When true a plain tap also opens the tooltip; otherwise the chart only
   *  responds to horizontal drags so vertical scrolling stays smooth. */
  tapToShow?: boolean;
  accessibilityLabel?: string;
}

interface GeomPoint {
  x: number;
  y: number;
  value: number;
  index: number;
}

interface Geom {
  points: GeomPoint[];
  linePath: string;
  areaPath: string;
  step: number;
}

const TOOLTIP_WIDTH = 96;

/** Smooths a polyline with quadratic curves through segment midpoints. */
function smoothLine(points: GeomPoint[]): string {
  if (points.length < 3) {
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
  }
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = ((points[i].x + points[i + 1].x) / 2).toFixed(1);
    const midY = ((points[i].y + points[i + 1].y) / 2).toFixed(1);
    d += ` Q${points[i].x.toFixed(1)},${points[i].y.toFixed(1)} ${midX},${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

export function InteractiveAreaChart({
  values,
  color = "#5B7BE1",
  height = 140,
  decimals = 0,
  unit = "",
  labels,
  tapToShow = false,
  accessibilityLabel = "Interactive chart — drag along the line to explore",
}: InteractiveAreaChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lastIndex = useRef<number | null>(null);
  const wrapRef = useRef<View>(null);
  // Horizontal origin of the chart in window coordinates, used to derive the
  // scrub x from pageX. locationX during responder moves can be offset by the
  // scroll position on Android, which makes tooltips jump — pageX does not.
  const originPageX = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawId = useId();
  const gradientId = `grad${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const geom: Geom | null = useMemo(() => {
    if (width <= 0 || values.length < 2) return null;
    const clean = values.map((v) => (Number.isFinite(v) ? v : 0));
    const maxValue = Math.max(...clean, 1) * 1.15;
    const plotTop = 10;
    const plotBottom = height - 12;
    const step = width / (clean.length - 1);
    const points: GeomPoint[] = clean.map((value, i) => ({
      x: i * step,
      y: plotBottom - (value / maxValue) * (plotBottom - plotTop),
      value,
      index: i,
    }));
    const linePath = smoothLine(points);
    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${linePath} L${last.x.toFixed(1)},${height} L${first.x.toFixed(1)},${height} Z`;
    return { points, linePath, areaPath, step };
  }, [width, values, height]);

  const scrubToX = (x: number) => {
    if (!geom) return;
    const index = Math.max(
      0,
      Math.min(geom.points.length - 1, Math.round(x / geom.step))
    );
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      setActiveIndex(index);
    }
  };

  // Resolve the finger x relative to the chart. pageX minus the measured
  // container origin is stable while the parent scrolls; locationX is only a
  // fallback until the first layout measurement lands.
  const touchX = (evt: any): number => {
    const pageX = evt?.nativeEvent?.pageX;
    if (typeof pageX === "number" && originPageX.current > 0) {
      return pageX - originPageX.current;
    }
    return evt?.nativeEvent?.locationX ?? 0;
  };

  // Keep the tooltip visible briefly after the finger lifts (mirrors the old
  // pointerVanishDelay) instead of snapping away — an abrupt dismiss reads as
  // glitchy. The delay is cancelled as soon as the user touches again.
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      lastIndex.current = null;
      setActiveIndex(null);
    }, 900);
  };

  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only claim the gesture once it is clearly a horizontal drag, so
        // vertical scrolling over the chart stays smooth. tapToShow makes a
        // plain touch open the tooltip too (used for single standalone charts).
        onStartShouldSetPanResponder: () => tapToShow,
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: (evt) => {
          cancelHide();
          scrubToX(touchX(evt));
        },
        onPanResponderMove: (evt) => scrubToX(touchX(evt)),
        onPanResponderRelease: () => scheduleHide(),
        onPanResponderTerminate: () => scheduleHide(),
      }),
    [geom, tapToShow]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
    wrapRef.current?.measureInWindow((x) => {
      originPageX.current = x;
    });
  };

  // Keep the chart's height reserved before the first layout so cards never
  // collapse or flash placeholder text on mount.
  if (width === 0) {
    return <View style={{ height }} />;
  }

  if (!geom) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Not enough data to chart</Text>
      </View>
    );
  }

  const activePoint = activeIndex != null ? geom.points[activeIndex] : null;
  const tooltipLeft = activePoint
    ? Math.max(4, Math.min(activePoint.x - TOOLTIP_WIDTH / 2, width - TOOLTIP_WIDTH - 4))
    : 0;
  const tooltipTop = activePoint ? Math.max(2, activePoint.y - 54) : 0;

  return (
    <View
      ref={wrapRef}
      style={styles.wrap}
      onLayout={onLayout}
      accessibilityLabel={accessibilityLabel}
      {...panResponder.panHandlers}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.03} />
            </LinearGradient>
          </Defs>
          <Path d={geom.areaPath} fill={`url(#${gradientId})`} />
          <Path
            d={geom.linePath}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}

      {activePoint && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.guide, { left: activePoint.x - 0.5 }]} />
          <View style={[styles.dotOuter, { left: activePoint.x - 7, top: activePoint.y - 7 }]} />
          <View style={[styles.dot, { left: activePoint.x - 3.5, top: activePoint.y - 3.5 }]} />
          <View style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop }]}>
            {labels?.[activePoint.index] ? (
              <Text style={styles.tooltipDate}>{labels[activePoint.index]}</Text>
            ) : null}
            <Text style={styles.tooltipValue}>
              {activePoint.value.toFixed(decimals)}
              {unit ? ` ${unit}` : ""}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
  },
  emptyText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  guide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: theme.colors.ink,
    opacity: 0.22,
  },
  dotOuter: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.ink,
    opacity: 0.18,
  },
  dot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.ink,
    borderWidth: 1.5,
    borderColor: theme.colors.card,
  },
  tooltip: {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: "center",
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },
  tooltipDate: {
    color: "#C9CBD1",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    marginBottom: 1,
  },
  tooltipValue: {
    color: theme.colors.card,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    fontWeight: "700",
  },
});
