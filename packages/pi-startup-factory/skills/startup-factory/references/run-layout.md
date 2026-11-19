# Run layout and state

Everything a run produces lives in one folder so several ideas can run side by
side, and so an interrupted session can resume.

## Folder shape

```text
runs/20261119_invoicing_designers/
├── brief.md              the idea, the customer, the constraints
├── research/
│   ├── market.md         competitors, pricing, search demand
│   ├── pains.md          ranked problems in the customer's own words
│   └── viability.md      market size, revenue estimates, risks
├── verdict.md            GO, PIVOT, or NO GO, with scores
├── plan.md               the 30 day plan with thresholds and copy
├── review.md             the critic's findings
├── build.md              the stack and its monthly cost
├── summary.md            one page to read first
├── decisions.md          every answer the founder gave
└── state.json            the stage, so the run can resume
```

The slug is two to four lowercase words from the idea joined by underscores. The
date is `YYYYMMDD`.

## `founder.md` (project root, shared by every run)

Keep it current. The judge scores founder fit against it, and the strategist
sizes the plan to the hours and budget here.

```markdown
# Founder profile

* Team: solo founder
* Background: not set
* Based in: not set
* Markets: decided per run
* Hours per week for validation: not set
* Budget for 30 days of validation: not set
* Goal: not set
* Will not do: not set
* Tools already in use: not set
```

The first run asks for anything marked `not set` that it needs, then saves the
answer here.

## `state.json`

Update it every time the stage changes. It is the single source of truth for
resuming.

```json
{
  "run": "20261119_invoicing_designers",
  "idea": "the idea exactly as the founder wrote it",
  "stage": "research",
  "selected_problem": null,
  "verdict": null,
  "deep_dives": 0,
  "review_rounds": 0,
  "updated": "2026-11-19"
}
```

Stages, in order: `intake`, `research`, `verdict`, `gate_verdict`, `plan`,
`review`, `gate_plan`, `build`, `done`. Use `stopped` when the founder ends the
run.

## `decisions.md`

Append one entry for every founder answer: the dated question, the answer, and
what was done with it. Specialists read this file, so it is how the founder's
choices reach them.

```markdown
## 2026-11-19 — Geography

Q: The idea does not name a market. Brazil or the US?
A: Brazil.
Used: brief.md updated; all research ran against the Brazilian market.
```

## `summary.md`

One page: the problem, the verdict and its score, the plan in five lines, the
stack and monthly cost, the first three things to do tomorrow, and the list of
files in the run.
