import { invoke } from "@tauri-apps/api/core";
import type { FetchCompatToolsResult } from "../types/compatTools";
import type { EnvVar, Profile } from "../types/profile";
import type { AppSettings } from "../types/settings";
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

export async function getSettings(): Promise<AppSettings> {
  return invoke("get_settings");
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return invoke("save_settings", { settings });
}

/**
 * Merge-and-save helper. Reads the current settings from disk, applies the
 * patch on top, and writes the result back. Prevents two stores that each
 * own a different slice of AppSettings from clobbering each other.
 */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  await saveSettings(merged);
  return merged;
}

export async function fetchCompatTools(force?: boolean): Promise<FetchCompatToolsResult> {
  return invoke("fetch_compat_tools", { force: force ?? null });
}

export async function launchGame(options: {
  gamePath: string;
  envVars: EnvVar[];
  protonPath: string | null;
}): Promise<void> {
  return invoke("launch_game", { options });
}

export async function abortLaunch(): Promise<void> {
  return invoke("abort_launch");
}

export async function installCompatTool(options: {
  downloadUrl: string;
  tagName: string;
  name?: string | null;
  assetSize: number;
}): Promise<void> {
  return invoke("install_compat_tool", options);
}

export async function uninstallCompatTool(tagName: string): Promise<void> {
  return invoke("uninstall_compat_tool", { tagName });
}
