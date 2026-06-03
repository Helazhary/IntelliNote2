// FocusPro paragraph-chunking helper (REQ-FOCUS-04, DEC-013). Paragraphs of 150+ words get a
// visual divider appended; no text content is changed, only presentation. Pure + testable.

export const FOCUS_CHUNK_WORD_THRESHOLD = 150;

export function wordCount(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function paragraphNeedsDivider(paragraph: string): boolean {
  return wordCount(paragraph) >= FOCUS_CHUNK_WORD_THRESHOLD;
}

export interface Paragraph {
  text: string;
  start: number; // char offset in the source
  end: number;
}

// Split source into paragraphs on blank lines, preserving offsets so a divider decoration can be
// placed at the end of any long paragraph.
export function splitParagraphs(source: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const re = /[^\n]+(?:\n(?!\n)[^\n]+)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    paragraphs.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return paragraphs;
}

// End offsets of paragraphs that should display a divider.
export function dividerOffsets(source: string): number[] {
  return splitParagraphs(source)
    .filter((p) => paragraphNeedsDivider(p.text))
    .map((p) => p.end);
}
