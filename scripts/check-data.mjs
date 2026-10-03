#!/usr/bin/env node
// Fails when a data entry has no source URL, no checked date, a date older than 18 months, or a source that does not answer.
//   node scripts/check-data.mjs             all checks, including a request to every URL
//   node scripts/check-data.mjs --offline   everything except the requests
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [["paywall-patterns.json", "patterns"], ["store-guidelines.json", "guidelines"], ["snippets.json", "snippets"]];
export const MAX_AGE_MONTHS = 18;

/** True when `checked` (YYYY-MM-DD) is more than `months` before `now`. */
export function isStale(checked, now = new Date(), months = MAX_AGE_MONTHS) {
  const d = new Date(`${checked}T00:00:00Z`);
  const limit = new Date(now);
  limit.setUTCMonth(limit.getUTCMonth() - months);
  return d < limit;
}

/** Structural problems of one entry: missing source, bad URL, missing or old date. */
export function problemsOf(entry, now = new Date()) {
  const out = [];
  const sources = [entry.source, ...(entry.related ?? [])];
  if (!entry.source?.url) out.push("source.url is missing");
  for (const s of sources) {
    if (!s) continue;
    if (!s.url) { out.push("a source has no url"); continue; }
    try { if (new URL(s.url).protocol !== "https:") out.push(`not https: ${s.url}`); } catch { out.push(`not a URL: ${s.url}`); }
    if (!s.title) out.push(`source has no title: ${s.url}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.checked ?? "")) out.push("checked date is missing or not YYYY-MM-DD");
  else if (Number.isNaN(new Date(`${entry.checked}T00:00:00Z`).getTime())) out.push("checked date is not a date");
  else if (isStale(entry.checked, now)) out.push(`checked ${entry.checked} is older than ${MAX_AGE_MONTHS} months`);
  else if (new Date(`${entry.checked}T00:00:00Z`) > new Date(now.getTime() + 864e5)) out.push(`checked ${entry.checked} is in the future`);
  return out;
}

export function loadEntries() {
  return FILES.flatMap(([file, key]) => JSON.parse(readFileSync(join(root, "data", file), "utf8"))[key].map((e) => ({ file, ...e })));
}

/** Source URLs listed under "## Sources" in each skill. */
export function skillUrls() {
  const dir = join(root, "plugins/kit/skills");
  return readdirSync(dir).flatMap((name) => {
    const md = readFileSync(join(dir, name, "SKILL.md"), "utf8");
    const sources = md.split("## Sources")[1] ?? "";
    return [...sources.matchAll(/https:\/\/[^\s)>\]`]+/g)].map((m) => m[0].replace(/[.,;]+$/, ""));
  });
}

async function reachable(url) {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(25000), headers: { "user-agent": "Mozilla/5.0 (compatible; monetization-kit-data-check)", accept: "text/html,*/*" } });
      if (res.ok) return null;
      last = `HTTP ${res.status}`;
    } catch (e) { last = e instanceof Error ? e.message : String(e); }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

async function main() {
  const offline = process.argv.includes("--offline");
  const entries = loadEntries();
  let failures = 0;
  const ids = new Set();
  for (const e of entries) {
    if (ids.has(`${e.file}:${e.id}`)) { console.error(`${e.file}: duplicate id ${e.id}`); failures++; }
    ids.add(`${e.file}:${e.id}`);
    for (const p of problemsOf(e)) { console.error(`${e.file} ${e.id}: ${p}`); failures++; }
  }
  if (!offline) {
    const urls = [...new Set([...entries.flatMap((e) => [e.source, ...(e.related ?? [])]).map((s) => s?.url).filter(Boolean), ...skillUrls()])];
    const results = await Promise.all(urls.map(async (u) => [u, await reachable(u)]));
    for (const [u, err] of results) if (err) { console.error(`unreachable (${err}): ${u}`); failures++; }
    console.log(`checked ${urls.length} URLs`);
  }
  console.log(`${entries.length} entries, ${failures} problem${failures === 1 ? "" : "s"}`);
  if (failures) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
