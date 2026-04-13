import { setFocus, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useCallback, useEffect, useRef } from "react";
import ButtonGlyph from "./ButtonGlyph";

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  const previousFocusKey = useRef<string | null>(null);

  const { ref, focused } = useFocusable({
    focusKey: "error-toast",
    onEnterPress: onDismiss,
    isFocusBoundary: true,
  });

  // Capture the previously focused element's focus key before we steal focus
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      // Walk up from the active element to find the nearest focusable ancestor
      // that has a data-focusable attribute (set by norigin-spatial-navigation)
      const focusable = active.closest("[data-focusable]");
      const key = focusable?.getAttribute("data-focus-key") ?? null;
      if (key && key !== "error-toast") {
        previousFocusKey.current = key;
      }
    }
    setFocus("error-toast");
  }, []);

  const handleDismiss = useCallback(() => {
    onDismiss();
    // Restore focus after the toast is removed from DOM
    requestAnimationFrame(() => {
      if (previousFocusKey.current) {
        setFocus(previousFocusKey.current);
      }
    });
  }, [onDismiss]);

  // Also handle Escape key to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDismiss]);

  return (
    <div className="fixed top-20 right-6 z-50 max-w-sm animate-slide-in">
      <div
        ref={ref}
        tabIndex={0}
        role="alertdialog"
        aria-label="Error"
        className={`bg-steam-darkest border rounded-lg shadow-lg shadow-black/40 p-4 cursor-pointer transition-colors
          ${focused ? "border-steam-accent ring-2 ring-steam-accent" : "border-steam-red/40"}`}
        onClick={handleDismiss}
      >
        <div className="flex items-start gap-3">
          <span className="text-steam-red-bright text-lg leading-none shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-steam-red-bright mb-0.5">Error</p>
            <p className="text-xs text-steam-text-dim break-words">{message}</p>
          </div>
          <div className="shrink-0">
            <ButtonGlyph action="CONFIRM" />
          </div>
        </div>
      </div>
    </div>
  );
}
