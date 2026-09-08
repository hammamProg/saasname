import { describe, it, expect } from "vitest";
import { shouldStartNewSession, SESSION_TIMEOUT_MS } from "./session-window";

describe("shouldStartNewSession", () => {
  const start = 1_700_000_000_000;

  it("does not start a new session before 30 minutes of inactivity", () => {
    expect(shouldStartNewSession(start, start + SESSION_TIMEOUT_MS - 1)).toBe(false);
  });

  it("starts a new session at exactly 30 minutes of inactivity", () => {
    expect(shouldStartNewSession(start, start + SESSION_TIMEOUT_MS)).toBe(true);
  });

  it("starts a new session well past 30 minutes of inactivity", () => {
    expect(shouldStartNewSession(start, start + SESSION_TIMEOUT_MS * 3)).toBe(true);
  });

  it("does not start a new session for a fresh visit", () => {
    expect(shouldStartNewSession(start, start)).toBe(false);
  });
});
