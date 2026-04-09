import type { GamepadAction } from "../types/input";
import ButtonGlyph from "./ButtonGlyph";

interface ButtonPromptProps {
  action: GamepadAction;
  label: string;
  className?: string;
}

export default function ButtonPrompt({ action, label, className }: ButtonPromptProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-steam-text-dim ${className ?? ""}`}
    >
      <ButtonGlyph action={action} /> {label}
    </span>
  );
}
