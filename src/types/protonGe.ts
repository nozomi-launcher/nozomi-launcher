export interface ProtonGeRelease {
  tagName: string;
  publishedAt: string;
  downloadUrl: string;
  assetSize: number;
}

export type ProtonGeStatus = "available" | "installed" | "selected";

export interface ProtonGeVersion {
  tagName: string;
  publishedAt: string | null;
  status: ProtonGeStatus;
}

export interface ProtonGeGroup {
  majorVersion: string;
  versions: ProtonGeVersion[];
}
