import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the CodeMirror wrapper so EditorPane logic (autosave, AI flow) is testable without mounting
// the real editor (CodeMirror doesn't render reliably in jsdom). The mock is a plain textarea.
vi.mock("@uiw/react-codemirror", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="cm-mock" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// Stub the real API client — transform + autosave PATCH go through it now.
vi.mock("@/lib/api/endpoints", () => ({
  aiApi: { transform: vi.fn(), revise: vi.fn(), notePilotStream: vi.fn() },
  notesApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  foldersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deletePreview: vi.fn(), remove: vi.fn() },
  prefsApi: { get: vi.fn(), update: vi.fn() },
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(),
}));

import { EditorPane } from "@/components/editor/EditorPane";
import { useNotesStore } from "@/lib/store/notesStore";
import { usePrefsStore } from "@/lib/store/prefsStore";
import { useReviewStore } from "@/lib/store/reviewStore";
import { useEditorStore } from "@/lib/store/editorStore";
import { aiApi, notesApi } from "@/lib/api/endpoints";
import { MOCK_FOLDERS, MOCK_NOTES, MOCK_PREFERENCES, toSummary } from "@/lib/mock/data";
import type { Note } from "@/lib/api/types";

const note: Note = {
  id: "n-test",
  title: "Test Note",
  content: "first line",
  folder_id: null,
  user_id: "u1",
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.mocked(notesApi.update).mockResolvedValue({ ...note } as Note);
  vi.mocked(aiApi.transform).mockResolvedValue({
    output: "## Structured Notes\n- first line",
    action: "format",
    scope: "document",
  });
  useNotesStore.setState({
    folders: [...MOCK_FOLDERS],
    noteSummaries: [toSummary(note), ...MOCK_NOTES.map(toSummary)],
    notesById: { "n-test": note, ...Object.fromEntries(MOCK_NOTES.map((n) => [n.id, n])) },
    activeNoteId: "n-test",
    activeNote: note,
    loaded: true,
  });
  usePrefsStore.setState({ prefs: { ...MOCK_PREFERENCES, notepilot_enabled: false } });
  useReviewStore.setState({ open: false, scope: "selection", action: null, original: "", output: "", loading: false, selectionRange: null });
  useEditorStore.getState().loadContent(note.content);
});

afterEach(() => vi.useRealTimers());

describe("EditorPane — autosave (REQ-SAVE-*)", () => {
  it("debounces edits and persists via PATCH after 1s of inactivity (REQ-SAVE-01)", async () => {
    render(<EditorPane note={note} />);
    fireEvent.change(screen.getByTestId("cm-mock"), { target: { value: "first line edited" } });
    expect(useEditorStore.getState().saveState).toBe("idle");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000); // debounce → PATCH /notes/{id}
      await Promise.resolve();
    });

    expect(notesApi.update).toHaveBeenCalledWith("n-test", { title: "Test Note", content: "first line edited" });
    expect(useEditorStore.getState().saveState).toBe("saved");
    expect(useNotesStore.getState().notesById["n-test"].content).toBe("first line edited");
  });
});

describe("EditorPane — full-document AI flow (REQ-AIA-04, REQ-REV-*)", () => {
  it("runs a doc action, previews output, and accepts to replace content", async () => {
    render(<EditorPane note={note} />);

    fireEvent.click(screen.getByTestId("doc-action-trigger"));
    fireEvent.click(screen.getByText("Format"));

    // Review opens in loading state (REQ-REV-07), then the AI output arrives.
    expect(useReviewStore.getState().open).toBe(true);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useReviewStore.getState().loading).toBe(false);
    expect(aiApi.transform).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Accept"));
    expect(useEditorStore.getState().content).toContain("Structured Notes");
  });
});
