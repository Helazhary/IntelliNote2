import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AIReviewPanel } from "@/components/review/AIReviewPanel";

function setup(overrides: Partial<React.ComponentProps<typeof AIReviewPanel>> = {}) {
  const props = {
    open: true,
    scope: "selection" as const,
    original: "original text",
    output: "ai output",
    loading: false,
    isMobile: false,
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onEditOutput: vi.fn(),
    onRevise: vi.fn(),
    onCopy: vi.fn(),
    ...overrides,
  };
  render(<AIReviewPanel {...props} />);
  return props;
}

describe("AIReviewPanel (REQ-REV-*)", () => {
  it("shows a loading state while processing (REQ-REV-07)", () => {
    setup({ loading: true });
    expect(screen.getByTestId("review-loading")).toBeInTheDocument();
  });

  it("accepts the output, replacing only the targeted text (REQ-REV-02)", () => {
    const props = setup();
    fireEvent.click(screen.getByText("Accept"));
    expect(props.onAccept).toHaveBeenCalledWith("ai output");
  });

  it("rejects without modifying content (REQ-REV-03)", () => {
    const props = setup();
    fireEvent.click(screen.getByText("Reject"));
    expect(props.onReject).toHaveBeenCalled();
  });

  it("makes the output editable in-panel and accepts the edited text (REQ-REV-04, DEC-008)", () => {
    const props = setup();
    fireEvent.click(screen.getByText("Edit suggestion"));
    const ta = screen.getByTestId("review-editable-output") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "edited output" } });
    fireEvent.click(screen.getByText("Accept"));
    expect(props.onAccept).toHaveBeenCalledWith("edited output");
  });

  it("requires typing + submitting a follow-up to revise (REQ-REV-05)", () => {
    const props = setup();
    fireEvent.click(screen.getByText("Ask AI to revise"));
    const input = screen.getByTestId("revise-input");
    fireEvent.change(input, { target: { value: "make it shorter" } });
    fireEvent.click(screen.getByText("Submit revision"));
    expect(props.onRevise).toHaveBeenCalledWith("make it shorter");
  });

  it("copies the output (REQ-REV-06)", () => {
    const props = setup();
    fireEvent.click(screen.getByText("Copy"));
    expect(props.onCopy).toHaveBeenCalledWith("ai output");
  });

  it("shows side-by-side diff for document scope on desktop (REQ-REV-08)", () => {
    setup({ scope: "document", isMobile: false });
    expect(screen.getByTestId("review-diff")).toBeInTheDocument();
    expect(screen.getByTestId("review-original")).toBeInTheDocument();
  });

  it("collapses to tabs for document scope on mobile (NFR-RESP-04)", () => {
    setup({ scope: "document", isMobile: true });
    expect(screen.getByTestId("review-tabs")).toBeInTheDocument();
  });
});
