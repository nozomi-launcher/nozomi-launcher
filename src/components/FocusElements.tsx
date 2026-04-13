import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

interface FocusButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  focusKey?: string;
  children: ReactNode;
}

/**
 * A button registered with the norigin spatial navigation library.
 * Replaces `<button data-focusable ...>`.
 */
export function FocusButton({ focusKey, children, disabled, onClick, ...rest }: FocusButtonProps) {
  const { ref } = useFocusable({
    focusKey,
    onEnterPress: () => {
      if (!disabled) ref.current?.click();
    },
  });

  return (
    <button ref={ref} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

interface FocusInputProps extends InputHTMLAttributes<HTMLInputElement> {
  focusKey?: string;
}

/**
 * An input registered with the norigin spatial navigation library.
 * Replaces `<input data-focusable ...>`.
 */
export function FocusInput({ focusKey, disabled, ...rest }: FocusInputProps) {
  const { ref } = useFocusable({
    focusKey,
    focusable: !disabled,
  });

  return <input ref={ref} disabled={disabled} {...rest} />;
}

interface FocusDivProps {
  focusKey?: string;
  tabIndex?: number;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * A focusable div registered with the norigin spatial navigation library.
 * Used for focusable list items (e.g. compat tool versions).
 */
export function FocusDiv({ focusKey, tabIndex = 0, onClick, className, children }: FocusDivProps) {
  const { ref } = useFocusable({
    focusKey,
    onEnterPress: () => {
      if (onClick) onClick();
    },
  });

  return (
    <div ref={ref} tabIndex={tabIndex} onClick={onClick} className={className}>
      {children}
    </div>
  );
}
