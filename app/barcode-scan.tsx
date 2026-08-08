import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { theme } from "../src/theme";
import { useGoBack } from "../src/hooks/useGoBack";
import { searchFoodByBarcode, getFoodDatabaseAttribution } from "../src/services/foodDatabase";

type ScanStatus = "idle" | "searching" | "not_found";

export default function BarcodeScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = useGoBack();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const busyRef = useRef(false);

  const handleBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (busyRef.current || !data) return;
      busyRef.current = true;
      setStatus("searching");
      try {
        const food = await searchFoodByBarcode(data);
        if (food) {
          // Reuse the existing serving-size + logging screen for the match.
          router.replace(
            `/food-detail?fdcId=${encodeURIComponent(food.fdcId)}&foodName=${encodeURIComponent(food.description)}`
          );
          return;
        }
        setStatus("not_found");
      } catch (e) {
        console.warn("[Barcode] Lookup failed:", e);
        setStatus("not_found");
      } finally {
        busyRef.current = false;
      }
    },
    [router]
  );

  const resetScanner = useCallback(() => {
    setStatus("idle");
  }, []);

  // Camera permission still loading.
  if (!permission) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  // Camera permission not granted.
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.permissionIcon}>
          <MaterialCommunityIcons name="barcode-scan" size={34} color={theme.colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Scan food product barcodes to log them instantly. We only use the
          camera while this screen is open.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={() => requestPermission()}
          activeOpacity={0.85}
        >
          <Text style={styles.permissionBtnText}>Allow camera access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionBack} onPress={handleBack}>
          <Text style={styles.permissionBackText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "itf14"],
        }}
        onBarcodeScanned={status === "idle" ? handleBarcode : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan a barcode</Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.midArea}>
          <View style={styles.frame}>
            <View style={[styles.frameCorner, styles.cornerTL]} />
            <View style={[styles.frameCorner, styles.cornerTR]} />
            <View style={[styles.frameCorner, styles.cornerBL]} />
            <View style={[styles.frameCorner, styles.cornerBR]} />
          </View>

          {status === "searching" && (
            <View style={styles.statusCard}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.statusText}>Looking up product…</Text>
            </View>
          )}

          {status === "not_found" && (
            <View style={styles.statusCard}>
              <MaterialCommunityIcons name="food-off" size={26} color={theme.colors.warning} />
              <Text style={styles.statusTitle}>Product not found</Text>
              <Text style={styles.statusText}>
                This barcode isn't in our offline database yet.
              </Text>
              <View style={styles.statusActions}>
                <TouchableOpacity style={styles.statusBtn} onPress={resetScanner} activeOpacity={0.8}>
                  <Text style={styles.statusBtnText}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, styles.statusBtnGhost]}
                  onPress={() => router.replace("/food-chat?mode=search")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.statusBtnGhostText}>Search manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.bottomHintText}>
            Point the camera at the product's barcode
          </Text>
          <Text style={styles.attribution}>{getFoodDatabaseAttribution()}</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xxl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    ...theme.typography.titleSm,
    color: "#FFFFFF",
  },
  midArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  frame: {
    width: 260,
    height: 150,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  frameCorner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: theme.colors.lime,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
  },
  statusCard: {
    width: 300,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    ...theme.shadows.elevated,
  },
  statusTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginTop: theme.spacing.xs,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  statusActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  statusBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
  },
  statusBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
  statusBtnGhost: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusBtnGhostText: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  bottomHint: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: Math.max(24, 16),
  },
  bottomHintText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  attribution: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
  },
  permissionIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  permissionTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: theme.spacing.xl,
  },
  permissionBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primary,
  },
  permissionBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
  permissionBack: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  permissionBackText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
  },
});
