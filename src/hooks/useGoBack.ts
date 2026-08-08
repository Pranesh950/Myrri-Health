// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback } from "react";
import { useRouter, useNavigation } from "expo-router";

/**
 * Reliable back-navigation for custom header back buttons.
 *
 * expo-router's imperative `router.back()` dispatches a targetless GO_BACK
 * action at its internal one-route root navigator, which silently drops it —
 * so buttons that call `router.back()` do nothing. The screen-level
 * navigation object from `useNavigation()` dispatches against the app's own
 * stack, which can actually pop the current screen. Falls back to the home
 * tab when there is no previous screen (e.g. a dev reload restored this
 * route as the stack's only entry).
 *
 * Some stacks accept the GO_BACK action in JS but never transition away from
 * the current screen (native-stack + expo-router state-restore edge cases).
 * To keep the button honest, the pop is verified after a tick; if the current
 * route has not actually changed, navigation is forced to the home tab.
 */
export function useGoBack() {
  const router = useRouter();
  const navigation = useNavigation();

  return useCallback(() => {
    const state = navigation.getState?.();
    const currentKey = state?.routes?.[state.index]?.key;

    const pop = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      // Screens on a single-entry nested stack (e.g. onboarding screens pushed
      // from a chat or the Biology tab) report canGoBack() === false even though
      // the root stack below them has history. Popping the parent stack is the
      // correct action in that case.
      const parent = navigation.getParent?.();
      if (parent && parent !== navigation && parent.canGoBack()) {
        parent.goBack();
        return true;
      }
      return false;
    };

    if (pop()) {
      // Confirm the pop actually left the current screen. If the stack kept
      // the route (silent drop), force a real exit so the button never no-ops.
      if (currentKey) {
        setTimeout(() => {
          const after = navigation.getState?.();
          const topKey = after?.routes?.[after.index]?.key;
          if (topKey === currentKey) {
            router.replace("/");
          }
        }, 350);
      }
      return;
    }

    // No history anywhere (deep link or dev reload landed directly here).
    router.replace("/");
  }, [navigation, router]);
}
