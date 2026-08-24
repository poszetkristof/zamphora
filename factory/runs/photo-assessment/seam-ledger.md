# Seam ledger — photo-assessment

One row per edge in `factory/handoff-map.yaml`. A seam is one file crossing from one subagent to
the next. The line almost never breaks inside a subagent — it breaks here.

**Labels:** `clean` · `under-supply` (got less than it needed) · `over-supply` (got more than it
needed, scope crept) · `missing` (the file was not there) · `routing` (went to the wrong subagent).

**Trace a break back to the earliest subagent that could have carried the missing piece**, not the
one that noticed it. The notice point is a symptom.

| # | From | To | File | Label | What was actually missing or extra |
| - | ---- | -- | ---- | ----- | ---------------------------------- |
| 0a | run input | 100-consulting | `factory/feature.md` | `under-supply` | Instructs 100 to "Write the six-month end date into the context brief", but no AWS account opening date appears in either input file. The rule is knowable and sourced; the number is not. **Closed 2026-08-24:** owner says the account opened 2026-07-01, so the window ends 2026-12-31. Written into `factory/feature.md` |
| 0b | run input | 100-consulting | `factory/feature.md` | `under-supply` | Puts "Storing that photo, with a retention rule" in scope and gives no rule, no period and no owner-set default. **Closed 2026-08-24:** 180 days, then automatic deletion by a storage lifecycle rule. Written into `factory/feature.md` |
| 0c | run input | 100-consulting | `factory/feature.md` | `under-supply` | The model call must return "a verdict, a confidence, and a next action". "Confidence" is never defined. A number the model reports about itself and a measured number are different things, and only one of them can be tested. **Closed 2026-08-24:** confidence is one of three bands — `likely`, `unsure`, `cannot-tell` — never a percentage, and it is tested by agreement against a golden set. Written into `factory/feature.md`, section "What confidence means on this project" |
| 0d | run input | 100-consulting | both input files | `under-supply` | Both say "more than one language" and neither names a language. Naming one is choosing scope, so 100 could not close it. **Closed 2026-08-24:** Hungarian and English in run 1. Written into `factory/feature.md` |
| 0e | run input | 100-consulting | `initial-plan.md` | `under-supply` | **Found on the second pass, 2026-08-24.** The plant list grew: several climbing plants of different kinds, a Pilea peperomioides and a Hoya were added to the original four. The count in `00-context-brief.md` §1 and §2 was "four plants", and two numbers were derived from it — the 30-assessments-a-month assumption in §4 and the "6 assessments in 8 weeks" bar in V2. Both were repaired to "at least eight pots". The exact number of climbing plants is still not written down, so the count stays approximate. The same paragraph also adds a real design fact that was not in the first pass: **one row per pot, not per species** |
| 0f | run input | 100-consulting | `factory/feature.md` | `under-supply` | **Found on the second pass, 2026-08-24.** The retention rule closes 0b for the photo (180 days) and opens a smaller gap next to it: "The **text** result of an assessment is kept longer" and no period is named. 400 Architecture cannot design the data lifecycle against "longer". Recorded as open question **O-10** in `00-context-brief.md` §7 and as human gate 10 |
| 1 | 100-consulting | 200-product | `docs/100-consulting/00-context-brief.md` | _not yet judged_ | 200 Product has not run. Label it after it does |
| 2 | 100-consulting | 200-product | `docs/100-consulting/01-use-cases.md` | _not yet judged_ | |
| 3 | 100-consulting | 200-product | `docs/100-consulting/03-market.md` | _not yet judged_ | |
| 4 | 100-consulting | 300-design | `docs/100-consulting/00-context-brief.md` | _not yet judged_ | |
| 5 | 100-consulting | 400-architecture | `docs/100-consulting/00-context-brief.md` | _not yet judged_ | |

## Findings

A finding names a file and a fact. Write at least three.

> **Good:** 600-qa under-supplied by 900-security on `docs/900-security/02-mitigations.md` — the
> rate-limit mitigation has no number, so no test case could be written against it.
>
> **Not a finding:** "better cross-role communication".

1. **`factory/feature.md` asks 100-consulting for a fact that no input carries.** It says "Write the
   six-month end date into the context brief", and neither `factory/feature.md` nor
   `initial-plan.md` records when the AWS account was opened. The end-date field in
   `docs/100-consulting/00-context-brief.md` §5.3 is therefore empty on purpose, with the sourced
   rule next to it. 800 Infra cannot set a cost guardrail against a date that does not exist.

2. **`factory/feature.md` requires a retention rule and supplies none.** "Storing that photo, with a
   retention rule" is in scope, and no period is written anywhere in either input. Because of this,
   the Viability gate of UC-5 in `docs/100-consulting/01-use-cases.md` is `open` rather than passed,
   and 400 Architecture has nothing to design the storage lifecycle against.

3. **"Confidence" is required as an output field and is never defined.** `factory/feature.md`
   requires the model call to return "a verdict, a confidence, and a next action", and no input says
   what confidence means or what value turns a result into "not sure". This is why UC-3 in
   `01-use-cases.md` fails its Feasibility gate with `open`. 600 QA cannot write a test case for
   "shows uncertainty honestly" until a number exists. **Closed 2026-08-24, and the answer changed
   the shape of the field rather than filling it in.** A percentage the model writes about itself
   cannot be tested at all, so no number would have fixed this. The field is now three literal
   values and the test is agreement against a golden set. UC-3's Feasibility gate can be re-judged
   by 200 Product against the new section in `factory/feature.md`.

4. **The cost of a model call is not in either input file, and it is a correctness property on this
   project.** `factory/feature.md` says the model call "costs money" and gives no figure.
   100-consulting had to research it: the per-assessment table in
   `docs/100-consulting/00-context-brief.md` §4 ($0.004 / $0.008 / $0.020, depending on the model)
   is calculated from published Anthropic prices, using two stated estimates for prompt and answer
   length. Those two estimates are the weakest numbers in the brief and should be replaced with
   measurements as soon as one real call has been made.

5. **The brief moves three approved backbone features down the list.**
   `docs/100-consulting/00-context-brief.md` line 20 says watering, soil and placement are "a
   schedule problem, and a calendar solves those". Backbone features 1, 2, 3 and 6 in
   `factory/feature.md` are approved by the owner, and the slot contract's DON'T column forbids
   ranking a backbone feature below anything. The brief contradicts itself at line 165, where it
   says this feature writes a care task that a later run reads and delivers as a reminder. Caught by
   the owner reading the brief, not by the line. **200 Product must read the backbone table as the
   ranking and ignore that sentence.** `factory/feature.md` now carries an explicit paragraph
   saying a calendar app is not the answer to any of the four.

6. **A likely under-supply that has not fired yet.** `docs/100-consulting/00-context-brief.md` §5.3
   records that AWS credits probably do not pay for the Anthropic API, and that whether Amazon
   Bedrock is inside the free plan's "over 90 select services" was **not verified**. If 800 Infra
   builds a cost guardrail assuming one account and one bill, this becomes a real break. Recorded as
   open question O-4. **Closed 2026-08-24:** 100 read the seam correctly. There are two bills. The
   model is paid from the owner's own Anthropic credits and Bedrock is not used, so no AWS alarm can
   ever see a model call. Written into `factory/feature.md`, read next by 800 Infra.

7. **Second pass, 2026-08-24 — the correction to finding 5 is now in the file.** Finding 5 above
   points at line numbers that no longer exist, because the brief was rewritten around them. The
   sentence "a calendar solves those" is gone. `00-context-brief.md` §1 now says the opposite, and
   quotes `factory/feature.md`: a calendar app is not the answer to backbone features 1, 2 and 3.
   `01-use-cases.md` carried the same fault in UC-1's Value gate ("the only one of his four problems
   that a calendar cannot solve") and in UC-2's "Why AI beats it here"; both are repaired. Finding 5
   is left as written, because it is the record of what pass one produced.

8. **Second pass, 2026-08-24 — an input change can make a correct document wrong without anybody
   touching it.** Nothing was wrong with `00-context-brief.md` when it was written. Then
   `initial-plan.md` gained three more kinds of plant, and every sentence counting "four plants"
   became false, including two derived numbers. This is the cheapest kind of break to find and the
   easiest to miss, because no role failed. The line has no re-check step that fires when an input
   file changes after a role has already read it. That belongs in the `ai-factory` repo, not here.

9. **The line has no cheap way to remove a sentence, so a role-owned file was edited by hand.** The
   owner read `00-context-brief.md` §2 and objected: it said the project has "an audience — a
   technical interviewer reading the repository", quoting `initial-plan.md` section 7. Everything in
   this repo is public, and a document that explains a technical decision by pointing at the owner's
   career is written for the wrong reader. The claim appeared in four places in the brief and in five
   files outside `docs/`. `initial-plan.md` section 7, the source, was rewritten to state the same
   bar without the audience: *a person who did not build this repo can read it, follow the reasoning,
   and change it without asking.* The private reason moved to `PRIVATE-NOTES.md`, which is in
   `.gitignore`.

   **The brief was then edited directly by the assistant rather than by a third pass of
   100-consulting**, because a third pass costs about 96,000 tokens to change four sentences, and
   `factory/COST_GUARDRAILS.md` allows one pass per role. This is a real break in the ownership rule,
   written down here rather than hidden. It shows a gap: the line has one repair size, a whole pass,
   and no smaller one. A change to make is recorded in `run-record.md`.

## The honest-run declaration

- Files hand-fed to a subagent outside its `reads:` list: **none.** 100-consulting read exactly
  `factory/feature.md` and `initial-plan.md`, plus its own slot contract and
  `factory/handoff-map.yaml`, which are process files rather than run inputs. It did not read
  `.claude/memory/`, and so it does not know the AWS account date or the retention rule even if one
  of those files records it. That is the design working, not a fault.
- Slots that stopped: **none stopped dead.** 100-consulting hit six stop-and-ask conditions,
  recorded all six in `human-gates.md`, and continued because none of them blocks its own four
  outputs. Two of them (gates 1 and 2) are marked to become hard stops at 400-architecture and
  800-infra.
- Slots re-run: none.

A run where every seam is clean and nothing was hand-fed is possible. A run where every seam is
clean *because* something was hand-fed teaches nothing — say which one this was.

### Second pass, 2026-08-24

100-consulting ran again over the same two inputs, both of which had changed. It read only those two
files and its own four outputs. Nothing was hand-fed. No new research was done and no price was
re-checked, so every source link and check date in `03-market.md` and `00-context-brief.md` §4 still
carries its original 2026-08-24 date. Five open questions closed from the inputs (O-3, O-4, O-5, O-7,
O-8), one new one opened (O-10), and four stayed open (O-1, O-2, O-6, O-9).

### A file owned by a role was edited by hand, 2026-08-24

`docs/100-consulting/00-context-brief.md` was edited by the assistant, not by 100-consulting, in
five places: §2 "a second reader exists", hypothesis R2 in §4, two bullets in §5.1, and the
"no experience" bullet in §5.3. Every edit removed or rephrased a claim about the owner as a person.
No new claim about the product was added. The owner asked for it directly. See finding 9.
