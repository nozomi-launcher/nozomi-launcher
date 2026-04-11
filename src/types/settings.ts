export interface ProtonManifestSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface AppSettings {
  activeCompatTool: string | null;
  protonManifestSources: ProtonManifestSource[];
}
