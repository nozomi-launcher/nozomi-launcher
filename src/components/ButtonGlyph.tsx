import { useInputStore } from "../stores/inputStore";
import { getGlyph } from "../lib/glyphs";
import type { GamepadAction } from "../types/input";

interface ButtonGlyphProps {
  action: GamepadAction;
  className?: string;
}

export default function ButtonGlyph({ action, className }: ButtonGlyphProps) {
  const inputMode = useInputStore((s) => s.inputMode);
  const controllerType = useInputStore((s) => s.controllerType);
  const glyph = getGlyph(inputMode, controllerType, action);

  return (
    <kbd
      className={`inline-flex items-center justify-center
        px-1.5 py-0.5 min-w-[1.5rem] rounded
        bg-steam-mid/60 border border-steam-border text-xs font-bold
        text-steam-accent ${className ?? ""}`}
    >
      {glyph.label}
    </kbd>
  );
}
