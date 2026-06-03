// Mock AI layer — Phase 3 simulates /ai/transform, /ai/revise, /ai/notepilot without real calls.
// Outputs are deterministic transformations so behavior is observable and testable. Phase 4b
// replaces these with real Anthropic-backed endpoints (same return shapes as API_CONTRACTS §7).

import type { AIAction, AIScope, Preset } from "@/lib/api/types";

export interface TransformResult {
  output: string;
  action: AIAction;
  scope: AIScope;
}

// Small artificial latency so loading states are visible (REQ-REV-07). Kept short for tests.
export const MOCK_AI_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function presetNote(preset: Preset): string {
  const map: Record<Preset, string> = {
    format_only: "_(format only — structure changed, wording preserved)_",
    clean_up: "_(cleaned up — grammar fixed)_",
    enhance: "_(enhanced — clarity & flow improved)_",
    explain: "_(explanations added)_",
    summarize: "_(summarized)_",
    study_mode: "_(study mode — definitions & review points added)_",
    meeting_mode: "_(meeting mode — decisions, tasks & owners extracted)_",
  };
  return map[preset];
}

function applyAction(action: AIAction, text: string, preset: Preset, instruction?: string | null): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const tag = presetNote(preset);

  switch (action) {
    case "format":
      return `## Structured Notes\n\n${lines.map((l) => (l.startsWith("#") ? l : `- ${l.trim()}`)).join("\n")}\n\n${tag}`;
    case "enhance":
      return `${text}\n\n${tag}`;
    case "summarize":
      return `## Summary\n\n${lines.slice(0, 3).map((l) => `- ${l.trim().slice(0, 80)}`).join("\n")}\n\n**Key takeaway:** ${lines[0]?.trim() ?? ""}\n\n${tag}`;
    case "explain":
      return lines.map((l) => `${l}\n  > _Explanation: this means ${l.trim().slice(0, 40)}…_`).join("\n\n") + `\n\n${tag}`;
    case "simplify":
      return `## In simple terms\n\n${lines.map((l) => `- ${l.trim()}`).join("\n")}\n\n${tag}`;
    case "bullets":
      return lines.map((l) => `- ${l.replace(/^[-*]\s*/, "").trim()}`).join("\n");
    case "action_items":
      return `## Action Items\n\n${lines.map((l) => `- [ ] ${l.trim()}`).join("\n")}\n\n${tag}`;
    case "custom":
      return `## Result\n\n_Instruction: ${instruction ?? ""}_\n\n${lines.map((l) => `- ${l.trim()}`).join("\n")}\n\n${tag}`;
    default:
      return text;
  }
}

export interface TransformArgs {
  action: AIAction;
  scope: AIScope;
  text: string;
  preset: Preset;
  instruction?: string | null;
}

export async function mockTransform(args: TransformArgs): Promise<TransformResult> {
  await delay(MOCK_AI_DELAY_MS);
  return {
    output: applyAction(args.action, args.text, args.preset, args.instruction),
    action: args.action,
    scope: args.scope,
  };
}

export async function mockRevise(previousOutput: string, instruction: string, preset: Preset): Promise<{ output: string }> {
  await delay(MOCK_AI_DELAY_MS);
  return {
    output: `${previousOutput}\n\n---\n_Revised per: "${instruction}"_ ${presetNote(preset)}`,
  };
}

// Streaming NotePilot continuation (REQ-NP-02/03). Emits tokens via onToken, then onDone.
// Returns a cancel function (any keypress dismisses — REQ-NP-05). Empty/error → onDone with no
// tokens (REQ-NP-07), simulated here when context is blank.
export function mockNotePilotStream(
  context: string,
  handlers: { onToken: (text: string) => void; onDone: () => void },
  delayMs = 60,
): () => void {
  const trimmed = context.trimEnd();
  // Simulate empty result (silent dismiss) for empty context.
  if (trimmed.length === 0) {
    const t = setTimeout(handlers.onDone, delayMs);
    return () => clearTimeout(t);
  }

  const suggestion = continuationFor(trimmed);
  const tokens = suggestion.match(/\S+\s*/g) ?? [];
  let i = 0;
  let cancelled = false;

  const timers: ReturnType<typeof setTimeout>[] = [];
  const tick = () => {
    if (cancelled) return;
    if (i >= tokens.length) {
      handlers.onDone();
      return;
    }
    handlers.onToken(tokens[i]);
    i += 1;
    timers.push(setTimeout(tick, delayMs));
  };
  timers.push(setTimeout(tick, delayMs));

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

function continuationFor(context: string): string {
  const lower = context.toLowerCase();
  if (lower.endsWith(":")) return " and the next step is to outline each item clearly.";
  if (lower.includes("todo") || lower.includes("task")) return " before the end of the week.";
  if (lower.endsWith(".")) return " This connects directly to the previous point.";
  return " and continues the current thought naturally.";
}
