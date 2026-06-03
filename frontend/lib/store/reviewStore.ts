// reviewStore — REQ-REV-*. Drives the AI Output Review panel. The original text is never mutated
// until the user explicitly accepts (REQ-REV-01); this store only holds preview state.
import { create } from "zustand";
import type { AIAction, AIScope } from "@/lib/api/types";

interface ReviewState {
  open: boolean;
  scope: AIScope;
  action: AIAction | null;
  original: string;
  output: string;
  loading: boolean;
  // Selection coordinates the result will replace (scope=selection); null for document scope.
  selectionRange: { from: number; to: number } | null;

  openReview: (args: {
    scope: AIScope;
    action: AIAction;
    original: string;
    selectionRange?: { from: number; to: number } | null;
  }) => void;
  setLoading: (loading: boolean) => void;
  setOutput: (output: string) => void;
  close: () => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  open: false,
  scope: "selection",
  action: null,
  original: "",
  output: "",
  loading: false,
  selectionRange: null,

  openReview: ({ scope, action, original, selectionRange = null }) =>
    set({ open: true, scope, action, original, output: "", loading: true, selectionRange }),
  setLoading: (loading) => set({ loading }),
  setOutput: (output) => set({ output, loading: false }),
  close: () => set({ open: false, loading: false, output: "" }),
}));
