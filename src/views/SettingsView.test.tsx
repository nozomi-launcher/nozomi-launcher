import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/tauri";
import { useCompatToolsStore } from "../stores/compatToolsStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppSettings } from "../types/settings";
import SettingsView from "./SettingsView";

vi.mock("../lib/tauri");

const mockedApi = vi.mocked(api);

function baseSettings(sources: AppSettings["compatToolSources"] = []): AppSettings {
  return { activeCompatTool: null, compatToolSources: sources };
}

describe("SettingsView", () => {
  beforeEach(() => {
    mockedApi.getSettings.mockReset();
    mockedApi.updateSettings.mockReset();
    mockedApi.fetchCompatTools.mockReset();

    mockedApi.getSettings.mockResolvedValue(baseSettings());
    mockedApi.updateSettings.mockImplementation(async (patch) => ({
      ...baseSettings(),
      ...patch,
    }));
    mockedApi.fetchCompatTools.mockResolvedValue({
      releases: [],
      sourceStatus: [],
    });

    useSettingsStore.setState({ sources: [], initialized: true });
    useCompatToolsStore.setState({
      releases: [],
      sourceStatus: [
        {
          sourceName: "Proton-GE Official",
          url: "https://raw.githubusercontent.com/nozomi-launcher/nozomi-launcher/main/manifests/proton-ge.json",
          success: true,
          releaseCount: 42,
          error: null,
          fromCache: false,
        },
      ],
      installedVersions: [],
      lastCheckedEpochSecs: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the default source as locked with its URL and status", () => {
    render(<SettingsView />);
    expect(screen.getByText("Proton-GE Official")).toBeInTheDocument();
    expect(
      screen.getByText(
        "https://raw.githubusercontent.com/nozomi-launcher/nozomi-launcher/main/manifests/proton-ge.json",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/42 releases/)).toBeInTheDocument();

    const defaultBlock = screen.getByTestId("default-source");
    expect(defaultBlock.textContent).toContain("Default");
    expect(defaultBlock.querySelector("button[data-focusable]")).toBeNull();
  });

  it("shows Add Manifest Source button initially", () => {
    render(<SettingsView />);
    expect(screen.getByText("+ Add Manifest Source")).toBeInTheDocument();
  });

  it("clicking Add shows the name + URL inputs", () => {
    render(<SettingsView />);
    fireEvent.click(screen.getByText("+ Add Manifest Source"));
    expect(screen.getByPlaceholderText(/Source name/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Manifest URL/)).toBeInTheDocument();
  });

  it("Save button is disabled when fields are empty", () => {
    render(<SettingsView />);
    fireEvent.click(screen.getByText("+ Add Manifest Source"));
    const saveBtn = screen.getByText("Save") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("adds a new source and clears the form", async () => {
    render(<SettingsView />);
    fireEvent.click(screen.getByText("+ Add Manifest Source"));

    fireEvent.change(screen.getByPlaceholderText(/Source name/), {
      target: { value: "CachyOS Proton" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Manifest URL/), {
      target: { value: "https://example.com/cachy.json" },
    });

    fireEvent.click(screen.getByText("Save"));

    await Promise.resolve();
    await Promise.resolve();

    const state = useSettingsStore.getState();
    expect(state.sources).toHaveLength(1);
    expect(state.sources[0]).toMatchObject({
      name: "CachyOS Proton",
      url: "https://example.com/cachy.json",
      enabled: true,
    });
    expect(mockedApi.updateSettings).toHaveBeenCalled();
    expect(mockedApi.fetchCompatTools).toHaveBeenCalled();
  });

  it("Cancel discards the form", () => {
    render(<SettingsView />);
    fireEvent.click(screen.getByText("+ Add Manifest Source"));

    fireEvent.change(screen.getByPlaceholderText(/Source name/), {
      target: { value: "typed" },
    });
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByPlaceholderText(/Source name/)).toBeNull();
    expect(screen.getByText("+ Add Manifest Source")).toBeInTheDocument();
  });

  it("renders existing extra sources with Disable and Remove buttons", () => {
    useSettingsStore.setState({
      sources: [
        {
          id: "cachy",
          name: "CachyOS Proton",
          url: "https://example.com/cachy.json",
          enabled: true,
        },
      ],
      initialized: true,
    });
    useCompatToolsStore.setState({
      sourceStatus: [
        {
          sourceName: "CachyOS Proton",
          url: "https://example.com/cachy.json",
          success: true,
          releaseCount: 8,
          error: null,
          fromCache: false,
        },
      ],
    });

    render(<SettingsView />);
    expect(screen.getByText("CachyOS Proton")).toBeInTheDocument();
    expect(screen.getByText(/8 releases/)).toBeInTheDocument();
    expect(screen.getByText("Disable")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("removes a source when Remove is clicked", async () => {
    useSettingsStore.setState({
      sources: [
        {
          id: "cachy",
          name: "CachyOS Proton",
          url: "https://example.com/cachy.json",
          enabled: true,
        },
      ],
      initialized: true,
    });

    render(<SettingsView />);
    fireEvent.click(screen.getByText("Remove"));

    await Promise.resolve();
    await Promise.resolve();

    expect(useSettingsStore.getState().sources).toHaveLength(0);
    expect(mockedApi.updateSettings).toHaveBeenCalledWith({ compatToolSources: [] });
    expect(mockedApi.fetchCompatTools).toHaveBeenCalled();
  });

  it("toggles a source when Disable/Enable is clicked", async () => {
    useSettingsStore.setState({
      sources: [
        {
          id: "cachy",
          name: "CachyOS Proton",
          url: "https://example.com/cachy.json",
          enabled: true,
        },
      ],
      initialized: true,
    });

    render(<SettingsView />);
    fireEvent.click(screen.getByText("Disable"));

    await Promise.resolve();
    await Promise.resolve();

    expect(useSettingsStore.getState().sources[0].enabled).toBe(false);
    expect(mockedApi.fetchCompatTools).toHaveBeenCalled();
  });

  it("shows error status for failed sources", () => {
    useSettingsStore.setState({
      sources: [
        {
          id: "bad",
          name: "Bad Source",
          url: "https://example.com/404",
          enabled: true,
        },
      ],
      initialized: true,
    });
    useCompatToolsStore.setState({
      sourceStatus: [
        {
          sourceName: "Bad Source",
          url: "https://example.com/404",
          success: false,
          releaseCount: 0,
          error: "HTTP 404",
          fromCache: false,
        },
      ],
    });

    render(<SettingsView />);
    expect(screen.getByText(/HTTP 404/)).toBeInTheDocument();
  });
});
