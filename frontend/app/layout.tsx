import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SmartNotes AI",
  description: "Write messy. Think freely. Let AI organize it.",
};

// Phase 3: ThemeProvider + QueryProvider wrap the app (COMPONENT_TREE §2). JetBrains Mono is the
// editor font (DEC-011); UI chrome uses the system sans stack. data-theme is set on the client by
// ThemeProvider from persisted prefs; "deeptech" is the SSR default to avoid a flash.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="deeptech">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
