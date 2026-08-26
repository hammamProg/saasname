import { describe, it, expect, vi } from "vitest";
import {
  generateCandidates,
  parseCandidates,
  GENERATION_MODEL,
  BATCH_SIZE,
} from "@/libs/names/generate";
import { NAME_STYLES, resolveStyle } from "@/libs/names/styles";
import { LlmError, type LlmProvider } from "@/libs/llm/provider";

function payload(names: Array<[string, string]>) {
  return JSON.stringify({
    candidates: names.map(([name, rationale]) => ({ name, rationale })),
  });
}

function stubProvider(...responses: Array<string | Error>): LlmProvider {
  const queue = [...responses];
  return {
    complete: vi.fn(async () => {
      const next = queue.shift();
      if (next === undefined) throw new Error("stub provider exhausted");
      if (next instanceof Error) throw next;
      return next;
    }),
  };
}

function callsOf(provider: LlmProvider) {
  return (provider.complete as unknown as ReturnType<typeof vi.fn>).mock.calls;
}

const eight: Array<[string, string]> = [
  ["Nameloop", "Loops through name ideas."],
  ["Brandwise", "Sounds considered."],
  ["Namely", "Short and memorable."],
  ["Tagline", "Evokes naming."],
  ["Coinage", "A coined word."],
  ["Moniker", "A synonym for name."],
  ["Wordsmith", "Craft of naming."],
  ["Namecheck", "Checking availability."],
];

describe("parseCandidates", () => {
  it("returns candidates with their normalized form attached", () => {
    expect(parseCandidates(payload([["Data Flow", "It flows."]]))).toEqual([
      { name: "Data Flow", normalizedName: "dataflow", rationale: "It flows." },
    ]);
  });

  it("collapses names that differ only by case, spacing, or hyphens", () => {
    const out = parseCandidates(
      payload([
        ["DataFlow", "one"],
        ["data flow", "two"],
        ["Data-Flow", "three"],
      ])
    );

    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("DataFlow");
  });

  it("drops entries with no usable name", () => {
    const out = parseCandidates(
      payload([
        ["   ", "blank"],
        ["!!!", "symbols"],
        ["Ok", "fine"],
      ])
    );

    expect(out.map((c) => c.name)).toEqual(["Ok"]);
  });

  it("drops entries with no rationale, since every candidate must explain itself", () => {
    const out = parseCandidates(
      payload([
        ["Alpha", "  "],
        ["Beta", "good reason"],
      ])
    );

    expect(out.map((c) => c.name)).toEqual(["Beta"]);
  });

  it("drops absurdly long names", () => {
    const out = parseCandidates(
      payload([
        ["a".repeat(31), "too long"],
        ["Fine", "ok"],
      ])
    );

    expect(out.map((c) => c.name)).toEqual(["Fine"]);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseCandidates("not json at all")).toThrow(LlmError);
  });

  it("throws when the candidates key is missing or not an array", () => {
    expect(() => parseCandidates(JSON.stringify({ names: [] }))).toThrow(LlmError);
  });
});

describe("generateCandidates", () => {
  const args = {
    idea: "a tool that finds unused SaaS names",
    targetPlatform: "web" as const,
  };

  it("returns the parsed candidates and asks the flash model for JSON", async () => {
    const provider = stubProvider(payload(eight));

    const out = await generateCandidates({ provider, ...args });

    expect(out).toHaveLength(BATCH_SIZE);
    expect(callsOf(provider)).toHaveLength(1);
    expect(callsOf(provider)[0][0]).toMatchObject({
      model: GENERATION_MODEL,
      json: true,
    });
  });

  it("puts the idea, the seed name, and the platform in the prompt", async () => {
    const provider = stubProvider(payload(eight));

    await generateCandidates({ provider, ...args, seedName: "Nomen" });

    const { user } = callsOf(provider)[0][0];
    expect(user).toContain("a tool that finds unused SaaS names");
    expect(user).toContain("Nomen");
    expect(user).toContain("web");
  });

  it("retries once when the first response is malformed", async () => {
    const provider = stubProvider("garbage", payload(eight));

    expect(await generateCandidates({ provider, ...args })).toHaveLength(
      BATCH_SIZE
    );
    expect(callsOf(provider)).toHaveLength(2);
  });

  it("retries once when the first batch is too short, and merges both batches", async () => {
    const provider = stubProvider(
      payload(eight.slice(0, 2)),
      payload(eight.slice(2, 8))
    );

    expect(await generateCandidates({ provider, ...args })).toHaveLength(
      BATCH_SIZE
    );
    expect(callsOf(provider)).toHaveLength(2);
  });

  it("accepts a degraded run of three rather than failing", async () => {
    const provider = stubProvider(payload(eight.slice(0, 3)), payload([]));

    expect(await generateCandidates({ provider, ...args })).toHaveLength(3);
  });

  it("throws when even the retry cannot produce three usable candidates", async () => {
    const provider = stubProvider(payload(eight.slice(0, 1)), payload([]));

    await expect(generateCandidates({ provider, ...args })).rejects.toThrow(LlmError);
  });

  it("does not retry an upstream failure on the first call", async () => {
    const provider = stubProvider(new LlmError("upstream 500", 500));

    await expect(generateCandidates({ provider, ...args })).rejects.toThrow(/upstream 500/);
    expect(callsOf(provider)).toHaveLength(1);
  });

  it("does not retry an upstream timeout, which carries no status", async () => {
    const provider = stubProvider(new LlmError("DeepSeek timed out after 15000ms"));

    await expect(generateCandidates({ provider, ...args })).rejects.toThrow(/timed out/);
    expect(callsOf(provider)).toHaveLength(1);
  });

  it("does not swallow an upstream failure on the retry", async () => {
    const provider = stubProvider("garbage", new LlmError("upstream 500", 500));

    await expect(generateCandidates({ provider, ...args })).rejects.toThrow(/upstream 500/);
  });

  it("never returns more than one batch", async () => {
    const many: Array<[string, string]> = Array.from({ length: 20 }, (_v, i) => [
      `Name${i}`,
      `reason ${i}`,
    ]);
    const provider = stubProvider(payload(many));

    expect(await generateCandidates({ provider, ...args })).toHaveLength(
      BATCH_SIZE
    );
  });

  it("puts the chosen style's constraint in the prompt", async () => {
    const provider = stubProvider(payload(eight));

    await generateCandidates({ provider, ...args, style: "invented" });

    expect(callsOf(provider)[0][0].user).toContain(
      resolveStyle("invented").constraint
    );
  });

  it("falls back to the unconstrained style for an unknown id", async () => {
    const provider = stubProvider(payload(eight));

    // A client holding a retired style id should get a vaguer batch, not a 500.
    await generateCandidates({ provider, ...args, style: "retired-style" });

    expect(callsOf(provider)[0][0].user).toContain(
      resolveStyle(undefined).constraint
    );
  });

  it("tells the model which names are already on screen", async () => {
    const provider = stubProvider(payload(eight));

    await generateCandidates({
      provider,
      ...args,
      excludeNames: ["Nameloop", "Brandwise"],
    });

    const { user } = callsOf(provider)[0][0];
    expect(user).toContain("Nameloop");
    expect(user).toContain("Brandwise");
  });

  it("offers every catalogued style to the prompt builder", async () => {
    for (const style of NAME_STYLES) {
      const provider = stubProvider(payload(eight));
      await generateCandidates({ provider, ...args, style: style.id });
      expect(callsOf(provider)[0][0].user).toContain(style.constraint);
    }
  });
});
