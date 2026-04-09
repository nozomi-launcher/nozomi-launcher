import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Layout from "./Layout";
import { useAppStore } from "../stores/appStore";

describe("Layout", () => {
  afterEach(() => {
    useAppStore.setState({ activeTab: "launch" });
    cleanup();
  });

  it("renders children", () => {
    render(
      <Layout>
        <p>Child content</p>
      </Layout>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders TabBar", () => {
    render(
      <Layout>
        <div />
      </Layout>,
    );
    expect(screen.getByText("Game Launch")).toBeInTheDocument();
  });

  it("has main element with relative positioning class", () => {
    render(
      <Layout>
        <p data-testid="child">Content</p>
      </Layout>,
    );
    const main = screen.getByTestId("child").closest("main");
    expect(main?.className).toContain("relative");
  });
});
