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
| 4 | 400-architecture | 6 owned files + 11 ADRs and the index. `00-options.md` (4 options, 4 constraints), `01-context.mmd` (6 boxes), `02-containers.mmd` (12 boxes), `05-patterns.md` (11 access patterns), `06-nfrs.md` (30 NFRs), `001-photo-assessment/03-flow.md` (15 steps, timed). 7 gates and 4 seam findings | default (Opus 5) | Default model, one pass. 280,000 tokens — over the 250,000 bound, and the first role to go over it. The output is also the largest: 11 ADRs are 11 documents. Recorded, not re-run | no |
| 4b | 400-architecture, **pre-mortem** | `001-photo-assessment/07-adversarial.md` (~800 lines, 11 findings) | default (Opus 5), **fresh session** | The contract says a session that built a design defends it, so this one was handed only `docs/400-architecture/` — no ADRs, no product or design files, no conversation history. 163,697 tokens. It found two defects the building session missed, both confirmed by hand | no |
| 5 | 500-engineering | 5 owned files: `00-conventions.md` (241 lines), `01-contracts.md` (425), `02-web-spec.md` (335), `03-api-spec.md` (340), `docs/context/stack.md` (84). 13 routes plus health, 20 failure codes, every NFR given an enforcement point | default (Opus 5) | Default model, one pass. 202,090 tokens, under the 250,000 bound. **10 stop-and-asks and 7 disagreements between its own inputs** — the most any role has reported, and the reason is that it is the first role reading four earlier roles at once | no |
| 5b | 500-engineering, **repair pass** | the same 5 files, corrected in place | default (Opus 5), same session resumed | **A repair, not a re-run.** The handoff map was fixed mid-run and two files entered its inputs. Resuming the same agent cost 276,040 tokens against about 200,000 for a fresh run, and kept role ownership — the alternative was the assistant editing a role-owned file. It corrected four rebuilds, two of which changed URL shapes | yes — this row is the re-run |
| 6 | 800-infra | 5 owned files, 1,737 lines: `00-environments.md` (298), `01-iac-plan.md` (479), `02-cost-guardrails.md` (339), `03-observability.md` (313), `04-ci-cd.md` (308). 8 CDK stacks, 10 alarms, 10 required status checks, 3 rollback levels. **5 human gates and 6 open questions** | default (Opus 5) | **One write pass and three repair passes, in one resumed session, 368,464 tokens** — over the 250,000 bound, and the second role to go over it after 400 Architecture. The write pass finished all five files but the editor was closed before it reported, so the contract was checked by hand instead. The three repairs applied 19 owner decisions as they were answered. **The reason it cost that much is the reason it was right:** the alternative was the assistant editing five role-owned files. **Two rate-limit stops and one editor close, and none of them lost work** — the agent was told to save each file before starting the next. **What it did that no gate asked for:** it marked six free-tier numbers as *not verified first-party* rather than presenting them as checked, it found that its own §8 contradicted the live branch protection, and it found two defects in other roles' files — `InitDuration` is not a CloudWatch metric (NFR-06), and a self-contradicting bullet in `03-api-spec.md` §9 | no |
| 7 | 900-security | | | | |
| 8 | 600-qa | | | | |

## What broke

Full list in `seam-ledger.md`. The three that matter:

1. **A role could not read two files it needed, and did not say so.** The handoff map still pointed
   at folder names from before a refactor. 500 Engineering wrote a complete, confident document that
   was wrong in four places, two of them URL shapes. **A starved role does not fail loudly — it
   guesses well.** The same bug sat in two more roles; Security was told to check the sign-in ADR and
   could not open a single ADR.

2. **An answered decision did not reach the documents built on it.** Seven times. The owner reversed
   the retry rule, and old values survived two deliberate sweeps — because three of the copies wrote
   the number *in words*, which no search for the number can match. A fresh reader found them.

3. **The skills contradicted the specs, and skills are what get read during a build.** Three lines
   each instructed a design an ADR had rejected by name — a pre-signed upload, an ownership check in
   the service, a confidence threshold that must never exist. Each is ordinary good advice for a
   generic app and false for this one, which is why it survived review.

## What stayed with a human

**Forty-two gates. All closed. None marked `missed`.**

The owner answered sixteen in the last two days. The four that changed the most:

- **No retry, anywhere** — moved the deadline from 24,000 ms to 20,000 ms and rewrote a screen state
  list.
- **No admin route in run 1** — reversed part of an accepted ADR, moved one story out and removed an
  acceptance criterion. Cheap only because nothing had been built on it yet.
- **`interface` is allowed again.** The ban had no source behind it, and the owner said so before
  any research did.
- **Vitest, and exact version pins.** Pinning caught that the project was pinned to a package that
  had since been renamed and deprecated.

**The pattern worth keeping:** every gate that turned out expensive was expensive because a role had
already built on the old answer. A gate asked *before* the role runs costs nothing — gate 19, the
visual identity, was answered first and no rework followed it.

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
| 15 | Finding 28 — a role flagged a figure as unverified, then made a choice that only works if the figure lands one way. ADR-0002 said the free amount was "not treated as verified here" and still picked on-demand DynamoDB capacity, which the free amount does not cover | Add a rule to every slot contract: **a figure marked unverified may not be the basis of a choice.** Either pick the option that is safe under every reading of it, or record the choice as a gate. Flagging a number and then betting on it is worse than not flagging it, because the flag reads as care | `factory/subagent-slots/*.md` in the `ai-factory` repo | no | |
| 16 | Finding 29 — `02-containers.mmd` claimed in its own header that every box had an arrow, which was true and did not catch a connection the prose described and the diagram never drew | Change the diagram check in the slot contract from "no orphan boxes" to **"every connection a box's description claims has a matching `Rel()`"**. The weak version passed a container diagram with no `web -> api` arrow, and the arrow was hiding an undecided question | `factory/subagent-slots/400-architecture.md` in the `ai-factory` repo | no | |
| 17 | Finding 30 — the pre-mortem found three real defects **before** the next role read the files. Every earlier instance of finding 14 was caught after the next role had already built on the wrong value | Make the pre-mortem a **gate on the role rather than its last output**. The role is not complete until a fresh session has read only its folder and reported. Today it is one of eight files the role writes, which means a role can be marked done with a defect still in it | `factory/subagent-slots/400-architecture.md` and `commands/run-role.md` in the `ai-factory` repo | no | |
| 18 | Finding 31 — 500-engineering could not read the ten verdict codes, because `00-prd.md` is not one of its declared inputs. It also could not read `05-patterns.md`, which four ADRs name as the authority for the key shapes, the cookie attributes and the answer schema | Add both files to `500-engineering`'s inputs in the handoff map. More generally: **when an ADR cites a file as the authority for a rule, every role that must follow the rule has to be able to read that file.** The map has no way to express that today, so it can starve a role of a fact its own inputs point at | `factory/handoff-map.yaml` in the `ai-factory` repo | no | |
| 19 | The slash command loaded plugin **0.1.2** from the cache while the repo ships **0.2.0**. 0.1.2 predates the per-feature folder refactor, so it reported two inputs MISSING that were present. A less careful operator records a false seam and stops the line | Make `role-inputs.mjs` print the plugin version it is running from, so a stale cache is visible in the first line of output instead of looking like a missing file | `factory/scripts/role-inputs.mjs` in the `ai-factory` repo | no | |
| 20 | Finding 32 — six stale sentences survived two deliberate sweeps after the retry reversal and the colour change, and a role reading the files cold found all six. Three of them wrote the old value in words rather than digits, so no search for the number could match | Add a step to the correction pass: after a reversal, **a fresh session reads every file that cites the changed decision and reports disagreements**, rather than the changing session searching for the old value. A search finds copies of a number; only a reader finds a sentence that means the old number | `commands/factory-run.md` in the `ai-factory` repo | no | |
| 21 | Finding 34 — a role that could not read the file its own ADRs cite produced a complete, confident document that was wrong in four places, two of them URL shapes. It did not fail; it guessed well | Add a rule to `run-role.md`: **before dispatching, resolve every file an input ADR names as an authority, and add it to the dispatch.** An ADR that says "see `05-patterns.md` §1" is a declared input in everything but name. Today the map has no way to express "this file is reachable through that one" | `commands/run-role.md` and `factory/handoff-map.yaml` in the `ai-factory` repo | no | |
| 22 | The slot contracts restated each role's inputs in prose, next to the map that also holds them. The two copies drifted after the per-feature refactor, so five contracts named paths that no longer existed | **Applied on 2026-08-26.** The prose list is deleted from all five and replaced by a pointer to the `reads:` block. One statement of a fact cannot disagree with itself | `factory/subagent-slots/*.md` in the `ai-factory` repo | **yes** | |

## Done bar

- [x] ≥3 seam findings, each naming a file and a fact — **40 findings**
- [x] ≥2 human-gate observations — **42 gates, all closed, none `missed`**
- [x] ≥1 change to make, naming its file — **22 changes; number 22 is applied**
- [x] one row per role call above — **7 rows, including two repair passes**
- [x] no file was hand-fed outside a role's `reads:` list — **with one exception, written down here.**
      When 500 Engineering was resumed for its repair pass, it was *told* that four values had
      changed (the 18,000 ms timeout, the retry wording, the `--color-warn` rule, the Q-3 line)
      instead of being left to re-read them. Every one of those facts was inside a file it
      already declared, so nothing new entered its context — but it was stated rather than read,
      and that is hand-feeding by the letter of the rule.

A run that stopped and is honest about it passes. A clean demo that was staged does not.
