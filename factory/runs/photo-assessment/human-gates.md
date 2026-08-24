# Human gates — photo-assessment

A human gate is a point where the line stops and a person decides. The policy is in
`factory/handoff-map.yaml` under `human_gate_policy`.

**Statuses:** `recorded-open` (fired, decision still open, line continued on a stated assumption) ·
`hard-stop` (line cannot continue) · `paused-approved` · `paused-blocked` · `missed` (should have
fired and did not — a finding, same weight as a broken seam) · `n/a` · `closed` (the owner answered
it and the answer is in a file a role can read).

`closed` is not in the plugin's template. It was added on this run because there was no way to say
"answered", which is the most common thing that happens to a gate. That is a change to make in the
`ai-factory` repo, not here — recorded in `run-record.md`.

**A decision that exists only in this chat has not been made.** When you answer a gate, write the
answer into a file a role can read, then name that file below. Otherwise the next role is running on
hand-fed context and the run is no longer honest.

| # | Slot | What triggered it | Status | Decision, and who made it | Written into which file, read next by which role | Assumption the line continued on |
| - | ---- | ----------------- | ------ | ------------------------- | ------------------------------------------------ | -------------------------------- |
| 1 | 100-consulting | **No retention rule for the plant photo.** `factory/feature.md` requires storage "with a retention rule" and treats the photo as personal data. Neither input file gives a period. Policy match: "a use case touches personal data and no retention rule exists" | `closed` 2026-08-24 — the hard stop at 400-architecture is lifted | **180 days, then automatic deletion**, by the owner. A storage lifecycle rule deletes the file, not application code. The text result is kept longer. A user can delete their photos on demand. The owner first asked for research; the research says GDPR Article 5(1)(e) names no period for anything and requires the owner to choose one, justify it, and actually delete | `factory/feature.md`, "Human decisions already made". Read next by 400-architecture, then 900-security | 100 continued because its four outputs do not need the number. The brief still shows O-5 as open, which is correct for what 100 knew when it ran |
| 2 | 100-consulting | **The AWS six-month end date cannot be sourced.** `factory/feature.md` says "Write the six-month end date into the context brief". Neither input records the date the AWS account was opened. Policy match: "the brief needs a number nobody can source" | `closed` 2026-08-24 — the hard stop at 800-infra is lifted | **Account opened 2026-07-01, so the free window ends 2026-12-31**, by the owner. That is four months from today, not six | `factory/feature.md`, "Known constraints the line must respect". Read next by 800-infra | The brief carries the rule and an empty date. Nothing downstream was invented from it |
| 3 | 100-consulting | **The value hypothesis needs a business number.** "8 accepted actions out of 10" and "6 assessments in 8 weeks" are proposals by this role, not measurements. Policy match: "a subagent needs a policy, compliance, budget or release decision" — what a business number means is the owner's | `closed` 2026-08-24 | **Keep both numbers, marked provisional**, by the owner. They stay until the first 20 real assessments give a measurement to replace them with. A hypothesis with no number cannot be tested, and a wrong number that is labelled wrong is still better than none | `00-context-brief.md` §3 and O-1 in §7 stay as written. Read next by 600 QA when it writes the AI evaluation | Nothing changed. The numbers the line already used are the ones the owner kept |
| 4 | 100-consulting | **Which languages ship is not decided.** Both inputs say "more than one language" and neither names one. Naming one would be choosing scope. Policy match: "a subagent chooses scope beyond `factory/feature.md`" | `closed` 2026-08-24 | **Hungarian and English in run 1**, by the owner | `factory/feature.md`, "Human decisions already made". Read next by 200-product, then 300-design and 500-engineering | The line continued with "more than one language" unresolved. 300 Design and 500 Engineering need the answer before they fix any text |
| 5 | 100-consulting | **Whether the EU AI Act applies to this project is a legal question.** Article 50 transparency duties became applicable on 2 August 2026. Policy match: "anything with a legal or privacy consequence" | `recorded-open` | Open. The owner. This role recorded the duty and the date, and did not judge whether the project is in scope of the Act | `00-context-brief.md` §5.4. Read next by 900 Security | The line continued on the cheap safe assumption: say on screen that the assessment came from an AI model. That is safe whether or not the Act applies |
| 6 | 100-consulting | **`03-market.md` W-4 proposes a second outside API (`plant.health` by Kindwise) that the model path would call.** Policy match: "a subagent proposes a new tool the model may call" | `recorded-open` | Open, and **it does not enter run 1**. It sits in "worth considering later" only | `03-market.md` §2, row W-4. The section header states that nothing in it enters the current run | Nothing. No role may act on W-4 until the owner picks it up into a copy of `factory/feature.md` |
| 7 | 100-consulting | Spending money, deploying anything, accepting a risk, reversing an ADR | `n/a` | This role proposed no spend, no deploy and no risk acceptance. The cost table in `00-context-brief.md` §4 is priced research, not a purchase | — | — |
| 8 | run input (seam 0c) | **"Confidence" was never defined**, and it decides what the user sees when the model is unsure. That is close to "what gets built" | `closed` 2026-08-24, **answered by the assistant on the owner's instruction** | Confidence is a band, not a number: `likely` · `unsure` · `cannot-tell`. No percentage on screen. Two agreement bars are provisional. The owner read the material folder question and told the assistant to answer it. **Recorded here because the assistant decided it, not the owner** — if it turns out wrong, this row is where to look | `factory/feature.md`, section "What confidence means on this project". Read next by 200-product, then 300-design, 500-engineering and 600-qa | — |
| 9 | run input (finding 6) | **Which account pays for a model call.** It decides whether a cost guardrail can be an AWS alarm at all | `closed` 2026-08-24 | **Two bills.** The Anthropic API is paid from the owner's own Anthropic credits. Bedrock is not used. So no AWS budget alarm can see a model call, and a runaway loop burns credits rather than closing the AWS account | `factory/feature.md`, "Human decisions already made". Read next by 800-infra, then 900-security | The brief left it unverified and said so. Nothing downstream was invented from it |
| 10 | 100-consulting, second pass (seam 0f) | **How long the assessment *text* is kept.** `factory/feature.md` closes the photo question with 180 days and says the text result is kept "longer", with no period. The text is still personal data — it is a record about a named user's home. Policy match: "a use case touches personal data and no retention rule exists" | `recorded-open` | Open. The owner, and never the model. `CLAUDE.md` lists how long personal data is kept as a decision that is never the model's, and "longer" is not a period | `00-context-brief.md` §5.4 and O-10 in §7, plus `02-decisions.md` D-12. Read next by 400-architecture, then 900-security | The second pass continued because none of 100's four outputs needs the number. UC-5's Viability gate in `01-use-cases.md` passes on the photo rule and carries this as its one condition. It becomes a hard stop when 400 Architecture designs the data lifecycle |

## Gates that should have fired and did not

This section is the valuable one. Read each slot's output and ask: did it decide something that was
not its to decide?

1. **100-consulting — `missed`, found by the owner reading the brief.**
   `00-context-brief.md` line 20 says watering, soil and placement are "a schedule problem, and a
   calendar solves those". Those are backbone features 1, 2, 3 and 6, already approved by the owner.
   Ranking an approved feature down is a "what gets built" decision, which is the last row of the
   standing list below. The brief contradicts itself at line 165. The line did not catch this; a
   person did, on a first read. `factory/feature.md` now says a calendar app is not the answer to
   any of the four, so 200 Product reads the correction from the input rather than from chat.

2. **100-consulting — otherwise checked, none found.** The four outputs propose numbers (the value
   hypothesis, the cost estimate, the assessments-per-month assumption) and every one of them is
   labelled in place as proposed or estimated, with the owner named as the person who confirms it.
   The one to re-check when 200 Product runs: does the brief's cost table read downstream as a model
   *choice*? It is not one. `02-decisions.md` D-10 says so out loud. If 400 Architecture treats
   Haiku 4.5 as already chosen, this becomes a `missed` gate and the fault is in the brief.

### Second pass, 2026-08-24 — checked again

3. **Gate 1 above is now repaired in the files, not only in the input.** The "a calendar solves
   those" sentence is gone from `00-context-brief.md` §1, and the same fault has been removed from
   two places in `01-use-cases.md` that the first check did not name: UC-1's Value gate said photo
   assessment was "the only one of his four problems that a calendar cannot solve", and UC-2's
   "Why AI beats it here" said "A phone calendar works." Both now quote `factory/feature.md`
   instead. The `missed` label on row 1 stands, because it did happen.

4. **No new missed gate found.** The second pass closed five open questions from the inputs and
   opened one (O-10, gate 10 above). It decided nothing itself. The two numbers it changed —
   "four plants" to "at least eight pots", and the reasoning under hypothesis V2 — are corrections
   of a fact from `initial-plan.md`, not new judgements. The targets themselves (8 in 10, 6
   assessments) were not touched, because gate 3 records the owner keeping them.

## Standing human-owned decisions on this project

Recorded here so a `missed` is easy to spot. None of these is ever a subagent's call.

- What gets built, and what ships when.
- Accepting any risk, security or architectural.
- What counts as personal data, and how long it is kept.
- Spending money. Deploying anything. Owning the kill-switch.
- Accepting a new dependency, or a new tool the model may call.
- Reversing an accepted ADR.
- The final merge, and the release go/no-go.
