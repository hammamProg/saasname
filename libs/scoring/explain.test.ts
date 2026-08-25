import { describe, it, expect, vi } from "vitest";
import { explainVerdicts, outputBudget } from "@/libs/scoring/explain";
import { LlmError, type LlmProvider } from "@/libs/llm/provider";
import type { CandidateVerdict } from "@/libs/scoring/verdict";

function verdict(over: Partial<CandidateVerdict> = {}): CandidateVerdict {
  return {
    verdict: "contested",
    score: 50,
    platforms: [{ platform: "domains", verdict: "contested", strength: 50 }],
    ...over,
  };
}

function providerReturning(raw: string | Error): LlmProvider {
  return {
    complete: vi.fn(async () => {
      if (raw instanceof Error) throw raw;
      return raw;
    }),
  };
}

describe("outputBudget", () => {
  it("clears the floor where a reasoning model starts producing output", () => {
    // A cap of 220 was measured producing 220 reasoning tokens and no answer.
    expect(outputBudget(1)).toBeGreaterThan(220);
  });

  it("grows with the batch so a large run is not truncated", () => {
    expect(outputBudget(8)).toBeGreaterThan(outputBudget(2));
  });
});

describe("explainVerdicts", () => {
  it("maps explanations back by name", async () => {
    const provider = providerReturning('{"e":[{"n":"Alpha","t":"Domains are taken."}]}');

    const out = await explainVerdicts(provider, [{ name: "Alpha", verdict: verdict() }]);

    expect(out.get("Alpha")).toBe("Domains are taken.");
  });

  it("makes one call for the whole batch, not one per candidate", async () => {
    const provider = providerReturning('{"e":[]}');

    await explainVerdicts(provider, [
      { name: "A", verdict: verdict() },
      { name: "B", verdict: verdict() },
      { name: "C", verdict: verdict() },
    ]);

    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("sends a compressed digest rather than raw signals", async () => {
    const provider = providerReturning('{"e":[]}');

    await explainVerdicts(provider, [{ name: "Alpha", verdict: verdict() }]);

    const sent = (provider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const payload = JSON.parse(sent.user);
    // Short keys, at most two facts: cost scales with tokens in.
    expect(payload[0]).toHaveProperty("n", "Alpha");
    expect(payload[0]).toHaveProperty("v");
    expect(payload[0].f.length).toBeLessThanOrEqual(2);
    // No internal scores: the model quotes back whatever it is handed, and
    // "strength 41" means nothing to a founder.
    expect(payload[0]).not.toHaveProperty("s");
    expect(JSON.stringify(payload)).not.toMatch(/\d/);
    expect(sent.maxOutputTokens).toBe(outputBudget(1));
  });

  it("caps the number of facts sent per candidate", async () => {
    const provider = providerReturning('{"e":[]}');

    await explainVerdicts(provider, [
      {
        name: "Alpha",
        verdict: verdict({
          platforms: [
            { platform: "app-store", verdict: "blocked", strength: 90 },
            { platform: "domains", verdict: "blocked", strength: 90 },
            { platform: "web-serp", verdict: "blocked", strength: 90 },
          ],
        }),
      },
    ]);

    const payload = JSON.parse(
      (provider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].user
    );
    expect(payload[0].f.length).toBe(2);
  });

  it("omits clear platforms from the digest, since there is nothing to explain", async () => {
    const provider = providerReturning('{"e":[]}');

    await explainVerdicts(provider, [
      {
        name: "Alpha",
        verdict: verdict({
          platforms: [
            { platform: "app-store", verdict: "clear", strength: 0 },
            { platform: "domains", verdict: "blocked", strength: 90 },
          ],
        }),
      },
    ]);

    const payload = JSON.parse(
      (provider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].user
    );
    expect(payload[0].f).toEqual(["domains: blocked"]);
  });

  it("returns empty rather than throwing when the model fails", async () => {
    // An explanation is a nicety. Losing it must not cost the user the report
    // they already paid for.
    const provider = providerReturning(new LlmError("upstream down", 500));

    const out = await explainVerdicts(provider, [{ name: "Alpha", verdict: verdict() }]);

    expect(out.size).toBe(0);
  });

  it("survives malformed JSON from the model", async () => {
    const out = await explainVerdicts(providerReturning("not json"), [
      { name: "Alpha", verdict: verdict() },
    ]);

    expect(out.size).toBe(0);
  });

  it("drops entries with an empty explanation", async () => {
    const out = await explainVerdicts(
      providerReturning('{"e":[{"n":"Alpha","t":"  "},{"n":"Beta","t":"Fine."}]}'),
      [{ name: "Alpha", verdict: verdict() }]
    );

    expect(out.has("Alpha")).toBe(false);
    expect(out.get("Beta")).toBe("Fine.");
  });

  it("makes no call at all for an empty batch", async () => {
    const provider = providerReturning('{"e":[]}');

    expect((await explainVerdicts(provider, [])).size).toBe(0);
    expect(provider.complete).not.toHaveBeenCalled();
  });
});

describe("explainVerdicts retry", () => {
  it("retries once with a larger budget when the first attempt comes back empty", async () => {
    // A reasoning model can spend the whole cap thinking and return nothing.
    // Losing the batch to a cap five tokens short is not acceptable.
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new LlmError("DeepSeek returned an empty completion"))
      .mockResolvedValueOnce('{"e":[{"n":"Alpha","t":"Domains are taken."}]}');

    const out = await explainVerdicts({ complete }, [
      { name: "Alpha", verdict: verdict() },
    ]);

    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0].maxOutputTokens).toBe(
      complete.mock.calls[0][0].maxOutputTokens * 2
    );
    expect(out.get("Alpha")).toBe("Domains are taken.");
  });

  it("gives up quietly when the retry also fails", async () => {
    const complete = vi.fn().mockRejectedValue(new LlmError("still down"));

    const out = await explainVerdicts({ complete }, [
      { name: "Alpha", verdict: verdict() },
    ]);

    expect(complete).toHaveBeenCalledTimes(2);
    expect(out.size).toBe(0);
  });
});

describe("digest ordering", () => {
  it("leads with the platform that caused the verdict", async () => {
    // A blocked name was once described as "domains and web are contested"
    // because the live trademark that actually blocked it was third in the
    // list and only the first two facts are sent.
    const provider = providerReturning('{"e":[]}');

    await explainVerdicts(provider, [
      {
        name: "Alpha",
        verdict: {
          verdict: "blocked",
          score: 90,
          platforms: [
            { platform: "domains", verdict: "contested", strength: 50 },
            { platform: "web-serp", verdict: "contested", strength: 55 },
            { platform: "trademark", verdict: "blocked", strength: 100 },
          ],
        },
      },
    ]);

    const payload = JSON.parse(
      (provider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].user
    );
    expect(payload[0].f[0]).toMatch(/trademark/);
  });
});
