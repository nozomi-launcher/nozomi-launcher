import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ModdingView from "./ModdingView";

describe("ModdingView", () => {
  afterEach(cleanup);

  it("shows coming soon message", () => {
    render(<ModdingView />);
    expect(screen.getByText("Modding support coming soon.")).toBeInTheDocument();
  });

  it("has a heading", () => {
    render(<ModdingView />);
    expect(screen.getByRole("heading", { name: "Modding" })).toBeInTheDocument();
  });
});
