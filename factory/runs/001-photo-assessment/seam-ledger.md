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
| 0f | run input | 100-consulting | `factory/feature.md` | `under-supply` | **Found on the second pass, 2026-08-24.** The retention rule closes 0b for the photo (180 days) and opens a smaller gap next to it: "The **text** result of an assessment is kept longer" and no period is named. 400 Architecture cannot design the data lifecycle against "longer". Recorded as open question **O-10** in `00-context-brief.md` §7 and as human gate 10. **Closed 2026-08-24:** no clock — the text lives as long as the pot does, with an account deleted after 12 months of no sign-in. Written into `factory/feature.md` |
| 1 | 100-consulting | 200-product | `docs/100-consulting/00-context-brief.md` | `under-supply` | Carried the problem, the four hypotheses and the cost research, and 200 built the whole PRD from it. One gap is serious: §4 works out that an unprotected endpoint empties the credit balance, and then never names the limit that stops it. 200 had to write US-08 with the number left blank, which is its one hard stop. Two smaller things: the 30-assessments-a-month figure still rests on the old four-plant count (O-9), and hypothesis R2 was worded so that it excluded Opus 5 and showed Opus 5 at the edge in the same paragraph — repaired, see finding 12 |
| 2 | 100-consulting | 200-product | `docs/100-consulting/01-use-cases.md` | `under-supply` | The routing worked: UC-1 says "what the list of possible verdicts is — 200 Product decides", and 200 decided it. Four numbers did not come with it. UC-1 says the flow must be "short enough to finish while standing" and hands the number to 300 Design. UC-4 says a session lasts "long enough". UC-7 says the kill-switch works without a deploy and gives no time. UC-6 hands the retry limit to 800 Infra. An acceptance criterion cannot wait for a later role, so 200 proposed 30 seconds, 30 days and 60 seconds, and marked all three as needing a person |
| 3 | 100-consulting | 200-product | `docs/100-consulting/03-market.md` | `routing` | Row W-3 says the reasoning would make "the `unsure` and `cannot-tell` bands from D-02 easier to believe". D-02 is a heading in `docs/100-consulting/02-decisions.md`, and `handoff-map.yaml` does not give that file to 200-product. The reference cannot be followed by the role that reads it. Everything else in the file landed: all seven W-rows reached the PRD's Out list with a person named as owner, and none was pulled into scope |
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

10. **A document can point at an ID that its reader is not allowed to see.** `03-market.md` row W-3
    names "D-02" as the source of the `unsure` and `cannot-tell` bands. D-02 is a heading in
    `02-decisions.md`. `handoff-map.yaml` gives 200-product three of 100's four files, and
    `02-decisions.md` is the one it does not get. So 200 read a reference it could not follow, and
    said so in `00-prd.md` §9. Nothing broke, because 200 got the same bands from `factory/feature.md`
    instead. It would have broken if that second source had not existed. The earliest role that could
    have carried it is 100-consulting, which wrote the cross-reference without checking who reads the
    file. This is a wiring question, not a writing one: either 200 should read `02-decisions.md`, or a
    role must not point at an ID outside the reading set of the file it is writing.

11. **The run input names three response fields and the use cases need four.** `factory/feature.md`
    says the model call returns "a verdict, a confidence, and a next action". UC-2 in `01-use-cases.md`
    passes its Viability gate only if the model returns the follow-up date in a shape the code can
    read, not inside a sentence. A three-field response cannot produce a dated care task, so US-03
    could not exist. 200 added a fourth field, the follow-up in whole days, and recorded it in
    `00-prd.md` §5.3 as its own decision. This is the first time this run that a role has added to
    what `factory/feature.md` listed, rather than filling in a blank. Recorded as gate 11.

12. **Two of the three contradictions the role reported were not contradictions.** 200 reported that
    `00-context-brief.md` §4 "gives the project's return as a career reason". No such sentence
    exists — the whole repository was checked for it. The role most likely read "learn AWS properly"
    that way. It also reported hypothesis R2 as self-contradicting: R2 excluded Opus 5 and then
    showed Opus 5 "exactly at the edge". Both halves were true, because $10.00 is not under $10, but
    the wording invited exactly the reading 200 gave it, and 400 Architecture picks the model from
    that table. The sentence was rephrased by hand — see the honest-run note below. The lesson is
    about the run, not the role: **a reported contradiction is a claim to check, not a fact.** Two of
    three were false here.

13. **The one number that protects the money is the one nobody wrote.** `00-context-brief.md` §4
    prices the failure, and no input file names a per-user daily limit to stop it. Every other cost
    figure on this run is research. This one is the actual risk. 200 wrote US-08 with the number
    blank and marked it a hard stop. `CLAUDE.md` says cost is a correctness property on this project,
    and the line had run two roles without the number that makes that true.

14. **Finding 8 happened again, the same day, and this time it was predictable.** The owner closed
    gates 11 and 12 on 2026-08-24, so `factory/feature.md` now carries the daily limit of 10 and the
    fourth response field. 200-product declares `factory/feature.md` as an input and has already run.
    So `01-user-stories.md` US-08 still says the limit is blank, while the input it was written from
    now names it. Nothing is wrong with the answer and nothing is wrong with the story — they simply
    no longer agree.

    It was left as is on purpose. The fourth field needs no change, because 200 had already written
    every story that way and the owner agreed with it. US-08 is the only stale line, and every role
    that reads it also reads `factory/feature.md`, which is the newer file. **The rule for the rest of
    this run: where `01-user-stories.md` and `factory/feature.md` disagree, `factory/feature.md`
    wins.** That is a patch over the gap, not a fix. The fix is change 4 in `run-record.md`, which now
    has two instances instead of one.

15. **A price became a claim about the owner's money, and five files repeated it.** The owner found
    it on 2026-08-25, reading the PRD. `00-context-brief.md` §4 wrote "100,000 calls on Opus 5 is
    **$2,000**". As arithmetic that is right: 100,000 × $0.020. As a statement about risk it is
    wrong, because the API stops when the credit runs out. The owner cannot lose $2,000. Nobody can
    lose more than the balance.

    The brief itself got it right one paragraph later — *"what runs out is Anthropic credit, and that
    is still an outage"*. The **headline** is what travelled. `01-use-cases.md` UC-5, `02-decisions.md`
    D-05, `00-prd.md` G-2 and `01-user-stories.md` US-14 all repeated the $2,000, and three of them
    added the words "of the owner's credit", which the brief never said. Two roles and the assistant
    passed it on without checking. It is now removed everywhere.

    **No role could have caught this**, and that is the useful part. Not one of the eight is given
    the credit balance, so "is $2,000 a sum this owner can lose" is a question no reader of the file
    could answer. The fix is an input, not a prompt: the balance now sits in `factory/feature.md`
    with the rule **a price is what calls would cost, and it is not a bill**. See change 10 in
    `run-record.md`.

    A second thing fell out of it. **10 a day was never a budget guard.** 10 × 30 days is 300 calls,
    which is $6.00 on Opus 5 and $1.20 on Haiku 4.5. The daily limit stops a script; it does not keep
    spend inside the balance. What does that is the model choice plus a total cap, and no total cap
    exists. Recorded as gate 18, and **closed the same day: there will not be one.** The owner ruled
    that the balance reaching zero is the stop. That answer costs nothing to build and cannot drift
    out of date, which a chosen cap would. The work it creates is one failure state, not a budget
    system.

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

### 200-product, 2026-08-24

- Files hand-fed outside its `reads:` list: **none.** 200-product read exactly `factory/feature.md`,
  `00-context-brief.md`, `01-use-cases.md` and `03-market.md`. It did not read `02-decisions.md`,
  which is why finding 10 exists.
- It was told, in the dispatch and not in a file, three things about **how** to write: B1 English,
  the banned-word list, and that every file here is public so no decision may rest on the owner's
  career. None of those is a fact about the product. No number, no name and no decision was passed
  to it by hand.
- Slots that stopped: **none stopped dead.** 200 hit ten stop-and-ask conditions, wrote all ten into
  `00-prd.md` §8, and continued. Two are hard stops that block a story it had already written
  (US-08 and US-10), not the run.
- Slots re-run: none.

### A second hand edit to a role-owned file, 2026-08-24

`docs/100-consulting/00-context-brief.md` §4, hypothesis R2, was rephrased by the assistant after
200-product reported it as a contradiction. The old wording said R2 held "on any of the three models
except Opus 5" and then called Opus 5 "exactly at the edge". The new wording names Haiku 4.5 and
Sonnet 5, and says $10.00 is not under $10, so Opus 5 fails by the smallest margin there is. **No
price and no number changed.** Both figures were already in the file and both are still there. This
is the small-repair category proposed as change 5 in `run-record.md`, used before the rule exists in
the `ai-factory` repo. See finding 12.

### Five role-owned files edited by hand, 2026-08-25

All five carried the $2,000 figure from finding 15, and all five now say the same thing without it:
`00-context-brief.md` §4, `01-use-cases.md` UC-5, `02-decisions.md` D-05, `00-prd.md` §8 gate G-2 and
`01-user-stories.md` US-14. **Nothing was added.** A sentence that named a sum was replaced by one
that names the credit balance, which is the true limit, and no price, model or threshold moved.

Two more edits in `00-prd.md` §9, the same category. Item 1 (hypothesis R2) now records that it was
repaired on 2026-08-24 rather than describing an open contradiction. Item 5 claimed the brief gives a
career reason for the project. Every file under `docs/` was searched and the phrase is not there —
the only mention was that line. It is struck out and marked as a false report, per finding 12.

These are small repairs by the rule proposed as change 5. The alternative was two full role re-runs,
about 175,000 tokens, to delete one number.

### The gate answers were written back into 200's files by hand, 2026-08-25

This one is **not** a small repair. It adds numbers to files a role owns, which is the correction pass
proposed as change 4 in `run-record.md`, done by hand because the pass does not exist yet.

The owner answered all ten of 200's gates on 2026-08-24 and 2026-08-25. `02-traceability.md` and
`01-user-stories.md` were written before those answers and carried the gaps: six `<UNSET — G-n>`
markers in acceptance criteria, four `<UNSET>` thresholds in the metric table, a line saying "six of
these numbers do not exist yet", and a section 3.6 listing ten open gates. Every one has been filled
in from `factory/feature.md`, with the gate id and the date next to it so a reader can see the number
was answered rather than guessed. Section 3.6 is now a table of the ten answers.

**Nothing was invented.** Every value came from `factory/feature.md`, which is the file the owner
answered into. The one `<UNSET>` still standing is US-12 AC-4, how far back the admin figures reach —
no gate ever asked for it, and 180 days is proposed in the story to match the photo retention.

This is finding 14's fourth instance and the clearest one: a correct document became a wrong document
because its input changed, and no role failed. It is also the first time the gap was repaired instead
of being covered by the "`factory/feature.md` wins" rule, because 300 Design reads these two files
next and would have met `<UNSET>` in an acceptance criterion.
