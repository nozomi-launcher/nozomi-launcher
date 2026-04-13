import type { ReactNode } from "react";
import TabBar from "./TabBar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen bg-steam-darkest text-steam-text flex flex-col overflow-hidden">
      <TabBar />
      <main className="flex-1 min-h-0 overflow-hidden relative bg-gradient-to-b from-steam-dark to-steam-darkest">
        {children}
      </main>
    </div>
  );
}
