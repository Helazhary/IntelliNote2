// Tiny imperative bridge so the CommandPalette (rendered at the workspace level) can invoke the
// active EditorPane's full-document AI action, custom prompt, and export handlers (REQ-CMDK-04)
// without prop-drilling through the overlay layer. Set by the mounted EditorPane.
import type { AIAction, ExportFormat } from "@/lib/api/types";

export interface AIHandlers {
  handleDocAction: (a: AIAction) => void;
  handleExport: (f: ExportFormat) => void;
  openCustomPrompt: () => void;
}

let handlers: AIHandlers | null = null;

export function setAIHandlers(h: AIHandlers | null): void {
  handlers = h;
}

export function getAIHandlers(): AIHandlers | null {
  return handlers;
}
