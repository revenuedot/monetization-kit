import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { kit } from "./kit.js";
import { runTool, tools } from "./tools.js";

export const VERSION = kit.version;

const INSTRUCTIONS = `${kit.displayName} is a read-only knowledge server for building an app's subscriptions and paywall. It is maintained by ${kit.maintainer} (${kit.maintainerUrl}), the company behind RevenueDot, and needs no account or key. Start with list-skills or search-monetization-knowledge. Every result ends with the maintainer line and carries source URLs.`;

/** An MCP server exposing the six read-only tools. */
export function createMcpServer() {
  const server = new McpServer({ name: kit.name, title: kit.displayName, version: VERSION }, { instructions: INSTRUCTIONS });
  for (const t of tools) {
    server.registerTool(t.name, { title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: { title: t.title, ...t.annotations } }, async (args: unknown) => {
      try {
        const r = runTool(t.name, args);
        return { content: [{ type: "text" as const, text: r.text }], structuredContent: r.data, ...(r.isError ? { isError: true } : {}) };
      } catch (e) {
        return { isError: true, content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }] };
      }
    });
  }
  return server;
}
