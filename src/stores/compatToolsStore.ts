import { create } from "zustand";
import * as api from "../lib/tauri";
import type {
  CompatToolGroup,
  CompatToolRelease,
  CompatToolStatus,
  CompatToolVersion,
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
  fetchReleases: (force?: boolean) => Promise<void>;
  fetchInstalled: () => Promise<void>;
}

export const useCompatToolsStore = create<CompatToolsStore>((set) => ({
  releases: [],
  sourceStatus: [],
  installedVersions: [],
  lastCheckedEpochSecs: null,
  isLoading: false,
  error: null,

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
): CompatToolVersion[] {
  const installedNames = new Set(installedVersions.map((v) => v.name));

  const versions: CompatToolVersion[] = releases.map((r) => {
    let status: CompatToolStatus = "available";
    if (r.tagName === selectedVersion) {
      status = "selected";
    } else if (installedNames.has(r.tagName)) {
      status = "installed";
    }
    return {
      tagName: r.tagName,
      publishedAt: r.publishedAt,
      status,
      sourceName: r.sourceName ?? null,
      category: r.category ?? null,
    };
  });

  const remoteNames = new Set(releases.map((r) => r.tagName));
  for (const installed of installedVersions) {
    if (!remoteNames.has(installed.name)) {
      versions.push({
        tagName: installed.name,
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

  for (const v of versions) {
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

  return groups;
}
