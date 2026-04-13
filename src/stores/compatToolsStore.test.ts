import { describe, expect, it } from "vitest";
import type { CompatToolRelease } from "../types/compatTools";
import type { ProtonVersion } from "../types/steam";
import {
  compareVersions,
  getMajorVersion,
  groupVersions,
  mergeVersions,
  parseVersion,
} from "./compatToolsStore";

const mockReleases: CompatToolRelease[] = [
  {
    tagName: "GE-Proton9-27",
    publishedAt: "2026-04-01T12:00:00Z",
    downloadUrl: "https://example.com/GE-Proton9-27.tar.gz",
    assetSize: 400000000,
  },
  {
    tagName: "GE-Proton9-9",
    publishedAt: "2026-01-10T10:00:00Z",
    downloadUrl: "https://example.com/GE-Proton9-9.tar.gz",
    assetSize: 370000000,
  },
  {
    tagName: "GE-Proton10-2",
    publishedAt: "2026-04-05T14:00:00Z",
    downloadUrl: "https://example.com/GE-Proton10-2.tar.gz",
    assetSize: 410000000,
  },
  {
    tagName: "GE-Proton9-26",
    publishedAt: "2026-03-15T10:00:00Z",
    downloadUrl: "https://example.com/GE-Proton9-26.tar.gz",
    assetSize: 390000000,
  },
  {
    tagName: "GE-Proton10-1",
    publishedAt: "2026-04-02T12:00:00Z",
    downloadUrl: "https://example.com/GE-Proton10-1.tar.gz",
    assetSize: 405000000,
  },
];

const mockInstalled: ProtonVersion[] = [
  { name: "GE-Proton9-27", path: "/home/user/.steam/root/compatibilitytools.d/GE-Proton9-27" },
  { name: "GE-Proton9-26", path: "/home/user/.steam/root/compatibilitytools.d/GE-Proton9-26" },
  { name: "GE-Proton8-1", path: "/home/user/.steam/root/compatibilitytools.d/GE-Proton8-1" },
];

describe("parseVersion", () => {
  it("parses standard GE-Proton tag names", () => {
    expect(parseVersion("GE-Proton9-27")).toEqual({ major: 9, minor: 27 });
    expect(parseVersion("GE-Proton10-2")).toEqual({ major: 10, minor: 2 });
  });

  it("returns null for unparseable names", () => {
    expect(parseVersion("SomeOtherTool")).toBeNull();
  });
});

describe("getMajorVersion", () => {
  it("extracts major version label", () => {
    expect(getMajorVersion("GE-Proton9-27")).toBe("GE-Proton9");
    expect(getMajorVersion("GE-Proton10-2")).toBe("GE-Proton10");
  });

  it("returns tag name for non-matching format", () => {
    expect(getMajorVersion("SomeOtherTool")).toBe("SomeOtherTool");
  });
});

describe("compareVersions", () => {
  it("sorts by major version descending", () => {
    expect(compareVersions("GE-Proton10-1", "GE-Proton9-27")).toBeLessThan(0);
  });

  it("sorts by minor version descending within same major", () => {
    expect(compareVersions("GE-Proton9-27", "GE-Proton9-9")).toBeLessThan(0);
  });

  it("puts unparseable versions last", () => {
    expect(compareVersions("GE-Proton9-1", "UnknownTool")).toBeLessThan(0);
    expect(compareVersions("UnknownTool", "GE-Proton9-1")).toBeGreaterThan(0);
  });
});

describe("mergeVersions", () => {
  it("marks remote-only versions as available", () => {
    const result = mergeVersions(mockReleases, [], null);
    expect(result.every((v) => v.status === "available")).toBe(true);
  });

  it("marks installed versions correctly", () => {
    const result = mergeVersions(mockReleases, mockInstalled, null);
    const v27 = result.find((v) => v.tagName === "GE-Proton9-27");
    const v9 = result.find((v) => v.tagName === "GE-Proton9-9");

    expect(v27?.status).toBe("installed");
    expect(v9?.status).toBe("available");
  });

  it("marks selected version correctly", () => {
    const result = mergeVersions(mockReleases, mockInstalled, "GE-Proton9-27");
    const v27 = result.find((v) => v.tagName === "GE-Proton9-27");

    expect(v27?.status).toBe("selected");
  });

  it("selected takes precedence over installed", () => {
    const result = mergeVersions(mockReleases, mockInstalled, "GE-Proton9-26");
    const v26 = result.find((v) => v.tagName === "GE-Proton9-26");
    const v27 = result.find((v) => v.tagName === "GE-Proton9-27");

    expect(v26?.status).toBe("selected");
    expect(v27?.status).toBe("installed");
  });

  it("appends installed versions not in remote list", () => {
    const result = mergeVersions(mockReleases, mockInstalled, null);
    const v81 = result.find((v) => v.tagName === "GE-Proton8-1");

    expect(v81).toBeDefined();
    expect(v81?.status).toBe("installed");
    expect(v81?.publishedAt).toBeNull();
  });

  it("sorts versions numerically descending", () => {
    const result = mergeVersions(mockReleases, mockInstalled, null);
    const names = result.map((v) => v.tagName);

    expect(names.indexOf("GE-Proton10-2")).toBeLessThan(names.indexOf("GE-Proton10-1"));
    expect(names.indexOf("GE-Proton10-1")).toBeLessThan(names.indexOf("GE-Proton9-27"));
    expect(names.indexOf("GE-Proton9-27")).toBeLessThan(names.indexOf("GE-Proton9-9"));
    expect(names.indexOf("GE-Proton9-9")).toBeLessThan(names.indexOf("GE-Proton8-1"));
  });

  it("handles empty inputs", () => {
    const result = mergeVersions([], [], null);
    expect(result).toEqual([]);
  });

  it("marks selected version from installed-only list", () => {
    const result = mergeVersions([], mockInstalled, "GE-Proton8-1");
    const v81 = result.find((v) => v.tagName === "GE-Proton8-1");

    expect(v81?.status).toBe("selected");
  });

  it("marks installing versions correctly", () => {
    const installingSet = new Set(["GE-Proton10-2"]);
    const result = mergeVersions(mockReleases, mockInstalled, null, installingSet);
    const v102 = result.find((v) => v.tagName === "GE-Proton10-2");

    expect(v102?.status).toBe("installing");
  });

  it("installing takes precedence over available", () => {
    const installingSet = new Set(["GE-Proton9-9"]);
    const result = mergeVersions(mockReleases, mockInstalled, null, installingSet);
    const v9 = result.find((v) => v.tagName === "GE-Proton9-9");

    expect(v9?.status).toBe("installing");
  });
});

describe("groupVersions", () => {
  it("groups by major version", () => {
    const versions = mergeVersions(mockReleases, mockInstalled, null);
    const groups = groupVersions(versions);

    const categories = groups.map((g) => g.category);
    expect(categories).toContain("GE-Proton10");
    expect(categories).toContain("GE-Proton9");
    expect(categories).toContain("GE-Proton8");
  });

  it("sorts groups by major version descending", () => {
    const versions = mergeVersions(mockReleases, mockInstalled, null);
    const groups = groupVersions(versions);

    const categories = groups.map((g) => g.category);
    expect(categories.indexOf("GE-Proton10")).toBeLessThan(categories.indexOf("GE-Proton9"));
    expect(categories.indexOf("GE-Proton9")).toBeLessThan(categories.indexOf("GE-Proton8"));
  });

  it("preserves version order within groups", () => {
    const versions = mergeVersions(mockReleases, [], null);
    const groups = groupVersions(versions);

    const ge9 = groups.find((g) => g.category === "GE-Proton9");
    const names = ge9!.versions.map((v) => v.tagName);
    expect(names.indexOf("GE-Proton9-27")).toBeLessThan(names.indexOf("GE-Proton9-9"));
  });

  it("handles empty input", () => {
    const groups = groupVersions([]);
    expect(groups).toEqual([]);
  });
});
