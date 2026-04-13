import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useEffect, useRef, useState } from "react";
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
  /** Called when the user presses Enter while editing. */
  onApply?: () => void;
  /** Called when the user presses Escape while editing. */
  onCancel?: () => void;
}

/**
 * An input registered with the norigin spatial navigation library.
 *
 * Starts read-only. Press Enter (spatial nav) or click to enter editing mode.
 * While editing, Enter applies and Escape cancels — both exit editing mode.
 */
export function FocusInput({
  focusKey,
  disabled,
  onApply,
  onCancel,
  onKeyDown: parentOnKeyDown,
  className,
  ...rest
}: FocusInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, focused } = useFocusable({
    focusKey,
    focusable: !disabled,
    onEnterPress: () => {
      if (!isEditing && !disabled) {
        setIsEditing(true);
      }
    },
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isEditing) {
      if (e.key === "Enter") {
        e.preventDefault();
        setIsEditing(false);
        inputRef.current?.blur();
        onApply?.();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
        inputRef.current?.blur();
        onCancel?.();
        return;
      }
    }
    parentOnKeyDown?.(e);
  };

  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    if (!isEditing && !disabled) {
      setIsEditing(true);
    }
  };

  const mergedRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    (ref as React.RefObject<HTMLInputElement | null>).current = el;
  };

  return (
    <input
      ref={mergedRef}
      disabled={disabled}
      readOnly={!isEditing}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={handleClick}
      className={`${className ?? ""} ${!isEditing && focused ? "ring-2 ring-steam-accent" : ""} ${!isEditing ? "cursor-default select-none" : ""}`}
      {...rest}
    />
  );
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

interface EditableFieldProps {
  /** Current saved value. */
  value: string;
  /** Called with the new value when the user applies (Enter or Apply button). */
  onApply: (value: string) => void;
  /** Placeholder text shown when the input is focused and empty. */
  placeholder?: string;
  /** Text shown when the field is empty and not editing. */
  emptyLabel?: string;
  /** Extra buttons rendered after Edit/Reset when not editing. */
  extraButtons?: ReactNode;
}

/**
 * A text field that starts as a non-editable display. Clicking "Edit" enters
 * edit mode with the input immediately focused. Enter / Apply saves; Escape /
 * Cancel reverts. Reusable across any settings-style form.
 */
export function EditableField({
  value,
  onApply,
  placeholder,
  emptyLabel = "Not set",
  extraButtons,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when the saved value changes externally
  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  // Auto-focus & select when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const apply = () => {
    onApply(draft.trim());
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className="flex-1 bg-steam-mid/50 border border-steam-border rounded px-3 py-2 text-sm text-steam-text
            placeholder:text-steam-text-dim/50
            focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
            hover:border-steam-accent/50 transition-colors"
        />
        <FocusButton
          onClick={apply}
          className="px-4 py-2 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
            hover:bg-steam-accent/30 hover:border-steam-accent transition-all
            focus:outline-none focus:ring-2 focus:ring-steam-accent"
        >
          Apply
        </FocusButton>
        <FocusButton
          onClick={cancel}
          className="px-4 py-2 bg-steam-mid/30 border border-steam-border text-steam-text-dim rounded text-sm font-medium uppercase tracking-wider
            hover:bg-steam-mid/50 hover:border-steam-accent/50 transition-all
            focus:outline-none focus:ring-2 focus:ring-steam-accent"
        >
          Cancel
        </FocusButton>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <p className="flex-1 bg-steam-mid/30 border border-steam-border/50 rounded px-3 py-2 text-sm text-steam-text-dim select-none truncate">
        {value || <span className="text-steam-text-dim/50 italic">{emptyLabel}</span>}
      </p>
      <FocusButton
        onClick={() => setIsEditing(true)}
        className="px-4 py-2 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
          hover:bg-steam-accent/30 hover:border-steam-accent transition-all
          focus:outline-none focus:ring-2 focus:ring-steam-accent"
      >
        Edit
      </FocusButton>
      {extraButtons}
    </div>
  );
}
