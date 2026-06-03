import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectionToolbar } from "@/components/editor/SelectionToolbar";

const rect = { top: 100, left: 50, width: 40, height: 20, right: 90, bottom: 120, x: 50, y: 100, toJSON: () => ({}) } as DOMRect;

describe("SelectionToolbar (REQ-TBAR-*)", () => {
  it("is hidden with no selection (REQ-TBAR-04)", () => {
    const { container } = render(<SelectionToolbar anchorRect={null} selectedText="" onAction={() => {}} isMobile={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows exactly 4 default actions + More (REQ-TBAR-02, DEC-007)", () => {
    render(<SelectionToolbar anchorRect={rect} selectedText="hello" onAction={() => {}} isMobile={false} />);
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Summarize")).toBeInTheDocument();
    expect(screen.getByText("Enhance")).toBeInTheDocument();
    expect(screen.getByText("Custom prompt")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-more")).toBeInTheDocument();
  });

  it("expands to all 8 actions on More (REQ-TBAR-03)", () => {
    render(<SelectionToolbar anchorRect={rect} selectedText="hello" onAction={() => {}} isMobile={false} />);
    fireEvent.click(screen.getByTestId("toolbar-more"));
    ["Explain", "Simplify", "Turn into bullets", "Turn into action items"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
  });

  it("fires onAction when an action is clicked", () => {
    const onAction = vi.fn();
    render(<SelectionToolbar anchorRect={rect} selectedText="hello" onAction={onAction} isMobile={false} />);
    fireEvent.click(screen.getByText("Format"));
    expect(onAction).toHaveBeenCalledWith("format");
  });
});
