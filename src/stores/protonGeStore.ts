import { create } from "zustand";
import * as api from "../lib/tauri";
import type {
  ProtonGeGroup,
  ProtonGeRelease,
  ProtonGeStatus,
  ProtonGeVersion,
} from "../types/protonGe";
import type { ProtonVersion } from "../types/steam";

interface ProtonGeStore {
  releases: ProtonGeRelease[];
  installedVersions: ProtonVersion[];
  isLoading: boolean;
  error: string | null;
  fetchReleases: () => Promise<void>;
  fetchInstalled: () => Promise<void>;
}

export const useProtonGeStore = create<ProtonGeStore>((set) => ({
  releases: [],
  installedVersions: [],
  isLoading: false,
  error: null,

  fetchReleases: async () => {
    set({ isLoading: true, error: null });
    try {
      const releases = await api.fetchProtonGeReleases();
      set({ releases, isLoading: false });
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

/** Parse "GE-Proton9-27" into { major: 9, minor: 27 }, or null if unparseable */
export function parseVersion(tagName: string): { major: number; minor: number } | null {
  const match = tagName.match(/GE-Proton(\d+)-(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

/** Extract major version label from tag name, e.g. "GE-Proton9-27" -> "GE-Proton9" */
export function getMajorVersion(tagName: string): string {
  const match = tagName.match(/(GE-Proton\d+)/);
  return match ? match[1] : tagName;
}

/** Sort versions numerically descending (major desc, minor desc). Unparseable go last. */
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
  releases: ProtonGeRelease[],
  installedVersions: ProtonVersion[],
  selectedVersion: string | null,
): ProtonGeVersion[] {
  const installedNames = new Set(installedVersions.map((v) => v.name));

  const versions: ProtonGeVersion[] = releases.map((r) => {
    let status: ProtonGeStatus = "available";
    if (r.tagName === selectedVersion) {
      status = "selected";
    } else if (installedNames.has(r.tagName)) {
      status = "installed";
    }
    return {
      tagName: r.tagName,
      publishedAt: r.publishedAt,
      status,
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

export function groupVersions(versions: ProtonGeVersion[]): ProtonGeGroup[] {
  const groupMap = new Map<string, ProtonGeVersion[]>();

  for (const v of versions) {
    const major = getMajorVersion(v.tagName);
    const group = groupMap.get(major);
    if (group) {
      group.push(v);
    } else {
      groupMap.set(major, [v]);
    }
  }

  const groups: ProtonGeGroup[] = [];
  for (const [majorVersion, groupVersions] of groupMap) {
    groups.push({ majorVersion, versions: groupVersions });
  }

  // Sort groups by major version number descending
  groups.sort((a, b) => {
    const aNum = Number(a.majorVersion.match(/\d+/)?.[0] ?? 0);
    const bNum = Number(b.majorVersion.match(/\d+/)?.[0] ?? 0);
    return bNum - aNum;
  });

  return groups;
}
