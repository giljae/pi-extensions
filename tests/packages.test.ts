import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const dirs = readdirSync(new URL("../packages", import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

test("every package is gallery-ready", () => {
  expect(dirs.length).toBeGreaterThan(0);
  for (const name of dirs) {
    const base = new URL(`../packages/${name}/`, import.meta.url);
    const pkg = JSON.parse(readFileSync(new URL("package.json", base), "utf8"));
    expect(pkg.keywords, name).toContain("pi-package");
    expect(pkg.publishConfig?.access, name).toBe("public");
    expect(Array.isArray(pkg.files) && pkg.files.length, name).toBeTruthy();
    expect(existsSync(new URL("LICENSE", base)), name).toBe(true);
    if (existsSync(new URL("skills", base)) || existsSync(new URL("extensions", base))) {
      expect(pkg.pi, name).toBeTruthy();
    }
  }
});
