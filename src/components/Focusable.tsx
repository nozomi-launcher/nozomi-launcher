import {
  FocusContext,
  type UseFocusableConfig,
  useFocusable,
} from "@noriginmedia/norigin-spatial-navigation";
import type { ReactNode } from "react";

interface FocusableProps extends UseFocusableConfig {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper that registers its child container with the norigin spatial
 * navigation library. Use this around groups of focusable elements
 * (e.g. a view section) or as a direct focusable leaf.
 */
export default function Focusable({ children, className, ...config }: FocusableProps) {
  const { ref, focusKey, focused } = useFocusable(config);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={className} data-focused={focused || undefined}>
        {children}
      </div>
    </FocusContext.Provider>
  );
}
