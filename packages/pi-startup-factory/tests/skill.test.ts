import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { expect, test } from "vitest";

const skillDir = new URL("../skills/startup-factory/", import.meta.url);
const text = readFileSync(new URL("SKILL.md", skillDir), "utf8");
const end = text.indexOf("\n---", 4);
const fm = parse(text.slice(4, end)) as Record<string, unknown>;

test("the skill has valid frontmatter", () => {
  expect(fm.name).toBe("startup-factory");
  expect(typeof fm.description).toBe("string");
  expect(String(fm.description).startsWith("Use when")).toBe(true);
  expect(String(fm.description)).toContain("/factory");
});

test("the skill documents both gates and the fallback path", () => {
  expect(text).toContain("Gate 1");
  expect(text).toContain("Gate 2");
  expect(text).toContain("subagent");
  expect(text).toContain("fall back");
  expect(text).toContain("web_search");
});

test("the skill names every stage and every specialist", () => {
  for (const stage of ["intake", "research", "verdict", "plan", "review", "build", "done"]) {
    expect(text, stage).toContain(stage);
  }
  for (const agent of [
    "factory-scout",
    "factory-miner",
    "factory-analyst",
    "factory-judge",
    "factory-strategist",
    "factory-critic",
    "factory-architect",
  ]) {
    expect(text, agent).toContain(agent);
  }
});

test("the referenced documents exist", () => {
  for (const ref of ["references/run-layout.md", "references/scoring.md"]) {
    expect(existsSync(new URL(ref, skillDir)), ref).toBe(true);
    expect(text, ref).toContain(ref);
  }
});
