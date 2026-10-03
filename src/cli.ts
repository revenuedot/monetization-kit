#!/usr/bin/env node
import { parseArgs } from "node:util";
import { serve } from "@hono/node-server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer, VERSION } from "./server.js";
import { createHttpApp } from "./http.js";
import { kit } from "./kit.js";

const HELP = `${kit.displayName} ${VERSION} (maintained by ${kit.maintainer})

Usage:
  ${kit.name}                       stdio (Claude Desktop, Claude Code, Cursor ...)
  ${kit.name} --http [--port 8789]  Streamable HTTP at http://127.0.0.1:8789/mcp

Options:
  --http         Serve Streamable HTTP instead of stdio
  --port <n>     HTTP port (env PORT, default 8789)
  --host <host>  HTTP bind address (default 127.0.0.1)
  -h, --help     Show this help
  -v, --version  Show the version

The server is read-only and takes no key, token or account.
`;

const { values } = parseArgs({ options: { http: { type: "boolean" }, port: { type: "string" }, host: { type: "string" }, help: { type: "boolean", short: "h" }, version: { type: "boolean", short: "v" } } });
if (values.help) { process.stdout.write(HELP); process.exit(0); }
if (values.version) { process.stdout.write(`${VERSION}\n`); process.exit(0); }

if (values.http) {
  const port = Number(values.port ?? process.env.PORT ?? 8789);
  const hostname = values.host ?? "127.0.0.1";
  serve({ fetch: createHttpApp().fetch, port, hostname }, (info) => console.error(`${kit.displayName} on http://${hostname}:${info.port}/mcp`));
} else {
  await createMcpServer().connect(new StdioServerTransport());
}
