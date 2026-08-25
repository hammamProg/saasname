import { describe, it, expect } from "vitest";
import config from "@/config";

describe("test harness", () => {
  it("resolves the @/ alias", () => {
    expect(typeof config.appName).toBe("string");
  });
});
