import { expect, test } from "vitest";
import spec, { piHostPointer, piPathSeparators } from "../scripts/vendors/pi-postgres-skills.ts";

test("descriptor mirrors plugin/skills into skills", () => {
  expect(spec.include).toEqual([{ from: "plugin/skills", to: "skills" }]);
  expect(spec.packageDir).toBe("packages/pi-postgres-skills");
  expect(spec.transforms.map((t) => t.name)).toEqual(["pi-host-pointer", "pi-path-separators"]);
});

test("piHostPointer inserts once after frontmatter and throws when present", () => {
  const doc = "---\nname: x\n---\n# X\n";
  const out = piHostPointer.apply(doc, "skills/x/SKILL.md");
  expect(out.match(/mcp__postgres-mcp__/g)).toHaveLength(1);
  expect(() => piHostPointer.apply(out, "skills/x/SKILL.md")).toThrow();
});

test("piPathSeparators normalizes paths and refuses non-path backslashes", () => {
  expect(piPathSeparators.apply('node "<skill-directory>\\scripts\\x.mjs"', "skills/migrate-oracle-app/SKILL.md"))
    .toBe('node "<skill-directory>/scripts/x.mjs"');
  expect(piPathSeparators.apply('"C:\\\\dev\\\\x"', "skills/migrate-oracle-app/references/a.md"))
    .toBe('"C:/dev/x"');
  expect(() => piPathSeparators.apply("regex \\.  here", "skills/migrate-oracle-app/references/a.md")).toThrow();
});

test("piPathSeparators include() only matches migrate-oracle-app markdown", () => {
  expect(piPathSeparators.include("skills/migrate-oracle-app/SKILL.md")).toBe(true);
  expect(piPathSeparators.include("skills/migrate-oracle-app/scripts/x.mjs")).toBe(false);
  expect(piPathSeparators.include("skills/pg-graph/SKILL.md")).toBe(false);
});
