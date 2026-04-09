import type { ReactNode } from "react";

interface TabPanelProps {
  active: boolean;
  children: ReactNode;
}

export default function TabPanel({ active, children }: TabPanelProps) {
  return (
    <div
      data-tab-active={active ? "true" : "false"}
      aria-hidden={!active}
      inert={!active ? true : undefined}
      className={`transition-opacity duration-200 ease-in-out
        ${
          active
            ? "opacity-100 relative pointer-events-auto"
            : "opacity-0 absolute inset-0 pointer-events-none"
        }`}
    >
      {children}
    </div>
  );
}
