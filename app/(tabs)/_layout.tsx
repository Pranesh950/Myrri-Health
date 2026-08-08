import { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  Text,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../src/theme";

const TABS: {
  name: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconFocused: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { name: "index", label: "Home", icon: "home-outline", iconFocused: "home" },
  {
    name: "journal",
    label: "Journal",
    icon: "notebook-outline",
    iconFocused: "notebook",
  },
  {
    name: "activity",
    label: "Fitness",
    icon: "run",
    iconFocused: "run-fast",
  },
  {
    name: "biology",
    label: "Biology",
    icon: "heart-outline",
    iconFocused: "heart",
  },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [barWidth, setBarWidth] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const indicatorOffset = useRef(new Animated.Value(4)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const tabCount = state.routes.length;
  const tabWidth = barWidth > 0 ? barWidth / tabCount : 0;

  useEffect(() => {
    if (barWidth > 0) {
      Animated.spring(indicatorAnim, {
        toValue: state.index * tabWidth,
        damping: 22,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, barWidth, tabWidth]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const toggleMenu = () => {
    const toValue = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnim, {
      toValue,
      damping: 20,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    setMenuOpen(false);
    Animated.spring(menuAnim, {
      toValue: 0,
      damping: 20,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  };

  const navigateAndClose = (route: string) => {
    closeMenu();
    router.push(route);
  };

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const menuOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 10) + theme.spacing.sm },
      ]}
    >
      {menuOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeMenu}
          accessibilityLabel="Close quick actions"
        />
      )}

      {/* Popup menu */}
      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        accessible={menuOpen}
        accessibilityRole="menu"
        accessibilityLabel="Quick actions"
        style={[
            styles.menuPopup,
            {
              bottom:
                Math.max(insets.bottom, 10) +
                theme.spacing.sm +
                68 +
                theme.spacing.sm,
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslateY }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateAndClose("/food-chat?mode=search")}
            activeOpacity={0.8}
            accessibilityRole="menuitem"
            accessibilityLabel="Search foods"
          >
            <View style={[styles.menuIcon, { backgroundColor: theme.colors.surfaceElevated }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuItemTitle}>Search Foods</Text>
              <Text style={styles.menuItemSub}>Browse & add manually</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateAndClose("/barcode-scan")}
            activeOpacity={0.8}
            accessibilityRole="menuitem"
            accessibilityLabel="Scan barcode"
          >
            <View style={[styles.menuIcon, { backgroundColor: `${theme.colors.success}14` }]}>
              <MaterialCommunityIcons name="barcode-scan" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuItemTitle}>Scan Barcode</Text>
              <Text style={styles.menuItemSub}>Log a product instantly</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateAndClose("/food-chat")}
            activeOpacity={0.8}
            accessibilityRole="menuitem"
            accessibilityLabel="AI food log"
          >
            <View style={[styles.menuIcon, { backgroundColor: `${theme.colors.primary}14` }]}>
              <MaterialCommunityIcons name="robot-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuItemTitle}>AI Food Log</Text>
              <Text style={styles.menuItemSub}>Chat with assistant</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateAndClose("/health-chat")}
            activeOpacity={0.8}
            accessibilityRole="menuitem"
            accessibilityLabel="Ask AI about health"
          >
            <View style={[styles.menuIcon, { backgroundColor: `${theme.colors.info}16` }]}>
              <MaterialCommunityIcons name="brain" size={20} color={theme.colors.info} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuItemTitle}>Ask AI</Text>
              <Text style={styles.menuItemSub}>Health insights & advice</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateAndClose("/settings")}
            activeOpacity={0.8}
            accessibilityRole="menuitem"
            accessibilityLabel="Settings"
          >
            <View style={[styles.menuIcon, { backgroundColor: theme.colors.surfaceElevated }]}>
              <MaterialCommunityIcons name="cog-outline" size={20} color={theme.colors.ink} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuItemTitle}>Settings</Text>
              <Text style={styles.menuItemSub}>AI, brief, health access</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.plusButton, menuOpen && styles.plusButtonActive]}
          onPress={toggleMenu}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ expanded: menuOpen }}
          accessibilityLabel={menuOpen ? "Close quick actions" : "Open quick actions"}
        >
          <MaterialCommunityIcons
            name={menuOpen ? "close" : "plus"}
            size={24}
            color={theme.colors.ink}
          />
        </TouchableOpacity>

        <View style={styles.tabBar} onLayout={onBarLayout}>
          {barWidth > 0 && (
            <Animated.View
              style={[
                styles.indicator,
                {
                  width: tabWidth - 8,
                  transform: [
                    {
                      translateX: Animated.add(indicatorAnim, indicatorOffset),
                    },
                  ],
                },
              ]}
            />
          )}

          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const meta = TABS.find((t) => t.name === route.name) ?? TABS[0];

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={meta.label}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={isFocused ? meta.iconFocused : meta.icon}
                  size={22}
                  color={isFocused ? theme.colors.ink : theme.colors.muted}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="journal" options={{ title: "Journal" }} />
      <Tabs.Screen name="activity" options={{ title: "Fitness" }} />
      <Tabs.Screen name="biology" options={{ title: "Biology" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  plusButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.elevated,
  },
  plusButtonActive: {
    backgroundColor: theme.colors.card,
  },
  menuPopup: {
    position: "absolute",
    left: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 4,
    width: 236,
    ...theme.shadows.elevated,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: theme.colors.ink,
  },
  menuItemSub: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: theme.colors.muted,
    marginTop: 2,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  tabBar: {
    flex: 1,
    flexDirection: "row",
    height: 68,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.card,
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    zIndex: 10,
    paddingVertical: 9,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  tabLabelActive: {
    color: theme.colors.ink,
  },
  tabLabelInactive: {
    color: theme.colors.muted,
  },
});
