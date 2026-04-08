import { useEffect, useRef, useCallback } from "react";
import { BUTTON_MAP, getStickAction } from "../lib/gamepad";
import { useInputStore } from "../stores/inputStore";
import type { GamepadAction } from "../types/input";

const REPEAT_DELAY = 300;
const REPEAT_RATE = 120;

export function useGamepad(onAction: (action: GamepadAction) => void) {
  const setInputMode = useInputStore((s) => s.setInputMode);
  const prevButtons = useRef<Record<number, boolean>>({});
  const prevStickAction = useRef<GamepadAction | null>(null);
  const repeatTimers = useRef<Record<string, number>>({});
  const rafId = useRef<number>(0);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const fireAction = useCallback(
    (action: GamepadAction) => {
      setInputMode("gamepad");
      onActionRef.current(action);
    },
    [setInputMode],
  );

  const startRepeat = useCallback(
    (key: string, action: GamepadAction) => {
      if (repeatTimers.current[key]) return;
      repeatTimers.current[key] = window.setTimeout(() => {
        repeatTimers.current[key] = window.setInterval(() => {
          fireAction(action);
        }, REPEAT_RATE);
      }, REPEAT_DELAY);
    },
    [fireAction],
  );

  const stopRepeat = useCallback((key: string) => {
    if (repeatTimers.current[key]) {
      clearTimeout(repeatTimers.current[key]);
      clearInterval(repeatTimers.current[key]);
      delete repeatTimers.current[key];
    }
  }, []);

  useEffect(() => {
    const poll = () => {
      const gamepads = navigator.getGamepads();

      for (const gp of gamepads) {
        if (!gp) continue;

        // Check buttons
        for (const [btnIdx, action] of Object.entries(BUTTON_MAP)) {
          const idx = Number(btnIdx);
          const pressed = gp.buttons[idx]?.pressed ?? false;
          const wasPressed = prevButtons.current[idx] ?? false;

          if (pressed && !wasPressed) {
            fireAction(action);
            if (["UP", "DOWN", "LEFT", "RIGHT"].includes(action)) {
              startRepeat(`btn-${idx}`, action);
            }
          } else if (!pressed && wasPressed) {
            stopRepeat(`btn-${idx}`);
          }

          prevButtons.current[idx] = pressed;
        }

        // Check left stick
        const stickAction = getStickAction(gp);
        if (stickAction && stickAction !== prevStickAction.current) {
          fireAction(stickAction);
          stopRepeat("stick");
          startRepeat("stick", stickAction);
        } else if (!stickAction && prevStickAction.current) {
          stopRepeat("stick");
        }
        prevStickAction.current = stickAction;

        break; // Only use first connected gamepad
      }

      rafId.current = requestAnimationFrame(poll);
    };

    rafId.current = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId.current);
      for (const key of Object.keys(repeatTimers.current)) {
        stopRepeat(key);
      }
    };
  }, [fireAction, startRepeat, stopRepeat]);

  // Detect mouse movement to switch back to keyboard mode
  useEffect(() => {
    const handleMouseMove = () => setInputMode("keyboard");
    const handleKeyDown = () => setInputMode("keyboard");

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setInputMode]);
}
