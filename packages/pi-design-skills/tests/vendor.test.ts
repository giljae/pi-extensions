import { existsSync, readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { checkVendor } from "../../../scripts/lib/vendor.ts";
import spec from "../../../scripts/vendors/pi-design-skills.ts";

test("vendored tree matches UPSTREAM.json", () => {
  expect(checkVendor(spec)).toBe(true);
});

test("every skill has a SKILL.md and learn-taste carries one Pi note", () => {
  const dir = new URL("../skills/", import.meta.url);
  const names = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  expect(names.length).toBeGreaterThanOrEqual(20);
  for (const name of names) {
    expect(existsSync(new URL(`${name}/SKILL.md`, dir)), name).toBe(true);
  }
  const text = readFileSync(new URL("learn-taste/SKILL.md", dir), "utf8");
  expect(text.match(/On Pi, project context lives in/g)).toHaveLength(1);
});
