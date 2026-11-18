import { expect, test } from "vitest";
import spec, { piHostNote, piAgentFrontmatter } from "../scripts/vendors/pi-pstack.ts";

test("descriptor mirrors pstack skills and agents at a pinned commit", () => {
  expect(spec.include).toEqual([
    { from: "pstack/skills", to: "skills" },
    { from: "pstack/agents", to: "agents" },
  ]);
  expect(spec.exclude).toEqual(["skills/statechart/scripts/test"]);
  expect(spec.packageDir).toBe("packages/pi-pstack");
  expect(spec.transforms.map((t) => t.name)).toEqual(["pi-host-note", "pi-agent-frontmatter"]);
});

const SKILL =
  "---\nname: poteto-mode\ndescription: x\nicon: crown\ncolor: yellow\n---\n\n# Poteto mode\n\npaths: handle this\n";

test("piHostNote strips Cursor keys, keeps body text, inserts once", () => {
  const out = piHostNote.apply(SKILL, "skills/poteto-mode/SKILL.md");
  expect(out).not.toMatch(/^icon:/m);
  expect(out).not.toMatch(/^color:/m);
  expect(out).toContain("paths: handle this");
  expect(out.match(/read `harness\/pi\.md`/g)).toHaveLength(1);
  expect(() => piHostNote.apply(out, "skills/poteto-mode/SKILL.md")).toThrow();
});

test("piHostNote.include matches skill files only", () => {
  expect(piHostNote.include("skills/tdd/SKILL.md")).toBe(true);
  expect(piHostNote.include("skills/poteto-mode/playbooks/feature.md")).toBe(false);
  expect(piHostNote.include("agents/poteto-agent.md")).toBe(false);
});

const AGENT =
  "---\nname: poteto-agent\ndescription: x\nis_background: true\nmodel: claude-opus-5-5-xhigh-fast\n---\n\nBody\n";
const AGENT_NO_MODEL = "---\nname: comment-sicko\ndescription: y\n---\n\nBody\n";

test("piAgentFrontmatter converts model/background to the pi-subagents schema", () => {
  const out = piAgentFrontmatter.apply(AGENT, "agents/poteto-agent.md");
  expect(out).not.toMatch(/^is_background:/m);
  expect(out).not.toMatch(/^model:/m);
  expect(out).toContain("thinking: high");
  expect(out).toContain("inheritSkills: false");
  expect(() => piAgentFrontmatter.apply(out, "agents/poteto-agent.md")).toThrow();
});

test("piAgentFrontmatter handles an agent with no model or background field", () => {
  const out = piAgentFrontmatter.apply(AGENT_NO_MODEL, "agents/comment-sicko.md");
  expect(out).toContain("inheritSkills: false");
  expect(out).not.toMatch(/^model:/m);
});
