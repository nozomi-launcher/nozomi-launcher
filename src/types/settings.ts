export interface CompatToolSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface AppSettings {
  activeCompatTool: string | null;
  compatToolSources: CompatToolSource[];
}
