"use client";

// MarkdownEditor (COMPONENT_TREE §2/§3) — CodeMirror 6 wrapper with three custom extensions:
// live Markdown rendering, NotePilot ghost text, and FocusPro. Owns the NotePilot debounce/trigger
// and real SSE streaming (POST /ai/notepilot); reports selection changes upstream to anchor the
// floating toolbar.
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useRef } from "react";
import { liveMarkdownExtension } from "./cm/liveMarkdown";
import { focusProExtension } from "./cm/focusPro";
import {
  clearGhost,
  notePilotExtension,
  setGhostLoading,
  setGhostText,
} from "./cm/notePilot";
import { aiApi } from "@/lib/api/endpoints";

export interface EditorSelectionPayload {
  text: string;
  rect: DOMRect | null;
  from: number;
  to: number;
}

interface MarkdownEditorProps {
  noteId: string;
  value: string;
  onChange: (value: string) => void;
  focusPro: boolean;
  notePilot: { enabled: boolean; delayMs: number };
  onSelectionChange: (sel: EditorSelectionPayload) => void;
  onRequestNotePilot?: (contextUpToCursor: string) => void;
}

function makeRect(left: number, top: number, right: number, bottom: number): DOMRect {
  const width = right - left;
  const height = bottom - top;
  return {
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

export function MarkdownEditor({
  noteId,
  value,
  onChange,
  focusPro,
  notePilot,
  onSelectionChange,
  onRequestNotePilot,
}: MarkdownEditorProps) {
  const viewRef = useRef<EditorView | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const notePilotRef = useRef(notePilot);
  notePilotRef.current = notePilot;
  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;

  const cancelNotePilot = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    cancelStreamRef.current?.();
    cancelStreamRef.current = null;
    viewRef.current?.dispatch({ effects: clearGhost.of() });
  }, []);

  // Disabling NotePilot stops suggestions immediately (REQ-NP, SPEC Feature 2).
  useEffect(() => {
    if (!notePilot.enabled) cancelNotePilot();
  }, [notePilot.enabled, cancelNotePilot]);

  useEffect(() => () => cancelNotePilot(), [cancelNotePilot]);

  const scheduleNotePilot = useCallback(() => {
    const np = notePilotRef.current;
    if (!np.enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelStreamRef.current?.();
    cancelStreamRef.current = null;

    timerRef.current = setTimeout(() => {
      const view = viewRef.current;
      if (!view) return;
      const pos = view.state.selection.main.head;
      const context = view.state.doc.sliceString(0, pos);
      onRequestNotePilot?.(context);
      view.dispatch({ effects: setGhostLoading.of(pos) });

      let acc = "";
      cancelStreamRef.current = aiApi.notePilotStream(noteIdRef.current, context, {
        onToken: (t) => {
          acc += t;
          const v = viewRef.current;
          if (v) v.dispatch({ effects: setGhostText.of({ from: pos, text: acc }) });
        },
        onDone: () => {
          // Error or empty result → remove placeholder silently (REQ-NP-07, NFR-REL-02).
          const v = viewRef.current;
          if (v && acc.length === 0) v.dispatch({ effects: clearGhost.of() });
          cancelStreamRef.current = null;
        },
      });
    }, np.delayMs);
  }, [onRequestNotePilot]);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      cancelNotePilot(); // typing dismisses current suggestion (REQ-NP-05)
      scheduleNotePilot(); // and schedules the next after the pause (REQ-NP-01)
    },
    [onChange, cancelNotePilot, scheduleNotePilot],
  );

  const selectionListener = EditorView.updateListener.of((update) => {
    if (!update.selectionSet && !update.docChanged) return;
    const sel = update.state.selection.main;
    if (sel.empty) {
      onSelectionChange({ text: "", rect: null, from: sel.from, to: sel.to });
      return;
    }
    const text = update.state.doc.sliceString(sel.from, sel.to);
    const start = update.view.coordsAtPos(sel.from);
    const end = update.view.coordsAtPos(sel.to);
    const rect =
      start && end
        ? makeRect(Math.min(start.left, end.left), Math.min(start.top, end.top), Math.max(start.right, end.right), Math.max(start.bottom, end.bottom))
        : null;
    onSelectionChange({ text, rect, from: sel.from, to: sel.to });
  });

  const extensions = [
    markdown(),
    liveMarkdownExtension(),
    ...notePilotExtension(),
    selectionListener,
    EditorView.lineWrapping,
    ...(focusPro ? focusProExtension() : []),
  ];

  return (
    <div className={`h-full overflow-auto ${focusPro ? "focuspro" : ""}`} data-testid="markdown-editor">
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        theme="none"
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
        className="min-h-full font-mono text-[15px]"
        style={{ background: "var(--color-surface)" }}
      />
    </div>
  );
}
