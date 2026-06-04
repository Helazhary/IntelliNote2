// authStore — REQ-AUTH-*. Phase 4b: real API. login/register hit the backend (JWT access+refresh,
// bcrypt); tokens live in the api token store (localStorage) so the session survives reload, and
// loadSession() restores it via GET /auth/me on startup. Duplicate-email / bad-credentials errors
// come straight from the contract error body (REQ-AUTH-02/04).
import { create } from "zustand";
import type { ApiError, User } from "@/lib/api/types";
import { authApi, clearTokens, getAccessToken, setTokens } from "@/lib/api/endpoints";

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  initialized: boolean; // session-restore check has run (prevents redirect flash)
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  loadSession: () => Promise<void>;
}

function errorMessage(e: unknown, fallback: string): string {
  return (e as ApiError)?.detail ?? fallback;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,

  login: async (email, password) => {
    try {
      const tokens = await authApi.login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      set({ user: tokens.user, isAuthenticated: true, initialized: true });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e, "Invalid email or password.") };
    }
  },

  register: async (email, password) => {
    try {
      await authApi.register(email, password); // 201 user; tokens come from login
      const tokens = await authApi.login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      set({ user: tokens.user, isAuthenticated: true, initialized: true });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e, "Could not create the account.") };
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    if (!getAccessToken()) {
      set({ isAuthenticated: false, initialized: true });
      return;
    }
    try {
      const user = await authApi.me(); // refresh-on-401 handled in the api layer (REQ-AUTH-05)
      set({ user, isAuthenticated: true, initialized: true });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, initialized: true });
    }
  },
}));
