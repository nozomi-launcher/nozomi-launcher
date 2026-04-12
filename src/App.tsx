import { FocusContext, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import Layout from "./components/Layout";
import TabPanel from "./components/TabPanel";
import { useGamepad } from "./hooks/useGamepad";
import { useSpatialNav } from "./hooks/useSpatialNav";
import { useAppStore } from "./stores/appStore";
import { useInputStore } from "./stores/inputStore";
import CompatToolsView from "./views/CompatToolsView";
import GameLaunchView from "./views/GameLaunchView";
import ModdingView from "./views/ModdingView";
import ProfilesView from "./views/ProfilesView";
import SettingsView from "./views/SettingsView";

function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const inputMode = useInputStore((s) => s.inputMode);
  const { ref, focusKey } = useFocusable();

  const handleAction = useSpatialNav();
  useGamepad(handleAction);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={inputMode === "gamepad" ? "cursor-none" : ""}>
        <Layout>
          <TabPanel active={activeTab === "launch"}>
            <GameLaunchView />
          </TabPanel>
          <TabPanel active={activeTab === "modding"}>
            <ModdingView />
          </TabPanel>
          <TabPanel active={activeTab === "compat"}>
            <CompatToolsView />
          </TabPanel>
          <TabPanel active={activeTab === "profiles"}>
            <ProfilesView />
          </TabPanel>
          <TabPanel active={activeTab === "settings"}>
            <SettingsView />
          </TabPanel>
        </Layout>
      </div>
    </FocusContext.Provider>
  );
}

export default App;
