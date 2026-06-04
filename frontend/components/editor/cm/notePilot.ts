// NotePilot CodeMirror extension (REQ-NP-03/04/05/06). Renders a loading placeholder and ghost
// suggestion text inline at the cursor, accepts on Tab, and dismisses silently on any other edit
// or cursor move. The trigger/debounce and the (mocked) streaming live in MarkdownEditor; this
// module owns the editor-state plumbing and rendering.
import { Prec, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType, keymap } from "@codemirror/view";

export interface GhostState {
  from: number;
  text: string;
  loading: boolean;
}

export const setGhostLoading = StateEffect.define<number>(); // pos
export const setGhostText = StateEffect.define<{ from: number; text: string }>();
export const clearGhost = StateEffect.define<void>();

class GhostWidget extends WidgetType {
  constructor(readonly text: string, readonly loading: boolean) {
    super();
  }
  eq(other: GhostWidget) {
    return other.text === this.text && other.loading === this.loading;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = this.loading ? "cm-notepilot-loading" : "cm-notepilot-ghost";
    span.setAttribute("aria-hidden", "true");
    if (!this.loading) span.textContent = this.text;
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

function decorationsFor(state: GhostState | null): DecorationSet {
  if (!state) return Decoration.none;
  if (!state.loading && state.text.length === 0) return Decoration.none;
  const widget = Decoration.widget({
    widget: new GhostWidget(state.text, state.loading),
    side: 1,
  });
  return Decoration.set([widget.range(state.from)]);
}

export const notePilotField = StateField.define<GhostState | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGhostLoading)) return { from: effect.value, text: "", loading: true };
      if (effect.is(setGhostText)) return { from: effect.value.from, text: effect.value.text, loading: false };
      if (effect.is(clearGhost)) return null;
    }
    // Any user edit or cursor move dismisses an active suggestion silently (REQ-NP-05).
    if (value && (tr.docChanged || tr.selection)) return null;
    return value;
  },
  provide: (f) => EditorView.decorations.from(f, decorationsFor),
});

// Tab accepts the suggestion and inserts it as real text (REQ-NP-04). Wrapped in Prec.highest so it
// wins over the Tab bindings in @uiw/react-codemirror's basicSetup keymaps. Returns false when
// there's no active suggestion so Tab keeps its default behavior.
export const notePilotKeymap = Prec.highest(
  keymap.of([
    {
      key: "Tab",
      run(view) {
        const ghost = view.state.field(notePilotField, false);
        if (!ghost || ghost.loading || ghost.text.length === 0) return false;
        view.dispatch({
          changes: { from: ghost.from, insert: ghost.text },
          selection: { anchor: ghost.from + ghost.text.length },
          effects: clearGhost.of(),
        });
        return true;
      },
    },
  ]),
);

export function notePilotExtension() {
  return [notePilotField, notePilotKeymap];
}
