import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script without types
import { isStale, loadEntries, problemsOf } from "../scripts/check-data.mjs";
import { guidelines, patterns, snippets } from "../src/data.js";

describe("seed data", () => {
  it("has 12 patterns, 10 guidelines and 10 snippets", () => {
    expect([patterns.length, guidelines.length, snippets.length]).toEqual([12, 10, 10]);
  });

  it("every entry has a source URL and a recent checked date", () => {
    const now = new Date();
    for (const e of loadEntries()) expect(problemsOf(e, now), `${e.file} ${e.id}`).toEqual([]);
  });

  it("every snippet says how it was verified", () => {
    for (const s of snippets) expect(["copied-from-revenuedot-docs", "executed-in-test", "written-from-official-docs-not-compiled"]).toContain(s.status);
  });

  it("holds no secret-looking literal", () => {
    const all = JSON.stringify([patterns, guidelines, snippets]);
    expect(all).not.toMatch(/sk_[A-Za-z0-9]{8,}|whsec_[a-z0-9]{8,}|BEGIN (RSA |EC )?PRIVATE KEY|(appl|goog|test)_[A-Za-z0-9]{16,}/);
  });
});

describe("check-data rules", () => {
  const good = { source: { title: "t", url: "https://example.com/a" }, checked: "2026-10-03" };
  const now = new Date("2026-10-03T00:00:00Z");
  it("accepts a good entry", () => expect(problemsOf(good, now)).toEqual([]));
  it("fails a missing source URL", () => expect(problemsOf({ checked: "2026-10-03" }, now).join()).toMatch(/source.url is missing/));
  it("fails a source without https", () => expect(problemsOf({ ...good, source: { title: "t", url: "http://x.test" } }, now).join()).toMatch(/not https/));
  it("fails a missing or malformed date", () => {
    expect(problemsOf({ source: good.source }, now).join()).toMatch(/checked date/);
    expect(problemsOf({ ...good, checked: "last week" }, now).join()).toMatch(/checked date/);
  });
  it("fails a date older than 18 months and passes exactly 18 months", () => {
    expect(isStale("2025-04-03", now)).toBe(false);
    expect(isStale("2025-04-02", now)).toBe(true);
    expect(problemsOf({ ...good, checked: "2024-01-01" }, now).join()).toMatch(/older than 18 months/);
  });
  it("checks related sources too", () => {
    expect(problemsOf({ ...good, related: [{ title: "r" }] }, now).join()).toMatch(/no url/);
  });
});

describe("executed snippet: webhook-verify-node", () => {
  const snippet = snippets.find((s) => s.id === "webhook-verify-node")!;
  const body = snippet.code.replace(/^import .*$/m, "").replace("export function", "function");
  const require = createRequire(import.meta.url);
  const verify = new Function("require", `const { createHmac, timingSafeEqual } = require("node:crypto"); ${body}; return verifySignature;`)(require) as
    (raw: Buffer, header: string, secret: string, opts?: { now?: Date }) => boolean;
  const secret = "test-secret-not-real";
  const raw = Buffer.from('{"api_version":"1.0","event":{"id":"e1","type":"TEST"}}');
  const now = new Date("2026-10-03T12:00:00Z");
  const t = Math.floor(now.getTime() / 1000);
  const sign = (ts: number, b: Buffer) => `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.`).update(b).digest("hex")}`;

  it("accepts a correct signature", () => expect(verify(raw, sign(t, raw), secret, { now })).toBe(true));
  it("rejects a changed body", () => expect(verify(Buffer.from("{}"), sign(t, raw), secret, { now })).toBe(false));
  it("rejects a wrong secret", () => expect(verify(raw, sign(t, raw), "other", { now })).toBe(false));
  it("rejects a replay older than 5 minutes", () => expect(verify(raw, sign(t - 301, raw), secret, { now })).toBe(false));
  it("rejects a missing or malformed header", () => {
    expect(verify(raw, "", secret, { now })).toBe(false);
    expect(verify(raw, "v1=abc", secret, { now })).toBe(false);
  });
  it("matches a signature made exactly as the docs describe", () => {
    const expected = createHmac("sha256", secret).update(Buffer.concat([Buffer.from(`${t}.`), raw])).digest("hex");
    expect(verify(raw, `t=${t},v1=${expected}`, secret, { now })).toBe(true);
  });
});
