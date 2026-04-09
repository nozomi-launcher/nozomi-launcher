import { invoke } from "@tauri-apps/api/core";
import type { EnvVar, Profile } from "../types/profile";
import type { LaunchContext, ProtonVersion } from "../types/steam";

export async function getLaunchContext(): Promise<LaunchContext | null> {
  return invoke("get_launch_context");
}

export async function listProtonVersions(): Promise<ProtonVersion[]> {
  return invoke("list_proton_versions");
}

export async function listProfiles(): Promise<Profile[]> {
  return invoke("list_profiles");
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  return invoke("save_profile", { profile });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke("delete_profile", { id });
}

export async function loadProfile(id: string): Promise<Profile> {
  return invoke("load_profile", { id });
}

export async function launchGame(options: {
  gamePath: string;
  envVars: EnvVar[];
  protonPath: string | null;
}): Promise<void> {
  return invoke("launch_game", { options });
}
