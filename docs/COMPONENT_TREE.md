# COMPONENT_TREE.md — SmartNotes AI

Phase 2 output. Full React component hierarchy with props interface sketches. Built in Phase 3
(`senior-frontend`) against `API_CONTRACTS.md` shapes. **Locked after Phase 2** — Phase 3 deviations
go in `FRONTEND_NOTES.md`.

Stack: Next.js 14 App Router, React 18, TypeScript, Tailwind. Editor engine: CodeMirror 6.
Shared wire types (`Note`, `Folder`, `Preferences`, `AIAction`, `Preset`, `Theme`, `ExportFormat`)
are imported from `lib/api/types.ts` and mirror API_CONTRACTS §1.

---

## 1. Route Tree (`app/`)

```
app/
├── layout.tsx                 # <RootLayout>: ThemeProvider, QueryProvider, font links
├── login/page.tsx             # <LoginPage>
├── register/page.tsx          # <RegisterPage>
└── page.tsx                   # <WorkspacePage> (auth-guarded; the app shell)
```

---

## 2. Component Hierarchy

```
<RootLayout>
 ├── <ThemeProvider>                       theme CSS-var injection (REQ-THEME-02/03)
 ├── <QueryProvider>                        TanStack Query client
 └── <WorkspacePage>                        auth guard → redirect /login if no token
      ├── <Sidebar>
      │    ├── <SidebarHeader>              new-note / new-folder buttons
      │    ├── <UnfiledSection>             notes with folder_id=null (REQ-FLDR-06)
      │    │    └── <NoteRow>*
      │    ├── <FolderTree>                 recursive (REQ-FLDR-02/03)
      │    │    └── <FolderNode>*           expand/collapse, rename inline, context menu
      │    │         ├── <FolderNode>*      (nested)
      │    │         └── <NoteRow>*
      │    └── <DeleteFolderDialog>         cascade confirm w/ counts (REQ-FLDR-04)
      ├── <EditorPane>
      │    ├── <EditorHeader>
      │    │    ├── <NoteTitleInput>        title edit → autosave
      │    │    ├── <SaveIndicator>         idle/Saving…/Saved/Error+Retry (REQ-SAVE-03)
      │    │    ├── <PresetSelector>        active preset, always visible (REQ-PRESET-02/03)
      │    │    ├── <FocusProToggle>        synced w/ prefs (REQ-FOCUS-06)
      │    │    ├── <DocActionMenu>         full-document AI actions (REQ-AIA-02/04)
      │    │    ├── <CustomPromptButton>    opens full-doc custom prompt (REQ-CPMT-01)
      │    │    └── <ExportButton>          format menu → download (REQ-EXP-02)
      │    ├── <MarkdownEditor>             CodeMirror 6 wrapper
      │    │    ├── (ext) liveMarkdownRender   headings/bold/lists/code/quote (REQ-EDIT-03/04)
      │    │    ├── (ext) notePilotGhostText   placeholder + ghost text + Tab (REQ-NP-03/04/05/06)
      │    │    └── (ext) focusProView         bionic bold, spacing, 150-word divider (REQ-FOCUS-*)
      │    ├── <SelectionToolbar>           floating pill, anchored to selection (REQ-TBAR-*)
      │    │    ├── <ToolbarAction>*         Format, Summarize, Enhance, Custom Prompt (default 4)
      │    │    └── <MoreActionsMenu>        expands to all 8 (REQ-TBAR-03)
      │    └── <CustomPromptInput>          full-doc free-form instruction (REQ-CPMT-01/02)
      ├── <AIReviewPanel>                   preview before apply (REQ-REV-*)
      │    ├── <ReviewLoading>              loading state (REQ-REV-07)
      │    ├── <DiffView>                   side-by-side (desktop) (REQ-REV-08)
      │    ├── <DiffTabs>                   tabbed Original/AI (mobile) (NFR-RESP-04)
      │    ├── <EditableOutput>             in-panel edit (REQ-REV-04, DEC-008)
      │    ├── <ReviseInput>                follow-up instruction, unlimited (REQ-REV-05)
      │    └── <ReviewActions>              Accept / Reject / Edit / Revise / Copy (REQ-REV-02..06)
      ├── <CommandPalette>                  Cmd/Ctrl+K (REQ-CMDK-*), cmdk lib
      │    ├── <PaletteSearchInput>         fuzzy over note titles (REQ-CMDK-02)
      │    ├── <PaletteNoteResults>         navigate to note (REQ-CMDK-03)
      │    └── <PaletteActions>             create note/folder, theme, focuspro, doc-AI, export (REQ-CMDK-04)
      └── <PreferencesPanel>               (REQ-PREF-*)
           ├── <ThemeSetting>              DeepTech/LightDesk (REQ-THEME-01)
           ├── <PresetSetting>            active preset (REQ-PRESET-03)
           ├── <FocusProSetting>          toggle + description (REQ-FOCUS-06)
           ├── <NotePilotSetting>         enable toggle (REQ-NP-09)
           └── <NotePilotDelaySetting>    500–5000ms slider, shown only when enabled (REQ-PREF-02, REQ-NP-10)
```
`*` = rendered in a list/recursively.

---

## 3. Props Interface Sketches

```ts
// ---- Sidebar ----
interface SidebarProps { activeNoteId: string | null; onSelectNote: (id: string) => void; }
interface FolderNodeProps {
  folder: Folder;
  childFolders: Folder[];
  notes: NoteSummary[];
  depth: number;
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onMove: (kind: "note" | "folder", id: string, parentId: string | null) => void;
  onRequestDelete: (folderId: string) => void;
}
interface NoteRowProps { note: NoteSummary; active: boolean; onSelect: (id: string) => void; }
interface DeleteFolderDialogProps {
  open: boolean;
  noteCount: number;        // from GET /folders/{id}/delete-preview
  subfolderCount: number;
  onConfirm: () => void;    // DELETE /folders/{id}
  onCancel: () => void;
}

// ---- Editor ----
interface EditorPaneProps { note: Note | null; }
interface EditorHeaderProps {
  title: string;
  saveState: "idle" | "saving" | "saved" | "error";
  onTitleChange: (t: string) => void;
  onRetrySave: () => void;
  activePreset: Preset;
  onPresetChange: (p: Preset) => void;
  focusPro: boolean;
  onToggleFocusPro: () => void;
  onDocAction: (action: AIAction) => void;
  onOpenCustomPrompt: () => void;
  onExport: (format: ExportFormat) => void;
}
interface MarkdownEditorProps {
  value: string;                       // raw markdown
  onChange: (value: string) => void;   // → debounced autosave
  focusPro: boolean;
  notePilot: { enabled: boolean; delayMs: number };
  onSelectionChange: (sel: { text: string; rect: DOMRect | null }) => void;
  onRequestNotePilot: (contextUpToCursor: string) => void;  // POST /ai/notepilot
}
interface SaveIndicatorProps { state: "idle" | "saving" | "saved" | "error"; onRetry: () => void; }
interface PresetSelectorProps { value: Preset; onChange: (p: Preset) => void; }
interface FocusProToggleProps { enabled: boolean; onToggle: () => void; }

// ---- Selection Toolbar ----
interface SelectionToolbarProps {
  anchorRect: DOMRect | null;          // null = hidden (REQ-TBAR-04)
  selectedText: string;
  onAction: (action: AIAction) => void;   // default 4 + expanded 8 (REQ-TBAR-02/03)
  isMobile: boolean;                       // reposition above keyboard (REQ-TBAR-05)
}

// ---- AI Review ----
interface AIReviewPanelProps {
  open: boolean;
  scope: AIScope;                          // "document" → diff; "selection" → simple preview
  original: string;
  output: string;
  loading: boolean;                        // REQ-REV-07
  isMobile: boolean;                       // tabbed vs side-by-side (REQ-REV-08)
  onAccept: (finalText: string) => void;   // REQ-REV-02
  onReject: () => void;                    // REQ-REV-03
  onEditOutput: (edited: string) => void;  // REQ-REV-04
  onRevise: (instruction: string) => void; // REQ-REV-05 → POST /ai/revise
  onCopy: () => void;                      // REQ-REV-06
}

// ---- Custom Prompt (full doc) ----
interface CustomPromptInputProps {
  open: boolean;
  onSubmit: (instruction: string) => void;  // → /ai/transform action=custom scope=document
  onCancel: () => void;
}

// ---- Command Palette ----
interface CommandPaletteProps {
  open: boolean;
  notes: NoteSummary[];
  onClose: () => void;                      // Esc / outside (REQ-CMDK-05)
  onNavigateNote: (id: string) => void;     // REQ-CMDK-03
  onAction: (a: PaletteAction) => void;     // REQ-CMDK-04
}
type PaletteAction =
  | "create_note" | "create_folder" | "switch_theme"
  | "toggle_focuspro" | "doc_ai_action" | "export_note";

// ---- Preferences ----
interface PreferencesPanelProps {
  prefs: Preferences;
  onChange: (patch: Partial<Preferences>) => void;  // PATCH /preferences (REQ-PREF-03)
}
interface NotePilotDelaySettingProps {
  enabled: boolean;            // control hidden when false (REQ-PREF-02)
  valueMs: number;             // one of 500..5000 step 500 (REQ-NP-10)
  onChange: (ms: number) => void;
}
```

---

## 4. State Stores (Zustand)

| Store | Holds | Backs |
|---|---|---|
| `authStore` | `user`, `accessToken`, `refreshToken`, `isAuthenticated` | REQ-AUTH-* |
| `notesStore` | `folders[]`, `noteSummaries[]`, `activeNote`, CRUD actions | REQ-FLDR-*, REQ-EDIT-* |
| `editorStore` | `content`, `lastSavedContent`, `saveState`, selection | REQ-SAVE-*, REQ-TBAR-* |
| `prefsStore` | full `Preferences`; theme/preset/focuspro/notepilot getters | REQ-PREF-*, REQ-THEME-*, REQ-PRESET-*, REQ-FOCUS-* |
| `reviewStore` | `open`, `scope`, `original`, `output`, `loading` | REQ-REV-* |

Preset/FocusPro/theme are single-sourced in `prefsStore`, so header, palette, and preferences
toggles stay in sync (REQ-FOCUS-06, REQ-PRESET-03).

---

## 5. Responsive Behavior (NFR-RESP-*)

| Breakpoint | Layout |
|---|---|
| ≥1280px (desktop) | sidebar + editor side-by-side; review diff side-by-side |
| 768px (tablet) | collapsible sidebar (drawer); editor full-width |
| 375px (mobile) | sidebar as overlay drawer; review diff → tabbed (NFR-RESP-04); selection toolbar repositions above keyboard (REQ-TBAR-05) |
