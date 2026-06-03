// Bionic reading helpers (REQ-FOCUS-01). The first half of each word is bolded to guide the eye.
// Pure functions so they're unit-testable without mounting CodeMirror.

// Number of leading characters to bold for a word of length n: the first half, rounded up.
export function bionicBoldLength(wordLength: number): number {
  if (wordLength <= 0) return 0;
  return Math.ceil(wordLength / 2);
}

export interface BionicWord {
  bold: string;
  rest: string;
}

export function bionicSplit(word: string): BionicWord {
  const n = bionicBoldLength(word.length);
  return { bold: word.slice(0, n), rest: word.slice(n) };
}

// Returns [start, end) offsets (relative to the input string) that should be bolded — one range
// per word. Used to build CodeMirror mark decorations over a line.
export function bionicRanges(text: string): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  const wordRe = /[\p{L}\p{N}']+/gu;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(text)) !== null) {
    const boldLen = bionicBoldLength(m[0].length);
    if (boldLen > 0) ranges.push({ from: m.index, to: m.index + boldLen });
  }
  return ranges;
}
