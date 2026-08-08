import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { useGoBack } from "../../src/hooks/useGoBack";
import { getActiveHabitIds } from "../../src/services/journal";
import { getJournalSeries, seriesAverage, ChartSeries } from "../../src/services/habitCharts";
import { TrendLineChart, BinaryStrip } from "../../src/components/TrendChart";

const TIME_OPTIONS = [
  { days: 7, label: "7d" },
  { days: 14, label: "14d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
];

const SERIES_COLORS = [
  "#5B7BE1",
  "#55A477",
  "#D69A43",
  "#C96D63",
  "#8A72C8",
  "#5D8793",
  "#C68D46",
  "#4B9678",
  "#6B83A5",
  "#C45C52",
];

function formatDateLabel(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SeriesCard({ series, index }: { series: ChartSeries; index: number }) {
  const color = SERIES_COLORS[index % SERIES_COLORS.length];
  const isBinary = series.kind === "binary";

  const stats = isBinary
    ? `${Math.round((series.filledCount / Math.max(1, series.totalDays)) * 100)}%`
    : seriesAverage(series.values) != null
      ? `${seriesAverage(series.values)?.toFixed(series.decimals ?? 0)}${series.unit ? ` ${series.unit}` : ""}`
      : "—";

  const firstDate = series.dates[0] ? formatDateLabel(series.dates[0]) : "";
  const lastDate = series.dates[series.dates.length - 1]
    ? formatDateLabel(series.dates[series.dates.length - 1])
    : "";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardEmoji}>{series.emoji}</Text>
          <View>
            <Text style={styles.cardTitle}>{series.label}</Text>
            <Text style={styles.cardRange}>
              {series.totalDays} days · {firstDate} – {lastDate}
            </Text>
          </View>
        </View>
        <View style={styles.cardStat}>
          <Text style={styles.cardStatValue}>{stats}</Text>
          <Text style={styles.cardStatLabel}>
            {isBinary ? "completed" : series.unit ? `avg ${series.unit}` : "average"}
          </Text>
        </View>
      </View>

      {isBinary ? (
        <BinaryStrip values={series.values} />
      ) : (
        <TrendLineChart
          values={series.values}
          color={color}
          unit={series.unit}
          decimals={series.decimals ?? 0}
          dates={series.dates}
        />
      )}

      {series.filledCount === 0 && (
        <Text style={styles.emptyHint}>
          Nothing logged in this period — entries will appear here as you track.
        </Text>
      )}
    </View>
  );
}

export default function JournalDataScreen() {
  const handleBack = useGoBack();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState(14);
  const [series, setSeries] = useState<ChartSeries[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const activeIds = await getActiveHabitIds();
      const result = await getJournalSeries(days, activeIds);
      setSeries(result);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const hasAnyData = series.some((item) => item.filledCount > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Journal data</Text>
          <Text style={styles.headerSub}>Track your trends over time</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        {TIME_OPTIONS.map((opt) => {
          const isActive = days === opt.days;
          return (
            <TouchableOpacity
              key={opt.days}
              style={[styles.timeChip, isActive && styles.timeChipActive]}
              onPress={() => setDays(opt.days)}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {!hasAnyData && (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="chart-line" size={28} color={theme.colors.muted} />
              <Text style={styles.emptyTitle}>No data yet</Text>
              <Text style={styles.emptyBody}>
                Log habits and meals in the Journal and check back here to see
                your trends take shape.
              </Text>
            </View>
          )}

          {series.map((item, index) => (
            <SeriesCard key={item.id} series={item} index={index} />
          ))}

          <Text style={styles.footnote}>
            Charts reflect what you log in the Journal — not a grade, just your
            own trends.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  headerSub: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
  },
  timeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeChipActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  timeChipText: {
    ...theme.typography.caption,
    color: theme.colors.body,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  timeChipTextActive: {
    color: theme.colors.card,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
    paddingTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  cardRange: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  cardStat: {
    alignItems: "flex-end",
  },
  cardStatValue: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  cardStatLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  emptyHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginTop: theme.spacing.sm,
  },
  emptyBody: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 17,
    marginTop: theme.spacing.xs,
  },
  footnote: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 16,
    marginTop: theme.spacing.md,
  },
});
