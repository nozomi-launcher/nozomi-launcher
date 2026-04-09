import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "../stores/appStore";
import Layout from "./Layout";

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
