import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkspacePage from "./page";

// Phase 2 skeleton smoke test. Component-level tests for interactive components land in Phase 3.
describe("WorkspacePage", () => {
  it("renders the app name", () => {
    render(<WorkspacePage />);
    expect(screen.getByText("SmartNotes AI")).toBeInTheDocument();
  });
});
