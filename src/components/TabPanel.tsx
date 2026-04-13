import { FocusContext, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import type { ReactNode } from "react";

interface TabPanelProps {
  active: boolean;
  children: ReactNode;
}

export default function TabPanel({ active, children }: TabPanelProps) {
  const { ref, focusKey } = useFocusable({ focusable: active });

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        data-tab-active={active ? "true" : "false"}
        aria-hidden={!active}
        inert={!active ? true : undefined}
        className={`transition-opacity duration-200 ease-in-out
          ${
            active
              ? "opacity-100 relative pointer-events-auto h-full"
              : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
      >
        {children}
      </div>
    </FocusContext.Provider>
  );
}
