import { navigateByDirection, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useCallback } from "react";
import { type Tab, useAppStore } from "../stores/appStore";
import { useCompatToolsStore } from "../stores/compatToolsStore";
import type { GamepadAction } from "../types/input";

const TABS: Tab[] = ["launch", "modding", "compat", "profiles", "settings"];

export function useSpatialNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const fetchReleases = useCompatToolsStore((s) => s.fetchReleases);
  const fetchInstalled = useCompatToolsStore((s) => s.fetchInstalled);

  const handleAction = useCallback(
    (action: GamepadAction) => {
      // Tab switching and refresh are never intercepted by components
      if (action === "TAB_LEFT" || action === "TAB_RIGHT") {
        const idx = TABS.indexOf(activeTab);
        const next =
          action === "TAB_RIGHT"
            ? TABS[(idx + 1) % TABS.length]
            : TABS[(idx - 1 + TABS.length) % TABS.length];
        setActiveTab(next);
        requestAnimationFrame(() => {
          setFocus(`view-${next}`);
        });
        return;
      }

      if (action === "REFRESH") {
        if (activeTab === "compat") {
          fetchReleases(true);
          fetchInstalled();
        }
        return;
      }

      // For directional, confirm, and cancel actions: dispatch a custom event
      // so components that have paused the library (e.g. open dropdowns) can
      // intercept gamepad input. If the event is consumed, skip default behavior.
      const active = document.activeElement as HTMLElement;
      if (active) {
        const event = new CustomEvent("gamepad-action", {
          detail: { action },
          bubbles: true,
          cancelable: true,
        });
        const handled = !active.dispatchEvent(event);
        if (handled) return;
      }

      if (action === "CONFIRM") {
        active?.click();
        return;
      }

      if (action === "CANCEL") {
        active?.blur();
        return;
      }

      // Directional navigation — delegate to norigin-spatial-navigation
      const directionMap: Record<string, string> = {
        UP: "up",
        DOWN: "down",
        LEFT: "left",
        RIGHT: "right",
      };
      const direction = directionMap[action];
      if (direction) {
        navigateByDirection(direction, {});
      }
    },
    [activeTab, setActiveTab, fetchReleases, fetchInstalled],
  );

  return handleAction;
}
