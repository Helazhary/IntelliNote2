// Lightweight Markdown helpers used by the live-render decorations (REQ-EDIT-03) and the export
// pipeline (REQ-EXP-*). Not a full Markdown parser — covers the inline/block syntax the spec lists
// (headings, bold, italic, lists, code, blockquotes). Pure + testable.

export function headingLevel(line: string): number {
  const m = /^(#{1,6})\s+/.exec(line);
  return m ? m[1].length : 0;
}

export function isBlockquote(line: string): boolean {
  return /^>\s?/.test(line);
}

export function isListItem(line: string): boolean {
  return /^\s*([-*+]|\d+\.)\s+/.test(line);
}

// Strip Markdown syntax to plain text (REQ-EXP-06). Conservative: removes the markers the spec's
// supported syntax uses, preserves the textual content.
export function stripMarkdown(md: string): string {
  return md
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "") // headings
        .replace(/^>\s?/, "") // blockquotes
        .replace(/^\s*[-*+]\s+/, "") // unordered list markers
        .replace(/^\s*\d+\.\s+/, "") // ordered list markers
        .replace(/`{1,3}([^`]*)`{1,3}/g, "$1") // inline/code fences
        .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
        .replace(/__([^_]+)__/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1") // italic
        .replace(/_([^_]+)_/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"), // links → text
    )
    .join("\n")
    .replace(/^```.*$/gm, "") // leftover fence lines
    .trim();
}

// Minimal Markdown → HTML for export (REQ-EXP-05). Handles headings, bold, italic, inline code,
// blockquotes, and unordered lists — sufficient for the supported syntax set.
export function markdownToHtmlBody(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>");

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = headingLevel(line);
    if (h > 0) {
      closeList();
      html.push(`<h${h}>${inline(line.replace(/^#{1,6}\s+/, ""))}</h${h}>`);
    } else if (isListItem(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+\.\s+/, ""))}</li>`);
    } else if (isBlockquote(line)) {
      closeList();
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join("\n");
}
