import { FocusContext, setFocus, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import QuitConfirmDialog from "./components/QuitConfirmDialog";
import TabPanel from "./components/TabPanel";
import { useGamepad } from "./hooks/useGamepad";
import { useSpatialNav } from "./hooks/useSpatialNav";
import * as api from "./lib/tauri";
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
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const handleAction = useSpatialNav();
  useGamepad(handleAction);

  useEffect(() => {
    requestAnimationFrame(() => {
      setFocus(`view-${activeTab}`);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global Escape key interceptor — opens quit confirmation from any tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (showQuitConfirm) return; // dialog handles its own keys
      e.preventDefault();
      e.stopPropagation();
      setShowQuitConfirm(true);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [showQuitConfirm]);

  const handleQuit = async () => {
    try {
      await api.abortLaunch();
    } catch {
      // best-effort abort
    }
    await getCurrentWindow().close();
  };

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
        {showQuitConfirm && (
          <QuitConfirmDialog
            onConfirm={handleQuit}
            onCancel={() => setShowQuitConfirm(false)}
          />
        )}
      </div>
    </FocusContext.Provider>
  );
}

export default App;
