import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
