import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/tauri";
import { useCompatStore } from "../stores/compatStore";
import { useProfileStore } from "../stores/profileStore";
import GameLaunchView from "./GameLaunchView";

vi.mock("../lib/tauri");

const mockedApi = vi.mocked(api);

describe("GameLaunchView", () => {
  beforeEach(() => {
    mockedApi.getLaunchContext.mockReset();
    mockedApi.listProtonVersions.mockReset();
    mockedApi.listProfiles.mockReset();
    mockedApi.getSettings.mockReset();
    mockedApi.launchGame.mockReset();
    mockedApi.abortLaunch.mockReset();

    mockedApi.getLaunchContext.mockResolvedValue(null);
    mockedApi.listProtonVersions.mockResolvedValue([]);
    mockedApi.listProfiles.mockResolvedValue([]);
    mockedApi.getSettings.mockResolvedValue({
      activeCompatTool: null,
      compatToolSources: [],
    });
    mockedApi.launchGame.mockResolvedValue(undefined);
    mockedApi.abortLaunch.mockResolvedValue(undefined);

    useProfileStore.setState({
      profiles: [],
      activeProfile: null,
      envVars: [],
      protonVersion: null,
      protonPath: null,
    });
    useCompatStore.setState({
      globalCompatTool: null,
      initialized: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows standalone mode message when no launch context", () => {
    render(<GameLaunchView />);
    expect(screen.getByText(/Standalone mode/)).toBeInTheDocument();
  });

  it("does not show abort button in standalone mode", () => {
    render(<GameLaunchView />);
    expect(screen.queryByRole("button", { name: "Abort" })).not.toBeInTheDocument();
  });

  it("shows abort button when launched as compat tool", async () => {
    mockedApi.getLaunchContext.mockResolvedValue({
      verb: "waitforexitandrun",
      gamePath: "/path/to/game.exe",
      steamAppId: "620",
      steamCompatDataPath: "/compat",
      steamClientInstallPath: "/steam",
    });

    render(<GameLaunchView />);

    const abortBtn = await screen.findByText("Abort");
    expect(abortBtn).toBeInTheDocument();
  });

  it("shows game path when launch context is present", async () => {
    mockedApi.getLaunchContext.mockResolvedValue({
      verb: "waitforexitandrun",
      gamePath: "/path/to/game.exe",
      steamAppId: "620",
      steamCompatDataPath: "/compat",
      steamClientInstallPath: "/steam",
    });

    render(<GameLaunchView />);

    expect(await screen.findByText("/path/to/game.exe")).toBeInTheDocument();
    expect(screen.getByText("App ID: 620")).toBeInTheDocument();
  });

  it("disables launch button when no compat tool selected", () => {
    render(<GameLaunchView />);
    const btn = screen.getByText("No Compatibility Tool");
    expect(btn).toBeInTheDocument();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
