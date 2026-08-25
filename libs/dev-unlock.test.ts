import { describe, it, expect, afterEach, vi } from "vitest";
import { isPaywallBypassEnabled } from "@/libs/dev-unlock";

afterEach(() => vi.unstubAllEnvs());

function setEnv(nodeEnv: string, flag?: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("DEV_UNLOCK_PAYMENTS", flag as string);
}

describe("isPaywallBypassEnabled", () => {
  it("is off by default in development", () => {
    setEnv("development", undefined);
    expect(isPaywallBypassEnabled()).toBe(false);
  });

  it("is on in development when the flag is exactly 'true'", () => {
    setEnv("development", "true");
    expect(isPaywallBypassEnabled()).toBe(true);
  });

  it("ignores truthy-looking values that are not 'true'", () => {
    for (const value of ["1", "yes", "TRUE", ""]) {
      setEnv("development", value);
      expect(isPaywallBypassEnabled()).toBe(false);
    }
  });

  it("stays off in production even when the flag is set", () => {
    setEnv("production", "true");
    expect(isPaywallBypassEnabled()).toBe(false);
  });
});
