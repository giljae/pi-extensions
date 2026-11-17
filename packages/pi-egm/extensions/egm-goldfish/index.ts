import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export const ROLE_TO_PERSONA = {
  "egm-bootstrap-orchestrator": "agents/bootstrap_orchestrator.md",
  "egm-codebase-details": "agents/codebase_details.md",
  "egm-comprehension": "agents/comprehension.md",
  "egm-design": "agents/design_critic.md",
  "egm-implementation-readiness": "agents/implementation_readiness.md",
  "egm-inventive-catalyst": "agents/inventive_catalyst.md",
  "egm-structural": "agents/structural.md",
  "egm-style": "agents/style.md",
  "egm-synthesizer": "agents/synthesizer.md",
  "egm-zoom-out": "agents/zoom_out.md",
} as const;
export type GoldfishRole = keyof typeof ROLE_TO_PERSONA;

export const ISOLATION_ARGS = [
  "--no-context-files", "--no-session",
  "--no-mcp", "--no-skills", "--no-prompt-templates",
] as const;
export const READ_ONLY_TOOLS = ["read", "grep", "find", "ls"] as const;

export function buildGoldfishArgv(task: string, extra: string[] = []): string[] {
  return [...ISOLATION_ARGS, "--tools", READ_ONLY_TOOLS.join(","), ...extra, "-p", task];
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

/** Run the child process, rejecting on spawn failure or a non-zero exit. */
export function runChild(invocation: { command: string; args: string[] }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: HERE,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (data) => (out += data));
    child.stderr.on("data", (data) => (err += data));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${out}\n${err}`.trim()));
    });
  });
}

function invocation(args: string[]): { command: string; args: string[] } {
  const script = process.argv[1];
  const bunVirtual = script !== undefined &&
    (script.startsWith("/$bunfs/root/") || /^[A-Za-z]:[\\/]~BUN[\\/]root[\\/]/.test(script));
  if (script && !bunVirtual && fs.existsSync(script)) {
    return { command: process.execPath, args: [script, ...args] };
  }
  const execName = path.basename(process.execPath).toLowerCase();
  if (!/^(node|bun)(\.exe)?$/.test(execName)) return { command: process.execPath, args };
  return { command: "pi", args };
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "egm_goldfish",
    label: "EGM Goldfish",
    description:
      "Run one EGM Goldfish reviewer in a fresh, read-only context and return its findings as text. The parent writes any report file.",
    parameters: Type.Object({
      role: Type.Union(
        Object.keys(ROLE_TO_PERSONA).map((r) => Type.Literal(r as GoldfishRole)),
        { description: "Which EGM persona the reviewer adopts." },
      ),
      target: Type.String({ description: "Absolute path of the document under review." }),
      model: Type.Optional(Type.String({ description: "Optional pi model pattern for the child." })),
      thinking_level: Type.Optional(Type.String({ description: "Optional pi thinking level for the child." })),
    }),
    async execute(_id, params) {
      const role = params.role as GoldfishRole;
      const persona = fs.readFileSync(path.join(ROOT, ROLE_TO_PERSONA[role]), "utf8");
      const body = persona.split("---").slice(2).join("---").trim();
      const promptFile = path.join(os.tmpdir(), `egm-${role}-${process.pid}.md`);
      fs.writeFileSync(promptFile, body);
      const extra: string[] = [];
      if (params.model) extra.push("--model", params.model);
      if (params.thinking_level) extra.push("--thinking", params.thinking_level);
      const task = `Task: review ${params.target} as ${role}. Return findings as text.`;
      const args = buildGoldfishArgv(task, [...extra, "--append-system-prompt", promptFile]);
      try {
        const output = await runChild(invocation(args));
        return { content: [{ type: "text", text: output.trim() }], details: { role } };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `egm_goldfish failed: ${message}` }],
          isError: true,
          details: { role },
        };
      } finally {
        fs.rmSync(promptFile, { force: true });
      }
    },
  });
}
