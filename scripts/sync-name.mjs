#!/usr/bin/env node
// The kit's name lives in kit.json and nowhere else. This script writes it into every generated file:
// both manifests, both marketplaces, package.json, README.md, llms.txt and the plugin README.
//   node scripts/sync-name.mjs           rewrite the generated files
//   node scripts/sync-name.mjs --check   fail if a generated file is out of date
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kit = JSON.parse(readFileSync(join(root, "kit.json"), "utf8"));
const check = process.argv.includes("--check");
const repo = `${kit.githubOrg}/${kit.name}`;
const author = { name: kit.maintainer, email: kit.supportEmail, url: kit.maintainerUrl };
const keywords = ["subscriptions", "in-app-purchases", "paywall", "pricing", "app-store", "google-play", "sandbox-testing", "mcp", "agent-skills"];
const json = (v) => JSON.stringify(v, null, 2) + "\n";

const files = {
  ".claude-plugin/marketplace.json": json({
    name: kit.name,
    owner: { name: kit.maintainer, email: kit.supportEmail },
    plugins: [{ name: kit.name, source: "./plugins/kit", description: kit.description, category: "development" }],
    metadata: { description: kit.description },
  }),
  ".agents/plugins/marketplace.json": json({
    name: kit.name,
    interface: { displayName: kit.displayName },
    plugins: [{
      name: kit.name,
      source: { source: "local", path: "./plugins/kit" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Developer Tools",
    }],
  }),
  "plugins/kit/.claude-plugin/plugin.json": json({
    name: kit.name, displayName: kit.displayName, version: kit.version, description: kit.description, author,
    homepage: `https://github.com/${repo}`, repository: `https://github.com/${repo}`, license: "MIT", keywords,
  }),
  "plugins/kit/.codex-plugin/plugin.json": json({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: kit.name, version: kit.version, description: kit.description, author,
    homepage: `https://github.com/${repo}`, repository: `https://github.com/${repo}`, license: "MIT", keywords,
  }),
};

for (const [out, tmpl] of [["README.md", "README.md"], ["llms.txt", "llms.txt"], ["plugins/kit/README.md", "plugin-README.md"]]) {
  files[out] = readFileSync(join(root, "templates", tmpl), "utf8")
    .replaceAll("{{name}}", kit.name).replaceAll("{{displayName}}", kit.displayName).replaceAll("{{repo}}", repo)
    .replaceAll("{{docsUrl}}", kit.docsUrl).replaceAll("{{maintainer}}", kit.maintainer).replaceAll("{{maintainerUrl}}", kit.maintainerUrl)
    .replaceAll("{{npmPackage}}", `${kit.npmScope}/${kit.name}`);
}

// package.json: only the fields that carry the name; everything else stays as it is.
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = `${kit.npmScope}/${kit.name}`;
pkg.version = kit.version;
pkg.description = kit.description;
pkg.repository = { type: "git", url: `https://github.com/${repo}.git` };
pkg.bin = { [kit.name]: "dist/cli.js" };
files["package.json"] = json(pkg);

let stale = 0;
for (const [rel, content] of Object.entries(files)) {
  const path = join(root, rel);
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === content) continue;
  if (check) { console.error(`out of date: ${rel}`); stale++; continue; }
  writeFileSync(path, content);
  console.log(`wrote ${rel}`);
}
if (check) { if (stale) process.exit(1); console.log("generated files are in sync with kit.json"); }
