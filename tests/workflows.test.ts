import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { expect, test } from "vitest";

const load = (name: string) =>
  parse(readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8"));

test("ci runs the check script", () => {
  const ci = load("ci.yml");
  expect(JSON.stringify(ci)).toContain("npm run check");
});

test("egm-sync runs weekly and opens a pull request", () => {
  const sync = load("egm-sync.yml");
  expect(JSON.stringify(sync)).toContain("sync-egm");
  expect(JSON.stringify(sync)).toMatch(/schedule|workflow_dispatch/);
  expect(JSON.stringify(sync)).toContain("create-pull-request");
});
