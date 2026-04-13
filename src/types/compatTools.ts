export interface CompatToolRelease {
  tagName: string;
  publishedAt: string;
  downloadUrl: string;
  assetSize: number;
  sourceName?: string | null;
  category?: string | null;
}

export interface SourceStatus {
  sourceName: string;
  url: string;
  success: boolean;
  releaseCount: number;
  error: string | null;
  category?: string | null;
  lastCheckedEpochSecs?: number | null;
  fromCache: boolean;
}

export interface FetchCompatToolsResult {
  releases: CompatToolRelease[];
  sourceStatus: SourceStatus[];
  lastCheckedEpochSecs?: number | null;
}

export type CompatToolStatus = "available" | "installed" | "selected" | "installing";

export interface CompatToolVersion {
  tagName: string;
  publishedAt: string | null;
  status: CompatToolStatus;
  sourceName?: string | null;
  category?: string | null;
}

export interface CompatToolGroup {
  category: string;
  versions: CompatToolVersion[];
}

export interface InstallProgress {
  tagName: string;
  stage: "downloading" | "extracting" | "done" | "error";
  bytesDownloaded: number;
  totalBytes: number;
  progressPct: number;
}
