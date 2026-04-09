import { useEffect, useState } from "react";
import { useProfileStore } from "../stores/profileStore";
import EnvVarEditor from "../components/EnvVarEditor";
import GamepadSelect from "../components/GamepadSelect";
import * as api from "../lib/tauri";
import type { LaunchContext, ProtonVersion } from "../types/steam";

export default function GameLaunchView() {
  const [launchContext, setLaunchContext] = useState<LaunchContext | null>(null);
  const [protonVersions, setProtonVersions] = useState<ProtonVersion[]>([]);
  const [launching, setLaunching] = useState(false);

  const envVars = useProfileStore((s) => s.envVars);
  const protonVersion = useProfileStore((s) => s.protonVersion);
  const protonPath = useProfileStore((s) => s.protonPath);
  const setProtonVersion = useProfileStore((s) => s.setProtonVersion);
  const profiles = useProfileStore((s) => s.profiles);
  const applyProfile = useProfileStore((s) => s.applyProfile);
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  useEffect(() => {
    api.getLaunchContext().then(setLaunchContext);
    api.listProtonVersions().then(setProtonVersions);
    fetchProfiles();
  }, [fetchProfiles]);

  const gamePath = launchContext?.gamePath ?? null;
  const isStandalone = !launchContext;

  const handleLaunch = async () => {
    if (!gamePath) return;
    setLaunching(true);
    try {
      await api.launchGame({
        gamePath,
        envVars,
        protonPath,
      });
    } catch (err) {
      console.error("Launch failed:", err);
    } finally {
      setLaunching(false);
    }
  };

  const handleProtonChange = (value: string) => {
    if (value === "") {
      setProtonVersion(null, null);
    } else {
      const version = protonVersions.find((v) => v.name === value);
      setProtonVersion(value, version?.path ?? null);
    }
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
            <p className="text-sm text-steam-text-dim">
              Standalone mode — no game selected
            </p>
            <p className="text-xs mt-1 text-steam-text-dim/60">
              Launch from Steam as a compatibility tool to select a game.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-steam-text font-mono break-all">
              {gamePath}
            </p>
            {launchContext?.steamAppId && (
              <p className="text-xs text-steam-text-dim mt-1">
                App ID: {launchContext.steamAppId}
              </p>
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

      {/* Proton / Compatibility */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-2">
          Compatibility
        </h3>
        <GamepadSelect
          options={[
            { value: "", label: "Native (no Proton)" },
            ...protonVersions.map((v) => ({ value: v.name, label: v.name })),
          ]}
          value={protonVersion ?? ""}
          onChange={handleProtonChange}
          placeholder="Native (no Proton)"
        />
      </section>

      {/* Environment Variables */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <EnvVarEditor />
      </section>

      {/* Launch Button */}
      <button
        data-focusable
        onClick={handleLaunch}
        disabled={!gamePath || launching}
        className={`w-full py-3 rounded text-lg font-bold uppercase tracking-wider transition-all
          focus:outline-none focus:ring-2 focus:ring-steam-green-bright
          ${
            gamePath && !launching
              ? "bg-gradient-to-r from-steam-green to-steam-green-bright text-white shadow-lg shadow-steam-green/20 hover:shadow-steam-green-bright/30 hover:brightness-110"
              : "bg-steam-mid/40 text-steam-text-dim cursor-not-allowed border border-steam-border"
          }`}
      >
        {launching ? "Launching..." : "Launch Game"}
      </button>
    </div>
  );
}
