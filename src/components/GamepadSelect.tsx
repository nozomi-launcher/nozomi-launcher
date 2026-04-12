import {
  FocusContext,
  pause,
  resume,
  useFocusable,
} from "@noriginmedia/norigin-spatial-navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useInputStore } from "../stores/inputStore";
import type { GamepadAction } from "../types/input";
import ButtonPrompt from "./ButtonPrompt";

export interface GamepadSelectOption {
  value: string;
  label: string;
}

interface GamepadSelectProps {
  options: GamepadSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GamepadSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
}: GamepadSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputMode = useInputStore((s) => s.inputMode);
  const listboxId = useId();

  const { ref: focusRef, focusKey, focused } = useFocusable({
    onEnterPress: () => {
      if (!isOpen) open();
    },
  });

  const selectedOption = options.find((o) => o.value === value);

  const open = useCallback(() => {
    const selectedIdx = options.findIndex((o) => o.value === value);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    setIsOpen(true);
    pause();
  }, [options, value]);

  const close = useCallback(() => {
    setIsOpen(false);
    resume();
  }, []);

  const select = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      close();
    },
    [onChange, close],
  );

  // Ensure library is resumed on unmount
  useEffect(() => {
    return () => {
      resume();
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, close]);

  // Close when focus leaves the container
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;
    const handleFocusOut = (e: FocusEvent) => {
      if (!container.contains(e.relatedTarget as Node)) {
        close();
      }
    };
    container.addEventListener("focusout", handleFocusOut);
    return () => container.removeEventListener("focusout", handleFocusOut);
  }, [isOpen, close]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement;
    item?.scrollIntoView?.({ block: "nearest" });
  }, [isOpen, highlightedIndex]);

  // Handle keyboard navigation when open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopImmediatePropagation();
          setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopImmediatePropagation();
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          e.stopImmediatePropagation();
          select(options[highlightedIndex].value);
          break;
        case "Escape":
          e.preventDefault();
          e.stopImmediatePropagation();
          close();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, highlightedIndex, options, select, close]);

  // Handle gamepad actions when open (dispatched by useSpatialNav as custom events)
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleGamepadAction = (e: Event) => {
      const action = (e as CustomEvent).detail?.action as GamepadAction | undefined;
      if (!action) return;
      e.preventDefault();
      switch (action) {
        case "DOWN":
          setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
          break;
        case "UP":
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case "CONFIRM":
          select(options[highlightedIndex].value);
          break;
        case "CANCEL":
          close();
          break;
      }
    };

    container.addEventListener("gamepad-action", handleGamepadAction);
    return () => container.removeEventListener("gamepad-action", handleGamepadAction);
  }, [isOpen, options, highlightedIndex, select, close]);

  // Merge the focusable ref with our container ref
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      (focusRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [focusRef],
  );

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={setRefs} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          onClick={() => (isOpen ? close() : open())}
          className={`w-full flex items-center justify-between bg-steam-mid/50 border border-steam-border rounded px-3 py-2 text-sm text-steam-text text-left
            hover:border-steam-accent/50 transition-colors
            ${focused ? "ring-2 ring-steam-accent border-steam-accent" : ""}`}
        >
          <span className={selectedOption ? "" : "text-steam-text-dim/50"}>
            {selectedOption?.label ?? placeholder}
          </span>
          <svg
            className={`w-3 h-3 ml-2 text-steam-accent transition-transform ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 8L1 3h10z" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-steam-dark border border-steam-border rounded shadow-lg shadow-black/40 overflow-hidden">
            <ul ref={listRef} id={listboxId} className="max-h-48 overflow-y-auto" role="listbox">
              {options.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => select(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors
                    ${
                      index === highlightedIndex
                        ? "bg-steam-accent/20 text-steam-accent"
                        : option.value === value
                          ? "text-steam-accent"
                          : "text-steam-text hover:bg-steam-mid/30"
                    }`}
                >
                  {option.label}
                </li>
              ))}
            </ul>

            {/* Button prompts */}
            {inputMode === "gamepad" && (
              <div className="flex gap-4 justify-center border-t border-steam-border px-3 py-1.5">
                <ButtonPrompt action="CONFIRM" label="Select" />
                <ButtonPrompt action="CANCEL" label="Back" />
              </div>
            )}
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}
