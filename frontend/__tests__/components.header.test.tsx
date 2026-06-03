import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { PresetSelector } from "@/components/editor/PresetSelector";
import { FocusProToggle } from "@/components/editor/FocusProToggle";
import { DocActionMenu } from "@/components/editor/DocActionMenu";
import { ExportButton } from "@/components/editor/ExportButton";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { AI_ACTIONS } from "@/lib/constants";

describe("SaveIndicator (REQ-SAVE-03)", () => {
  it("shows saving / saved / error states", () => {
    const { rerender } = render(<SaveIndicator state="saving" onRetry={() => {}} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    rerender(<SaveIndicator state="saved" onRetry={() => {}} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    const onRetry = vi.fn();
    rerender(<SaveIndicator state="error" onRetry={onRetry} />);
    expect(screen.getByText("Error saving")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("PresetSelector (REQ-PRESET-02/03)", () => {
  it("lists all 7 presets and reports changes", () => {
    const onChange = vi.fn();
    render(<PresetSelector value="format_only" onChange={onChange} />);
    const select = screen.getByLabelText("AI behavior preset") as HTMLSelectElement;
    expect(select.options).toHaveLength(7);
    fireEvent.change(select, { target: { value: "meeting_mode" } });
    expect(onChange).toHaveBeenCalledWith("meeting_mode");
  });
});

describe("FocusProToggle (REQ-FOCUS-06)", () => {
  it("reflects state and toggles", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<FocusProToggle enabled={false} onToggle={onToggle} />);
    const sw = screen.getByTestId("focuspro-toggle");
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    expect(onToggle).toHaveBeenCalled();
    rerender(<FocusProToggle enabled onToggle={onToggle} />);
    expect(screen.getByTestId("focuspro-toggle")).toHaveAttribute("aria-checked", "true");
  });
});

describe("DocActionMenu (REQ-AIA-02/04)", () => {
  it("exposes all 8 actions and routes custom to the prompt", () => {
    const onDocAction = vi.fn();
    const onOpenCustomPrompt = vi.fn();
    render(<DocActionMenu onDocAction={onDocAction} onOpenCustomPrompt={onOpenCustomPrompt} />);
    fireEvent.click(screen.getByTestId("doc-action-trigger"));
    expect(screen.getAllByRole("menuitem")).toHaveLength(AI_ACTIONS.length);
    fireEvent.click(screen.getByText("Format"));
    expect(onDocAction).toHaveBeenCalledWith("format");

    fireEvent.click(screen.getByTestId("doc-action-trigger"));
    fireEvent.click(screen.getByText("Custom prompt"));
    expect(onOpenCustomPrompt).toHaveBeenCalled();
  });
});

describe("ExportButton (REQ-EXP-01/02)", () => {
  it("offers md/html/txt and reports the chosen format", () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} />);
    fireEvent.click(screen.getByTestId("export-trigger"));
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    fireEvent.click(screen.getByText("HTML"));
    expect(onExport).toHaveBeenCalledWith("html");
  });
});

describe("EditorHeader", () => {
  const baseProps = {
    title: "My note",
    saveState: "idle" as const,
    onTitleChange: vi.fn(),
    onRetrySave: vi.fn(),
    activePreset: "format_only" as const,
    onPresetChange: vi.fn(),
    focusPro: false,
    onToggleFocusPro: vi.fn(),
    onDocAction: vi.fn(),
    onOpenCustomPrompt: vi.fn(),
    onExport: vi.fn(),
  };

  it("edits the title and opens the custom prompt", () => {
    render(<EditorHeader {...baseProps} />);
    const title = screen.getByLabelText("Note title") as HTMLInputElement;
    expect(title.value).toBe("My note");
    fireEvent.change(title, { target: { value: "Renamed" } });
    expect(baseProps.onTitleChange).toHaveBeenCalledWith("Renamed");
    fireEvent.click(screen.getByTestId("custom-prompt-button"));
    expect(baseProps.onOpenCustomPrompt).toHaveBeenCalled();
  });
});
