import { describe, it, expect, afterEach, vi } from "vitest";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isConnectorEnabled", () => {
  it("defaults to enabled when no flag is set", () => {
    expect(isConnectorEnabled("hacker_news")).toBe(true);
  });

  it("is disabled when the env flag is explicitly 'false'", () => {
    vi.stubEnv("INGEST_HACKER_NEWS_ENABLED", "false");
    expect(isConnectorEnabled("hacker_news")).toBe(false);
  });

  it("uppercases and underscores the connector id to build the flag name", () => {
    vi.stubEnv("INGEST_STACK_EXCHANGE_ENABLED", "false");
    expect(isConnectorEnabled("stack_exchange")).toBe(false);
  });
});
