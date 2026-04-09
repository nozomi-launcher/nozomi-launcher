import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ButtonGlyph from "./ButtonGlyph";
import { useInputStore } from "../stores/inputStore";

describe("ButtonGlyph", () => {
  afterEach(() => {
    useInputStore.setState({
      inputMode: "keyboard",
      controllerType: null,
    });
    cleanup();
  });

  it("shows keyboard label in keyboard mode", () => {
    useInputStore.setState({ inputMode: "keyboard" });
    render(<ButtonGlyph action="CONFIRM" />);
    expect(screen.getByText("Enter")).toBeInTheDocument();
  });

  it("shows Xbox label with xbox controller", () => {
    useInputStore.setState({ inputMode: "gamepad", controllerType: "xbox" });
    render(<ButtonGlyph action="CONFIRM" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows PlayStation label with playstation controller", () => {
    useInputStore.setState({
      inputMode: "gamepad",
      controllerType: "playstation",
    });
    render(<ButtonGlyph action="CONFIRM" />);
    expect(screen.getByText("Cross")).toBeInTheDocument();
  });

  it("shows Nintendo label with nintendo controller", () => {
    useInputStore.setState({
      inputMode: "gamepad",
      controllerType: "nintendo",
    });
    render(<ButtonGlyph action="CANCEL" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders as kbd element", () => {
    render(<ButtonGlyph action="CONFIRM" />);
    const el = screen.getByText("Enter");
    expect(el.tagName).toBe("KBD");
  });
});
