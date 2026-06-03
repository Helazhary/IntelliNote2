import { describe, expect, it, vi } from "vitest";
import { mockNotePilotStream, mockRevise, mockTransform } from "@/lib/mock/ai";

describe("mock AI (matches /ai/* contract shapes)", () => {
  it("transform returns output/action/scope and reflects preset (REQ-AIA-05)", async () => {
    const res = await mockTransform({ action: "format", scope: "selection", text: "a\nb", preset: "format_only" });
    expect(res.action).toBe("format");
    expect(res.scope).toBe("selection");
    expect(res.output).toContain("format only"); // preset observable in output

    const meeting = await mockTransform({ action: "summarize", scope: "document", text: "decide x", preset: "meeting_mode" });
    expect(meeting.output).toContain("meeting mode");
  });

  it("custom action includes the instruction (REQ-CPMT-02)", async () => {
    const res = await mockTransform({ action: "custom", scope: "document", text: "x", preset: "enhance", instruction: "make it formal" });
    expect(res.output).toContain("make it formal");
  });

  it("revise produces a new output from previous (REQ-REV-05)", async () => {
    const res = await mockRevise("original output", "shorter", "enhance");
    expect(res.output).toContain("original output");
    expect(res.output).toContain("shorter");
  });

  it("notepilot streams tokens then done (REQ-NP-02/03)", async () => {
    vi.useFakeTimers();
    const tokens: string[] = [];
    let done = false;
    mockNotePilotStream("the cell is", { onToken: (t) => tokens.push(t), onDone: () => (done = true) }, 10);
    await vi.advanceTimersByTimeAsync(2000);
    expect(tokens.length).toBeGreaterThan(0);
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it("notepilot empty context → done with no tokens (REQ-NP-07)", async () => {
    vi.useFakeTimers();
    const tokens: string[] = [];
    let done = false;
    mockNotePilotStream("   ", { onToken: (t) => tokens.push(t), onDone: () => (done = true) }, 10);
    await vi.advanceTimersByTimeAsync(50);
    expect(tokens).toHaveLength(0);
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it("notepilot cancel stops further tokens (REQ-NP-05)", async () => {
    vi.useFakeTimers();
    const tokens: string[] = [];
    const cancel = mockNotePilotStream("the cell is", { onToken: (t) => tokens.push(t), onDone: () => {} }, 10);
    await vi.advanceTimersByTimeAsync(15);
    const countAfterCancel = tokens.length;
    cancel();
    await vi.advanceTimersByTimeAsync(2000);
    expect(tokens.length).toBe(countAfterCancel);
    vi.useRealTimers();
  });
});
