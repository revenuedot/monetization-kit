import { readdirSync, readFileSync, existsSync } from "node:fs";
import { ROOT, repoUrl } from "./kit.js";

export interface Source { title: string; url: string; publisher?: string }
export interface Pattern {
  id: string; name: string; summary: string; structure: string[]; whenItWorks: string; whenToAvoid: string; rules: string[];
  implementation: Record<"swiftui" | "compose" | "react-native" | "flutter", string>; guidelineIds: string[];
  source: Source; related?: Source[]; checked: string; evidence: string;
}
export interface Guideline { id: string; store: "apple" | "google"; title: string; rule: string; inPractice: string; source: Source; checked: string }
export interface Snippet {
  id: string; title: string; platform: string; task: string; backend: "revenuedot" | "store-native"; language: string; code: string;
  notes: string; status: string; source: Source; checked: string;
}
export interface Skill { name: string; description: string; path: string; url: string }

const readJson = <T>(file: string, key: string): T[] => (JSON.parse(readFileSync(`${ROOT}data/${file}`, "utf8")) as Record<string, T[]>)[key] ?? [];

export const patterns = readJson<Pattern>("paywall-patterns.json", "patterns");
export const guidelines = readJson<Guideline>("store-guidelines.json", "guidelines");
export const snippets = readJson<Snippet>("snippets.json", "snippets");

/** Skills are read from the plugin folder: name and description come from each SKILL.md front matter. */
export function loadSkills(): Skill[] {
  const dir = `${ROOT}plugins/kit/skills`;
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => {
    const text = readFileSync(`${dir}/${d.name}/SKILL.md`, "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
    const field = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, "m").exec(fm)?.[1]?.trim() ?? "";
    return { name: field("name") || d.name, description: field("description"), path: `plugins/kit/skills/${d.name}/SKILL.md`, url: `${repoUrl}/blob/main/plugins/kit/skills/${d.name}/SKILL.md` };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export const skills = loadSkills();

export interface Passage { kind: "pattern" | "guideline" | "snippet" | "skill"; id: string; title: string; passage: string; sourceUrl: string; checked?: string; score: number }

const STOP = new Set("a an the and or of to in on for is are be with how do i my me we what when which that this it as at by from can should use".split(" "));
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));

interface Doc { kind: Passage["kind"]; id: string; title: string; body: string; sourceUrl: string; checked?: string }
const docs: Doc[] = [
  ...patterns.map((p): Doc => ({ kind: "pattern", id: p.id, title: p.name, body: [p.summary, p.whenItWorks, p.whenToAvoid, ...p.structure, ...p.rules].join(" "), sourceUrl: p.source.url, checked: p.checked })),
  ...guidelines.map((g): Doc => ({ kind: "guideline", id: g.id, title: g.title, body: `${g.store} ${g.rule} ${g.inPractice}`, sourceUrl: g.source.url, checked: g.checked })),
  ...snippets.map((s): Doc => ({ kind: "snippet", id: s.id, title: s.title, body: `${s.platform} ${s.task} ${s.backend} ${s.language} ${s.notes}`, sourceUrl: s.source.url, checked: s.checked })),
  ...skills.map((s): Doc => ({ kind: "skill", id: s.name, title: s.name, body: s.description, sourceUrl: s.url })),
];

/** Ranked passages for a query: title hits count three times a body hit, rarer terms count more. */
export function search(query: string, limit = 5, kind?: Passage["kind"]): Passage[] {
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const pool = kind ? docs.filter((d) => d.kind === kind) : docs;
  const idf = (t: string) => Math.log(1 + docs.length / (1 + docs.filter((d) => tokens(`${d.title} ${d.body}`).includes(t)).length));
  const scored = pool.map((d) => {
    const title = tokens(d.title), body = tokens(d.body);
    let score = 0;
    for (const t of q) score += idf(t) * (3 * title.filter((x) => x === t).length + Math.min(3, body.filter((x) => x === t).length));
    return { d, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id)).slice(0, limit);
  return scored.map(({ d, score }) => ({ kind: d.kind, id: d.id, title: d.title, passage: d.body.length > 360 ? `${d.body.slice(0, 357)}...` : d.body, sourceUrl: d.sourceUrl, checked: d.checked, score: Math.round(score * 100) / 100 }));
}
