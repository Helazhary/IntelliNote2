import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";
import { CustomPromptInput } from "@/components/editor/CustomPromptInput";
import { MOCK_PREFERENCES } from "@/lib/mock/data";

describe("PreferencesPanel (REQ-PREF-*)", () => {
  it("changes theme and preset", () => {
    const onChange = vi.fn();
    render(<PreferencesPanel open prefs={MOCK_PREFERENCES} onChange={onChange} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "lightdesk" } });
    expect(onChange).toHaveBeenCalledWith({ theme: "lightdesk" });
    fireEvent.change(screen.getByLabelText("Active preset"), { target: { value: "study_mode" } });
    expect(onChange).toHaveBeenCalledWith({ active_preset: "study_mode" });
  });

  it("shows the delay control only when NotePilot is enabled (REQ-PREF-02)", () => {
    const { rerender } = render(<PreferencesPanel open prefs={{ ...MOCK_PREFERENCES, notepilot_enabled: true }} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByTestId("notepilot-delay-setting")).toBeInTheDocument();
    rerender(<PreferencesPanel open prefs={{ ...MOCK_PREFERENCES, notepilot_enabled: false }} onChange={() => {}} onClose={() => {}} />);
    expect(screen.queryByTestId("notepilot-delay-setting")).not.toBeInTheDocument();
  });

  it("toggles FocusPro", () => {
    const onChange = vi.fn();
    render(<PreferencesPanel open prefs={MOCK_PREFERENCES} onChange={onChange} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText("FocusPro mode"));
    expect(onChange).toHaveBeenCalledWith({ focuspro_enabled: true });
  });
});

describe("CustomPromptInput (REQ-CPMT-01/02)", () => {
  it("disables submit until text is entered, then submits", () => {
    const onSubmit = vi.fn();
    render(<CustomPromptInput open onSubmit={onSubmit} onCancel={() => {}} />);
    const run = screen.getByText("Run") as HTMLButtonElement;
    expect(run).toBeDisabled();
    fireEvent.change(screen.getByTestId("custom-prompt-input"), { target: { value: "make it formal" } });
    expect(run).not.toBeDisabled();
    fireEvent.click(run);
    expect(onSubmit).toHaveBeenCalledWith("make it formal");
  });

  // QA Phase 6 (BUG-02): the toolbar's selection-scoped custom prompt must not claim to act on the
  // whole note — its copy has to say "selected text", not "entire note" (REQ-CPMT-03).
  it("labels the dialog by scope — document vs selection (REQ-CPMT-03)", () => {
    const { rerender } = render(<CustomPromptInput open scope="document" onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Custom prompt — entire note")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Custom prompt for the whole document");

    rerender(<CustomPromptInput open scope="selection" onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Custom prompt — selected text")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Custom prompt for the selected text");
  });
});
