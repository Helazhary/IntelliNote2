import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/endpoints", () => ({
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  foldersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deletePreview: vi.fn(), remove: vi.fn() },
  notesApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  prefsApi: { get: vi.fn(), update: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(),
}));

import { NoteRow } from "@/components/sidebar/NoteRow";
import { DeleteFolderDialog } from "@/components/sidebar/DeleteFolderDialog";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useNotesStore } from "@/lib/store/notesStore";
import { notesApi } from "@/lib/api/endpoints";
import { MOCK_FOLDERS, MOCK_NOTES, toSummary } from "@/lib/mock/data";
import type { Note } from "@/lib/api/types";

beforeEach(() => {
  vi.clearAllMocks();
  useNotesStore.setState({
    folders: [...MOCK_FOLDERS],
    noteSummaries: MOCK_NOTES.map(toSummary),
    notesById: Object.fromEntries(MOCK_NOTES.map((n) => [n.id, n])),
    activeNoteId: null,
    activeNote: null,
    loaded: true,
  });
  vi.mocked(notesApi.create).mockResolvedValue({
    id: "n-new", title: "", content: "", folder_id: null, user_id: "u1", created_at: "", updated_at: "",
  } as Note);
});

describe("NoteRow", () => {
  it("renders title, falls back to Untitled, and selects on click", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<NoteRow note={{ id: "1", title: "Hi", folder_id: null, updated_at: "" }} active={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Hi"));
    expect(onSelect).toHaveBeenCalledWith("1");
    rerender(<NoteRow note={{ id: "2", title: "", folder_id: null, updated_at: "" }} active onSelect={onSelect} />);
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });
});

describe("DeleteFolderDialog (REQ-FLDR-04, DEC-010)", () => {
  it("shows note count and wires confirm/cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DeleteFolderDialog open folderName="Work" noteCount={3} subfolderCount={1} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText(/3 notes/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<DeleteFolderDialog open={false} folderName="x" noteCount={0} subfolderCount={0} onConfirm={() => {}} onCancel={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("Sidebar (REQ-FLDR-06)", () => {
  it("renders Unfiled notes and top-level folders, and creates a note", async () => {
    render(<Sidebar />);
    expect(screen.getByText("Unfiled")).toBeInTheDocument();
    expect(screen.getByText("Scratchpad")).toBeInTheDocument();
    expect(screen.getByText(/University/)).toBeInTheDocument();

    const before = useNotesStore.getState().noteSummaries.length;
    fireEvent.click(screen.getByLabelText("New note"));
    await waitFor(() => expect(useNotesStore.getState().noteSummaries.length).toBe(before + 1));
    expect(notesApi.create).toHaveBeenCalledWith({ folder_id: null });
  });

  it("opens the cascade delete dialog from a folder", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getAllByLabelText("Delete folder")[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
