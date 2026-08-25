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
| 5 | 100-consulting | **Whether the EU AI Act applies to this project is a legal question.** Article 50 transparency duties became applicable on 2 August 2026. Policy match: "anything with a legal or privacy consequence" | `closed` 2026-08-25 | **Show the notice, take no legal advice, for run 1**, by the owner. Every screen showing an assessment says it came from an AI model. Whether the Act applies is left unanswered on purpose, because the answer changes nothing while the app has one user and is not offered to anyone. **Scoped to run 1: this re-opens the day the app is offered to another person**, and that is a different question | `factory/feature.md`, "Human decisions already made". Read next by 300-design, which draws the notice, then 900 Security. `00-context-brief.md` §5.4 still shows it open, written before the answer | The line continued on the cheap safe assumption, and the owner kept it |
| 6 | 100-consulting | **`03-market.md` W-4 proposes a second outside API (`plant.health` by Kindwise) that the model path would call.** Policy match: "a subagent proposes a new tool the model may call" | `closed` 2026-08-25 | **Rejected outright, not deferred**, by the owner: *"I won't accept it, I'm not interested about Kindwise."* This is stronger than the market scan's "worth considering later". No role may propose a second opinion service again, and no design should leave a place for one. The reasons already in the file stand: double cost per assessment, a second outside service to keep working, and a rule needed for what the screen shows when two services disagree | `factory/feature.md`, "Human decisions already made". Read next by 300-design and 400-architecture. **`03-market.md` §2 W-4 and `00-prd.md` §6.2 still read "worth considering later"** — both were written before the answer. `factory/feature.md` is newer and wins, per finding 14 | Nothing was built on it either way |
| 7 | 100-consulting | Spending money, deploying anything, accepting a risk, reversing an ADR | `n/a` | This role proposed no spend, no deploy and no risk acceptance. The cost table in `00-context-brief.md` §4 is priced research, not a purchase | — | — |
| 8 | run input (seam 0c) | **"Confidence" was never defined**, and it decides what the user sees when the model is unsure. That is close to "what gets built" | `closed` 2026-08-24, **answered by the assistant on the owner's instruction** | Confidence is a band, not a number: `likely` · `unsure` · `cannot-tell`. No percentage on screen. Two agreement bars are provisional. The owner read the material folder question and told the assistant to answer it. **Recorded here because the assistant decided it, not the owner** — if it turns out wrong, this row is where to look | `factory/feature.md`, section "What confidence means on this project". Read next by 200-product, then 300-design, 500-engineering and 600-qa | — |
| 9 | run input (finding 6) | **Which account pays for a model call.** It decides whether a cost guardrail can be an AWS alarm at all | `closed` 2026-08-24 | **Two bills.** The Anthropic API is paid from the owner's own Anthropic credits. Bedrock is not used. So no AWS budget alarm can see a model call, and a runaway loop burns credits rather than closing the AWS account | `factory/feature.md`, "Human decisions already made". Read next by 800-infra, then 900-security | The brief left it unverified and said so. Nothing downstream was invented from it |
| 10 | 100-consulting, second pass (seam 0f) | **How long the assessment *text* is kept.** `factory/feature.md` closes the photo question with 180 days and says the text result is kept "longer", with no period. The text is still personal data — it is a record about a named user's home. Policy match: "a use case touches personal data and no retention rule exists" | `closed` 2026-08-24 — the hard stop is lifted. **This was the last hard stop on the run** | **No clock. The text lives as long as the pot does**, by the owner. Delete the pot and its assessments go; delete the account and everything goes. The answer changed the shape of the field rather than filling it in, the same way gate 8 did: a fixed period would delete the early part of a plant's history, which is the part worth having, and GDPR Article 5(1)(e) asks for no longer than the purpose needs. Backstop: **an account with no sign-in for 12 months is deleted, warned by email at 11 months.** The owner chose 12 over 24, holding less data at the cost of a shorter grace period | `factory/feature.md`, "Human decisions already made". Read next by 400-architecture, which designs the data lifecycle, then 900-security. **`00-context-brief.md` §5.4, O-10 in §7 and `02-decisions.md` D-12 still say it is open** — they were written before the answer and no role has re-read them. `factory/feature.md` is the newer file and wins, per finding 14 | The second pass continued because none of 100's four outputs needs the number. UC-5's Viability gate in `01-use-cases.md` passes on the photo rule and carries this as its one condition. It becomes a hard stop when 400 Architecture designs the data lifecycle |
| 11 | 200-product (G-1) | **The model response grew a fourth field.** `factory/feature.md` names three: verdict, confidence, next action. UC-2's Viability condition needs the follow-up date in a shape the code can read. Without it US-03, the care task, cannot exist. Policy match: "a subagent chooses scope beyond `factory/feature.md`" — this adds to the input rather than filling a blank in it | `closed` 2026-08-24 | **Four fields**, by the owner. The fourth is the follow-up in whole days, chosen by the model, because how soon you check a plant again depends on how bad it looks. The rejected option was a fixed table from verdict to interval — cheaper and fully testable, but it gives the same date for the same verdict every time. 200 had already written every story this way, so nothing it wrote needs changing | `factory/feature.md`, "Human decisions already made". Also in `00-prd.md` §5.3 and US-02. Read next by 300-design, then 400-architecture and 500-engineering, which puts it in the contract | Four fields. Everything 200 wrote about the care task rests on it, and the answer matched |
| 12 | 200-product (G-2) | **The per-user daily limit on assessments.** `00-context-brief.md` §4 works out that an unprotected endpoint empties the whole credit balance in about a minute, and no input names the limit that stops it. Policy match: spending money, which `CLAUDE.md` lists as never the model's | `closed` 2026-08-24 — the hard stop is lifted | **10 assessments per user per day**, by the owner. The check runs before the model call and before any retry, so a failed call still counts. Expected real use is about 30 a month, so this is ten times headroom. 5 a day was rejected as too tight for an evening spent checking several pots; 20 was rejected because the cap stops protecting much | `factory/feature.md`, "Human decisions already made". Read next by 400-architecture, which decides where it is enforced, then 800-infra and 900-security | **None was needed.** 200 refused to propose a number here, unlike the four below. That was the right call: every other blank on this run costs a re-write, this one costs money |
| 13 | 200-product (G-5) | **The time budget from first tap to result.** UC-1 says the flow must be "short enough to finish while standing" and hands the number to 300 Design. An acceptance criterion cannot wait for a later role | `closed` 2026-08-25 | **30 seconds**, by the owner — 200's proposal, kept. Measured from the tap to something on screen, so it covers the resize, the upload and the model call. 15 seconds was rejected because a weak signal can spend that on the upload alone, so the app would throw away answers it had already paid for. 60 seconds was rejected because a minute in front of a plant reads as broken, and the user taps again, which costs a second call | `factory/feature.md`, "Human decisions already made". Read next by 300-design, which decides what the wait looks like, then 400-architecture, which has to fit its timed flow inside it | 30 seconds, and the answer matched |
| 14 | 200-product (G-6) | **The list of ten verdict codes.** UC-1 ends with "what the list of possible verdicts is — 200 Product decides", so the routing is correct and the role did its job. But it built the list from symptom words in its three input files, with no plant reference. A missing code costs a plant | `closed` 2026-08-25, **with a review date** | **Ship the ten as written, review after the first 20 real assessments**, by the owner. Accepted without a plant reference because the list cannot fail silently: `other` and `nothing-wrong` mean the model is never forced to invent a fault, so a missing code shows up as a pile of `other` answers, which is countable. The 40-photo test set exposes the rest. Checking it against a plant reference first was rejected as a new input to the whole line rather than a fix to one list | `factory/feature.md`, "Human decisions already made". `00-prd.md` §5.2 holds the codes. Read next by 300-design, 500-engineering and 600-qa. **600 QA owns the review**: a rising share of `other` is the signal | The ten codes as written, and the answer matched |
| 15 | 200-product (G-7) | **How long a session lasts for a returning user.** UC-4 says "long enough" and names no period | `closed` 2026-08-25 | **30 days**, by the owner — 200's proposal, kept. 7 days was rejected because the app is opened every few weeks, not daily, so the user would meet the sign-in screen almost every visit. 90 days was rejected because a lost phone would stay signed in to photos of the inside of a home for three months | `factory/feature.md`, "Human decisions already made". Read next by 400-architecture, which decides how sign-in works and where tokens live | 30 days, and the answer matched |
| 16 | 200-product (G-8) | **How fast the kill-switch must take effect.** UC-7 requires it to work without a deploy and gives no time. `CLAUDE.md` lists owning the kill-switch as never the model's | `closed` 2026-08-25 | **60 seconds**, by the owner — 200's proposal, kept. The on/off value may be cached for up to a minute, so a few calls can slip through after it is flipped. Checking on every request was rejected as the more complicated answer: with no cached value, someone must decide what happens when that read itself fails, on or off. 5 minutes was rejected because the switch exists for when something is already going wrong | `factory/feature.md`, "Human decisions already made". Read next by 400-architecture, then 800-infra, which builds it | 60 seconds, and the answer matched |
| 17 | 200-product (G-9) | **The retry limit after a failed model call.** UC-6 hands it to 800 Infra with no number. Every retry is a paid call, so this is gate 12 in a second form | `closed` 2026-08-25 | **Two attempts total: one try, one retry**, by the owner. Backoff between them, both inside the 30 seconds of gate 13. It retries only a timeout, a 429 or a 503 — never a bad request, a rejected photo, or an empty credit balance. Both attempts count against the 10-a-day limit. The owner first proposed **five tries with exponential backoff**, which is the standard answer and is wrong here for two reasons worth keeping: every attempt is a paid model call, and 1+2+4+8 seconds of backoff alone overruns the 30-second limit before the fifth call is even made. Five tries becomes right once the assessment runs in the background — backbone 6, run 3 | `factory/feature.md`, "Human decisions already made". Read next by 400-architecture, then 800-infra and 500-engineering, which writes the failure messages | The rule without the number. The number now exists |
| 18 | the owner, reading `00-prd.md` (finding 15) | **There is no cap on total spend, only on calls per user per day.** 10 a day for a month is 300 calls: $6.00 on Opus 5, $1.20 on Haiku 4.5. So the daily limit stops a script but does not keep spend inside the credit balance. Policy match: spending money, and accepting a risk | `closed` 2026-08-25 | **No cap. The credit runs out and the feature stops**, by the owner. The balance reaching zero is the stop, so a cap would be a second number to pick, enforce and keep correct that could only ever fire before the one that already works. The owner accepts that the feature can go dark with no warning, because topping up is manual anyway and nothing else in the product stops | `factory/feature.md`, "Human decisions already made". Read next by 400-architecture, then 500-engineering and 800-infra, which must treat an empty balance as a named failure state and must **not** retry it | The line continued on the daily limit alone. That was enough against a script, and the owner has now said it does not need to be more |

### Three of 200's gates are gates this run already has

200-product did not know that, because it reads no run bookkeeping. Recorded here so they are
answered once, not twice.

- **Its G-3, how long the assessment text is kept, is gate 10 above.** 200 raises it from
  `recorded-open` to a **hard stop**, because US-10 puts the period on a screen and there is no
  period to print. Gate 10 said it becomes a hard stop at 400 Architecture. It became one earlier.
- **Its G-4, the 8-in-10 acceptance target, is gate 3 above,** which the owner closed on 2026-08-24
  by keeping the number and marking it provisional. 200 carried it through as M-01 with the same
  label. Nothing more is owed here.
- **Its G-10, whether the EU AI Act applies, is gate 5 above,** still open. 200 took the same cheap
  safe assumption 100 did: US-06 shows the AI notice whether or not the Act applies.

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

### 200-product, 2026-08-24

5. **200-product — `missed`. It set the build order for the whole product.** `00-prd.md` §3 gives
   every backbone feature a run number: watering and soil in "Run 2 (planned)", notifications in
   "Run 3", placement in "Run 4", documenting over time in "Run 5". `factory/feature.md` lists the
   six backbone features and **never assigns a run to any of them**. So those five numbers were
   invented here. 200's own slot contract says it must hand back "what gets built first", and
   `00-prd.md` §8 says out loud that build order is never decided in that document. The table
   contradicts the rule three sections later in the same file.

   It is a small mistake with a long reach: 300 Design and 400 Architecture read the PRD and will
   treat "run 2" as settled. **Read that column as "not this run" and nothing more.** The owner
   decides what run 2 is. Nothing else in the PRD depends on the numbers — every story in this run
   serves backbone feature 5, and §3 says so.

6. **The re-check from row 2 above is answered: no.** Row 2 asked whether the brief's cost table
   would read downstream as a model *choice*. It did not. `00-prd.md` §10 lists "which model is
   used" as a thing this document does not decide, and no story names a model. The brief's warning
   in D-10 held for one hand-off. Ask again after 400 Architecture, which is the role that picks.

## Standing human-owned decisions on this project

Recorded here so a `missed` is easy to spot. None of these is ever a subagent's call.

- What gets built, and what ships when.
- Accepting any risk, security or architectural.
- What counts as personal data, and how long it is kept.
- Spending money. Deploying anything. Owning the kill-switch.
- Accepting a new dependency, or a new tool the model may call.
- Reversing an accepted ADR.
- The final merge, and the release go/no-go.
