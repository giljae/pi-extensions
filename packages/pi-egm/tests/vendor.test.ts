import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

const ROOT = new URL("../", import.meta.url);
const upstream = JSON.parse(readFileSync(new URL("UPSTREAM.json", ROOT), "utf8"));

test("pins the EGM v0.1.1 commit", () => {
  expect(upstream.ref).toBe("v0.1.1");
  expect(upstream.commit).toBe("dea7761de06ce5b51c177ebb9bba0469f24af5a4");
});

test("every vendored file matches its recorded hash", () => {
  for (const [rel, digest] of Object.entries<string>(upstream.files)) {
    const bytes = readFileSync(new URL(rel, ROOT));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(digest);
  }
});

test("every skill carries exactly one Pi pointer", () => {
  const skills = readdirSync(new URL("skills/", ROOT), { withFileTypes: true }).filter((e) => e.isDirectory());
  expect(skills.length).toBe(7);
  for (const skill of skills) {
    const text = readFileSync(new URL(`skills/${skill.name}/SKILL.md`, ROOT), "utf8");
    expect(text.match(/In Pi, read `\.\.\/\.\.\/PI\.md` first\./g)).toHaveLength(1);
  }
});

test("dispatch skills name the Pi tool", () => {
  for (const name of ["egm-bootstrap", "egm-brainstorm", "egm-review", "egm-review-loop"]) {
    const text = readFileSync(new URL(`skills/${name}/SKILL.md`, ROOT), "utf8");
    expect(text).toContain("Pi: `egm_goldfish`");
  }
});
