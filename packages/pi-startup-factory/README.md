# @giljae/pi-startup-factory

An honest startup validation pipeline for the [Pi coding agent](https://pi.dev).
Give it a niche or an idea and it runs parallel market research, judges the
evidence with a verdict that is allowed to say **no**, then writes a 30 day
validation plan, stress-tests it, and picks the tools to run it — stopping for
you at the two decisions that matter.

It is a **content pack** over two mature Pi extensions:

- [`pi-web-access`](https://www.npmjs.com/package/pi-web-access) — keyless web
  search, page fetching, and source checking (`web_search`, `fetch_content`,
  `get_search_content`, `source_check`). Works with no API keys.
- [`pi-subagents`](https://www.npmjs.com/package/pi-subagents) — delegation to
  fresh, isolated child agents, with parallel research.

This package adds the process: one orchestrator skill, seven focused specialist
agents, and the scoring, plan, and run-state references that keep it honest and
resumable.

> Concept inspired by [`tiagoapolo/startup-factory`](https://github.com/tiagoapolo/startup-factory),
> which is **unlicensed**. Nothing from it is copied or redistributed; this is an
> independent implementation. Not affiliated with the upstream author.

## Install

```bash
pi install npm:@giljae/pi-startup-factory
pi install npm:pi-subagents
pi install npm:pi-web-access
```

Start a new Pi session, then:

```text
/factory invoicing for freelance designers in Brazil
```

Or use the skill directly: `/skill:startup-factory <idea>`. `status` and
`resume <run>` are also accepted as the input.

## Requirements

- `pi-web-access` for research. Without it the researchers have no sources and
  the run is not useful.
- `pi-subagents` for delegation. Without it the run still works: the skill runs
  each specialist in the main thread, one at a time, and says so once.

`pi-subagents` foreground children do not load the parent's ambient extensions.
If a research child reports that `web_search` is missing, the skill reruns that
step as a background child (`async: true`), which does load ambient extensions,
and falls back to the main thread if that still fails. It never accepts a report
with no sources.

## What it does

```text
idea ─▶ intake ─▶ research (scout ∥ miner ∥ analyst) ─▶ judge ─▶ Gate 1
                                                                  │
      ┌───────────────────────────────────────────────────────────┘
      ▼
   plan (strategist) ─▶ review (critic, ≤2 revisions) ─▶ Gate 2 ─▶ build (architect) ─▶ summary
```

| Agent | Job | Writes |
| --- | --- | --- |
| `factory-scout` | competitors, pricing, search demand | `research/market.md` |
| `factory-miner` | reviews and forums, real complaints | `research/pains.md` |
| `factory-analyst` | market size, traffic→revenue estimates | `research/viability.md` |
| `factory-judge` | verifies evidence, scores, gives the verdict | `verdict.md` |
| `factory-strategist` | the 30 day validation plan | `plan.md` |
| `factory-critic` | stress-tests the plan | `review.md` |
| `factory-architect` | the smallest stack and monthly cost | `build.md` |

## Honesty by construction

- **Most ideas should fail.** The judge is built to return `NO GO` or `PIVOT`,
  and a low-confidence verdict cannot be a plain `GO`.
- **Evidence, not vibes.** Every factual claim cites a source. Every estimate is
  labeled `ESTIMATE` with the math shown. Nothing is invented.
- **Three signals.** Demand counts as real only when at least two of search
  demand, stated pain, and money in the market agree.
- **You stay in charge.** The pipeline stops at Gate 1 (the verdict) and Gate 2
  (the plan), and never sends, publishes, or spends anything on its own.

## What you get

```text
runs/20261119_invoicing_designers/
├── brief.md  research/{market,pains,viability}.md
├── verdict.md  plan.md  review.md  build.md  summary.md
├── decisions.md
└── state.json          resume an interrupted run from here
```

`founder.md` at the project root holds your hours, budget, and constraints and is
read by every agent.

## Models

Agents declare only a `thinking` level and inherit your session model:
`factory-judge` and `factory-critic` run `high`, the rest `medium`. For a stronger
judge, pin a model for those two roles in `pi-subagents` configuration.

## License

MIT, Copyright (c) 2026 giljae. See [LICENSE](./LICENSE).
