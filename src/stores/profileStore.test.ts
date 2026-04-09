import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "../types/profile";
import { useProfileStore } from "./profileStore";

describe("profileStore", () => {
  beforeEach(() => {
    useProfileStore.setState({
      profiles: [],
      activeProfile: null,
      envVars: [],
      protonVersion: null,
      protonPath: null,
    });
  });

  it("starts with empty state", () => {
    const state = useProfileStore.getState();
    expect(state.envVars).toEqual([]);
    expect(state.activeProfile).toBeNull();
    expect(state.protonVersion).toBeNull();
  });

  it("adds an env var", () => {
    useProfileStore.getState().addEnvVar();
    const envVars = useProfileStore.getState().envVars;
    expect(envVars).toHaveLength(1);
    expect(envVars[0]).toEqual({ key: "", value: "", enabled: true });
  });

  it("updates an env var field", () => {
    useProfileStore.getState().addEnvVar();
    useProfileStore.getState().updateEnvVar(0, "key", "MANGOHUD");
    useProfileStore.getState().updateEnvVar(0, "value", "1");

    const envVar = useProfileStore.getState().envVars[0];
    expect(envVar.key).toBe("MANGOHUD");
    expect(envVar.value).toBe("1");
    expect(envVar.enabled).toBe(true);
  });

  it("toggles env var enabled state", () => {
    useProfileStore.getState().addEnvVar();
    useProfileStore.getState().updateEnvVar(0, "enabled", false);
    expect(useProfileStore.getState().envVars[0].enabled).toBe(false);
  });

  it("removes an env var", () => {
    useProfileStore.getState().addEnvVar();
    useProfileStore.getState().addEnvVar();
    expect(useProfileStore.getState().envVars).toHaveLength(2);

    useProfileStore.getState().removeEnvVar(0);
    expect(useProfileStore.getState().envVars).toHaveLength(1);
  });

  it("sets proton version and path", () => {
    useProfileStore.getState().setProtonVersion("GE-Proton9-1", "/path/to/proton");
    const state = useProfileStore.getState();
    expect(state.protonVersion).toBe("GE-Proton9-1");
    expect(state.protonPath).toBe("/path/to/proton");
  });

  it("clears proton version", () => {
    useProfileStore.getState().setProtonVersion("GE-Proton9-1", "/path");
    useProfileStore.getState().setProtonVersion(null, null);
    expect(useProfileStore.getState().protonVersion).toBeNull();
    expect(useProfileStore.getState().protonPath).toBeNull();
  });

  it("applies a profile", () => {
    const profile: Profile = {
      id: "test-id",
      name: "Test",
      envVars: [{ key: "FOO", value: "bar", enabled: true }],
      protonVersion: "Proton 9.0",
      createdAt: "",
      updatedAt: "",
    };

    useProfileStore.getState().applyProfile(profile);
    const state = useProfileStore.getState();

    expect(state.activeProfile?.id).toBe("test-id");
    expect(state.envVars).toHaveLength(1);
    expect(state.envVars[0].key).toBe("FOO");
    expect(state.protonVersion).toBe("Proton 9.0");
  });

  it("applying profile deep-copies env vars", () => {
    const profile: Profile = {
      id: "test",
      name: "Test",
      envVars: [{ key: "A", value: "1", enabled: true }],
      protonVersion: null,
      createdAt: "",
      updatedAt: "",
    };

    useProfileStore.getState().applyProfile(profile);
    useProfileStore.getState().updateEnvVar(0, "value", "changed");

    // Original profile should be unchanged
    expect(profile.envVars[0].value).toBe("1");
    expect(useProfileStore.getState().envVars[0].value).toBe("changed");
  });
});
