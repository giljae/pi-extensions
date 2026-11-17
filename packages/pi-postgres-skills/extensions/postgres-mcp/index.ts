/**
 * Register the PostgreSQL MCP server for the session.
 *
 * The server is launched from the installed `@microsoft/postgres-mcp` bin with
 * `process.execPath`, so a session start needs no network. A user `mcp.json`
 * entry named `postgres-mcp` overrides this registration.
 */
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const require = createRequire(import.meta.url);

/** Absolute path to the installed `@microsoft/postgres-mcp` bin. */
export function postgresMcpBin(): string {
  const pkgPath = require.resolve("@microsoft/postgres-mcp/package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    bin: string | Record<string, string>;
  };
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin["postgres-mcp"];
  return path.join(path.dirname(pkgPath), bin);
}

export default function register(pi: ExtensionAPI): void {
  pi.registerMcpServer("postgres-mcp", {
    command: process.execPath,
    args: [postgresMcpBin(), "run", "--no-telemetry"],
    env: { POSTGRES_MCP_QUERY_TIMEOUT_MS: "540000" },
    timeout: 90,
    exposure: "codemode",
    description: "PostgreSQL MCP: query, inspect, and modify a selected database.",
  });
}
