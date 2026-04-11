export interface ProtonGeRelease {
  tagName: string;
  publishedAt: string;
  downloadUrl: string;
  assetSize: number;
  sourceName?: string | null;
}

export interface SourceStatus {
  sourceName: string;
  url: string;
  success: boolean;
  releaseCount: number;
  error: string | null;
}

export interface FetchReleasesResult {
  releases: ProtonGeRelease[];
  sourceStatus: SourceStatus[];
}

export type ProtonGeStatus = "available" | "installed" | "selected";

export interface ProtonGeVersion {
  tagName: string;
  publishedAt: string | null;
  status: ProtonGeStatus;
  sourceName?: string | null;
}

export interface ProtonGeGroup {
  majorVersion: string;
  versions: ProtonGeVersion[];
}
