import { expect, test } from "vitest";
import spec, { piHostNote, piSkillCommand } from "../scripts/vendors/pi-blueprint.ts";

test("descriptor mirrors the skill subset at a pinned commit", () => {
  expect(spec.repo).toBe("https://github.com/intincrab/blueprint");
  expect(spec.refStrategy).toEqual({ kind: "commit", commit: "84b89576f1e4f4e308e12b3eb4cbb37816b8104e" });
  expect(spec.include).toEqual([
    { from: "references", to: "skills/blueprint/references" },
    { from: "runtime", to: "skills/blueprint/runtime" },
    { from: "scripts", to: "skills/blueprint/scripts" },
    { from: "templates", to: "skills/blueprint/templates" },
    { from: "examples", to: "skills/blueprint/examples" },
  ]);
  expect(spec.files).toEqual([
    { from: "SKILL.md", to: "skills/blueprint/SKILL.md" },
    { from: "video/encode.swift", to: "skills/blueprint/video/encode.swift" },
  ]);
  expect(spec.packageDir).toBe("packages/pi-blueprint");
  expect(spec.transforms.map((t) => t.name)).toEqual(["pi-skill-command", "pi-host-note"]);
});

test("piSkillCommand rewrites the command once and throws when the anchor is gone", () => {
  const doc = "---\nname: blueprint\ndescription: a scene, or types /blueprint [topic].\n---\n# Blueprint\n";
  const out = piSkillCommand.apply(doc, "skills/blueprint/SKILL.md");
  expect(out).not.toContain("types /blueprint [topic]");
  expect(out).toContain("/skill:blueprint");
  expect(() => piSkillCommand.apply(out, "skills/blueprint/SKILL.md")).toThrow();
});

test("piHostNote inserts once after frontmatter and throws when present", () => {
  const doc = "---\nname: blueprint\n---\n# Blueprint\n";
  const out = piHostNote.apply(doc, "skills/blueprint/SKILL.md");
  expect(out.match(/On Pi, invoke this skill with/g)).toHaveLength(1);
  expect(() => piHostNote.apply(out, "skills/blueprint/SKILL.md")).toThrow();
});

test("both transforms only match skills/blueprint/SKILL.md", () => {
  expect(piSkillCommand.include("skills/blueprint/SKILL.md")).toBe(true);
  expect(piSkillCommand.include("skills/blueprint/examples/small/cache.js")).toBe(false);
  expect(piHostNote.include("skills/blueprint/SKILL.md")).toBe(true);
  expect(piHostNote.include("skills/blueprint/references/craft.md")).toBe(false);
});
