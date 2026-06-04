import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/lib/api/endpoints", () => ({
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(),
}));

import { AuthForm } from "@/components/auth/AuthForm";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/endpoints";

const TOKENS = {
  access_token: "a",
  refresh_token: "r",
  token_type: "bearer" as const,
  user: { id: "u1", email: "a@b.co", created_at: "" },
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false, initialized: false });
});

describe("AuthForm (REQ-AUTH-*)", () => {
  it("logs in with valid credentials and redirects", async () => {
    vi.mocked(authApi.login).mockResolvedValue(TOKENS);
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Sign in"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("rejects duplicate-email registration with the contract error (REQ-AUTH-02)", async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      detail: "An account with this email already exists.",
      code: "email_exists",
    });
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "demo@smartnotes.app" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Create account"));
    expect(await screen.findByTestId("auth-error")).toHaveTextContent("already exists");
    expect(push).not.toHaveBeenCalled();
  });
});
