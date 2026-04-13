import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useCompatStore } from "../stores/compatStore";
import { useCompatToolsStore } from "../stores/compatToolsStore";
import CompatToolsView from "./CompatToolsView";

describe("CompatToolsView", () => {
  beforeEach(() => {
    useCompatToolsStore.setState({
      releases: [
        {
          tagName: "GE-Proton10-1",
          publishedAt: "2026-04-05T14:00:00Z",
          downloadUrl: "https://example.com/GE-Proton10-1.tar.gz",
          assetSize: 410000000,
        },
        {
          tagName: "GE-Proton9-27",
          publishedAt: "2026-04-01T12:00:00Z",
          downloadUrl: "https://example.com/GE-Proton9-27.tar.gz",
          assetSize: 400000000,
        },
        {
          tagName: "GE-Proton9-26",
          publishedAt: "2026-03-15T10:00:00Z",
          downloadUrl: "https://example.com/GE-Proton9-26.tar.gz",
          assetSize: 390000000,
        },
      ],
      installedVersions: [
        {
          name: "GE-Proton9-27",
          path: "/home/user/.steam/root/compatibilitytools.d/GE-Proton9-27",
        },
      ],
      lastCheckedEpochSecs: null,
      isLoading: false,
      error: null,
      installing: new Map(),
      fetchReleases: async () => {},
      fetchInstalled: async () => {},
      installTool: async () => {},
      uninstallTool: async () => {},
    });
    useCompatStore.setState({
      globalCompatTool: "GE-Proton9-27",
      initialized: true,
      setGlobalCompatTool: async () => {},
    });
  });

  afterEach(cleanup);

  it("renders the heading", () => {
    render(<CompatToolsView />);
    expect(screen.getByText("Compatibility Tools")).toBeInTheDocument();
  });

  it("renders major version sidebar items", () => {
    render(<CompatToolsView />);
    expect(screen.getByText("GE-Proton10")).toBeInTheDocument();
    expect(screen.getByText("GE-Proton9")).toBeInTheDocument();
  });

  it("auto-selects first major version and shows its versions", () => {
    render(<CompatToolsView />);
    expect(screen.getByText("GE-Proton10-1")).toBeInTheDocument();
  });

  it("clicking a sidebar item shows that group's versions", () => {
    render(<CompatToolsView />);
    fireEvent.click(screen.getByText("GE-Proton9"));
    expect(screen.getByText("GE-Proton9-27")).toBeInTheDocument();
    expect(screen.getByText("GE-Proton9-26")).toBeInTheDocument();
  });

  it("shows Active badge for the globally active version", () => {
    render(<CompatToolsView />);
    fireEvent.click(screen.getByText("GE-Proton9"));
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows Activate button for installed but non-active versions", () => {
    useCompatStore.setState({ globalCompatTool: "GE-Proton10-1" });
    useCompatToolsStore.setState({
      installedVersions: [
        { name: "GE-Proton9-27", path: "/path/GE-Proton9-27" },
        { name: "GE-Proton10-1", path: "/path/GE-Proton10-1" },
      ],
    });
    render(<CompatToolsView />);
    fireEvent.click(screen.getByText("GE-Proton9"));
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });

  it("refresh button is rendered", () => {
    render(<CompatToolsView />);
    const refreshBtn = screen.getByRole("button", { name: "Refresh" });
    expect(refreshBtn).toBeInTheDocument();
  });

  it("shows last checked timestamp", () => {
    render(<CompatToolsView />);
    expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useCompatToolsStore.setState({
      releases: [],
      installedVersions: [],
      isLoading: true,
      installing: new Map(),
      fetchReleases: async () => {},
      fetchInstalled: async () => {},
      installTool: async () => {},
      uninstallTool: async () => {},
    });
    render(<CompatToolsView />);
    expect(screen.getByText("Loading releases...")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error message", () => {
    useCompatToolsStore.setState({
      error: "Network error",
      installing: new Map(),
      fetchReleases: async () => {},
      fetchInstalled: async () => {},
      installTool: async () => {},
      uninstallTool: async () => {},
    });
    render(<CompatToolsView />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when no versions", () => {
    useCompatToolsStore.setState({
      releases: [],
      installedVersions: [],
      isLoading: false,
      installing: new Map(),
      fetchReleases: async () => {},
      fetchInstalled: async () => {},
      installTool: async () => {},
      uninstallTool: async () => {},
    });
    render(<CompatToolsView />);
    expect(screen.getByText("No versions found.")).toBeInTheDocument();
  });

  it("shows Install button for available versions", () => {
    render(<CompatToolsView />);
    // GE-Proton10-1 is available (not installed)
    expect(screen.getByText("Install")).toBeInTheDocument();
  });

  it("shows Uninstall button for installed versions", () => {
    render(<CompatToolsView />);
    fireEvent.click(screen.getByText("GE-Proton9"));
    expect(screen.getByText("Uninstall")).toBeInTheDocument();
  });

  it("shows Installing badge for versions being installed", () => {
    useCompatToolsStore.setState({
      installing: new Map([
        [
          "GE-Proton10-1",
          {
            tagName: "GE-Proton10-1",
            stage: "downloading",
            bytesDownloaded: 100000000,
            totalBytes: 410000000,
            progressPct: 24.4,
          },
        ],
      ]),
    });
    render(<CompatToolsView />);
    expect(screen.getByText("Installing")).toBeInTheDocument();
    expect(screen.getByText("Downloading...")).toBeInTheDocument();
  });

  it("error toast can be dismissed", () => {
    useCompatToolsStore.setState({
      error: "Some error",
      installing: new Map(),
      fetchReleases: async () => {},
      fetchInstalled: async () => {},
      installTool: async () => {},
      uninstallTool: async () => {},
    });
    render(<CompatToolsView />);
    expect(screen.getByText("Some error")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Dismiss error"));
    expect(screen.queryByText("Some error")).not.toBeInTheDocument();
  });

  it("renders footer with button prompts", () => {
    render(<CompatToolsView />);
    expect(screen.getByText("Select")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getAllByText("Refresh").length).toBeGreaterThanOrEqual(1);
  });
});
