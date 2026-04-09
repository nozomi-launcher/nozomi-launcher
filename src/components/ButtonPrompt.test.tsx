import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useInputStore } from "../stores/inputStore";
import ButtonPrompt from "./ButtonPrompt";

describe("ButtonPrompt", () => {
  afterEach(() => {
    useInputStore.setState({ inputMode: "keyboard", controllerType: null });
    cleanup();
  });

  it("renders glyph and label together", () => {
    render(<ButtonPrompt action="CONFIRM" label="Select" />);
    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("shows gamepad glyph in gamepad mode", () => {
    useInputStore.setState({ inputMode: "gamepad", controllerType: "xbox" });
    render(<ButtonPrompt action="CONFIRM" label="Select" />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ButtonPrompt action="CANCEL" label="Back" className="my-class" />,
    );
    const span = container.firstElementChild;
    expect(span?.className).toContain("my-class");
  });
});
