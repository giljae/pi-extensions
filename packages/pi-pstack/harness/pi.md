# pstack on Pi

pstack skills use Cursor names. Read this file once per session, then map each
Cursor name in a skill with the tables below. `<pstack>` means the folder that
holds this package's `skills/` and `harness/`. If a Cursor field has no row,
drop it and say so. Never pass a field or value the Pi tool schema rejects.

## Tools

| Cursor | Pi |
| --- | --- |
| `Task` | The `subagent` tool. When no subagent tool is installed, do the work in the main thread and say so once — do not stop. |
| `AskQuestion` | Ask in plain text. If the session is non-interactive, decide and proceed. |
| Open a todolist, or copy steps into the todolist tool | Keep the list in the plan file or in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | `read` `<pstack>/skills/<name>/SKILL.md` and follow it. |
| `Grep`, `Glob` | The `grep` and `find` tools. |

## Subagent fields

| Cursor | Pi |
| --- | --- |
| `subagent_type: generalPurpose` | The closest built-in agent, `delegate`. |
| `poteto-agent`, `comment-sicko` | `agent: "poteto-agent"`, `agent: "comment-sicko"`, once registered with `pi-subagents`. Until then, run in the main thread. |
| The `model:` line in an agent file | It holds a Cursor slug. Omit it; the child inherits the session model, or use a `thinking` level per the Models table. |
| `readonly: true` | An agent whose `tools` are read-only, such as `reviewer`. Also tell the brief "do not edit files" and check `git status` afterward. |
| `run_in_background: true` | A background run. |
| `environment: "cloud"` | A worktree, or skip when the cloud machine itself is needed. |
| `resume` | Spawn a fresh child and paste the earlier result into its brief. |

## Models

| Cursor | Pi |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | Omit the slug. On a stock Pi the child runs on the session model. With `pi-subagents`, set a `thinking` level instead: `low`, `medium`, `high`, or `max`. |
| A `gemini-*` or other non-Claude slug | Omit it, or a `thinking` level. Never pass a Cursor slug to a Pi tool. |
| `auto` or `inherit-parent` | Omit `model`; the child runs on the session model. |

Verification always runs on the strongest model available to the session, not on
the model that wrote the code.

## Paths

| Cursor | Pi |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `<pstack>/skills/`. |
| `~/.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md` (Pi reads it automatically). |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | Not used. Read skills from `<pstack>/skills/`. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.pi/agent/sessions/`. Read only this workspace's sessions. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists; read the local copy and never fetch it. Otherwise give the user the URL. |

## Cursor-only features

Pi has no Cursor Bugbot, Automations, cloud agents, or built-in PR tool. When a
step needs one, put one line in your reply, `Skipped on Pi: <step>. <reason>.`,
then go on to the next step. Do not stop, ask, or retry. When a later step needs
what the skipped step made, such as a URL or a key, leave a placeholder and name
it in the line.

| Cursor | Pi |
| --- | --- |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads. Triage them with the forge command the step gives; skip a step that starts or configures Bugbot. |
| Cursor Automations: routines, webhooks, secret requests | Skip with the line. |
| Cursor cloud agents | Map to a worktree where the table above allows; otherwise skip with the line. |
| The built-in PR tool | Use the forge command the step gives, such as `gh pr create`. That is not a skip, so write no line. |

## setup-pstack

Skip model pinning. Pi uses the session model. Role-based model selection belongs
to `pi-subagents` configuration, which a later release wires up. On a stock Pi,
say so once and continue.
