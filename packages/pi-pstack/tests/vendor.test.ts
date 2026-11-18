import { existsSync, readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { checkVendor } from "../../../scripts/lib/vendor.ts";
import spec from "../../../scripts/vendors/pi-pstack.ts";

test("vendored tree matches UPSTREAM.json", () => {
  expect(checkVendor(spec)).toBe(true);
});

test("every skill carries one Pi note and no Cursor-only frontmatter key", () => {
  const dir = new URL("../skills/", import.meta.url);
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  expect(names).toHaveLength(58);
  for (const name of names) {
    const text = readFileSync(new URL(`${name}/SKILL.md`, dir), "utf8");
    expect(text.match(/read `harness\/pi\.md`/g), name).toHaveLength(1);
    const fm = text.slice(4, text.indexOf("\n---", 4));
    expect(fm, name).not.toMatch(/^(icon|color|alwaysApply|paths):/m);
  }
});

test("agents use the pi-subagents schema and the statechart corpus is excluded", () => {
  const dir = new URL("../agents/", import.meta.url);
  for (const name of readdirSync(dir)) {
    const text = readFileSync(new URL(name, dir), "utf8");
    expect(text, name).toContain("inheritSkills:");
    expect(text, name).not.toMatch(/^(is_background|model):/m);
  }
  expect(existsSync(new URL("../skills/statechart/scripts/test", import.meta.url))).toBe(false);
});

test("agents carry writer/read-only pi-subagents policy", () => {
  const dir = new URL("../agents/", import.meta.url);
  const poteto = readFileSync(new URL("poteto-agent.md", dir), "utf8");
  expect(poteto).toMatch(/^tools: .*edit, write/m);
  expect(poteto).toContain("acceptanceRole: writer");
  const sicko = readFileSync(new URL("comment-sicko.md", dir), "utf8");
  expect(sicko).toContain("acceptanceRole: read-only");
  expect(sicko).not.toMatch(/^tools: .*\b(edit|write)\b/m);
});
