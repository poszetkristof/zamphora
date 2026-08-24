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
| 2 | 200-product | | | | |
| 3 | 300-design | | | | |
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
| 4 | Finding 8 — an input changed after the role that reads it had finished, so a correct document quietly became a wrong one and no role failed | Add a **correction pass** to the run flow: when a run input changes, re-dispatch every role that already ran and declares that input, with the instruction to repair only what now disagrees. Without it, the answer lands in `feature.md`, which is rewritten between runs, while the error stays in `docs/`, which is not | `factory/handoff-map.yaml` and `commands/factory-run.md` in the `ai-factory` repo | no | |
| 5 | Finding 9 — the line has one repair size, a whole pass, so a four-sentence fix meant either 96,000 tokens or breaking the ownership rule | Name a **small repair** in the cost guardrails: the assistant may edit a role-owned file when the change removes or rephrases text and adds no new claim, and every such edit is listed in the honest-run declaration. Keep everything else the role's | `factory/COST_GUARDRAILS.md` and the slot contracts in the `ai-factory` repo | no | |
| 6 | Finding 9 — a private reason for building the project reached a public document, and no rule stopped it | Add a DON'T row to every slot contract: never justify a technical decision by pointing at the owner's career, and never quote a motive from an input that is about the owner rather than the product | `factory/subagent-slots/*.md` in the `ai-factory` repo | no | |

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
