import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { liveMarkdownExtension } from "@/components/editor/cm/liveMarkdown";

const SAMPLE = [
  "# Notes",
  "",
  "## Machine Learning",
  "",
  "- **Bias:** how far the prediction is from the true values",
  "- *Variance*: how much predictions vary",
  "",
  "### SiWare",
  "**FT-NIR (fourier transform)**: `spectroscopy` technique.",
].join("\n");

describe("liveMarkdown extension", () => {
  it("builds decorations without throwing and hides markers off-cursor", () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: SAMPLE,
        // cursor at very end so heading/list lines are all "off-cursor"
        selection: { anchor: SAMPLE.length },
        extensions: [liveMarkdownExtension()],
      }),
    });

    // Collect all decoration classes present in the rendered DOM.
    const html = view.dom.innerHTML;
    expect(html).toContain("cm-md-h1");
    expect(html).toContain("cm-md-h2");
    expect(html).toContain("cm-md-h3");
    expect(html).toContain("cm-md-bold");
    expect(html).toContain("cm-md-code");
    expect(html).toContain("cm-md-hidden"); // markers hidden off-cursor
    expect(html).toContain("cm-md-bullet"); // • widget rendered

    view.destroy();
    // no assertion failure / no thrown RangeError == pass
    expect(true).toBe(true);
  });

  it("reveals markers on the cursor line (no hidden marks there)", () => {
    // Put the cursor on the first line ("# Notes"): its # marker must NOT be hidden.
    const view = new EditorView({
      state: EditorState.create({
        doc: SAMPLE,
        selection: { anchor: 2 },
        extensions: [liveMarkdownExtension()],
      }),
    });
    const firstLine = view.dom.querySelector(".cm-line");
    expect(firstLine?.querySelector(".cm-md-hidden")).toBeNull();
    view.destroy();
  });
});
