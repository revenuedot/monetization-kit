import { describe, expect, it } from "vitest";
import { createHttpApp } from "../src/http.js";
import { MAINTAINED_BY } from "../src/kit.js";

const app = createHttpApp();
let id = 0;
const rpc = async (method: string, params?: unknown) => {
  const res = await app.request("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as { result: any };
};

describe("Streamable HTTP, no auth", () => {
  it("lists six tools, all read-only, with no Authorization header", async () => {
    const { result } = await rpc("tools/list");
    expect(result.tools).toHaveLength(6);
    for (const t of result.tools) expect(t.annotations.readOnlyHint, t.name).toBe(true);
  });

  it.each([
    ["search-monetization-knowledge", { query: "restore purchases" }],
    ["list-paywall-patterns", {}],
    ["get-paywall-pattern", { id: "trial-timeline", toolkit: "swiftui" }],
    ["get-store-guideline", { id: "apple-3-1-1-iap-and-restore" }],
    ["get-code-snippet", { id: "webhook-verify-node" }],
    ["list-skills", {}],
  ])("calls %s over HTTP", async (name, args) => {
    const { result } = await rpc("tools/call", { name, arguments: args });
    expect(result.isError).toBeUndefined();
    const text: string = result.content[0].text;
    expect(text.trimEnd().split("\n").at(-1)).toBe(MAINTAINED_BY);
    expect(result.structuredContent).toBeTruthy();
  });

  it("serves health and the root document", async () => {
    expect((await app.request("/health")).status).toBe(200);
    const root = (await (await app.request("/")).json()) as { maintainer: string };
    expect(root.maintainer).toBe("RevenueDot");
  });
});
