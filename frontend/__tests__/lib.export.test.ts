import { describe, expect, it } from "vitest";
import { buildExport, sanitizeFilename, EXPORT_MIME } from "@/lib/export/exporters";

describe("export pipeline (REQ-EXP-*, DEC-016)", () => {
  it("sanitizes filenames and falls back to untitled (REQ-EXP-08)", () => {
    expect(sanitizeFilename('a/b:c*?"<>|')).toBe("abc");
    expect(sanitizeFilename("   ")).toBe("untitled");
    expect(sanitizeFilename("My Note")).toBe("My Note");
  });

  it("builds md/html/txt with correct extensions and MIME (REQ-EXP-03/04/05/06)", () => {
    const md = buildExport("Note", "# Hi\n\n- a", "md");
    expect(md.filename).toBe("Note.md");
    expect(md.mime).toBe(EXPORT_MIME.md);
    expect(md.body).toBe("# Hi\n\n- a"); // raw markdown preserved

    const html = buildExport("Note", "# Hi", "html");
    expect(html.filename).toBe("Note.html");
    expect(html.body).toContain("<h1>Hi</h1>");
    expect(html.body).toContain("max-width"); // inline readability styles

    const txt = buildExport("Note", "# Hi", "txt");
    expect(txt.filename).toBe("Note.txt");
    expect(txt.body).not.toContain("#");
  });

  it("allows empty notes — valid empty file, no error (REQ-EXP-07)", () => {
    const res = buildExport("", "", "md");
    expect(res.filename).toBe("untitled.md");
    expect(res.body).toBe("");
  });
});
