import { useCallback } from "react";
import { type Tab, useAppStore } from "../stores/appStore";
import { useInputStore } from "../stores/inputStore";
import type { GamepadAction } from "../types/input";

const TABS: Tab[] = ["launch", "modding", "profiles"];

function getFocusableElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-focusable]")).filter(
    (el) => !el.closest('[data-tab-active="false"]'),
  );
}

function getRect(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
  };
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

function findNearest(current: HTMLElement, direction: Direction): HTMLElement | null {
  const elements = getFocusableElements().filter((el) => el !== current);
  if (elements.length === 0) return null;

  const from = getRect(current);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of elements) {
    const to = getRect(el);

    // Filter by direction
    const inDirection =
      (direction === "UP" && to.y < from.y) ||
      (direction === "DOWN" && to.y > from.y) ||
      (direction === "LEFT" && to.x < from.x) ||
      (direction === "RIGHT" && to.x > from.x);

    if (!inDirection) continue;

    // Score: prefer elements along the primary axis
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const isVertical = direction === "UP" || direction === "DOWN";
    const primary = isVertical ? Math.abs(dy) : Math.abs(dx);
    const secondary = isVertical ? Math.abs(dx) : Math.abs(dy);

    // Weight secondary axis more heavily to prefer aligned elements
    const score = primary + secondary * 3;

    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

export function useSpatialNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const navigationLock = useInputStore((s) => s.navigationLock);

  const handleAction = useCallback(
    (action: GamepadAction) => {
      if (action === "TAB_LEFT" || action === "TAB_RIGHT") {
        const idx = TABS.indexOf(activeTab);
        const next =
          action === "TAB_RIGHT"
            ? TABS[(idx + 1) % TABS.length]
            : TABS[(idx - 1 + TABS.length) % TABS.length];
        setActiveTab(next);
        // Focus the newly active tab button after render
        requestAnimationFrame(() => {
          const tabButton = document.querySelector<HTMLElement>(`[data-tab-id="${next}"]`);
          tabButton?.focus();
        });
        return;
      }

      // When navigation is locked, dispatch a custom event instead of navigating
      if (navigationLock) {
        const active = document.activeElement as HTMLElement;
        if (active) {
          active.dispatchEvent(
            new CustomEvent("gamepad-action", {
              detail: { action },
              bubbles: true,
            }),
          );
        }
        return;
      }

      if (action === "CONFIRM") {
        const active = document.activeElement as HTMLElement;
        active?.click();
        return;
      }

      if (action === "CANCEL") {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      // Directional navigation
      const active = document.activeElement as HTMLElement;
      if (!active || !active.hasAttribute("data-focusable")) {
        // No focus yet — focus first element
        const elements = getFocusableElements();
        elements[0]?.focus();
        return;
      }

      const next = findNearest(active, action as Direction);
      next?.focus();
    },
    [activeTab, setActiveTab, navigationLock],
  );

  return handleAction;
}
