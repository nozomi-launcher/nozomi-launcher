import { useEffect, useState } from "react";
import { useProfileStore } from "../stores/profileStore";
import * as api from "../lib/tauri";
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Save Current Config as Profile */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">Save Current Configuration</h2>
        <div className="flex gap-2">
          <input
            type="text"
            data-focusable
            placeholder="Profile name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            data-focusable
            onClick={handleSave}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium
              focus:outline-none focus:ring-2 focus:ring-blue-400
              disabled:bg-gray-700 disabled:text-gray-500"
          >
            Save
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Saves the current environment variables and Proton version as a reusable profile.
        </p>
      </section>

      {/* Existing Profiles */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">Saved Profiles</h2>
        {profiles.length === 0 ? (
          <p className="text-gray-500 text-sm">No profiles saved yet.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between bg-gray-700 rounded p-3"
              >
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-xs text-gray-400">
                    {profile.envVars.length} env var{profile.envVars.length !== 1 && "s"}
                    {profile.protonVersion && ` · ${profile.protonVersion}`}
                  </p>
                </div>
                <button
                  data-focusable
                  onClick={() => handleDelete(profile.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm
                    focus:outline-none focus:ring-2 focus:ring-red-400"
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
