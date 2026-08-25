# Run record — photo-assessment

The summary a person reads instead of the whole folder. Fill it in last.

**Date:** started 2026-08-24 · **Feature:** see `factory/feature.md` · **Roles run:** 8

## What ran, and what it cost

One row per role call. Bounds are in `factory/COST_GUARDRAILS.md`: one pass per role, default model
first, a premium model only for one named decision with the reason written here.

| # | Role | Wrote | Model | Why that model | Re-run? |
| - | ---- | ----- | ----- | -------------- | ------- |
| 1 | 100-consulting | 4 owned files + seam/gate rows | default (Opus 5) | Default model, one pass. 108,726 tokens, well under the 250,000 bound | no |
| 1b | 100-consulting, **second pass** | the same 4 files, corrected in place + seam rows 0e/0f, findings 7/8, gate 10 | default (Opus 5) | **A repair, not a re-run.** Both declared inputs changed after pass one: the owner answered five open questions in `factory/feature.md` and added plants to `initial-plan.md`. The four files are written once in run 1 and only read in later runs, so an error left in them would outlive the input that corrects it. 96,142 tokens | yes — this row is the re-run |
| 2 | 200-product | 3 owned files: `00-prd.md` (224 lines), `01-user-stories.md` (474), `02-traceability.md` (159). 14 stories, 22 metrics, 10 gates | default (Opus 5) | Default model, one pass. 77,566 tokens, the cheapest role call so far and well under the 250,000 bound | no |
| 3 | 300-design | 4 owned files: `00-journey-map.md` (140 lines), `01-CONTEXT.md` (163), `02-SPEC.md` (616), `03-tokens.md` (209, flat). 7 surfaces, a 10-state camera list, 19 components all flagged new, 37 negative ACs | default (Opus 5) | Default model, one pass. 133,941 tokens — the most expensive role so far, and the largest output. Well under the 250,000 bound | no |
| 4 | 400-architecture | | | | |
| 5 | 500-engineering | | | | |
| 6 | 800-infra | | | | |
| 7 | 900-security | | | | |
| 8 | 600-qa | | | | |

## What broke

See `seam-ledger.md`. Summarise the three that matter.

## What stayed with a human

See `human-gates.md`. Summarise, including any gate marked `missed`.

## What to fix before the next run

One finding becomes one change to the factory. A change must name the file it edits — a slot
contract, the handoff map, the registry, or a template. "Improve the security prompt" is not a
change; "add a DON'T row to `factory/subagent-slots/900-security.md` forbidding a fix with no
number" is.

| # | From which finding | Change to make | Which file | Applied? | Did the next run fix it? |
| - | ------------------ | -------------- | ---------- | -------- | ------------------------ |
| 1 | Gate template has no status for "the owner answered it" | Add `closed` to the status list, meaning the answer is written into a file a role can read | `factory/runs/_templates/human-gates.md` in the `ai-factory` repo | no | |
| 2 | Finding 5 — the brief ranked backbone features 1, 2, 3 and 6 below the run's feature | Add a DO row: "quote the backbone table from `factory/feature.md` before ranking anything, and never argue that an existing tool already solves a backbone feature" | `factory/subagent-slots/100-consulting.md` in the `ai-factory` repo | no | |
| 3 | Finding 1 and gate 2 — 100 was told to write a date that no input carried | Move "write the six-month end date" from an instruction to 100 into a field the owner fills in `feature.md` before the run starts | `factory/feature.md` here, and the run checklist in the `ai-factory` repo | no | |
| 4 | Findings 8 and 14 — an input changed after the role that reads it had finished, so a correct document quietly became a wrong one and no role failed. **Twice now, on the same day.** The second time was predictable: answering a gate always changes `factory/feature.md`, and every role declares it | Add a **correction pass** to the run flow: when a run input changes, re-dispatch every role that already ran and declares that input, with the instruction to repair only what now disagrees. Without it, the answer lands in `feature.md`, which is rewritten between runs, while the error stays in `docs/`, which is not | `factory/handoff-map.yaml` and `commands/factory-run.md` in the `ai-factory` repo | no | |
| 5 | Finding 9 — the line has one repair size, a whole pass, so a four-sentence fix meant either 96,000 tokens or breaking the ownership rule | Name a **small repair** in the cost guardrails: the assistant may edit a role-owned file when the change removes or rephrases text and adds no new claim, and every such edit is listed in the honest-run declaration. Keep everything else the role's | `factory/COST_GUARDRAILS.md` and the slot contracts in the `ai-factory` repo | no | |
| 6 | Finding 9 — a private reason for building the project reached a public document, and no rule stopped it | Add a DON'T row to every slot contract: never justify a technical decision by pointing at the owner's career, and never quote a motive from an input that is about the owner rather than the product | `factory/subagent-slots/*.md` in the `ai-factory` repo | no | |
| 7 | Finding 10 — `03-market.md` points at "D-02", which lives in `02-decisions.md`, a file the reader is not given | Pick one and write it down: either add `02-decisions.md` to `200-product`'s `reads:` list, or add a DON'T row to `100-consulting` — never point at an ID in a file that the role reading this one does not receive. A cross-reference the reader cannot follow is a broken link, not a note | `factory/handoff-map.yaml`, or `factory/subagent-slots/100-consulting.md`, in the `ai-factory` repo | no | |
| 8 | Missed gate 5 — 200 gave every backbone feature a run number, and `factory/feature.md` gives none | Add a DON'T row: never assign a run, a release or a date to a feature that is not in this run. Write "not this run" and stop. Build order is the owner's, and the slot contract already says so — the rule exists and the file still broke it, so it needs to be in the DON'T column where the role reads it | `factory/subagent-slots/200-product.md` in the `ai-factory` repo | no | |
| 9 | Finding 12 — the role reported three contradictions in its inputs and two of them were not real | Add a step to the run-role command: check every contradiction a role reports against the file before recording it, and quote the line. An unchecked report becomes a finding, and a wrong finding costs the next run a repair pass it did not need | `commands/run-role.md` in the `ai-factory` repo | no | |
| 10 | Finding 15 — a price ("100,000 calls is $2,000") was written as money the owner could lose, and four later files repeated it. No role could check it, because no role is given the account balance | Two parts. Add a DON'T row to every slot contract: **never describe a price as a sum the owner can lose; a price is what calls would cost, and it is not a bill.** And add a required field to the run input for the balance or budget behind any paid service, so the figure a role reasons about is an input instead of arithmetic | `factory/subagent-slots/*.md` and the `feature.md` template in the `ai-factory` repo | no | |
| 11 | Found by the owner asking where run 2's documents go. **Every path in the registry and the map is fixed, with no feature in it.** `200-product` writes `docs/200-product/001-photo-assessment/00-prd.md` on every run, so run 2 silently overwrites run 1's PRD, stories and traceability. Nothing warns. The wiring check cannot see it either, because the paths are still valid | Add a `{feature}` placeholder to the paths of the **per-feature** roles (200, 300, 600, and the parts of 500 and 900 that describe one feature), filled from the slug in `factory/feature.md` — the same slug `factory/runs/<slug>/` already uses. The **cumulative** roles (400, 800, the conventions and contracts in 500) keep flat paths and extend their files. `role-inputs.mjs` and `check-wiring.mjs` resolve the placeholder. Second part: story and metric ids must carry the feature, or run 2 produces a second US-01 and traceability across features breaks | `factory/handoff-map.yaml`, `factory/subagent-registry.yaml`, `scripts/role-inputs.mjs`, `scripts/check-wiring.mjs` in the `ai-factory` repo | **yes, 2026-08-25, plugin 0.2.0** — not yet pushed | |
| 12 | Change 11 landed incompletely. The handoff map, the registry and the scripts were updated for `{feature}`; the **slot contracts were not**. `300-design.md` still describes its inputs as `docs/200-product/00-prd.md`, the flat path. The generated adapter is right, because it is built from the map, so nothing breaks — the hand-written prose is the stale half | Update the `description` line and the `Inputs & outputs` block in every slot contract that names a per-feature path, then re-derive. Better: stop repeating paths in the contract prose at all, and let the adapter be the only place they are listed — a path written twice is a path that will disagree | `factory/subagent-slots/*.md` in the `ai-factory` repo | no | |
| 13 | 300 caught two contradictions inside `factory/feature.md` that the assistant wrote and did not notice: a leftover sentence from a rejected palette, and a contrast pair that the same file measures as failing. Both survived because `feature.md` is hand-edited many times in a session and nothing re-reads it whole | Add a step to the run-role command: before dispatching, re-read `factory/feature.md` end to end and check it against itself — every colour pair against its own measured table, and every sentence about the look against the current palette. It is the one file every role reads, and it is the one file no role checks | `commands/run-role.md` in the `ai-factory` repo | no | |
| 14 | Finding 21 — three files in `.claude/skills/` had already chosen a component library and a styling engine, and no role can read that folder. A role could write a correct ADR that contradicts rules that load on every coding session, and neither side would see the other | Give the line one job at the start of a run: read the project’s own rules layer — `CLAUDE.md`, `AGENTS.md`, `.claude/skills/` — and list every technical choice it already assumes. Those are decisions, whether or not anybody decided them. Either they earn an ADR or they get deleted; left where they are, the line runs against a stack nobody chose. The check belongs beside the wiring check, because this is a wiring problem: an input the roles need is sitting where none of them can reach it | `scripts/check-wiring.mjs` and `commands/factory-run.md` in the `ai-factory` repo | no | |
The last column is filled in during the **next** run, not this one. That column is the whole point:
without it you never learn whether the fix worked.

---

## Done bar

- [ ] ≥3 seam findings, each naming a file and a fact
- [ ] ≥2 human-gate observations
- [ ] ≥1 change to make, naming its file
- [ ] one row per role call above
- [ ] no file was hand-fed outside a role's `reads:` list, or the exception is written down

A run that stopped and is honest about it passes. A clean demo that was staged does not.
