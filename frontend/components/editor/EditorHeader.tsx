"use client";

// EditorHeader (COMPONENT_TREE §2/§3): note title, save indicator, preset selector, FocusPro
// toggle, full-document AI menu, custom-prompt button, and export menu.
import type { AIAction, ExportFormat, Preset } from "@/lib/api/types";
import { SaveIndicator } from "./SaveIndicator";
import { PresetSelector } from "./PresetSelector";
import { FocusProToggle } from "./FocusProToggle";
import { DocActionMenu } from "./DocActionMenu";
import { ExportButton } from "./ExportButton";
import type { SaveState } from "@/lib/store/editorStore";

interface EditorHeaderProps {
  title: string;
  saveState: SaveState;
  onTitleChange: (t: string) => void;
  onRetrySave: () => void;
  activePreset: Preset;
  onPresetChange: (p: Preset) => void;
  focusPro: boolean;
  onToggleFocusPro: () => void;
  onDocAction: (action: AIAction) => void;
  onOpenCustomPrompt: () => void;
  onExport: (format: ExportFormat) => void;
  onOpenSidebar?: () => void; // mobile drawer trigger
}

export function EditorHeader({
  title,
  saveState,
  onTitleChange,
  onRetrySave,
  activePreset,
  onPresetChange,
  focusPro,
  onToggleFocusPro,
  onDocAction,
  onOpenCustomPrompt,
  onExport,
  onOpenSidebar,
}: EditorHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-border bg-panel px-3 py-2 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onOpenSidebar && (
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={onOpenSidebar}
            className="rounded border border-border px-2 py-1 text-sm md:hidden"
          >
            ☰
          </button>
        )}
        <input
          aria-label="Note title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-text outline-none placeholder:text-muted"
        />
        <SaveIndicator state={saveState} onRetry={onRetrySave} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <PresetSelector value={activePreset} onChange={onPresetChange} />
        <FocusProToggle enabled={focusPro} onToggle={onToggleFocusPro} />
        <button
          type="button"
          onClick={onOpenCustomPrompt}
          className="rounded border border-border px-2 py-1 text-xs text-text hover:bg-border/40"
          data-testid="custom-prompt-button"
        >
          Custom prompt
        </button>
        <DocActionMenu onDocAction={onDocAction} onOpenCustomPrompt={onOpenCustomPrompt} />
        <ExportButton onExport={onExport} />
      </div>
    </header>
  );
}
