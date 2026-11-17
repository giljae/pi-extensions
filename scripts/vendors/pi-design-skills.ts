/**
 * `emilkowalski/skills` vendoring descriptor.
 *
 * A full mirror of `skills/**`, adapted only by the `pi-host-note` transform.
 * The shared core in `scripts/lib/vendor.ts` does the fetch, copy, hashing, and
 * `UPSTREAM.json` work. Never hand-edit the vendored tree.
 */
import type { Transform, VendorSpec } from "../lib/vendor.ts";

const PI_NOTE_MARKER = "On Pi, project context lives in";
const PI_NOTE =
  "> On Pi, project context lives in AGENTS.md (Pi reads it automatically), and " +
  "corrections come from the current session rather than the Claude Code paths " +
  "named below.";

function frontmatterEnd(text: string): number {
  if (!text.startsWith("---\n")) throw new Error("missing frontmatter");
  const close = text.indexOf("\n---", 4);
  if (close === -1) throw new Error("unterminated frontmatter");
  return close + "\n---".length;
}

/** Add a Pi-specific note to the one host-coupled skill. */
export const piHostNote: Transform = {
  name: "pi-host-note",
  include: (relPath) => relPath === "skills/learn-taste/SKILL.md",
  apply: (text) => {
    if (text.includes(PI_NOTE_MARKER)) throw new Error("Pi note already present");
    const at = frontmatterEnd(text);
    return `${text.slice(0, at)}\n\n${PI_NOTE}\n${text.slice(at)}`;
  },
};

const piDesignSkills: VendorSpec = {
  repo: "https://github.com/emilkowalski/skills",
  refStrategy: { kind: "commit", commit: "64eb3deb9a5fbfa041faf783e0bc3fd635872e9c" },
  include: ["skills"],
  transforms: [piHostNote],
  packageDir: "packages/pi-design-skills",
};

export default piDesignSkills;
