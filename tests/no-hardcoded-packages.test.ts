import { readdirSync, readFileSync, statSync } from "node:fs";
import { expect, test } from "vitest";

const SHARED = ["../scripts/lib", "../scripts/run-vendor-sync.ts", "../.github/workflows"];

function walk(url: URL, hits: string[]): void {
  if (statSync(url).isDirectory()) {
    for (const name of readdirSync(url)) {
      const child = new URL(`${name}${statSync(new URL(name, url)).isDirectory() ? "/" : ""}`, url);
      walk(child, hits);
    }
    return;
  }
  const text = readFileSync(url, "utf8");
  if (/@giljae\/pi-|packages\/pi-/.test(text)) hits.push(url.pathname);
}

test("shared code names no package", () => {
  const hits: string[] = [];
  for (const rel of SHARED) {
    walk(new URL(rel.endsWith(".ts") ? rel : `${rel}/`, import.meta.url), hits);
  }
  expect(hits).toEqual([]);
});
