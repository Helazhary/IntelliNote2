// Live Markdown rendering decorations (REQ-EDIT-03/04). Styles the rendered presentation —
// headings sized by level, bold/italic/code/blockquote/list markers — while the raw Markdown
// source stays fully editable. Obsidian-style: the syntax markers (#, **, `, >, list bullets)
// are visually hidden and only revealed on the line the cursor is on, so editing still works.
// A ViewPlugin recomputes decorations over the visible ranges.
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { headingLevel, isBlockquote, isListItem } from "@/lib/editor/markdown";

const headingLine = [1, 2, 3, 4, 5, 6].map((n) =>
  Decoration.line({ class: `cm-md-h${n}` }),
);
const quoteLine = Decoration.line({ class: "cm-md-quote" });
const boldMark = Decoration.mark({ class: "cm-md-bold" });
const italicMark = Decoration.mark({ class: "cm-md-italic" });
const codeMark = Decoration.mark({ class: "cm-md-code" });
const listMark = Decoration.mark({ class: "cm-md-list" });
const hiddenMark = Decoration.mark({ class: "cm-md-hidden" });

// Replaces a list bullet char (-, *, +) with a styled • when the cursor is off the line.
class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-md-bullet";
    span.textContent = "•";
    return span;
  }
  ignoreEvent() {
    return false;
  }
}
const bulletDeco = Decoration.replace({ widget: new BulletWidget() });

// Line numbers touched by any selection range — markers on these lines stay visible for editing.
function activeLines(view: EditorView): Set<number> {
  const set = new Set<number>();
  for (const r of view.state.selection.ranges) {
    const first = view.state.doc.lineAt(r.from).number;
    const last = view.state.doc.lineAt(r.to).number;
    for (let n = first; n <= last; n++) set.add(n);
  }
  return set;
}

type Span = { from: number; to: number; deco: Decoration };

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const active = activeLines(view);

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;
      const onCursorLine = active.has(line.number);
      const inline: Span[] = [];
      const hide = (start: number, end: number) => {
        if (!onCursorLine && end > start) inline.push({ from: start, to: end, deco: hiddenMark });
      };

      const h = headingLevel(text);
      if (h > 0) {
        builder.add(line.from, line.from, headingLine[h - 1]);
        const markerLen = /^#{1,6}\s+/.exec(text)![0].length;
        hide(line.from, line.from + markerLen);
        // The ## / ### underline rule is drawn on the line box via CSS (cm-md-h2/h3).
      } else if (isBlockquote(text)) {
        builder.add(line.from, line.from, quoteLine);
        hide(line.from, line.from + /^>\s?/.exec(text)![0].length);
      }

      // List marker: styled • for unordered bullets, accent colour for ordered.
      const listMatch = /^(\s*)([-*+]|\d+\.)(\s+)/.exec(text);
      if (isListItem(text) && listMatch) {
        const markStart = line.from + listMatch[1].length;
        const markEnd = markStart + listMatch[2].length;
        if (/^[-*+]$/.test(listMatch[2]) && !onCursorLine) {
          inline.push({ from: markStart, to: markEnd, deco: bulletDeco });
        } else {
          inline.push({ from: markStart, to: markEnd, deco: listMark });
        }
      }

      // Inline spans: colour the content and hide the surrounding markers.
      const wrap = (re: RegExp, markerLen: number, deco: Decoration) => {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          if (m[0].length === 0) {
            re.lastIndex++;
            continue;
          }
          const start = line.from + m.index;
          const end = start + m[0].length;
          inline.push({ from: start + markerLen, to: end - markerLen, deco });
          hide(start, start + markerLen);
          hide(end - markerLen, end);
        }
      };
      wrap(/`[^`]+`/g, 1, codeMark);
      wrap(/\*\*[^*]+\*\*/g, 2, boldMark);
      wrap(/(?<!\*)\*(?!\*)[^*]+\*(?!\*)/g, 1, italicMark);

      inline
        .sort((a, b) => a.from - b.from)
        .forEach((d) => {
          try {
            builder.add(d.from, d.to, d.deco);
          } catch {
            /* overlapping/conflicting ranges — skip the conflicting span */
          }
        });

      if (line.to + 1 > to) break;
      pos = line.to + 1;
    }
  }

  return builder.finish();
}

export function liveMarkdownExtension() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }
      update(update: ViewUpdate) {
        // Rebuild on selection changes too, so markers reveal/hide as the cursor moves.
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}
