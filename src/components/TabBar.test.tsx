import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../stores/appStore";
import TabBar from "./TabBar";

describe("TabBar", () => {
  beforeEach(() => {
    useAppStore.setState({ activeTab: "launch" });
  });

  afterEach(cleanup);

  it("renders all tabs", () => {
    render(<TabBar />);
    expect(screen.getByText("Game Launch")).toBeInTheDocument();
    expect(screen.getByText("Modding")).toBeInTheDocument();
    expect(screen.getByText("Compatibility Tools")).toBeInTheDocument();
    expect(screen.getByText("Profiles")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights the active tab", () => {
    render(<TabBar />);
    const activeTab = screen.getByText("Game Launch").closest("[data-tab-id]");
    expect(activeTab?.className).toContain("text-steam-accent");
  });
});
