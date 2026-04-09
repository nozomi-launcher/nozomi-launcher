import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TabPanel from "./TabPanel";

describe("TabPanel", () => {
  afterEach(cleanup);

  it("renders children", () => {
    render(
      <TabPanel active={true}>
        <p>Content</p>
      </TabPanel>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("sets data-tab-active to true when active", () => {
    render(
      <TabPanel active={true}>
        <p>Active</p>
      </TabPanel>,
    );
    const panel = screen.getByText("Active").parentElement;
    expect(panel).toHaveAttribute("data-tab-active", "true");
  });

  it("sets data-tab-active to false when inactive", () => {
    render(
      <TabPanel active={false}>
        <p>Inactive</p>
      </TabPanel>,
    );
    const panel = screen.getByText("Inactive").parentElement;
    expect(panel).toHaveAttribute("data-tab-active", "false");
  });

  it("has pointer-events-none when inactive", () => {
    render(
      <TabPanel active={false}>
        <p>Hidden</p>
      </TabPanel>,
    );
    const panel = screen.getByText("Hidden").parentElement;
    expect(panel?.className).toContain("pointer-events-none");
  });

  it("has pointer-events-auto when active", () => {
    render(
      <TabPanel active={true}>
        <p>Visible</p>
      </TabPanel>,
    );
    const panel = screen.getByText("Visible").parentElement;
    expect(panel?.className).toContain("pointer-events-auto");
  });
});
