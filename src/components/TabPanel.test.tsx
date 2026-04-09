import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

  it("sets aria-hidden and inert when inactive", () => {
    render(
      <TabPanel active={false}>
        <p>Hidden</p>
      </TabPanel>,
    );
    const panel = screen.getByText("Hidden").parentElement;
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveAttribute("inert");
  });

  it("does not set aria-hidden or inert when active", () => {
    render(
      <TabPanel active={true}>
        <p>Visible</p>
      </TabPanel>,
    );
    const panel = screen.getByText("Visible").parentElement;
    expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(panel).not.toHaveAttribute("inert");
  });
});
