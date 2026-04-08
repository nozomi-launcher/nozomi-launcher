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
  createdAt: string;
  updatedAt: string;
}
