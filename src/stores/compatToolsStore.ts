import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { create } from "zustand";
import * as api from "../lib/tauri";
import type {
  CompatToolGroup,
  CompatToolRelease,
  CompatToolStatus,
  CompatToolVersion,
  InstallProgress,
  SourceStatus,
} from "../types/compatTools";
import type { ProtonVersion } from "../types/steam";

interface CompatToolsStore {
  releases: CompatToolRelease[];
  sourceStatus: SourceStatus[];
  installedVersions: ProtonVersion[];
  lastCheckedEpochSecs: number | null;
  isLoading: boolean;
  error: string | null;
  installing: Map<string, InstallProgress>;
  fetchReleases: (force?: boolean) => Promise<void>;
  fetchInstalled: () => Promise<void>;
  installTool: (release: CompatToolRelease) => Promise<void>;
  uninstallTool: (tagName: string) => Promise<void>;
}

let progressUnlisten: UnlistenFn | null = null;

export const useCompatToolsStore = create<CompatToolsStore>((set, get) => ({
  releases: [],
  sourceStatus: [],
  installedVersions: [],
  lastCheckedEpochSecs: null,
  isLoading: false,
  error: null,
  installing: new Map(),

  fetchReleases: async (force?: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.fetchCompatTools(force);
      set({
        releases: result.releases,
        sourceStatus: result.sourceStatus,
        lastCheckedEpochSecs: result.lastCheckedEpochSecs ?? null,
        isLoading: false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  fetchInstalled: async () => {
    try {
      const installedVersions = await api.listProtonVersions();
      set({ installedVersions });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  installTool: async (release: CompatToolRelease) => {
    const { installing, fetchInstalled } = get();
    if (installing.has(release.tagName)) return;
    set({ error: null });

    const initial: InstallProgress = {
      tagName: release.tagName,
      stage: "downloading",
      bytesDownloaded: 0,
      totalBytes: release.assetSize,
      progressPct: 0,
    };
    const next = new Map(installing);
    next.set(release.tagName, initial);
    set({ installing: next });

    // Listen for progress events
    if (!progressUnlisten) {
      progressUnlisten = await listen<InstallProgress>(
        "compat-tool-install-progress",
        (event) => {
          const progress = event.payload;
          const current = get().installing;
          if (progress.stage === "done" || progress.stage === "error") {
            const updated = new Map(current);
            updated.delete(progress.tagName);
            set({ installing: updated });
            if (progress.stage === "done") {
              fetchInstalled();
            }
            if (progress.stage === "error") {
              set({ error: `Install failed for ${progress.tagName}` });
            }
          } else {
            const updated = new Map(current);
            updated.set(progress.tagName, progress);
            set({ installing: updated });
          }
        },
      );
    }

    try {
      await api.installCompatTool({
        downloadUrl: release.downloadUrl,
        tagName: release.tagName,
        name: release.name ?? null,
        assetSize: release.assetSize,
      });
    } catch (e) {
      const current = get().installing;
      const updated = new Map(current);
      updated.delete(release.tagName);
      set({ installing: updated, error: String(e) });
    }
  },

  uninstallTool: async (tagName: string) => {
    set({ error: null });
    try {
      await api.uninstallCompatTool(tagName);
      await get().fetchInstalled();
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));

export function parseVersion(tagName: string): { major: number; minor: number } | null {
  const match = tagName.match(/GE-Proton(\d+)-(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function getMajorVersion(tagName: string): string {
  const match = tagName.match(/(GE-Proton\d+)/);
  return match ? match[1] : tagName;
}

export function compareVersions(a: string, b: string): number {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  if (!av && !bv) return b.localeCompare(a);
  if (!av) return 1;
  if (!bv) return -1;
  if (av.major !== bv.major) return bv.major - av.major;
  return bv.minor - av.minor;
}

export function mergeVersions(
  releases: CompatToolRelease[],
  installedVersions: ProtonVersion[],
  selectedVersion: string | null,
  installingSet?: Set<string>,
): CompatToolVersion[] {
  const installedNames = new Set(installedVersions.map((v) => v.name));

  const versions: CompatToolVersion[] = releases.map((r) => {
    const name = r.name ?? r.tagName;
    let status: CompatToolStatus = "available";
    if (installingSet?.has(r.tagName)) {
      status = "installing";
    } else if (r.tagName === selectedVersion || name === selectedVersion) {
      status = "selected";
    } else if (installedNames.has(name)) {
      status = "installed";
    }
    return {
      tagName: r.tagName,
      name,
      publishedAt: r.publishedAt,
      status,
      sourceName: r.sourceName ?? null,
      category: r.category ?? null,
    };
  });

  const remoteNames = new Set(releases.map((r) => r.name ?? r.tagName));
  for (const installed of installedVersions) {
    if (!remoteNames.has(installed.name)) {
      versions.push({
        tagName: installed.name,
        name: installed.name,
        publishedAt: null,
        status: installed.name === selectedVersion ? "selected" : "installed",
      });
    }
  }

  versions.sort((a, b) => compareVersions(a.tagName, b.tagName));
  return versions;
}

export function groupVersions(versions: CompatToolVersion[]): CompatToolGroup[] {
  const groupMap = new Map<string, CompatToolVersion[]>();
  const latestAliases: CompatToolVersion[] = [];

  for (const v of versions) {
    // "GE-Proton Latest" doesn't match a numeric major version;
    // collect it separately and insert into the top group later.
    if (v.tagName === "GE-Proton Latest") {
      latestAliases.push(v);
      continue;
    }
    const major = getMajorVersion(v.tagName);
    const group = groupMap.get(major);
    if (group) {
      group.push(v);
    } else {
      groupMap.set(major, [v]);
    }
  }

  const groups: CompatToolGroup[] = [];
  for (const [category, groupVersions] of groupMap) {
    groups.push({ category, versions: groupVersions });
  }

  groups.sort((a, b) => {
    const aNum = Number(a.category.match(/\d+/)?.[0] ?? 0);
    const bNum = Number(b.category.match(/\d+/)?.[0] ?? 0);
    return bNum - aNum;
  });

  // Prepend "GE-Proton Latest" to the highest major version group
  if (latestAliases.length > 0 && groups.length > 0) {
    groups[0].versions = [...latestAliases, ...groups[0].versions];
  }

  return groups;
}
