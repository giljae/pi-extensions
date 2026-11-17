import { expect, test } from "vitest";
import spec, { piHostNote } from "../scripts/vendors/pi-design-skills.ts";

test("descriptor mirrors skills/ at a pinned commit", () => {
  expect(spec.include).toEqual(["skills"]);
  expect(spec.packageDir).toBe("packages/pi-design-skills");
  expect(spec.transforms.map((t) => t.name)).toEqual(["pi-host-note"]);
});

test("piHostNote inserts once after frontmatter and throws when present", () => {
  const doc = "---\nname: learn-taste\n---\n# X\n";
  const out = piHostNote.apply(doc, "skills/learn-taste/SKILL.md");
  expect(out.match(/On Pi, project context lives in/g)).toHaveLength(1);
  expect(() => piHostNote.apply(out, "skills/learn-taste/SKILL.md")).toThrow();
});

test("piHostNote.include only matches the learn-taste skill", () => {
  expect(piHostNote.include("skills/learn-taste/SKILL.md")).toBe(true);
  expect(piHostNote.include("skills/animate/SKILL.md")).toBe(false);
});
