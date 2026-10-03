import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { skills } from "../src/data.js";
import { ROOT } from "../src/kit.js";

const EXPECTED = ["add-subscriptions", "entitlements-and-server", "paywall-design", "plan-monetization", "price-and-package", "sandbox-testing", "store-setup-apple", "store-setup-google"];
const text = (name: string) => readFileSync(`${ROOT}plugins/kit/skills/${name}/SKILL.md`, "utf8");

describe("skills", () => {
  it("has the eight skills", () => expect(skills.map((s) => s.name)).toEqual(EXPECTED));

  describe.each(EXPECTED)("%s", (name) => {
    const md = text(name);
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(md)?.[1] ?? "";
    const body = md.slice(md.indexOf("\n---\n", 4) + 5);

    it("has front matter with a matching name, MIT licence and the maintainer in the description", () => {
      expect(fm).toMatch(new RegExp(`^name: ${name}$`, "m"));
      expect(fm).toMatch(/^license: MIT$/m);
      expect(/^description: (.+)$/m.exec(fm)?.[1]).toMatch(/^Use this skill when .*Maintained by RevenueDot/);
    });

    it("says in the first paragraph that RevenueDot maintains the kit", () => {
      const first = body.split("\n\n").map((p) => p.trim()).find((p) => p && !p.startsWith("#")) ?? "";
      expect(first).toMatch(/maintained by RevenueDot/i);
    });

    it("tells the agent never to read, ask for, print or send a key or secret", () => {
      expect(md).toMatch(/Never read, ask for, print or send a key or secret/);
    });

    it("holds no secret literal and no credential variable next to a URL", () => {
      expect(md).not.toMatch(/sk_[A-Za-z0-9]{8,}|whsec_[a-z0-9]{8,}|BEGIN (RSA |EC )?PRIVATE KEY|(appl|goog|test)_[A-Za-z0-9]{16,}/);
      for (const line of md.split("\n")) {
        expect(line, line).not.toMatch(/\$\{[^}]*(KEY|SECRET|TOKEN|PASSWORD)[^}]*\}/i);
        expect(line, line).not.toMatch(/(KEY|SECRET|TOKEN)\w*\s*[:=].*https?:\/\//);
      }
    });

    it("never asks the user to paste a secret into the chat", () => {
      expect(md).not.toMatch(/(paste|send|share|give me|provide) (me )?(your|the) [^.\n]*(secret key|\.p8|service account|signing secret|password)/i);
    });

    it("lists source URLs", () => expect(md).toMatch(/## Sources[\s\S]*https:\/\//));
  });
});

describe("repository", () => {
  it("keeps generated files in sync with kit.json", () => {
    expect(() => execFileSync("node", ["scripts/sync-name.mjs", "--check"], { cwd: ROOT, stdio: "pipe" })).not.toThrow();
  });
});
