export interface LaunchContext {
  verb: string;
  gamePath: string;
  steamAppId: string | null;
  steamCompatDataPath: string | null;
  steamClientInstallPath: string | null;
}

export interface ProtonVersion {
  name: string;
  path: string;
}
