export interface EnvVar {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  envVars: EnvVar[];
  protonVersion: string | null;
  /** Steam app ID this profile is associated with; auto-applies on launch for the matching game. */
  steamAppId: string | null;
  createdAt: string;
  updatedAt: string;
}
