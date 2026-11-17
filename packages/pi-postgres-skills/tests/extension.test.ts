import { existsSync } from "node:fs";
import { expect, test, vi } from "vitest";
import register, { postgresMcpBin } from "../extensions/postgres-mcp/index.ts";

test("registers postgres-mcp with a pinned, non-network launch", () => {
  const registerMcpServer = vi.fn();
  register({ registerMcpServer } as never);
  const [name, config] = registerMcpServer.mock.calls[0];
  expect(name).toBe("postgres-mcp");
  expect(config.exposure).toBe("codemode");
  expect(config.args).toContain("--no-telemetry");
  expect(config.env.POSTGRES_MCP_QUERY_TIMEOUT_MS).toBe("540000");
});

test("postgresMcpBin resolves an existing file", () => {
  expect(existsSync(postgresMcpBin())).toBe(true);
});
