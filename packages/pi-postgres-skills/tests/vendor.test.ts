import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { checkVendor } from "../../../scripts/lib/vendor.ts";
import spec from "../../../scripts/vendors/pi-postgres-skills.ts";

test("vendored tree matches UPSTREAM.json", () => {
  expect(checkVendor(spec)).toBe(true);
});

test("each SKILL.md carries exactly one Pi pointer", () => {
  const skills = readdirSync(new URL("../skills", import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);
  expect(skills.sort()).toEqual(["migrate-oracle-app", "pg-graph", "postgresql-best-practices"]);
  for (const name of skills) {
    const text = readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), "utf8");
    expect(text.match(/mcp__postgres-mcp__/g)?.length, name).toBe(1);
  }
});

test("migrate-oracle-app markdown has no backslashes left", () => {
  const base = new URL("../skills/migrate-oracle-app/", import.meta.url);
  const hits: string[] = [];
  const walk = (u: URL) => {
    for (const e of readdirSync(u, { withFileTypes: true })) {
      const c = new URL(e.name + (e.isDirectory() ? "/" : ""), u);
      if (e.isDirectory()) walk(c);
      else if (e.name.endsWith(".md") && readFileSync(c, "utf8").includes("\\")) hits.push(c.pathname);
    }
  };
  walk(base);
  expect(hits).toEqual([]);
});
