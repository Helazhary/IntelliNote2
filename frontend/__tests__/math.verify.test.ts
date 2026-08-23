import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { mathExtension } from "@/components/editor/cm/math";

const DOC = [
  "Inline math $E = mc^2$ in a sentence.",
  "",
  "$$\\int_0^1 x^2 \\, dx$$",
  "",
  "Costs $5 and $10 total.", // must NOT be treated as math
].join("\n");

describe("math extension", () => {
  it("renders inline and block KaTeX off-cursor, leaves currency alone", () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: DOC,
        selection: { anchor: DOC.length }, // cursor at end → all math off-cursor
        extensions: [mathExtension()],
      }),
    });
    const html = view.dom.innerHTML;
    expect(html).toContain("katex"); // KaTeX rendered something
    expect(html).toContain("cm-math-inline");
    expect(html).toContain("cm-math-block");
    // The currency line's text is still present verbatim (not swallowed into a widget).
    expect(view.dom.textContent).toContain("Costs $5 and $10 total.");
    view.destroy();
  });

  it("reveals raw source when the cursor is inside the equation", () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: "a $x^2$ b",
        selection: { anchor: 4 }, // inside $x^2$
        extensions: [mathExtension()],
      }),
    });
    expect(view.dom.querySelector(".cm-math")).toBeNull();
    expect(view.dom.textContent).toContain("$x^2$");
    view.destroy();
  });
});
