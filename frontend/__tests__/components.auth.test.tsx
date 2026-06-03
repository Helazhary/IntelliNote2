import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

import { AuthForm } from "@/components/auth/AuthForm";
import { useAuthStore } from "@/lib/store/authStore";

beforeEach(() => {
  push.mockClear();
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, knownEmails: ["demo@smartnotes.app"] });
});

describe("AuthForm (REQ-AUTH-*)", () => {
  it("logs in with valid credentials and redirects", () => {
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Sign in"));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("rejects duplicate-email registration with the contract error (REQ-AUTH-02)", () => {
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "demo@smartnotes.app" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Create account"));
    expect(screen.getByTestId("auth-error")).toHaveTextContent("already exists");
    expect(push).not.toHaveBeenCalled();
  });
});
