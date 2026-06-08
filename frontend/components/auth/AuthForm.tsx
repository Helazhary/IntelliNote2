"use client";

// Shared auth form for login/register (REQ-AUTH-*, SPEC Auth). Phase 4b: hits the real backend
// (JWT + bcrypt). Duplicate-email registration / bad credentials surface the contract error
// (REQ-AUTH-02/04). On success, redirect to the workspace.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = isLogin ? await login(email, password) : await register(email, password);
    setSubmitting(false);
    if (result.ok) router.push("/");
    else setError(result.error ?? "Something went wrong.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-border bg-panel p-6 shadow-xl" data-testid="auth-form">
        <h1 className="mb-1 font-mono text-xl font-bold text-accent">SmartNotes AI</h1>
        <p className="mb-5 text-sm text-muted">{isLogin ? "Sign in to your account" : "Create an account"}</p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
            aria-label="Email"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
            aria-label="Password"
          />
        </label>

        {error && (
          <p className="mb-3 text-sm text-danger" role="alert" data-testid="auth-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-[var(--color-accent-fg)] hover:opacity-90 disabled:opacity-60"
        >
          {isLogin ? "Sign in" : "Create account"}
        </button>

        <p className="mt-4 text-center text-xs text-muted">
          {isLogin ? (
            <>
              No account?{" "}
              <Link href="/register" className="text-accent hover:underline">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
