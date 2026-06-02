// Phase 2 skeleton landing. The auth-guarded workspace (sidebar + editor + toolbar + palette +
// review + preferences) is built in Phase 3 per docs/COMPONENT_TREE.md.
export default function WorkspacePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
      <h1 className="font-mono text-2xl text-accent">SmartNotes AI</h1>
      <p className="text-muted">Write messy. Think freely. Let AI organize it.</p>
      <p className="text-sm text-muted">Phase 2 skeleton — UI arrives in Phase 3.</p>
    </main>
  );
}
