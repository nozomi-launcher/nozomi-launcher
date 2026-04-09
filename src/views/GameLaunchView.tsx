import { useEffect, useState } from "react";
import EnvVarEditor from "../components/EnvVarEditor";
import GamepadSelect from "../components/GamepadSelect";
import * as api from "../lib/tauri";
import { useAppStore } from "../stores/appStore";
import { resolveCompatTool, useCompatStore } from "../stores/compatStore";
import { useProfileStore } from "../stores/profileStore";
import type { LaunchContext, ProtonVersion } from "../types/steam";

export default function GameLaunchView() {
  const [launchContext, setLaunchContext] = useState<LaunchContext | null>(null);
  const [protonVersions, setProtonVersions] = useState<ProtonVersion[]>([]);
  const [launching, setLaunching] = useState(false);

  const envVars = useProfileStore((s) => s.envVars);
  const profileProtonOverride = useProfileStore((s) => s.protonVersion);
  const profiles = useProfileStore((s) => s.profiles);
  const applyProfile = useProfileStore((s) => s.applyProfile);
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const globalCompatTool = useCompatStore((s) => s.globalCompatTool);
  const initialized = useCompatStore((s) => s.initialized);
  const loadSettings = useCompatStore((s) => s.loadSettings);
  const autoSelectLatest = useCompatStore((s) => s.autoSelectLatest);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const effectiveCompatTool = resolveCompatTool(globalCompatTool, profileProtonOverride);

  useEffect(() => {
    api.getLaunchContext().then(setLaunchContext);
    api.listProtonVersions().then(setProtonVersions);
    fetchProfiles();
    loadSettings();
  }, [fetchProfiles, loadSettings]);

  // Auto-select latest installed version if nothing is set
  useEffect(() => {
    if (initialized && protonVersions.length > 0) {
      autoSelectLatest(protonVersions);
    }
  }, [initialized, protonVersions, autoSelectLatest]);

  const gamePath = launchContext?.gamePath ?? null;
  const isStandalone = !launchContext;

  // Resolve the proton path from the effective compat tool name
  const resolvedProtonPath =
    protonVersions.find((v) => v.name === effectiveCompatTool)?.path ?? null;

  const canLaunch = gamePath && effectiveCompatTool && resolvedProtonPath && !launching;

  const handleLaunch = async () => {
    if (!gamePath || !resolvedProtonPath) return;
    setLaunching(true);
    try {
      await api.launchGame({
        gamePath,
        envVars,
        protonPath: resolvedProtonPath,
      });
    } catch (err) {
      console.error("Launch failed:", err);
    } finally {
      setLaunching(false);
    }
  };

  const handleChangeCompatTool = () => {
    setActiveTab("compat");
    requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>('[data-tab-active="true"]');
      const firstFocusable = panel?.querySelector<HTMLElement>("[data-focusable]");
      firstFocusable?.focus();
    });
  };

  const handleProfileChange = (value: string) => {
    setSelectedProfileId(value);
    const profile = profiles.find((p) => p.id === value);
    if (profile) applyProfile(profile);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Game Info */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-2">
          Game
        </h2>
        {isStandalone ? (
          <div>
            <p className="text-sm text-steam-text-dim">Standalone mode — no game selected</p>
            <p className="text-xs mt-1 text-steam-text-dim/60">
              Launch from Steam as a compatibility tool to select a game.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-steam-text font-mono break-all">{gamePath}</p>
            {launchContext?.steamAppId && (
              <p className="text-xs text-steam-text-dim mt-1">App ID: {launchContext.steamAppId}</p>
            )}
          </div>
        )}
      </section>

      {/* Profile Selector */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-2">
          Profile
        </h3>
        <GamepadSelect
          options={[
            { value: "", label: "No profile" },
            ...profiles.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={selectedProfileId}
          onChange={handleProfileChange}
          placeholder="No profile"
        />
      </section>

      {/* Compatibility Tool */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-2">
          Compatibility Tool
        </h3>
        <div className="flex items-center justify-between">
          <div>
            {effectiveCompatTool ? (
              <div>
                <p className="text-sm text-steam-text font-medium">{effectiveCompatTool}</p>
                {profileProtonOverride && (
                  <p className="text-xs text-steam-text-dim mt-0.5">
                    Profile override (global: {globalCompatTool ?? "none"})
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-steam-red-bright">
                No compatibility tool selected
              </p>
            )}
          </div>
          <button
            data-focusable
            onClick={handleChangeCompatTool}
            className="px-3 py-1.5 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
              hover:bg-steam-accent/30 hover:border-steam-accent transition-all
              focus:outline-none focus:ring-2 focus:ring-steam-accent"
          >
            Change
          </button>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <EnvVarEditor />
      </section>

      {/* Launch Button */}
      <button
        data-focusable
        onClick={handleLaunch}
        disabled={!canLaunch}
        className={`w-full py-3 rounded text-lg font-bold uppercase tracking-wider transition-all
          focus:outline-none focus:ring-2 focus:ring-steam-green-bright
          ${
            canLaunch
              ? "bg-gradient-to-r from-steam-green to-steam-green-bright text-white shadow-lg shadow-steam-green/20 hover:shadow-steam-green-bright/30 hover:brightness-110"
              : "bg-steam-mid/40 text-steam-text-dim cursor-not-allowed border border-steam-border"
          }`}
      >
        {launching
          ? "Launching..."
          : !effectiveCompatTool
            ? "No Compatibility Tool"
            : "Launch Game"}
      </button>
    </div>
  );
}
