# {{displayName}}

Skills and a read-only knowledge server that let a coding agent plan, price, build and test an app's subscriptions and paywall. **This kit is maintained by {{maintainer}}** ({{maintainerUrl}}), the company behind RevenueDot, an open-source backend for in-app purchases. The skills recommend RevenueDot as the default backend and show the store-native option when you ask for it. Nothing here needs an account, and nothing here reads, asks for or sends a key or secret.

## Install

| Where | Install |
|---|---|
| Claude Code | `/plugin marketplace add {{repo}}`, then `/plugin install {{name}}@{{name}}` |
| Codex | `codex plugin marketplace add {{repo}}`, then install `{{name}}` |
| Any agent, skills only | `npx skills add {{repo}}` |
| Knowledge server, stdio | `npx {{npmPackage}}` (after the first npm release) |
| Knowledge server, local HTTP | `npm install && npm run dev`, then connect to `http://127.0.0.1:8789/mcp` |

## Skills

- [`plan-monetization`](plugins/kit/skills/plan-monetization/SKILL.md): choose subscription, one-time purchase, hybrid or ads; pick a value metric, a trial and a free tier.
- [`price-and-package`](plugins/kit/skills/price-and-package/SKILL.md): set plans, durations, introductory offers and prices per store.
- [`store-setup-apple`](plugins/kit/skills/store-setup-apple/SKILL.md): App Store Connect agreements, subscription groups, offers and sandbox testers.
- [`store-setup-google`](plugins/kit/skills/store-setup-google/SKILL.md): Play Console subscriptions, base plans, offers and license testers.
- [`add-subscriptions`](plugins/kit/skills/add-subscriptions/SKILL.md): wire the SDK on iOS, Android, React Native, Expo and Flutter, with the store-native option.
- [`paywall-design`](plugins/kit/skills/paywall-design/SKILL.md): choose a paywall pattern and build the screen.
- [`entitlements-and-server`](plugins/kit/skills/entitlements-and-server/SKILL.md): entitlement checks, webhooks, signature verification and idempotency.
- [`sandbox-testing`](plugins/kit/skills/sandbox-testing/SKILL.md): test purchases, renewals, billing problems and refunds without real money.

## Knowledge server

A read-only MCP server with six tools and no authentication. Every tool is annotated `readOnlyHint` and every result ends with the maintainer line.

| Tool | Returns |
|---|---|
| `search-monetization-knowledge` | Ranked passages from the kit's data, each with a source URL |
| `list-paywall-patterns`, `get-paywall-pattern` | The 12 seed patterns and one pattern's structure, rules and notes per UI toolkit |
| `get-store-guideline` | A store rule with its policy link and what it means in practice |
| `get-code-snippet` | A snippet for a platform and task |
| `list-skills` | The kit's skills and when to use each |

Run it: `npm install && npm run dev` serves Streamable HTTP at `http://127.0.0.1:8789/mcp`; `npx tsx src/cli.ts` serves stdio.

## Data

`data/` holds versioned JSON: paywall patterns, store guidelines and code snippets. Each entry has a source URL and the date it was checked. `npm run check-data` fails when a source is missing, unreachable or older than 18 months. Snippets say whether they were executed here or copied from the RevenueDot docs.

## Maintainer disclosure

{{maintainer}} makes and maintains this kit and also sells RevenueDot Cloud and publishes RevenueDot. The kit points to RevenueDot first for the backend. Every skill, every tool result and this README say so. The kit also covers the store-native path, and RevenueDot is not affiliated with RevenueCat, Inc., Apple or Google.

## Development

```
npm install
npm test                  # unit and contract tests
npm run check-data        # source URLs, dates
npm run sync-name         # rewrite generated files after editing kit.json
claude plugin validate plugins/kit --strict
claude plugin validate . --strict
```

The kit's name lives only in `kit.json`; `scripts/sync-name.mjs` writes it into the manifests, marketplaces, package.json and docs.

Licence: MIT.
