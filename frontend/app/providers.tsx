"use client";

// App-wide providers (COMPONENT_TREE §2): ThemeProvider injects the active theme as a
// `data-theme` attribute on <html> (REQ-THEME-02/03), QueryProvider holds the TanStack Query
// client, and the session bootstrap restores the JWT session on load (REQ-AUTH-05).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { usePrefsStore } from "@/lib/store/prefsStore";
import { useAuthStore } from "@/lib/store/authStore";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePrefsStore((s) => s.prefs.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return <>{children}</>;
}

function SessionBootstrap() {
  // Restore the session from the stored token once on load (validates via GET /auth/me).
  useEffect(() => {
    void useAuthStore.getState().loadSession();
  }, []);
  return null;
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
      <SessionBootstrap />
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
