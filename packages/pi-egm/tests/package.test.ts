import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const ROOT = new URL("../", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, ROOT), "utf8");

test("PI.md documents paths, the tool, isolation, and artifacts", () => {
  const guide = read("PI.md");
  for (const phrase of ["egm_goldfish", "--no-context-files", "EGM artifact directory: ", "../../PI.md"]) {
    expect(guide).toContain(phrase);
  }
});

test("README states install, provenance, and non-endorsement", () => {
  const readme = read("README.md");
  expect(readme).toContain("pi install npm:@giljae/pi-egm");
  expect(readme).toContain("Not an officially supported Google product");
  expect(readme.toLowerCase()).toContain("vendored");
});

test("manifest is gallery-ready", () => {
  const pkg = JSON.parse(read("package.json"));
  expect(pkg.keywords).toContain("pi-package");
  expect(pkg.publishConfig.access).toBe("public");
  expect(pkg.files).toContain("PI.md");
});
