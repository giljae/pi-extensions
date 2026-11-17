/**
 * `microsoft/postgres-skills` vendoring descriptor.
 *
 * A full mirror of `plugin/skills/**`, adapted only by the two fail-loud
 * transforms below. The shared core in `scripts/lib/vendor.ts` does the fetch,
 * copy, hashing, and `UPSTREAM.json` work. Never hand-edit the vendored tree.
 */
import type { Transform, VendorSpec } from "../lib/vendor.ts";

const PI_NOTE =
  "> On Pi, the PostgreSQL MCP tools are exposed as `mcp__postgres-mcp__<operation>` " +
  "— for example the query tool is the server's `postgres_mcp_query`. " +
  "This package directory is the plugin root.";

function frontmatterEnd(text: string): number {
  if (!text.startsWith("---\n")) throw new Error("missing frontmatter");
  const close = text.indexOf("\n---", 4);
  if (close === -1) throw new Error("unterminated frontmatter");
  return close + "\n---".length;
}

/** State how Pi exposes the MCP tools, once, right after the frontmatter. */
export const piHostPointer: Transform = {
  name: "pi-host-pointer",
  include: (relPath) => /^skills\/[^/]+\/SKILL\.md$/.test(relPath),
  apply: (text) => {
    if (text.includes("mcp__postgres-mcp__")) throw new Error("Pi pointer already present");
    const at = frontmatterEnd(text);
    return `${text.slice(0, at)}\n\n${PI_NOTE}\n${text.slice(at)}`;
  },
};

/**
 * Make the `migrate-oracle-app` examples OS-independent: path separators become
 * `/` in that skill's Markdown. A backslash that is not a path separator (for
 * example a regex `\.`) is left in place, and the trailing check fails the sync
 * rather than corrupting it.
 */
export const piPathSeparators: Transform = {
  name: "pi-path-separators",
  include: (relPath) => relPath.startsWith("skills/migrate-oracle-app/") && relPath.endsWith(".md"),
  apply: (text) => {
    let out = text.replace(/\\\\/g, "/");
    out = out.replace(/(?<=[A-Za-z0-9_.<>-])\\(?=[A-Za-z0-9_.<>-])/g, "/");
    if (out.includes("\\")) throw new Error("non-path backslash remains after normalization");
    return out;
  },
};

const piPostgresSkills: VendorSpec = {
  repo: "https://github.com/microsoft/postgres-skills",
  refStrategy: { kind: "commit", commit: "b7908c0b53b2a292fb8286d4d4bdba7ea4690291" },
  include: [{ from: "plugin/skills", to: "skills" }],
  transforms: [piHostPointer, piPathSeparators],
  packageDir: "packages/pi-postgres-skills",
};

export default piPostgresSkills;
