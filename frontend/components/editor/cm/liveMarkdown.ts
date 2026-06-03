// Live Markdown rendering decorations (REQ-EDIT-03/04). Styles the rendered presentation —
// headings sized by level, bold/italic/code/blockquote/list markers — while the raw Markdown
// source stays fully editable. A ViewPlugin recomputes decorations over the visible ranges.
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { headingLevel, isBlockquote, isListItem } from "@/lib/editor/markdown";

const headingLine = [1, 2, 3, 4, 5, 6].map((n) =>
  Decoration.line({ class: `cm-md-h${n}` }),
);
const quoteLine = Decoration.line({ class: "cm-md-quote" });
const boldMark = Decoration.mark({ class: "cm-md-bold" });
const italicMark = Decoration.mark({ class: "cm-md-italic" });
const codeMark = Decoration.mark({ class: "cm-md-code" });
const listMark = Decoration.mark({ class: "cm-md-list" });

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;

      const h = headingLevel(text);
      if (h > 0) builder.add(line.from, line.from, headingLine[h - 1]);
      else if (isBlockquote(text)) builder.add(line.from, line.from, quoteLine);

      // List marker emphasis.
      const listMatch = /^(\s*)([-*+]|\d+\.)(\s+)/.exec(text);
      if (isListItem(text) && listMatch) {
        const markStart = line.from + listMatch[1].length;
        const markEnd = markStart + listMatch[2].length;
        builder.add(markStart, markEnd, listMark);
      }

      // Inline spans within the line. Order by start position via a collected list.
      const inline: { from: number; to: number; deco: Decoration }[] = [];
      const push = (re: RegExp, deco: Decoration) => {
        let m: RegExpExecArray | null;
        re.lastIndex = 0;
        while ((m = re.exec(text)) !== null) {
          if (m[0].length === 0) {
            re.lastIndex++;
            continue;
          }
          inline.push({ from: line.from + m.index, to: line.from + m.index + m[0].length, deco });
        }
      };
      push(/`[^`]+`/g, codeMark);
      push(/\*\*[^*]+\*\*/g, boldMark);
      push(/(?<!\*)\*(?!\*)[^*]+\*(?!\*)/g, italicMark);

      inline
        .sort((a, b) => a.from - b.from)
        .forEach((d) => {
          try {
            builder.add(d.from, d.to, d.deco);
          } catch {
            /* overlapping ranges — skip the conflicting span */
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
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}
