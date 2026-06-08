// Real API client tests — transform/revise wire-up, NotePilot SSE parsing (REQ-NP-02/03/07), and
// the transparent refresh-on-401 interceptor (REQ-AUTH-05). `fetch` is stubbed; no network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiApi, authApi, setTokens } from "@/lib/api/endpoints";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sseResponse(text: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  setTokens("access-token", "refresh-token");
});

afterEach(() => vi.unstubAllGlobals());

describe("aiApi.transform / revise (REQ-AIA, REQ-REV)", () => {
  it("posts to /ai/transform and returns the parsed output", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ output: "OUT", action: "format", scope: "document" }));
    const result = await aiApi.transform({
      note_id: "n1", action: "format", scope: "document", text: "raw", preset: "enhance",
    });
    expect(result.output).toBe("OUT");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/ai/transform");
    expect(JSON.parse(init.body)).toMatchObject({ note_id: "n1", action: "format", preset: "enhance" });
    expect(init.headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("posts to /ai/revise and returns the new output (REQ-REV-05)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ output: "REVISED" }));
    const result = await aiApi.revise({ previous_output: "old", instruction: "shorter", preset: "enhance" });
    expect(result.output).toBe("REVISED");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/ai/revise");
  });
});

describe("aiApi.notePilotStream (SSE — REQ-NP)", () => {
  it("parses token events then resolves on done (REQ-NP-02/03)", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        'event: token\ndata: {"text": "Hel"}\n\nevent: token\ndata: {"text": "lo"}\n\nevent: done\ndata: {}\n\n',
      ),
    );
    const tokens: string[] = [];
    await new Promise<void>((resolve) => {
      aiApi.notePilotStream("n1", "context", { onToken: (t) => tokens.push(t), onDone: resolve });
    });
    expect(tokens).toEqual(["Hel", "lo"]);
  });

  it("fails silently: a non-OK response yields done with no tokens (REQ-NP-07)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("upstream error", { status: 502 }));
    const tokens: string[] = [];
    let done = false;
    await new Promise<void>((resolve) => {
      aiApi.notePilotStream("n1", "c", {
        onToken: (t) => tokens.push(t),
        onDone: () => { done = true; resolve(); },
      });
    });
    expect(tokens).toHaveLength(0);
    expect(done).toBe(true);
  });
});

describe("refresh-on-401 interceptor (REQ-AUTH-05)", () => {
  it("refreshes the access token once and retries the original request", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "expired", code: "unauthorized" }, 401)) // /auth/me
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh", token_type: "bearer" })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse({ id: "u1", email: "a@b.co", created_at: "" })); // retried /auth/me
    const user = await authApi.me();
    expect(user.email).toBe("a@b.co");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/auth/refresh");
  });

  it("dedupes concurrent refreshes: parallel 401s trigger a single /auth/refresh", async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/auth/refresh")) {
        refreshCalls++;
        return Promise.resolve(jsonResponse({ access_token: "fresh", token_type: "bearer" }));
      }
      const auth = (init?.headers as Headers | undefined)?.get("Authorization");
      // Stale token → 401; the retry after a successful refresh carries the fresh token → 200.
      if (auth === "Bearer fresh") {
        return Promise.resolve(jsonResponse({ id: "u1", email: "a@b.co", created_at: "" }));
      }
      return Promise.resolve(jsonResponse({ detail: "expired", code: "unauthorized" }, 401));
    });

    const [a, b] = await Promise.all([authApi.me(), authApi.me()]);
    expect(refreshCalls).toBe(1); // both 401s share one in-flight refresh
    expect(a.email).toBe("a@b.co");
    expect(b.email).toBe("a@b.co");
  });
});
