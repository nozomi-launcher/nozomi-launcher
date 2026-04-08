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
    <nav className="flex gap-1 bg-gray-800 p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-focusable
          onClick={() => setActiveTab(tab.id)}
          className={`px-6 py-2 rounded text-sm font-medium transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
