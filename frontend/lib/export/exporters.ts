// Export pipeline (REQ-EXP-*, DEC-016). Phase 3 builds export files client-side (mocked download)
// from the note content; Phase 4b can move this to GET /notes/{id}/export. Empty notes are allowed
// and produce a valid empty file (REQ-EXP-07). Filenames default to the sanitized title, falling
// back to "untitled" (REQ-EXP-08).
import type { ExportFormat } from "@/lib/api/types";
import { markdownToHtmlBody, stripMarkdown } from "@/lib/editor/markdown";

export const EXPORT_MIME: Record<ExportFormat, string> = {
  md: "text/markdown",
  html: "text/html",
  txt: "text/plain",
};

// Remove characters unsafe for filenames across OSes (DEC-016); fall back to "untitled".
export function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : "untitled";
}

export function htmlDocument(content: string): string {
  const body = markdownToHtmlBody(content);
  // Inline styles for readability (REQ-EXP-05): font-family, line-height, max-width.
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>SmartNotes export</title></head>
<body style="font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.6; max-width: 720px; margin: 2rem auto; padding: 0 1rem;">
${body}
</body>
</html>`;
}

export interface ExportResult {
  filename: string;
  mime: string;
  body: string;
}

export function buildExport(title: string, content: string, format: ExportFormat): ExportResult {
  const base = sanitizeFilename(title);
  switch (format) {
    case "md":
      return { filename: `${base}.md`, mime: EXPORT_MIME.md, body: content };
    case "html":
      return { filename: `${base}.html`, mime: EXPORT_MIME.html, body: htmlDocument(content) };
    case "txt":
      return { filename: `${base}.txt`, mime: EXPORT_MIME.txt, body: stripMarkdown(content) };
  }
}

// Trigger a browser download (REQ-EXP-02). No-op-safe in non-DOM environments.
export function downloadExport(result: ExportResult): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([result.body], { type: result.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
