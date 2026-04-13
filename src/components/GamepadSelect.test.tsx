import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useInputStore } from "../stores/inputStore";
import GamepadSelect from "./GamepadSelect";

const options = [
  { value: "", label: "None" },
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
];

describe("GamepadSelect", () => {
  afterEach(() => {
    useInputStore.setState({
      inputMode: "keyboard",
      controllerType: null,
    });
    cleanup();
  });

  it("renders with placeholder when no value selected", () => {
    render(
      <GamepadSelect
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ]}
        value=""
        onChange={() => {}}
        placeholder="Pick one"
      />,
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("renders selected option label", () => {
    render(<GamepadSelect options={options} value="a" onChange={() => {}} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows options", () => {
    render(<GamepadSelect options={options} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("selects an option on click", () => {
    let selected = "";
    render(
      <GamepadSelect
        options={options}
        value=""
        onChange={(v) => {
          selected = v;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Option B"));
    expect(selected).toBe("b");
  });

  it("closes on Escape", () => {
    render(<GamepadSelect options={options} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("trigger button is rendered as a button", () => {
    render(<GamepadSelect options={options} value="" onChange={() => {}} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
