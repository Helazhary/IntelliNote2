"use client";

// App-wide providers (COMPONENT_TREE §2): ThemeProvider injects the active theme as a
// `data-theme` attribute on <html> (REQ-THEME-02/03), QueryProvider holds the TanStack Query
// client (used in Phase 4b for real data fetching).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { usePrefsStore } from "@/lib/store/prefsStore";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePrefsStore((s) => s.prefs.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<QueryClient>();
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: false } },
    });
  }
  return (
    <QueryClientProvider client={clientRef.current}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
