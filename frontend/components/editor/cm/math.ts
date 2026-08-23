// LaTeX math rendering (Obsidian-style). Inline `$eq$` and block `$$eq$$` are replaced with
// KaTeX-rendered widgets. Like the live-Markdown markers, the raw source is revealed whenever the
// cursor/selection touches the span, so the equation stays fully editable. Requires the KaTeX
// stylesheet, imported once in app/layout.tsx.
//
// Implemented as a StateField (not a ViewPlugin): block-level and line-break-spanning replace
// decorations — which `$$...$$` needs — are only permitted from state fields.
import { type EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import katex from "katex";

class MathWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly block: boolean,
  ) {
    super();
  }
  eq(other: MathWidget) {
    return other.src === this.src && other.block === this.block;
  }
  toDOM() {
    const el = document.createElement(this.block ? "div" : "span");
    el.className = this.block ? "cm-math cm-math-block" : "cm-math cm-math-inline";
    try {
      katex.render(this.src, el, { displayMode: this.block, throwOnError: false });
    } catch {
      el.textContent = this.src; // malformed LaTeX — fall back to raw text
    }
    return el;
  }
  ignoreEvent() {
    return false;
  }
}

// True if any selection range overlaps [from, to] — used to reveal the raw source for editing.
function selectionTouches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some((r) => r.to >= from && r.from <= to);
}

function buildMath(state: EditorState): DecorationSet {
  const text = state.doc.toString();
  const spans: { from: number; to: number; deco: Decoration }[] = [];
  const blockRanges: { from: number; to: number }[] = [];

  // Block math: $$ ... $$ (may span multiple lines).
  const blockRe = /\$\$([\s\S]+?)\$\$/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(text)) !== null) {
    const from = m.index;
    const to = m.index + m[0].length;
    blockRanges.push({ from, to });
    if (!selectionTouches(state, from, to)) {
      spans.push({
        from,
        to,
        deco: Decoration.replace({ widget: new MathWidget(m[1].trim(), true), block: true }),
      });
    }
  }

  // Inline math: $ ... $ on a single line. No space just inside the delimiters (reduces the
  // "$5 ... $10" currency false-positive). Skip anything already inside a block span.
  const inlineRe = /\$(?!\s)([^$\n]+?)(?<!\s)\$/g;
  while ((m = inlineRe.exec(text)) !== null) {
    const from = m.index;
    const to = m.index + m[0].length;
    if (blockRanges.some((b) => from >= b.from && to <= b.to)) continue;
    if (!selectionTouches(state, from, to)) {
      spans.push({
        from,
        to,
        deco: Decoration.replace({ widget: new MathWidget(m[1].trim(), false) }),
      });
    }
  }

  spans.sort((a, b) => a.from - b.from || a.to - b.to);
  const builder = new RangeSetBuilder<Decoration>();
  for (const s of spans) {
    try {
      builder.add(s.from, s.to, s.deco);
    } catch {
      /* overlapping ranges — skip */
    }
  }
  return builder.finish();
}

const mathField = StateField.define<DecorationSet>({
  create: (state) => buildMath(state),
  update(deco, tr) {
    if (tr.docChanged || tr.selection) return buildMath(tr.state);
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function mathExtension() {
  return [mathField];
}
