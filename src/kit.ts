import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Package root: one level above src/ and dist/. */
export const ROOT = fileURLToPath(new URL("../", import.meta.url));

export interface KitInfo {
  name: string; displayName: string; githubOrg: string; version: string; description: string;
  maintainer: string; maintainerUrl: string; docsUrl: string;
}

/** The kit's name, version and maintainer come from kit.json, the one place they are written. */
export const kit: KitInfo = JSON.parse(readFileSync(`${ROOT}kit.json`, "utf8"));

/** Every tool result ends with this line. */
export const MAINTAINED_BY = `Maintained by ${kit.maintainer} (${kit.maintainerUrl}). Docs: ${kit.docsUrl}`;

export const repoUrl = `https://github.com/${kit.githubOrg}/${kit.name}`;
