// QA Phase 6 (BUG-01, REQ-EDIT-01): opening a note must put the cursor in the editor so the user can
// type with no click. CodeMirror can't mount in jsdom, so we stub @uiw/react-codemirror to invoke
// onCreateEditor with a view whose focus() is a spy, then assert it's focused on mount and on every
// note switch. The full behavior is also verified live (Playwright) in docs/QA_REPORT.md.
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const focusSpy = vi.fn();

vi.mock("@uiw/react-codemirror", () => ({
  default: ({ onCreateEditor }: { onCreateEditor?: (view: unknown) => void }) => {
    useEffect(() => {
      onCreateEditor?.({ focus: focusSpy, dispatch: () => {} });
    }, [onCreateEditor]);
    return <textarea data-testid="cm-mock" />;
  },
}));

vi.mock("@/lib/api/endpoints", () => ({
  aiApi: { notePilotStream: vi.fn() },
}));

import { MarkdownEditor } from "@/components/editor/MarkdownEditor";

const baseProps = {
  value: "hello",
  onChange: () => {},
  focusPro: false,
  notePilot: { enabled: false, delayMs: 2000 },
  onSelectionChange: () => {},
};

beforeEach(() => focusSpy.mockClear());
afterEach(() => vi.clearAllMocks());

describe("MarkdownEditor autofocus (REQ-EDIT-01)", () => {
  it("focuses the editor when a note first opens", () => {
    render(<MarkdownEditor noteId="n1" {...baseProps} />);
    expect(focusSpy).toHaveBeenCalled();
  });

  it("re-focuses the editor when switching to another note", () => {
    const { rerender } = render(<MarkdownEditor noteId="n1" {...baseProps} />);
    focusSpy.mockClear();
    rerender(<MarkdownEditor noteId="n2" {...baseProps} />);
    expect(focusSpy).toHaveBeenCalled();
  });
});
