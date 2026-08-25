import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCreditBalance } from "@/libs/credits/balance";

declare global {
  var __fakeServerClient: { rpc: ReturnType<typeof vi.fn> };
}

function fakeClient(response: { data: unknown; error: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(response) };
}

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => globalThis.__fakeServerClient,
}));

// getCreditBalance is wrapped in React's `cache`, which memoises per request.
// Vitest runs outside a request scope, so each call re-executes — but the mock
// is reset between tests regardless.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getCreditBalance", () => {
  it("returns the balance reported by credit_balance", async () => {
    const client = fakeClient({ data: 12, error: null });
    globalThis.__fakeServerClient = client;

    await expect(getCreditBalance("user-1")).resolves.toBe(12);
    expect(client.rpc).toHaveBeenCalledWith("credit_balance", { p_user_id: "user-1" });
  });

  it("returns 0 when the read fails rather than throwing", async () => {
    globalThis.__fakeServerClient = fakeClient({
      data: null,
      error: { message: "FORBIDDEN" },
    });

    await expect(getCreditBalance("user-2")).resolves.toBe(0);
  });

  it("returns 0 when the function yields null", async () => {
    globalThis.__fakeServerClient = fakeClient({ data: null, error: null });

    await expect(getCreditBalance("user-3")).resolves.toBe(0);
  });
});
