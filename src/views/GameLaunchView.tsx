import { useEffect, useState } from "react";
import { useProfileStore } from "../stores/profileStore";
import EnvVarEditor from "../components/EnvVarEditor";
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Game Info */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-2">Game</h2>
        {isStandalone ? (
          <div className="text-gray-400">
            <p className="text-sm">Standalone mode — no game selected</p>
            <p className="text-xs mt-1 text-gray-500">
              Launch from Steam as a compatibility tool to select a game.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-300 font-mono break-all">{gamePath}</p>
            {launchContext?.steamAppId && (
              <p className="text-xs text-gray-500 mt-1">
                App ID: {launchContext.steamAppId}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Profile Selector */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Profile</h3>
        <select
          data-focusable
          onChange={(e) => {
            const profile = profiles.find((p) => p.id === e.target.value);
            if (profile) applyProfile(profile);
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue=""
        >
          <option value="">No profile</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </section>

      {/* Proton / Compatibility */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Compatibility</h3>
        <select
          data-focusable
          value={protonVersion ?? ""}
          onChange={(e) => handleProtonChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Native (no Proton)</option>
          {protonVersions.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
      </section>

      {/* Environment Variables */}
      <section className="bg-gray-800 rounded-lg p-4">
        <EnvVarEditor />
      </section>

      {/* Launch Button */}
      <button
        data-focusable
        onClick={handleLaunch}
        disabled={!gamePath || launching}
        className={`w-full py-3 rounded-lg text-lg font-bold transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-400
          ${
            gamePath && !launching
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
      >
        {launching ? "Launching..." : "Launch Game"}
      </button>
    </div>
  );
}
