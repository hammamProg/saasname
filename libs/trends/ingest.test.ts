import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestSignals } from "@/libs/trends/ingest";
import type { RawSignal } from "@/libs/trends/types";

const upsert = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn(() => ({ upsert })));
const createSupabaseAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin,
}));

const signal: RawSignal = {
  sourceProvider: "hacker_news",
  sourceType: "launch",
  externalId: "123",
  canonicalUrl: "https://example.com/123",
  publishedAt: "2026-09-01T00:00:00.000Z",
  title: "Example",
};

beforeEach(() => {
  createSupabaseAdmin.mockReturnValue({ from });
  vi.clearAllMocks();
});

describe("ingestSignals", () => {
  it("upserts on content_hash and reports inserted count from returned rows", async () => {
    upsert.mockReturnValue({
      select: () => Promise.resolve({ data: [{ id: "row-1" }], error: null }),
    });

    const result = await ingestSignals("hacker_news", [signal]);

    expect(from).toHaveBeenCalledWith("signals");
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          source_provider: "hacker_news",
          external_id: "123",
          content_hash: expect.any(String),
        }),
      ]),
      { onConflict: "content_hash", ignoreDuplicates: true }
    );
    expect(result).toEqual({ inserted: 1, skipped: 0 });
  });

  it("counts duplicates as skipped, not failed", async () => {
    upsert.mockReturnValue({
      select: () => Promise.resolve({ data: [], error: null }),
    });

    const result = await ingestSignals("hacker_news", [signal, signal]);

    expect(result).toEqual({ inserted: 0, skipped: 2 });
  });

  it("returns zeros without calling Supabase when given no signals", async () => {
    const result = await ingestSignals("hacker_news", []);

    expect(result).toEqual({ inserted: 0, skipped: 0 });
    expect(from).not.toHaveBeenCalled();
  });

  it("throws when Supabase is not configured", async () => {
    const { createSupabaseAdmin } = await import("@/libs/supabase");
    vi.mocked(createSupabaseAdmin).mockReturnValueOnce(null as never);

    await expect(ingestSignals("hacker_news", [signal])).rejects.toThrow(
      "Supabase is not configured"
    );
  });
});
