import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartNotes AI",
  description: "Write messy. Think freely. Let AI organize it.",
};

// Phase 2 skeleton. ThemeProvider / QueryProvider and the full <WorkspacePage> tree
// (see docs/COMPONENT_TREE.md) are implemented in Phase 3.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="deeptech">
      <body className="font-sans">{children}</body>
    </html>
  );
}
