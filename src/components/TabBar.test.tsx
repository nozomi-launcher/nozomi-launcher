import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
