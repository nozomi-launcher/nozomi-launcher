import type { ReactNode } from "react";
import TabBar from "./TabBar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-steam-darkest text-steam-text flex flex-col">
      <TabBar />
      <main className="flex-1 p-6 overflow-auto bg-gradient-to-b from-steam-dark to-steam-darkest">
        {children}
      </main>
    </div>
  );
}
