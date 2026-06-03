import { describe, expect, it } from "vitest";
import { bionicBoldLength, bionicRanges, bionicSplit } from "@/lib/editor/bionic";
import { dividerOffsets, paragraphNeedsDivider, wordCount } from "@/lib/editor/focuspro";
import { headingLevel, isBlockquote, isListItem, markdownToHtmlBody, stripMarkdown } from "@/lib/editor/markdown";

describe("bionic (REQ-FOCUS-01)", () => {
  it("bolds the first half (rounded up) of a word", () => {
    expect(bionicBoldLength(4)).toBe(2);
    expect(bionicBoldLength(5)).toBe(3);
    expect(bionicBoldLength(0)).toBe(0);
    expect(bionicSplit("reading")).toEqual({ bold: "read", rest: "ing" });
  });

  it("produces one bold range per word", () => {
    const ranges = bionicRanges("hello world");
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({ from: 0, to: 3 });
  });
});

describe("focuspro chunking (REQ-FOCUS-04, DEC-013)", () => {
  it("flags paragraphs of 150+ words", () => {
    expect(wordCount("a b c")).toBe(3);
    expect(paragraphNeedsDivider("word ".repeat(149))).toBe(false);
    expect(paragraphNeedsDivider("word ".repeat(150))).toBe(true);
  });

  it("returns divider offsets only for long paragraphs", () => {
    const longPara = "word ".repeat(150).trim();
    const doc = `short para\n\n${longPara}\n\nanother short`;
    expect(dividerOffsets(doc)).toHaveLength(1);
  });
});

describe("markdown helpers (REQ-EDIT-03, REQ-EXP-*)", () => {
  it("detects headings, quotes, list items", () => {
    expect(headingLevel("## Title")).toBe(2);
    expect(headingLevel("no heading")).toBe(0);
    expect(isBlockquote("> quote")).toBe(true);
    expect(isListItem("- item")).toBe(true);
    expect(isListItem("1. item")).toBe(true);
  });

  it("strips markdown syntax for plain text export (REQ-EXP-06)", () => {
    const out = stripMarkdown("# Title\n\n- **bold** item\n> quote");
    expect(out).not.toContain("#");
    expect(out).not.toContain("**");
    expect(out).not.toContain(">");
    expect(out).toContain("bold item");
  });

  it("renders HTML with headings and lists (REQ-EXP-05)", () => {
    const html = markdownToHtmlBody("# Title\n\n- one\n- two");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
  });
});
