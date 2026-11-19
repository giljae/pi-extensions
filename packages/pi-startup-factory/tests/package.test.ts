import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const base = new URL("../", import.meta.url);

test("package is gallery-ready and declares every resource kind", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", base), "utf8"));

  expect(pkg.name).toBe("@giljae/pi-startup-factory");
  expect(pkg.license).toBe("MIT");
  expect(pkg.keywords).toContain("pi-package");
  expect(pkg.publishConfig?.access).toBe("public");
  expect(Array.isArray(pkg.files) && pkg.files.length).toBeTruthy();
  expect(pkg.repository?.url).toContain("github.com/giljae/pi-extensions");
  expect(pkg.repository?.directory).toBe("packages/pi-startup-factory");

  expect(pkg.pi?.skills).toEqual(["./skills"]);
  expect(pkg.pi?.prompts).toEqual(["./prompts"]);
  expect(pkg["pi-subagents"]?.agents).toEqual(["./agents"]);

  expect(existsSync(new URL("LICENSE", base))).toBe(true);
  expect(existsSync(new URL("prompts/factory.md", base))).toBe(true);
  expect(existsSync(new URL("skills/startup-factory/SKILL.md", base))).toBe(true);
});

test("no vendored tree is shipped", () => {
  expect(existsSync(new URL("UPSTREAM.json", base))).toBe(false);
  const pkg = JSON.parse(readFileSync(new URL("package.json", base), "utf8"));
  expect(pkg.dependencies).toBeUndefined();
});
