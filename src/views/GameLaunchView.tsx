import { FocusContext, setFocus, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useEffect, useRef, useState } from "react";
import EnvVarEditor from "../components/EnvVarEditor";
import { FocusButton, FocusInput } from "../components/FocusElements";
import GamepadSelect from "../components/GamepadSelect";
import * as api from "../lib/tauri";
import { useAppStore } from "../stores/appStore";
import { resolveCompatTool, useCompatStore } from "../stores/compatStore";
import { useProfileStore } from "../stores/profileStore";
import type { Profile } from "../types/profile";
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
  const [isNamingGameProfile, setIsNamingGameProfile] = useState(false);
  const [newGameProfileName, setNewGameProfileName] = useState("");
  const autoMatchAttempted = useRef(false);

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

  // Auto-apply a profile matching the current game's Steam app ID. Runs once
  // per view mount to avoid clobbering manual profile choices.
  const gameProfile =
    profiles.find((p) => p.steamAppId && p.steamAppId === launchContext?.steamAppId) ?? null;
  useEffect(() => {
    if (autoMatchAttempted.current) return;
    if (!launchContext || profiles.length === 0) return;
    autoMatchAttempted.current = true;

    const appId = launchContext.steamAppId;
    if (!appId) return;

    const match = profiles.find((p) => p.steamAppId === appId);
    if (match) {
      setSelectedProfileId(match.id);
      applyProfile(match);
    }
  }, [launchContext, profiles, applyProfile]);

  const gamePath = launchContext?.gamePath ?? null;
  const isStandalone = !launchContext;

  // Resolve the proton path from the effective compat tool name
  const resolvedProtonPath =
    protonVersions.find((v) => v.name === effectiveCompatTool)?.path ?? null;

  const canLaunch = Boolean(gamePath && effectiveCompatTool && resolvedProtonPath && !launching);

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
      setFocus("tab-compat");
    });
  };

  const handleProfileChange = (value: string) => {
    setSelectedProfileId(value);
    const profile = profiles.find((p) => p.id === value);
    if (profile) applyProfile(profile);
  };

  const handleSaveGameProfile = async () => {
    const appId = launchContext?.steamAppId;
    if (!appId) return;

    // If a profile is already associated with this game, update it in place;
    // otherwise require a name and create a new one.
    const now = new Date().toISOString();
    let profile: Profile;
    if (gameProfile) {
      profile = {
        ...gameProfile,
        envVars: envVars.map((ev) => ({ ...ev })),
        protonVersion: effectiveCompatTool,
        updatedAt: now,
      };
    } else {
      const name = newGameProfileName.trim();
      if (!name) return;
      profile = {
        id: crypto.randomUUID(),
        name,
        envVars: envVars.map((ev) => ({ ...ev })),
        protonVersion: effectiveCompatTool,
        steamAppId: appId,
        createdAt: now,
        updatedAt: now,
      };
    }

    await api.saveProfile(profile);
    await fetchProfiles();
    setSelectedProfileId(profile.id);
    setNewGameProfileName("");
    setIsNamingGameProfile(false);
  };

  const { ref: viewRef, focusKey } = useFocusable({ focusKey: "tab-launch" });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={viewRef} className="max-w-3xl mx-auto space-y-4">
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

        {/* Per-game profile association */}
        {launchContext?.steamAppId && (
          <div className="mt-3 pt-3 border-t border-steam-border/50">
            {gameProfile ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-steam-text-dim">
                  Profile for this game:{" "}
                  <span className="text-steam-accent">{gameProfile.name}</span>
                </p>
                <FocusButton
                  onClick={handleSaveGameProfile}
                  className="px-3 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-xs font-medium uppercase tracking-wider
                    hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-accent"
                >
                  Update
                </FocusButton>
              </div>
            ) : isNamingGameProfile ? (
              <div className="flex gap-2">
                <FocusInput
                  type="text"
                  autoFocus
                  placeholder="Profile name..."
                  value={newGameProfileName}
                  onChange={(e) => setNewGameProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveGameProfile();
                    if (e.key === "Escape") {
                      setNewGameProfileName("");
                      setIsNamingGameProfile(false);
                    }
                  }}
                  className="flex-1 bg-steam-mid/50 border border-steam-border rounded px-3 py-1.5 text-sm text-steam-text
                    placeholder:text-steam-text-dim/50
                    focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
                    hover:border-steam-accent/50 transition-colors"
                />
                <FocusButton
                  onClick={handleSaveGameProfile}
                  disabled={!newGameProfileName.trim()}
                  className="px-3 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-xs font-medium uppercase tracking-wider
                    hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-accent
                    disabled:bg-steam-mid/20 disabled:border-steam-border disabled:text-steam-text-dim"
                >
                  Save
                </FocusButton>
                <FocusButton
                  onClick={() => {
                    setNewGameProfileName("");
                    setIsNamingGameProfile(false);
                  }}
                  className="px-3 py-1 bg-steam-mid/30 border border-steam-border text-steam-text-dim rounded text-xs font-medium uppercase tracking-wider
                    hover:bg-steam-mid/50 hover:border-steam-accent/50 transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-accent"
                >
                  Cancel
                </FocusButton>
              </div>
            ) : (
              <FocusButton
                onClick={() => setIsNamingGameProfile(true)}
                className="px-3 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-xs font-medium uppercase tracking-wider
                  hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                  focus:outline-none focus:ring-2 focus:ring-steam-accent"
              >
                Save for this game
              </FocusButton>
            )}
          </div>
        )}
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
              <p className="text-sm text-steam-red-bright">No compatibility tool selected</p>
            )}
          </div>
          <FocusButton
            onClick={handleChangeCompatTool}
            className="px-3 py-1.5 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
              hover:bg-steam-accent/30 hover:border-steam-accent transition-all
              focus:outline-none focus:ring-2 focus:ring-steam-accent"
          >
            Change
          </FocusButton>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <EnvVarEditor />
      </section>

      {/* Launch Button */}
      <FocusButton
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
      </FocusButton>
      </div>
    </FocusContext.Provider>
  );
}
