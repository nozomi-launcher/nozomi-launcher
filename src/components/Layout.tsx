import type { ReactNode } from "react";
import TabBar from "./TabBar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <TabBar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
