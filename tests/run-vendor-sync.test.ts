import { mkdtempSync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "vitest";
import { discoverVendors, writeChangeset } from "../scripts/run-vendor-sync.ts";

test("discoverVendors finds the pi-egm descriptor", async () => {
  const vendors = await discoverVendors();
  expect(vendors.map((v) => v.name)).toContain("pi-egm");
});

test("writeChangeset writes a patch changeset and is idempotent per name", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cs-"));
  const file = writeChangeset("@giljae/pi-egm", dir);
  expect(readFileSync(file, "utf8")).toContain('"@giljae/pi-egm": patch');
  expect(writeChangeset("@giljae/pi-egm", dir)).toBe(file);
});
