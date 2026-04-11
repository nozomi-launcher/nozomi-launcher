import { type Tab, useAppStore } from "../stores/appStore";
import ButtonGlyph from "./ButtonGlyph";

const tabs: { id: Tab; label: string }[] = [
  { id: "launch", label: "Game Launch" },
  { id: "modding", label: "Modding" },
  { id: "compat", label: "Compatibility Tools" },
  { id: "profiles", label: "Profiles" },
  { id: "settings", label: "Settings" },
];

export default function TabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <nav className="flex items-center bg-steam-darkest border-b border-steam-border">
      <div className="pl-4 pr-2">
        <ButtonGlyph action="TAB_LEFT" />
      </div>

      <div className="flex flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-focusable
            data-tab-id={tab.id}
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
      </div>

      <div className="pl-2 pr-4">
        <ButtonGlyph action="TAB_RIGHT" />
      </div>
    </nav>
  );
}
