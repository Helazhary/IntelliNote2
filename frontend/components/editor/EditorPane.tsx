"use client";

// EditorPane (COMPONENT_TREE §2) — orchestrates the active note: editor, header, autosave
// (REQ-SAVE-*), selection toolbar, and the AI action → review flow (REQ-AIA-*, REQ-REV-*).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AIAction, AIScope, ExportFormat, Note } from "@/lib/api/types";
import { MarkdownEditor, type EditorSelectionPayload } from "./MarkdownEditor";
import { EditorHeader } from "./EditorHeader";
import { SelectionToolbar } from "./SelectionToolbar";
import { CustomPromptInput } from "./CustomPromptInput";
import { useEditorStore } from "@/lib/store/editorStore";
import { useNotesStore } from "@/lib/store/notesStore";
import { usePrefsStore } from "@/lib/store/prefsStore";
import { useReviewStore } from "@/lib/store/reviewStore";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { aiApi, notesApi } from "@/lib/api/endpoints";
import { buildExport, downloadExport } from "@/lib/export/exporters";
import { AIReviewPanel } from "@/components/review/AIReviewPanel";

const AUTOSAVE_DEBOUNCE_MS = 1000; // REQ-SAVE-01, NFR-PERF-01
const AI_ERROR_NOTICE = "⚠️ The AI request failed. Please try again.";

interface EditorPaneProps {
  note: Note;
  onOpenSidebar?: () => void;
}

export function EditorPane({ note, onOpenSidebar }: EditorPaneProps) {
  const isMobile = useIsMobile();

  const content = useEditorStore((s) => s.content);
  const saveState = useEditorStore((s) => s.saveState);
  const selection = useEditorStore((s) => s.selection);
  const setContent = useEditorStore((s) => s.setContent);
  const loadContent = useEditorStore((s) => s.loadContent);
  const setSelection = useEditorStore((s) => s.setSelection);
  const markSaving = useEditorStore((s) => s.markSaving);
  const markSaved = useEditorStore((s) => s.markSaved);
  const markError = useEditorStore((s) => s.markError);
  const isDirty = useEditorStore((s) => s.isDirty);

  const applyNoteUpdate = useNotesStore((s) => s.applyNoteUpdate);
  const renameNote = useNotesStore((s) => s.renameNote);

  const prefs = usePrefsStore((s) => s.prefs);
  const review = useReviewStore();

  const [title, setTitle] = useState(note.title);
  const [customPrompt, setCustomPrompt] = useState<{ open: boolean; scope: AIScope }>({ open: false, scope: "document" });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load note content into the editor store when the active note changes.
  useEffect(() => {
    loadContent(note.content);
    setTitle(note.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const saveNow = useCallback(async () => {
    if (!isDirty() && title === note.title) return; // REQ-SAVE-04: skip when unchanged
    markSaving();
    const latest = useEditorStore.getState().content;
    try {
      await notesApi.update(note.id, { title, content: latest }); // PATCH /notes/{id} (REQ-SAVE-01)
      applyNoteUpdate(note.id, { title, content: latest });
      markSaved();
    } catch {
      markError(); // REQ-SAVE-03 / NFR-REL-01 — content stays in the editor; Retry re-runs saveNow
    }
  }, [applyNoteUpdate, isDirty, markSaving, markSaved, markError, note.id, note.title, title]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, AUTOSAVE_DEBOUNCE_MS);
  }, [saveNow]);

  // Cmd/Ctrl+S → immediate save (REQ-SAVE-02).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  function handleContentChange(val: string) {
    setContent(val);
    scheduleSave();
  }

  function handleTitleChange(t: string) {
    setTitle(t);
    renameNote(note.id, t);
    scheduleSave();
  }

  function handleSelectionChange(sel: EditorSelectionPayload) {
    setSelection(sel.text ? { text: sel.text, rect: sel.rect, from: sel.from, to: sel.to } : null);
  }

  // ---- AI action → review flow ----
  const runTransform = useCallback(
    async (action: AIAction, scope: AIScope, text: string, selectionRange: { from: number; to: number } | null, instruction?: string) => {
      review.openReview({ scope, action, original: text, selectionRange });
      try {
        const result = await aiApi.transform({
          note_id: note.id,
          action,
          scope,
          text,
          preset: prefs.active_preset,
          instruction: instruction ?? null,
        });
        review.setOutput(result.output);
      } catch {
        review.setOutput(AI_ERROR_NOTICE); // 502/ai_error — preview only, note untouched (REQ-REV-01)
      }
    },
    [note.id, prefs.active_preset, review],
  );

  function handleToolbarAction(action: AIAction) {
    if (!selection) return;
    const range = { from: selection.from, to: selection.to };
    if (action === "custom") {
      setCustomPrompt({ open: true, scope: "selection" });
      return;
    }
    runTransform(action, "selection", selection.text, range);
  }

  function handleDocAction(action: AIAction) {
    runTransform(action, "document", content, null);
  }

  function handleCustomPromptSubmit(instruction: string) {
    const scope = customPrompt.scope;
    setCustomPrompt((c) => ({ ...c, open: false }));
    if (scope === "selection" && selection) {
      runTransform("custom", "selection", selection.text, { from: selection.from, to: selection.to }, instruction);
    } else {
      runTransform("custom", "document", content, null, instruction);
    }
  }

  function applyAccepted(finalText: string) {
    if (review.scope === "document") {
      setContent(finalText);
    } else if (review.selectionRange) {
      const { from, to } = review.selectionRange;
      const next = content.slice(0, from) + finalText + content.slice(to);
      setContent(next);
    }
    setSelection(null);
    review.close();
    scheduleSave();
  }

  async function handleRevise(instruction: string) {
    review.setLoading(true);
    try {
      const result = await aiApi.revise({
        previous_output: review.output,
        instruction,
        preset: prefs.active_preset,
      });
      review.setOutput(result.output); // unlimited, explicit per submit (REQ-REV-05, DEC-009)
    } catch {
      review.setOutput(AI_ERROR_NOTICE);
    }
  }

  function handleCopy(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  }

  function handleExport(format: ExportFormat) {
    downloadExport(buildExport(title, content, format));
  }

  // Expose handlers for the command palette (doc AI + export) via the workspace.
  useImperativeAIHandlers({ handleDocAction, handleExport, openCustomPrompt: () => setCustomPrompt({ open: true, scope: "document" }) });

  const notePilot = useMemo(
    () => ({ enabled: prefs.notepilot_enabled, delayMs: prefs.notepilot_delay_ms }),
    [prefs.notepilot_enabled, prefs.notepilot_delay_ms],
  );

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <EditorHeader
        title={title}
        saveState={saveState}
        onTitleChange={handleTitleChange}
        onRetrySave={saveNow}
        activePreset={prefs.active_preset}
        onPresetChange={(p) => usePrefsStore.getState().update({ active_preset: p })}
        focusPro={prefs.focuspro_enabled}
        onToggleFocusPro={() => usePrefsStore.getState().toggleFocusPro()}
        onDocAction={handleDocAction}
        onOpenCustomPrompt={() => setCustomPrompt({ open: true, scope: "document" })}
        onExport={handleExport}
        onOpenSidebar={onOpenSidebar}
      />

      <div className="relative flex-1 overflow-hidden">
        <MarkdownEditor
          noteId={note.id}
          value={content}
          onChange={handleContentChange}
          focusPro={prefs.focuspro_enabled}
          notePilot={notePilot}
          onSelectionChange={handleSelectionChange}
        />
      </div>

      <SelectionToolbar
        anchorRect={selection?.rect ?? null}
        selectedText={selection?.text ?? ""}
        onAction={handleToolbarAction}
        isMobile={isMobile}
      />

      <CustomPromptInput
        open={customPrompt.open}
        onSubmit={handleCustomPromptSubmit}
        onCancel={() => setCustomPrompt((c) => ({ ...c, open: false }))}
      />

      <AIReviewPanel
        open={review.open}
        scope={review.scope}
        original={review.original}
        output={review.output}
        loading={review.loading}
        isMobile={isMobile}
        onAccept={applyAccepted}
        onReject={review.close}
        onEditOutput={() => {}}
        onRevise={handleRevise}
        onCopy={handleCopy}
      />
    </section>
  );
}

// Bridge so the command palette (rendered in WorkspacePage) can invoke EditorPane handlers.
import { setAIHandlers } from "@/lib/store/aiBridge";
function useImperativeAIHandlers(handlers: {
  handleDocAction: (a: AIAction) => void;
  handleExport: (f: ExportFormat) => void;
  openCustomPrompt: () => void;
}) {
  useEffect(() => {
    setAIHandlers(handlers);
    return () => setAIHandlers(null);
  }, [handlers]);
}
