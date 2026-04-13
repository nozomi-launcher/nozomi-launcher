import { setFocus, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useCallback, useEffect, useRef } from "react";
import ButtonGlyph from "./ButtonGlyph";
import { FocusButton } from "./FocusElements";

interface QuitConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function QuitConfirmDialog({ onConfirm, onCancel }: QuitConfirmDialogProps) {
  const previousFocusKey = useRef<string | null>(null);

  const { ref, focused } = useFocusable({
    focusKey: "quit-confirm",
    onEnterPress: onConfirm,
    isFocusBoundary: true,
  });

  // Capture previous focus and steal it
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      const focusable = active.closest("[data-focusable]");
      const key = focusable?.getAttribute("data-focus-key") ?? null;
      if (key && key !== "quit-confirm") {
        previousFocusKey.current = key;
      }
    }
    setFocus("quit-confirm");
  }, []);

  const dismiss = useCallback(() => {
    onCancel();
    requestAnimationFrame(() => {
      if (previousFocusKey.current) {
        setFocus(previousFocusKey.current);
      }
    });
  }, [onCancel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [dismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        ref={ref}
        tabIndex={0}
        role="alertdialog"
        aria-label="Quit confirmation"
        className={`bg-steam-darkest border rounded-lg shadow-lg shadow-black/40 p-6 max-w-md w-full mx-4 transition-colors
          ${focused ? "border-steam-accent ring-2 ring-steam-accent" : "border-steam-border"}`}
      >
        <h2 className="text-lg font-bold text-steam-text mb-2">Quit Nozomi Launcher?</h2>
        <p className="text-sm text-steam-text-dim mb-6">
          This will abort any running game and close the launcher.
        </p>
        <div className="flex justify-end gap-3">
          <FocusButton
            onClick={dismiss}
            className="px-4 py-2 bg-steam-mid/30 border border-steam-border text-steam-text-dim rounded text-sm font-medium uppercase tracking-wider
              hover:bg-steam-mid/50 hover:border-steam-accent/50 transition-all
              focus:outline-none focus:ring-2 focus:ring-steam-accent"
          >
            Cancel
          </FocusButton>
          <FocusButton
            onClick={onConfirm}
            className="px-4 py-2 bg-steam-red/20 border border-steam-red/40 text-steam-red-bright rounded text-sm font-medium uppercase tracking-wider
              hover:bg-steam-red/30 hover:border-steam-red-bright transition-all
              focus:outline-none focus:ring-2 focus:ring-steam-red"
          >
            Quit
          </FocusButton>
        </div>
        <div className="flex items-center justify-end gap-4 mt-4 pt-3 border-t border-steam-border/30">
          <span className="flex items-center gap-1.5 text-xs text-steam-text-dim">
            <ButtonGlyph action="CONFIRM" /> Quit
          </span>
          <span className="flex items-center gap-1.5 text-xs text-steam-text-dim">
            <ButtonGlyph action="CANCEL" /> Cancel
          </span>
        </div>
      </div>
    </div>
  );
}
