import Layout from "./components/Layout";
import GameLaunchView from "./views/GameLaunchView";
import ModdingView from "./views/ModdingView";
import ProfilesView from "./views/ProfilesView";
import { useAppStore } from "./stores/appStore";
import { useInputStore } from "./stores/inputStore";
import { useGamepad } from "./hooks/useGamepad";
import { useSpatialNav } from "./hooks/useSpatialNav";

function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const inputMode = useInputStore((s) => s.inputMode);

  const handleAction = useSpatialNav();
  useGamepad(handleAction);

  return (
    <div className={inputMode === "gamepad" ? "cursor-none" : ""}>
      <Layout>
        {activeTab === "launch" && <GameLaunchView />}
        {activeTab === "modding" && <ModdingView />}
        {activeTab === "profiles" && <ProfilesView />}
      </Layout>
    </div>
  );
}

export default App;
