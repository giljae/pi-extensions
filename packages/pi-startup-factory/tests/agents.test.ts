import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { expect, test } from "vitest";

const dir = new URL("../agents/", import.meta.url);

const AGENTS = [
  "factory-scout",
  "factory-miner",
  "factory-analyst",
  "factory-judge",
  "factory-strategist",
  "factory-critic",
  "factory-architect",
];

const WEB_AGENTS = ["factory-scout", "factory-miner", "factory-analyst", "factory-judge", "factory-critic", "factory-architect"];

function frontmatter(name: string): Record<string, unknown> {
  const text = readFileSync(new URL(`${name}.md`, dir), "utf8");
  expect(text.startsWith("---\n"), name).toBe(true);
  const end = text.indexOf("\n---", 4);
  expect(end, name).toBeGreaterThan(0);
  return parse(text.slice(4, end)) as Record<string, unknown>;
}

test("exactly the seven expected agents exist", () => {
  const names = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
  expect(names).toEqual([...AGENTS].sort());
});

test("every agent carries valid pi-subagents frontmatter", () => {
  for (const name of AGENTS) {
    const fm = frontmatter(name);
    expect(fm.name, name).toBe(name);
    expect(typeof fm.description, name).toBe("string");
    expect(String(fm.description).length, name).toBeGreaterThan(30);
    expect(typeof fm.tools, name).toBe("string");
    expect(fm.inheritSkills, name).toBe(false);
    expect(fm.systemPromptMode, name).toBe("replace");
    expect(name.startsWith("factory-"), name).toBe(true);
  }
});

test("name field matches the file name and is unique", () => {
  const names = AGENTS.map((a) => frontmatter(a).name);
  expect(new Set(names).size).toBe(names.length);
});

test("web agents declare the pi-web-access tools they need", () => {
  for (const name of WEB_AGENTS) {
    expect(String(frontmatter(name).tools), name).toContain("web_search");
  }
  expect(String(frontmatter("factory-judge").tools)).toContain("source_check");
  expect(String(frontmatter("factory-architect").tools)).toContain("fetch_content");
});

test("the judge and the critic think at the highest level", () => {
  expect(frontmatter("factory-judge").thinking).toBe("high");
  expect(frontmatter("factory-critic").thinking).toBe("high");
});

test("every agent ends with a status block the orchestrator can read", () => {
  for (const name of AGENTS) {
    const text = readFileSync(new URL(`${name}.md`, dir), "utf8");
    expect(text, name).toContain("STATUS:");
    expect(text, name).toContain("NEEDS_HUMAN:");
  }
});
