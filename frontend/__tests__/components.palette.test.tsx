import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "@/components/palette/CommandPalette";
import type { NoteSummary } from "@/lib/api/types";

const notes: NoteSummary[] = [
  { id: "n1", title: "Biology Lecture", folder_id: null, updated_at: "" },
  { id: "n2", title: "Meeting Notes", folder_id: null, updated_at: "" },
];

describe("CommandPalette (REQ-CMDK-*)", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CommandPalette open={false} notes={notes} onClose={() => {}} onNavigateNote={() => {}} onAction={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists action shortcuts and notes (REQ-CMDK-04)", () => {
    render(<CommandPalette open notes={notes} onClose={() => {}} onNavigateNote={() => {}} onAction={() => {}} />);
    expect(screen.getByText("Create note")).toBeInTheDocument();
    expect(screen.getByText("Switch theme")).toBeInTheDocument();
    expect(screen.getByText("Biology Lecture")).toBeInTheDocument();
  });

  it("navigates to a note on select (REQ-CMDK-03)", () => {
    const onNavigateNote = vi.fn();
    const onClose = vi.fn();
    render(<CommandPalette open notes={notes} onClose={onClose} onNavigateNote={onNavigateNote} onAction={() => {}} />);
    fireEvent.click(screen.getByText("Meeting Notes"));
    expect(onNavigateNote).toHaveBeenCalledWith("n2");
    expect(onClose).toHaveBeenCalled();
  });

  it("fuzzy filters by typing (REQ-CMDK-02)", () => {
    render(<CommandPalette open notes={notes} onClose={() => {}} onNavigateNote={() => {}} onAction={() => {}} />);
    fireEvent.change(screen.getByTestId("palette-input"), { target: { value: "Biology" } });
    expect(screen.getByText("Biology Lecture")).toBeInTheDocument();
    expect(screen.queryByText("Meeting Notes")).not.toBeInTheDocument();
  });

  it("runs an action shortcut (REQ-CMDK-04)", () => {
    const onAction = vi.fn();
    render(<CommandPalette open notes={notes} onClose={() => {}} onNavigateNote={() => {}} onAction={onAction} />);
    fireEvent.click(screen.getByText("Switch theme"));
    expect(onAction).toHaveBeenCalledWith("switch_theme");
  });
});
