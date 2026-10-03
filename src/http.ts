import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer, VERSION } from "./server.js";
import { kit, repoUrl } from "./kit.js";

/** Streamable HTTP at /mcp. Stateless (a fresh server per request, JSON responses) and open: there is nothing to protect, every tool is read-only. */
export function createHttpApp() {
  const app = new Hono();
  app.use("*", cors({ origin: "*", allowHeaders: ["*"], allowMethods: ["GET", "POST", "DELETE", "OPTIONS"], exposeHeaders: ["mcp-session-id", "mcp-protocol-version"] }));
  app.get("/", (c) => c.json({ name: kit.name, version: VERSION, maintainer: kit.maintainer, mcp: `${new URL(c.req.url).origin}/mcp`, source: repoUrl }));
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.all("/mcp", async (c) => {
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });
  return app;
}
