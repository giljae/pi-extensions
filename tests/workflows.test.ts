import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { expect, test } from "vitest";

const load = (name: string) =>
  parse(readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8"));

test("ci runs the check script", () => {
  expect(JSON.stringify(load("ci.yml"))).toContain("npm run check");
});

test("vendor-sync runs on a schedule and opens a pull request", () => {
  const sync = JSON.stringify(load("vendor-sync.yml"));
  expect(sync).toContain("run-vendor-sync");
  expect(sync).toMatch(/schedule|workflow_dispatch/);
  expect(sync).toContain("create-pull-request");
});

test("release publishes with changesets and OIDC", () => {
  const release = JSON.stringify(load("release.yml"));
  expect(release).toContain("changesets/action");
  expect(release).toContain("id-token");
});

test("the legacy egm-sync workflow is gone", () => {
  expect(existsSync(new URL("../.github/workflows/egm-sync.yml", import.meta.url))).toBe(false);
});
