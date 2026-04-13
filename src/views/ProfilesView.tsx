import { FocusContext, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useEffect, useState } from "react";
import ButtonPrompt from "../components/ButtonPrompt";
import { FocusButton, FocusInput } from "../components/FocusElements";
import GamepadSelect from "../components/GamepadSelect";
import * as api from "../lib/tauri";
import { useCompatToolsStore } from "../stores/compatToolsStore";
import { useProfileStore } from "../stores/profileStore";
import type { Profile } from "../types/profile";

export default function ProfilesView() {
  const profiles = useProfileStore((s) => s.profiles);
  const envVars = useProfileStore((s) => s.envVars);
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);
  const installedVersions = useCompatToolsStore((s) => s.installedVersions);
  const fetchInstalled = useCompatToolsStore((s) => s.fetchInstalled);
  const [newName, setNewName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchInstalled();
  }, [fetchProfiles, fetchInstalled]);

  const handleSave = async () => {
    const name = newName.trim();
    if (!name) return;

    // New profiles inherit from the global profile by default — null fields
    // mean "fall back to global". The user can later associate the profile
    // with a game from the Launch view.
    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      envVars: envVars.map((ev) => ({ ...ev })),
      protonVersion: null,
      steamAppId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await api.saveProfile(profile);
    setNewName("");
    setIsEditingName(false);
    await fetchProfiles();
  };

  const handleDelete = async (id: string) => {
    await api.deleteProfile(id);
    await fetchProfiles();
  };

  const handleUpdateCompatTool = async (profileId: string, version: string | null) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const updated: Profile = {
      ...profile,
      protonVersion: version,
      updatedAt: new Date().toISOString(),
    };
    await api.saveProfile(updated);
    await fetchProfiles();
  };

  const { ref: viewRef, focusKey } = useFocusable({ focusKey: "view-profiles" });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={viewRef} className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
        {/* Save Current Config as Profile */}
        <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-3">
            Save Current Configuration
          </h2>
          <div className="flex gap-2">
            {isEditingName ? (
              <>
                <FocusInput
                  type="text"
                  autoFocus
                  placeholder="Profile name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") {
                      setNewName("");
                      setIsEditingName(false);
                    }
                  }}
                  className="flex-1 bg-steam-mid/50 border border-steam-border rounded px-3 py-2 text-sm text-steam-text
                    placeholder:text-steam-text-dim/50
                    focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
                    hover:border-steam-accent/50 transition-colors"
                />
                <FocusButton
                  onClick={handleSave}
                  disabled={!newName.trim()}
                  className="px-4 py-2 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
                    hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-accent
                    disabled:bg-steam-mid/20 disabled:border-steam-border disabled:text-steam-text-dim"
                >
                  Save
                </FocusButton>
                <FocusButton
                  onClick={() => {
                    setNewName("");
                    setIsEditingName(false);
                  }}
                  className="px-4 py-2 bg-steam-mid/30 border border-steam-border text-steam-text-dim rounded text-sm font-medium uppercase tracking-wider
                    hover:bg-steam-mid/50 hover:border-steam-accent/50 transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-accent"
                >
                  Cancel
                </FocusButton>
              </>
            ) : (
              <FocusButton
                onClick={() => setIsEditingName(true)}
                className="px-4 py-2 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
                  hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                  focus:outline-none focus:ring-2 focus:ring-steam-accent"
              >
                New Profile
              </FocusButton>
            )}
          </div>
          <p className="text-xs text-steam-text-dim/60 mt-2">
            Saves the current environment variables as a reusable profile. Unset fields fall back to
            global defaults.
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
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  onDelete={handleDelete}
                  installedVersions={installedVersions}
                  onUpdateCompatTool={handleUpdateCompatTool}
                />
              ))}
            </div>
          )}
        </section>
      </div>
        </div>

        {/* Footer: button prompts */}
        <div className="flex items-center justify-end gap-6 px-4 py-2 border-t border-steam-border/50 bg-steam-darkest/80 shrink-0">
          <ButtonPrompt action="CONFIRM" label="Select" />
          <ButtonPrompt action="CANCEL" label="Cancel" />
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function ProfileRow({
  profile,
  onDelete,
  installedVersions,
  onUpdateCompatTool,
}: {
  profile: Profile;
  onDelete: (id: string) => void;
  installedVersions: { name: string; path: string }[];
  onUpdateCompatTool: (profileId: string, version: string | null) => void;
}) {
  const compatToolOptions = [
    { value: "", label: "Global default" },
    ...installedVersions.map((v) => ({ value: v.name, label: v.name })),
  ];

  return (
    <div
      className="bg-steam-mid/30 border border-steam-border/50 rounded p-3
        hover:border-steam-accent/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-steam-text">{profile.name}</p>
          <p className="text-xs text-steam-text-dim">
            {profile.envVars.length} env var{profile.envVars.length !== 1 && "s"}
            {profile.protonVersion && ` · ${profile.protonVersion}`}
            {profile.steamAppId && ` · App ${profile.steamAppId}`}
          </p>
        </div>
        <FocusButton
          onClick={() => onDelete(profile.id)}
          className="px-3 py-1 bg-steam-red/20 border border-steam-red/40 text-steam-red-bright rounded text-sm
            hover:bg-steam-red/30 hover:border-steam-red-bright transition-all
            focus:outline-none focus:ring-2 focus:ring-steam-red"
        >
          Delete
        </FocusButton>
      </div>
      <div className="mt-2 pt-2 border-t border-steam-border/30">
        <label className="text-xs text-steam-text-dim block mb-1">Compatibility Tool</label>
        <GamepadSelect
          options={compatToolOptions}
          value={profile.protonVersion ?? ""}
          onChange={(value) => onUpdateCompatTool(profile.id, value || null)}
          placeholder="Global default"
        />
      </div>
    </div>
  );
}
