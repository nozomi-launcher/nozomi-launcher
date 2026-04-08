import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EnvVarEditor from "./EnvVarEditor";
import { useProfileStore } from "../stores/profileStore";

describe("EnvVarEditor", () => {
  beforeEach(() => {
    useProfileStore.setState({ envVars: [] });
  });

  afterEach(cleanup);

  it("shows empty state message", () => {
    render(<EnvVarEditor />);
    expect(screen.getByText("No environment variables configured.")).toBeInTheDocument();
  });

  it("adds an env var when clicking Add", () => {
    render(<EnvVarEditor />);
    fireEvent.click(screen.getByText("+ Add"));
    expect(useProfileStore.getState().envVars).toHaveLength(1);
  });

  it("renders env var inputs", () => {
    useProfileStore.setState({
      envVars: [{ key: "FOO", value: "bar", enabled: true }],
    });
    render(<EnvVarEditor />);
    expect(screen.getByDisplayValue("FOO")).toBeInTheDocument();
    expect(screen.getByDisplayValue("bar")).toBeInTheDocument();
  });

  it("removes an env var", () => {
    useProfileStore.setState({
      envVars: [{ key: "A", value: "1", enabled: true }],
    });
    render(<EnvVarEditor />);
    fireEvent.click(screen.getByText("Remove"));
    expect(useProfileStore.getState().envVars).toHaveLength(0);
  });
});
