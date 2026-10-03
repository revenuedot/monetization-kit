import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MAINTAINED_BY } from "../src/kit.js";
import { runTool, tools } from "../src/tools.js";
import { guidelines, patterns, snippets } from "../src/data.js";

const NAMES = ["search-monetization-knowledge", "get-paywall-pattern", "list-paywall-patterns", "get-store-guideline", "get-code-snippet", "list-skills"];
const CREDENTIAL = /key|secret|token|password|passwd|credential|auth|bearer|p8|jwt|cert/i;

describe("tools", () => {
  it("has exactly the six tools", () => expect(tools.map((t) => t.name).sort()).toEqual([...NAMES].sort()));

  it("annotates every tool read-only", () => {
    for (const t of tools) expect(t.annotations, t.name).toEqual({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  });

  it("takes no credential: no input field is named like one, and no description asks for one", () => {
    for (const t of tools) {
      for (const field of Object.keys(t.inputSchema)) expect(field, `${t.name}.${field}`).not.toMatch(CREDENTIAL);
      expect(t.description, t.name).not.toMatch(/api key|secret|password|token/i);
    }
  });

  const calls: [string, unknown][] = [
    ["search-monetization-knowledge", { query: "free trial disclosure" }],
    ["search-monetization-knowledge", { query: "zzzzqqqq nothing" }],
    ["list-paywall-patterns", {}],
    ["get-paywall-pattern", { id: "annual-first" }],
    ["get-paywall-pattern", { id: "annual-first", toolkit: "flutter" }],
    ["get-paywall-pattern", { id: "does-not-exist" }],
    ["get-store-guideline", {}],
    ["get-store-guideline", { store: "google" }],
    ["get-store-guideline", { id: "apple-3-1-2a-trial-disclosure" }],
    ["get-store-guideline", { id: "nope" }],
    ["get-code-snippet", { id: "ios-configure" }],
    ["get-code-snippet", { platform: "ios" }],
    ["get-code-snippet", { platform: "windows" }],
    ["list-skills", {}],
  ];

  it.each(calls)("%s %j ends with the maintained-by line", (name, args) => {
    const r = runTool(name, args);
    expect(r.text.trimEnd().split("\n").at(-1)).toBe(MAINTAINED_BY);
    expect(MAINTAINED_BY).toContain("RevenueDot");
  });

  it("every pattern, guideline and snippet can be fetched by id", () => {
    for (const p of patterns) expect(runTool("get-paywall-pattern", { id: p.id }).isError, p.id).toBe(false);
    for (const g of guidelines) expect(runTool("get-store-guideline", { id: g.id }).isError, g.id).toBe(false);
    for (const s of snippets) expect(runTool("get-code-snippet", { id: s.id }).isError, s.id).toBe(false);
  });

  it("search ranks by relevance and cites a source URL", () => {
    const r = runTool("search-monetization-knowledge", { query: "acknowledge purchase within 3 days" });
    const results = (r.data as { results: { id: string; sourceUrl: string }[] }).results;
    expect(results[0]?.id).toBe("google-acknowledge-within-3-days");
    for (const x of results) expect(x.sourceUrl).toMatch(/^https:\/\//);
  });

  it("rejects bad input", () => {
    expect(() => runTool("get-paywall-pattern", {})).toThrow();
    expect(() => runTool("search-monetization-knowledge", { query: "x", limit: 99 })).toThrow(z.ZodError);
  });

  it("patterns reference only existing guidelines", () => {
    const ids = new Set(guidelines.map((g) => g.id));
    for (const p of patterns) for (const g of p.guidelineIds) expect(ids.has(g), `${p.id} -> ${g}`).toBe(true);
  });
});
