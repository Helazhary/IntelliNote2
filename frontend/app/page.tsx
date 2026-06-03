"use client";

// WorkspacePage (COMPONENT_TREE §1/§2) — the auth-guarded app shell: sidebar + editor, command
// palette (Cmd/Ctrl+K), and preferences panel. Responsive: sidebar is side-by-side on desktop and
// an overlay drawer on mobile (NFR-RESP-*).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { EditorPane } from "@/components/editor/EditorPane";
import { CommandPalette, type PaletteAction } from "@/components/palette/CommandPalette";
import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";
import { useAuthStore } from "@/lib/store/authStore";
import { useNotesStore } from "@/lib/store/notesStore";
import { usePrefsStore } from "@/lib/store/prefsStore";
import { getAIHandlers } from "@/lib/store/aiBridge";

export default function WorkspacePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const activeNote = useNotesStore((s) => s.activeNote);
  const noteSummaries = useNotesStore((s) => s.noteSummaries);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);
  const createFolder = useNotesStore((s) => s.createFolder);

  const prefs = usePrefsStore((s) => s.prefs);
  const updatePrefs = usePrefsStore((s) => s.update);
  const toggleTheme = usePrefsStore((s) => s.toggleTheme);
  const toggleFocusPro = usePrefsStore((s) => s.toggleFocusPro);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.replace("/login");
  }, [mounted, isAuthenticated, router]);

  // Cmd/Ctrl+K opens the command palette from any view (REQ-CMDK-01).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handlePaletteAction(action: PaletteAction) {
    switch (action) {
      case "create_note":
        createNote(null);
        break;
      case "create_folder":
        createFolder(null);
        break;
      case "switch_theme":
        toggleTheme();
        break;
      case "toggle_focuspro":
        toggleFocusPro();
        break;
      case "doc_ai_action":
        getAIHandlers()?.handleDocAction("format");
        break;
      case "export_note":
        getAIHandlers()?.handleExport("md");
        break;
    }
  }

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      {/* Sidebar — persistent on desktop, drawer on mobile */}
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawerOpen(false)} style={{ background: "var(--color-overlay)" }}>
          <div className="h-full w-64 max-w-[80%]" onClick={(e) => e.stopPropagation()}>
            <Sidebar onAfterSelect={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-border bg-panel px-3 py-1.5 text-xs">
          <button type="button" onClick={() => setPaletteOpen(true)} className="rounded border border-border px-2 py-1 text-muted hover:bg-border/40">
            ⌘K
          </button>
          <button type="button" onClick={() => setPrefsOpen(true)} className="rounded border border-border px-2 py-1 hover:bg-border/40">
            Preferences
          </button>
          <button type="button" onClick={logout} className="rounded border border-border px-2 py-1 hover:bg-border/40">
            Sign out
          </button>
        </div>

        {activeNote ? (
          <EditorPane key={activeNote.id} note={activeNote} onOpenSidebar={() => setDrawerOpen(true)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <button type="button" aria-label="Open sidebar" onClick={() => setDrawerOpen(true)} className="rounded border border-border px-3 py-1 text-sm md:hidden">
              ☰ Notes
            </button>
            <h1 className="font-mono text-xl text-accent">SmartNotes AI</h1>
            <p className="text-muted">Select a note from the sidebar or create a new one.</p>
            <button
              type="button"
              onClick={() => createNote(null)}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] hover:opacity-90"
            >
              ＋ New note
            </button>
          </div>
        )}
      </main>

      <CommandPalette
        open={paletteOpen}
        notes={noteSummaries}
        onClose={() => setPaletteOpen(false)}
        onNavigateNote={(id) => selectNote(id)}
        onAction={handlePaletteAction}
      />

      <PreferencesPanel open={prefsOpen} prefs={prefs} onChange={updatePrefs} onClose={() => setPrefsOpen(false)} />
    </div>
  );
}
