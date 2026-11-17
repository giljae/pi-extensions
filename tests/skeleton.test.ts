import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("root is a private npm workspace with a check script", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  expect(pkg.private).toBe(true);
  expect(pkg.workspaces).toContain("packages/*");
  expect(pkg.scripts.check).toContain("typecheck");
  expect(pkg.scripts.check).toContain("test");
});
