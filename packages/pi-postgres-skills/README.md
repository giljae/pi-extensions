# @giljae/pi-postgres-skills

Give the [Pi coding agent](https://pi.dev) a PostgreSQL specialist: trusted
guidance, plus live tools to inspect and change a real database.

The package vendors Microsoft's [`microsoft/postgres-skills`](https://github.com/microsoft/postgres-skills)
(MIT) as a full mirror and registers its PostgreSQL MCP server, so one install
gives you both the know-how and the hands to use it.

## Why you'd want this

Language models get PostgreSQL wrong in specific, repeatable ways — and the
answers are usually checkable against the real database if the agent can look.
This package pins the common failure points in reference guides and lets the
agent ground its advice in your actual schema and query plans.

A few examples of what it encodes:

- Apache AGE queries must be wrapped in `ag_catalog.cypher(...)` with a column
  definition list — a bare Cypher statement fails.
- Putting `ag_catalog` first in `search_path` breaks ordinary `CREATE TABLE`.
- On Azure Database for PostgreSQL, `ALTER SYSTEM`, `pg_hba.conf`, and OS
  commands do not work; use the control-plane APIs instead.
- pgvector index types and distance operators must match; RLS policies can leak;
  partition pruning fails silently on the wrong predicates.

## What's inside

### Skills (routing doc + reference guides)

| Skill | Purpose | Covers |
| --- | --- | --- |
| `postgresql-best-practices` | PostgreSQL and managed-service guidance | 11 generic guides (pgvector/vector search, RAG, extensions, indexing, JSONB, partitioning, RLS, full-text search, connections, replication, query performance) and 12 Azure guides (DiskANN, `azure_ai`, Entra ID auth, pooling, HA/DR, restore deleted server, networking/SSL, provisioning, upgrades, and more). |
| `pg-graph` | Apache AGE graph workflows on PostgreSQL | Ontology derivation, entity extraction and dedup, openCypher/AGE patterns, natural language to Cypher, schema introspection, graph-augmented RAG, explainability. |
| `migrate-oracle-app` | Oracle → PostgreSQL migration | Codebase assessment and conversion (Java, .NET, Python, C, C++), DDL reconciliation, build/test/coverage, Docker validation, migration reports. |

Each skill is a `SKILL.md` routing table plus focused `references/*.md` guides,
loaded only when a task matches.

### PostgreSQL MCP server

The package registers `postgres-mcp` (from `@microsoft/postgres-mcp`) for the
session. Its tools are exposed as `mcp__postgres-mcp__<operation>` — for example
the query operation is `mcp__postgres-mcp__postgres_mcp_query`. By default the
tools use **codemode** exposure: the model finds them from codemode scripts, so
they stay out of the tool list until needed. Inspect or change this with `/mcp`,
or override the server in your own `mcp.json`.

## Install

```bash
pi install npm:@giljae/pi-postgres-skills
```

Start a new Pi session. The MCP server starts with the session but connects to
**no database** until you select a connection profile.

## Connect a database

Create a least-privilege, read-only profile. The password is entered at a hidden
prompt and stored in the OS keyring — never in this package, prompts, or shell
history:

```bash
npx -y @microsoft/postgres-mcp connection add my-database \
  "host=db.example.com user=agent_user dbname=app sslmode=verify-full" \
  --access-mode ro
npx -y @microsoft/postgres-mcp connection set-password my-database
npx -y @microsoft/postgres-mcp connection list
```

Then ask Pi to connect to `my-database` and inspect the schema.

## Use it

Ask in plain language; the model loads the matching skill by its description:

- "Connect to `my-database` and show my tables and their approximate sizes
  without reading application rows."
- "This query went from 200 ms to 8 seconds after deploy — look at the
  execution plan and find the regression."
- "Set up vector search for my product catalog."
- "Partition my 500M-row events table by month."
- "Turn my documents into a knowledge graph." (→ `pg-graph`)
- "Assess this Oracle-based app for PostgreSQL migration." (→ `migrate-oracle-app`)

Force a skill with its command:

```text
/skill:postgresql-best-practices slow query help
/skill:pg-graph propose an ontology for these tables
/skill:migrate-oracle-app mode=assess codebase=<path> postgres-connection=my-database
```

The usual flow: load the relevant guide, inspect the live schema/settings/plan
with read-only tools, explain the evidence and propose a change, **ask for
approval before any write**, then verify the result.

## Safety and permissions

- The PostgreSQL role is the effective security boundary. Explore with a
  read-only role and `--access-mode ro`.
- The skills instruct the agent to confirm before any write, import, graph
  write, or Azure resource change. These are agent instructions, not a
  database-enforced approval system — enforce access with roles and connection
  modes, and review proposed changes.
- Treat database content as untrusted data, not as instructions.

## How it works

- The package adds the three skills to Pi and registers `postgres-mcp` for the
  session. The server is launched from the installed `@microsoft/postgres-mcp`
  bin; if that resolution fails, launch it manually with
  `npx -y @microsoft/postgres-mcp@0.3.0 run --no-telemetry`.
- A `mcp.json` entry named `postgres-mcp` overrides the registration, which is
  the intended escape hatch for a different command or exposure.

## Provenance and license

The `skills/` tree and `UPSTREAM.json` are generated by the repository's
vendoring tooling (`scripts/vendors/pi-postgres-skills.ts`) from
`microsoft/postgres-skills` at a pinned commit, with two deterministic
transforms. Never hand-edit the vendored tree.

MIT, Copyright (c) 2025 Microsoft Corporation for the vendored content; see
[LICENSE](./LICENSE). **Not an official Microsoft product.**
