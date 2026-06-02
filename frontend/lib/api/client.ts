// Minimal typed fetch wrapper. Phase 2 provides the base + auth header plumbing; per-route
// functions and the refresh-on-401 interceptor (REQ-AUTH-05) are completed in Phase 3/4b.
import type { ApiError } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({
      detail: res.statusText,
      code: "unknown",
    }))) as ApiError;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
