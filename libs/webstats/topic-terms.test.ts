import { describe, expect, it } from "vitest";
import { matchAliases, siteProfile, termsFrom } from "./topic-terms";

describe("termsFrom", () => {
  it("splits a path into words", () => {
    expect(termsFrom(["/blog/vector-databases"])).toContain("vector");
    expect(termsFrom(["/blog/vector-databases"])).toContain("databases");
  });

  it("splits on underscores as well as hyphens", () => {
    expect(termsFrom(["/docs/rag_pipeline"])).toEqual(
      expect.arrayContaining(["rag", "pipeline"]),
    );
  });

  it("drops structural path words that describe every site", () => {
    // "blog" and "docs" say nothing about what a site is about.
    const terms = termsFrom(["/blog/agents", "/docs/agents"]);

    expect(terms).not.toContain("blog");
    expect(terms).not.toContain("docs");
    expect(terms).toContain("agents");
  });

  it("drops very short fragments", () => {
    expect(termsFrom(["/a/of/ai"])).not.toContain("a");
    expect(termsFrom(["/a/of/ai"])).not.toContain("of");
  });

  it("keeps two-letter terms that are real", () => {
    // "ai" is short but is exactly the kind of signal that matters here.
    expect(termsFrom(["/ai"])).toContain("ai");
  });

  it("drops purely numeric fragments", () => {
    expect(termsFrom(["/posts/2026/01"])).not.toContain("2026");
  });

  it("deduplicates across pages", () => {
    const terms = termsFrom(["/agents/build", "/agents/deploy"]);

    expect(terms.filter((t) => t === "agents")).toHaveLength(1);
  });

  it("returns nothing for a bare root path", () => {
    expect(termsFrom(["/"])).toEqual([]);
  });
});

describe("matchAliases", () => {
  const aliases = [
    { topicId: "t1", alias: "vector database" },
    { topicId: "t2", alias: "rag" },
    { topicId: "t3", alias: "kubernetes" },
  ];

  it("matches a single-word alias against a term", () => {
    const hits = matchAliases(["rag", "pipeline"], aliases);

    expect(hits.map((h) => h.topicId)).toEqual(["t2"]);
  });

  it("matches a multi-word alias when all its words are present", () => {
    const hits = matchAliases(["vector", "database", "pricing"], aliases);

    expect(hits.map((h) => h.topicId)).toContain("t1");
  });

  it("does not match a multi-word alias on a partial overlap", () => {
    // "vector" alone is not evidence of "vector database".
    const hits = matchAliases(["vector"], aliases);

    expect(hits.map((h) => h.topicId)).not.toContain("t1");
  });

  it("is case insensitive", () => {
    expect(matchAliases(["Kubernetes"], aliases).map((h) => h.topicId)).toEqual([
      "t3",
    ]);
  });

  it("reports which term produced the match", () => {
    expect(matchAliases(["rag"], aliases)[0].evidence).toBe("rag");
  });

  it("returns nothing when no alias matches", () => {
    expect(matchAliases(["pricing", "about"], aliases)).toEqual([]);
  });
});

describe("siteProfile", () => {
  it("joins titles into one string for embedding", () => {
    expect(siteProfile(["Vector search", "RAG pipelines"], [])).toBe(
      "Vector search. RAG pipelines",
    );
  });

  it("falls back to path terms when there are no titles", () => {
    // A site can have no <title> worth reading; its URLs still describe it.
    expect(siteProfile([], ["agents", "evals"])).toBe("agents. evals");
  });

  it("returns an empty string when there is nothing to describe", () => {
    expect(siteProfile([], [])).toBe("");
  });

  it("caps length so one page cannot dominate the embedding", () => {
    const long = Array.from({ length: 200 }, (_, i) => `title-${i}`);

    expect(siteProfile(long, []).length).toBeLessThanOrEqual(1000);
  });
});
