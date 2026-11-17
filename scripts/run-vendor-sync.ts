/**
 * Discovery and CLI for the vendoring core.
 *
 * Every vendored package ships one descriptor at `scripts/vendors/<pkg>.ts`
 * with a default `VendorSpec` export. This module finds them by glob, so
 * adding a package needs no change here or in any workflow.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { checkVendor, runVendorSync, type VendorSpec } from "./lib/vendor.ts";

export interface Vendor {
  name: string;
  spec: VendorSpec;
}

/** Discover descriptors in `dir` (default `scripts/vendors`), sorted by name. */
export async function discoverVendors(dir = "scripts/vendors"): Promise<Vendor[]> {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"));
  const vendors: Vendor[] = [];
  for (const entry of entries) {
    const name = entry.name.replace(/\.ts$/, "");
    const mod = (await import(pathToFileURL(path.resolve(dir, entry.name)).href)) as {
      default: VendorSpec;
    };
    vendors.push({ name, spec: mod.default });
  }
  return vendors.sort((a, b) => a.name.localeCompare(b.name));
}

/** Write (overwrite) a deterministic patch changeset for one package. */
export function writeChangeset(packageName: string, dir = ".changeset"): string {
  const slug = packageName.replace(/^@/, "").replace(/\//g, "-");
  const file = path.join(dir, `vendor-${slug}.md`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, `---\n"${packageName}": patch\n---\n\nSync vendored content.\n`);
  return file;
}

function packageNameOf(spec: VendorSpec): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(spec.packageDir, "package.json"), "utf8")) as {
    name: string;
  };
  return pkg.name;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const has = (flag: string): boolean => args.includes(flag);
  const get = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const ref = get("--ref");
  const all = has("--all");
  const check = has("--check");
  const latest = has("--latest");
  const changeset = has("--changeset");
  const target = args.find((arg) => !arg.startsWith("--") && arg !== ref);

  const vendors = await discoverVendors();
  const selected = all ? vendors : vendors.filter((vendor) => vendor.name === target);
  if (selected.length === 0) {
    console.error(`unknown vendor: ${target ?? "(none)"} (have: ${vendors.map((v) => v.name).join(", ")})`);
    process.exitCode = 1;
    return;
  }

  let drift = false;
  for (const { name, spec } of selected) {
    if (check) {
      const ok = checkVendor(spec);
      console.log(`${name}: ${ok ? "ok" : "drift"}`);
      if (!ok) drift = true;
      continue;
    }
    const result = runVendorSync(spec, { latest, ref });
    console.log(`${result.changed ? "changed" : "unchanged"}: ${name} ${result.commit}`);
    if (result.changed && changeset) {
      console.log(`changeset: ${writeChangeset(packageNameOf(spec))}`);
    }
  }
  if (drift) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
