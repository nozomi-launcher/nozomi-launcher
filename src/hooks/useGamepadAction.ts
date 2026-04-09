import { useEffect, type RefObject } from "react";
import type { GamepadAction } from "../types/input";

export function useGamepadAction(
  ref: RefObject<HTMLElement | null>,
  handler: (action: GamepadAction) => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const listener = (e: Event) => {
      const action = (e as CustomEvent).detail?.action as
        | GamepadAction
        | undefined;
      if (action) handler(action);
    };

    el.addEventListener("gamepad-action", listener);
    return () => el.removeEventListener("gamepad-action", listener);
  }, [ref, handler, enabled]);
}
