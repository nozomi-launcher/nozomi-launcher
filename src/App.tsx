import Layout from "./components/Layout";
import TabPanel from "./components/TabPanel";
import { useGamepad } from "./hooks/useGamepad";
import { useSpatialNav } from "./hooks/useSpatialNav";
import { useAppStore } from "./stores/appStore";
import { useInputStore } from "./stores/inputStore";
import GameLaunchView from "./views/GameLaunchView";
import ModdingView from "./views/ModdingView";
import ProfilesView from "./views/ProfilesView";
import ProtonView from "./views/ProtonView";

function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const inputMode = useInputStore((s) => s.inputMode);

  const handleAction = useSpatialNav();
  useGamepad(handleAction);

  return (
    <div className={inputMode === "gamepad" ? "cursor-none" : ""}>
      <Layout>
        <TabPanel active={activeTab === "launch"}>
          <GameLaunchView />
        </TabPanel>
        <TabPanel active={activeTab === "modding"}>
          <ModdingView />
        </TabPanel>
        <TabPanel active={activeTab === "compat"}>
          <ProtonView />
        </TabPanel>
        <TabPanel active={activeTab === "profiles"}>
          <ProfilesView />
        </TabPanel>
      </Layout>
    </div>
  );
}

export default App;
