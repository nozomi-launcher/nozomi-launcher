import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TabBar from "./TabBar";
import { useAppStore } from "../stores/appStore";

describe("TabBar", () => {
  beforeEach(() => {
    useAppStore.setState({ activeTab: "launch" });
  });

  afterEach(cleanup);

  it("renders all three tabs", () => {
    render(<TabBar />);
    expect(screen.getByText("Game Launch")).toBeInTheDocument();
    expect(screen.getByText("Modding")).toBeInTheDocument();
    expect(screen.getByText("Profiles")).toBeInTheDocument();
  });

  it("switches tab on click", () => {
    render(<TabBar />);
    fireEvent.click(screen.getByText("Profiles"));
    expect(useAppStore.getState().activeTab).toBe("profiles");
  });

  it("all tabs have data-focusable attribute", () => {
    render(<TabBar />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("data-focusable");
    }
  });
});
