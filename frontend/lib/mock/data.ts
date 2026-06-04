// Test fixtures — sample entities used only by the test suite to seed stores / stub the api layer.
// As of Phase 4b the running app no longer imports this; it loads everything from the real backend.
// Every shape here still mirrors docs/API_CONTRACTS.md §1 exactly so fixtures stay contract-true.

import type { Folder, Note, NoteSummary, Preferences, User } from "@/lib/api/types";

const NOW = "2026-06-03T12:00:00Z";

export const MOCK_USER: User = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "demo@smartnotes.app",
  created_at: "2026-05-01T09:00:00Z",
};

// Folder tree (SPEC Feature 7 example structure)
export const MOCK_FOLDERS: Folder[] = [
  { id: "f-university", name: "University", parent_id: null, user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "f-biology", name: "Biology 101", parent_id: "f-university", user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "f-work", name: "Work", parent_id: null, user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "f-alpha", name: "Project Alpha", parent_id: "f-work", user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
];

const lecture1 = `# Lecture 1 — Cell Biology

the cell is the basic unit of life. two main types prokaryotic and eukaryotic.

prokaryotes no nucleus, eukaryotes have a nucleus and membrane bound organelles.

mitochondria powerhouse of the cell makes ATP. ribosomes make proteins.

- membrane controls what enters and exits
- cytoplasm is the fluid inside
- DNA carries genetic info

**todo** review osmosis before exam`;

const meetingNotes = `# Project Alpha — Kickoff

attendees: sam, priya, jordan, me

discussed timeline. launch target end of Q3. priya owns design, jordan owns backend.

risks: api rate limits, unclear scope on the export feature.

next steps need to finalize spec by friday and book a follow up`;

const brainDump = `random ideas

- a notes app that formats itself with AI
- bionic reading mode for focus
- command palette for everything

> write messy, think freely, let AI organize it`;

export const MOCK_NOTES: Note[] = [
  { id: "n-lecture1", title: "Lecture 1", content: lecture1, folder_id: "f-biology", user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "n-lecture2", title: "Lecture 2", content: "# Lecture 2\n\nphotosynthesis converts light into chemical energy.", folder_id: "f-biology", user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "n-exam", title: "Exam Notes", content: "# Exam Notes\n\nkey topics: cells, energy, genetics", folder_id: "f-biology", user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "n-meeting", title: "Meeting Notes", content: meetingNotes, folder_id: "f-alpha", user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "n-ideas", title: "Product Ideas", content: "# Ideas\n\n- streaming suggestions\n- diff preview", folder_id: "f-alpha", user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "n-scratch", title: "Scratchpad", content: brainDump, folder_id: null, user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
  { id: "n-welcome", title: "Welcome", content: "# Welcome to SmartNotes\n\nStart typing. Select text for AI actions, or pause to see NotePilot suggestions.", folder_id: null, user_id: MOCK_USER.id, created_at: NOW, updated_at: NOW },
];

export const MOCK_PREFERENCES: Preferences = {
  user_id: MOCK_USER.id,
  theme: "deeptech",
  active_preset: "format_only",
  focuspro_enabled: false,
  notepilot_enabled: true,
  notepilot_delay_ms: 2000,
  updated_at: NOW,
};

export function toSummary(note: Note): NoteSummary {
  return { id: note.id, title: note.title, folder_id: note.folder_id, updated_at: note.updated_at };
}

let idCounter = 0;
// Deterministic-ish UUID-shaped id for newly created mock entities.
export function mockId(prefix = "id"): string {
  idCounter += 1;
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now().toString(16)}-${idCounter}-${rand}`;
}
