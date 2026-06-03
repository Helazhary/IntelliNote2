// authStore — REQ-AUTH-*. Phase 3 mocks login/register/refresh (no real API). Tokens persisted
// to localStorage so the session survives reload. Any non-empty credentials succeed in mock mode;
// a registered duplicate email is rejected to exercise REQ-AUTH-02 in the UI.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api/types";
import { MOCK_USER } from "@/lib/mock/data";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  knownEmails: string[];
  login: (email: string, password: string) => { ok: boolean; error?: string };
  register: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      knownEmails: [MOCK_USER.email],

      login: (email, password) => {
        if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
        if (password.length < 8) return { ok: false, error: "Invalid email or password." };
        set({
          user: { ...MOCK_USER, email },
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          isAuthenticated: true,
        });
        return { ok: true };
      },

      register: (email, password) => {
        if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
        if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
        if (get().knownEmails.includes(email)) {
          return { ok: false, error: "An account with this email already exists." };
        }
        set((s) => ({
          knownEmails: [...s.knownEmails, email],
          user: { ...MOCK_USER, email },
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          isAuthenticated: true,
        }));
        return { ok: true };
      },

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: "smartnotes-auth" },
  ),
);
