// FocusPro CodeMirror decorations (REQ-FOCUS-01/02/04, DEC-012/013). Applies bionic bolding to the
// first half of each word and inserts a visual divider at the end of paragraphs of 150+ words.
// Spacing/line-height come from the `.focuspro` container class in globals.css. These extensions
// are included only while FocusPro is enabled (toggled by MarkdownEditor via the extensions prop).
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { bionicRanges } from "@/lib/editor/bionic";
import { dividerOffsets } from "@/lib/editor/focuspro";

const bionicMark = Decoration.mark({ class: "cm-bionic" });
const dividerLine = Decoration.line({ class: "cm-focus-divider" });

function buildBionic(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      for (const r of bionicRanges(line.text)) {
        builder.add(line.from + r.from, line.from + r.to, bionicMark);
      }
      if (line.to + 1 > to) break;
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

function buildDividers(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc.toString();
  const lineStarts = dividerOffsets(doc)
    .map((off) => view.state.doc.lineAt(Math.min(off, doc.length)).from)
    .sort((a, b) => a - b);
  for (const start of lineStarts) builder.add(start, start, dividerLine);
  return builder.finish();
}

const bionicPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildBionic(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = buildBionic(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

const dividerPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDividers(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = buildDividers(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

export function focusProExtension() {
  return [bionicPlugin, dividerPlugin];
}
