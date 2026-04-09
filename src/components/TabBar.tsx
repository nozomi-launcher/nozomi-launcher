import { useAppStore, type Tab } from "../stores/appStore";

const tabs: { id: Tab; label: string }[] = [
  { id: "launch", label: "Game Launch" },
  { id: "modding", label: "Modding" },
  { id: "profiles", label: "Profiles" },
];

export default function TabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <nav className="flex bg-steam-darkest border-b border-steam-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-focusable
          onClick={() => setActiveTab(tab.id)}
          className={`px-6 py-3 text-sm font-medium uppercase tracking-wider transition-all
            focus:outline-none focus:ring-2 focus:ring-steam-accent focus:ring-inset
            ${
              activeTab === tab.id
                ? "bg-steam-dark text-steam-accent border-t-2 border-steam-accent"
                : "text-steam-text-dim hover:text-steam-text hover:bg-steam-dark/50 border-t-2 border-transparent"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
