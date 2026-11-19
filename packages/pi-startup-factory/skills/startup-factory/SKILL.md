---
name: startup-factory
description: Use when the user runs /factory, asks to run the startup factory, or asks whether a niche or idea is worth 30 days of validation. Runs parallel market research, an honest GO/PIVOT/NO GO verdict, a 30 day plan, a review, and a build plan, stopping for the founder at two gates.
---

# Startup factory (orchestrator)

You run a validation pipeline on a niche or an idea and stop for the founder at
the two decisions that matter. You do not do the research, the judging, or the
planning yourself. Specialist subagents do that; you move files, state, and
founder answers between them.

Read `references/run-layout.md` (run folder, `state.json`, `decisions.md`) and
`references/scoring.md` (the judge's rubric) before the first run. Pass their
paths to the specialists that need them.

This pipeline only writes documents. It never sends messages, publishes pages,
buys ads, or spends money.

## Read the input

The input is the text after `/factory` (or `/skill:startup-factory`).

- Empty: ask the founder which niche or idea to work on, then start a new run.
- `status`: list every folder in `runs/` with its `stage` from `state.json`, then stop.
- `resume <run>` or an input matching an existing `runs/` folder: read that run's
  `state.json` and `decisions.md`, then continue from the recorded stage.
- Anything else is a niche or an idea. Start a new run.

## Set up before the first run

Do this in the project folder the founder is working in.

1. Confirm the two companion extensions are available by asking the session to
   list its tools once. The pipeline needs `pi-web-access` (`web_search`,
   `fetch_content`, `get_search_content`, `source_check`) for research, and
   `pi-subagents` (the `subagent` tool) for delegation. If either is missing, say
   so in one line and use the fallback below.
2. If `founder.md` is missing at the project root, create it from the shape in
   `references/run-layout.md` with every unknown value set to `not set`.
3. Create `runs/` at the project root if it does not exist.

Never overwrite an existing `founder.md`.

## Delegate with the subagent tool, or fall back

Spawn every specialist with the `subagent` tool, by its `factory-*` name, and give
it the absolute path of the run folder. Each specialist writes one file and ends
with a short status block; read only the status block, never paste a whole report
into the chat.

- Parallel research: issue the three research tasks in one subagent call so they
  run at the same time, then wait for all three.
- Web tools in children: `pi-subagents` foreground children do not load the
  parent's ambient extensions. If a research child reports that `web_search` is
  missing, rerun that step as a background child (`async: true`), which does load
  ambient extensions. If it still has no web tools, run that one step in the main
  session, which always has them. Never accept a report that names no sources.
- No `subagent` tool at all: run each role in this session, one at a time, using
  the matching agent file under `agents/` as the system prompt. Say once that the
  run is in main-thread mode.

## Pipeline

Update `state.json` at every stage change. Append every founder answer to
`decisions.md`. Valid stages, in order: `intake`, `research`, `verdict`,
`gate_verdict`, `plan`, `review`, `gate_plan`, `build`, `done`. Use `stopped`
when the founder ends the run.

### Stage 0 — Intake

1. Read `founder.md`.
2. Create `runs/<YYYYMMDD>_<slug>/`, where the slug is two to four lowercase
   words from the idea joined by underscores. Create `research/` inside it.
3. Write `brief.md`: the idea in the founder's words, the niche, the geography,
   the suspected customer, what a good outcome looks like, and the constraints
   from `founder.md`.
4. Ask only what is missing and changes the plan: the geography when the idea
   does not name it, and the weekly hours or the 30 day budget when `founder.md`
   says `not set`. At most one round here. Save hours and budget back to
   `founder.md` so the next run does not ask again.
5. Write the brief in the founder's language. Every downstream stage follows it.

### Stage 1 — Research, in parallel

Spawn `factory-scout`, `factory-miner`, and `factory-analyst` together. Each
writes its file under `research/`. If one returns `partial` or `blocked`, spawn it
once more with a narrower task; if it fails again, carry on and name the weak
report at Gate 1.

### Stage 2 — Verdict

Spawn `factory-judge`. It reads the brief and all three reports, scores the
candidate problems against `references/scoring.md`, verifies the sources, and
writes `verdict.md` with `GO`, `PIVOT`, or `NO GO`. Save the verdict and score in
`state.json`.

If the judge says the evidence is too thin to decide and names the gaps, send the
relevant researchers back once with those gaps as exact questions, then rerun the
judge. Do this at most once before the gate.

### Gate 1 — Is this worth solving?

Show the founder, briefly: the verdict and confidence, the recommended problem,
its score, the three main reasons, the riskiest assumptions, and any weak report.
Point to `verdict.md`. Then ask how to proceed and offer:

1. Proceed with the recommended problem
2. Proceed with another candidate (list the judge's other candidates)
3. Dig deeper first (take the founder's question, send the researchers back, rerun
   the judge, return here)
4. Stop here

When the verdict is `NO GO` or `PIVOT`, say so plainly and make "Stop here" or the
pivot the first option. Never soften a `NO GO` to keep the run alive. If the
founder proceeds against the verdict, record that in `decisions.md`.

Record the answer and set `selected_problem`. Move to `plan`.

### Stage 3 — Plan

Spawn `factory-strategist` on the selected problem. It writes `plan.md`: a 30 day
validation plan with experiments, channels, pass/fail thresholds, hours per week,
budget, and copy the founder can paste.

### Stage 4 — Review

Spawn `factory-critic`. If it returns `REVISE`, spawn `factory-strategist` again
in revision mode with the critic's notes, then `factory-critic` again. Allow at
most two revision rounds. If it still says `REVISE`, go to Gate 2 anyway and show
what is open.

### Gate 2 — Is this plan good to run?

Show the founder: the 30 day goal, the main experiments and channels, the
pass/fail thresholds, weekly hours, budget, the critic's decision, and anything
open. Point to `plan.md` and `review.md`. Offer:

1. Approve the plan
2. Change something (record the notes in `decisions.md`, run `factory-strategist`
   in revision mode, run `factory-critic` once, return here)
3. Stop here

### Stage 5 — Build plan

Spawn `factory-architect`. It writes `build.md`: the smallest stack and tools to
run the validation and a first version, with monthly cost, chosen from tools that
already exist and checked on the web.

### Wrap up

1. Write `summary.md`: the problem, the verdict and score, the plan in five
   lines, the stack and monthly cost, the first three things to do tomorrow, and
   the list of files in the run.
2. Set `stage` to `done`.
3. Tell the founder what was decided and where the run folder is. Keep it short.

## Ask outside the gates only when it changes the outcome

- A specialist returns a `NEEDS_HUMAN` question.
- Two or more reports come back with low confidence: ask whether to narrow the
  niche, change the geography, or continue.
- The reports point to a different customer or geography than the brief.
- A next step would spend money, publish something, or contact real people.

Group the questions. Ask everything pending at once, at most four at a time.

## Rules for every run

- Stay light. Pass paths to specialists and read status blocks. Open a full report
  only when a gate needs it.
- Never skip a gate, never answer one for the founder, and never mark a run
  approved without an answer.
- Never edit a report a specialist wrote. Send the specialist back instead.
- Write only inside the run folder, except for saving founder answers to
  `founder.md`.
- `state.json` and `decisions.md` hold everything needed to resume after an
  interruption.
- Write to the founder in plain, short sentences in their language.
