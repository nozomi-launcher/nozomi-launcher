import { useEffect, useState } from "react";
import * as api from "../lib/tauri";
import { useProfileStore } from "../stores/profileStore";
import type { Profile } from "../types/profile";

export default function ProfilesView() {
  const profiles = useProfileStore((s) => s.profiles);
  const envVars = useProfileStore((s) => s.envVars);
  const protonVersion = useProfileStore((s) => s.protonVersion);
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSave = async () => {
    const name = newName.trim();
    if (!name) return;

    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      envVars: envVars.map((ev) => ({ ...ev })),
      protonVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await api.saveProfile(profile);
    setNewName("");
    await fetchProfiles();
  };

  const handleDelete = async (id: string) => {
    await api.deleteProfile(id);
    await fetchProfiles();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Save Current Config as Profile */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-3">
          Save Current Configuration
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            data-focusable
            placeholder="Profile name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="flex-1 bg-steam-mid/50 border border-steam-border rounded px-3 py-2 text-sm text-steam-text
              placeholder:text-steam-text-dim/50
              focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
              hover:border-steam-accent/50 transition-colors"
          />
          <button
            data-focusable
            onClick={handleSave}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
              hover:bg-steam-accent/30 hover:border-steam-accent transition-all
              focus:outline-none focus:ring-2 focus:ring-steam-accent
              disabled:bg-steam-mid/20 disabled:border-steam-border disabled:text-steam-text-dim"
          >
            Save
          </button>
        </div>
        <p className="text-xs text-steam-text-dim/60 mt-2">
          Saves the current environment variables and Proton version as a reusable profile.
        </p>
      </section>

      {/* Existing Profiles */}
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-3">
          Saved Profiles
        </h2>
        {profiles.length === 0 ? (
          <p className="text-steam-text-dim text-sm">No profiles saved yet.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between bg-steam-mid/30 border border-steam-border/50 rounded p-3
                  hover:border-steam-accent/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-steam-text">{profile.name}</p>
                  <p className="text-xs text-steam-text-dim">
                    {profile.envVars.length} env var{profile.envVars.length !== 1 && "s"}
                    {profile.protonVersion && ` · ${profile.protonVersion}`}
                  </p>
                </div>
                <button
                  data-focusable
                  onClick={() => handleDelete(profile.id)}
                  className="px-3 py-1 bg-steam-red/20 border border-steam-red/40 text-steam-red-bright rounded text-sm
                    hover:bg-steam-red/30 hover:border-steam-red-bright transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-red"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
