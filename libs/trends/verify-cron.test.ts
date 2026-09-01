import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { verifyCronRequest } from "@/libs/trends/verify-cron";

function requestWith(auth?: string) {
  return new Request("https://example.com/api/internal/ingest/hacker-news", {
    headers: auth ? { authorization: auth } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyCronRequest", () => {
  it("allows the request when CRON_SECRET matches", async () => {
    vi.stubEnv("CRON_SECRET", "shh");
    vi.stubEnv("NODE_ENV", "production");

    expect(verifyCronRequest(requestWith("Bearer shh"))).toBeNull();
  });

  it("rejects when the bearer token does not match", async () => {
    vi.stubEnv("CRON_SECRET", "shh");

    const result = verifyCronRequest(requestWith("Bearer wrong"));
    expect(result?.status).toBe(401);
  });

  it("rejects when no secret is configured in production", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    const result = verifyCronRequest(requestWith());
    expect(result?.status).toBe(500);
  });

  it("allows the request when no secret is configured outside production", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(verifyCronRequest(requestWith())).toBeNull();
  });
});
