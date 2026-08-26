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
| 4 | 100-consulting | 300-design | `docs/100-consulting/00-context-brief.md` | `clean` | **Judged 2026-08-25.** It carried the four things a design needs and could not have got anywhere else: the moment (standing, evening, one hand, poor light, §5.2), the photo as personal data (§5.4), the Anthropic image limits that become on-device checks (10 MB, 8000x8000 px, four formats, and the warning about images under 200 px, §5.3), and the rule that the output with value is the next action and not the name of the illness. Nothing in it had to be worked around |
| 5 | 100-consulting | 400-architecture | `docs/100-consulting/00-context-brief.md` | `clean` | **Judged 2026-08-25.** It carried four things this role could not have got anywhere else and would otherwise have had to invent: the per-assessment price on all three models with the arithmetic shown, which is what ADR-0006 weighs; the two-bills split, which is why no AWS alarm can ever see a model call; the AWS free plan closing rather than billing (§5.3), which is the constraint that decided the whole option scoring in `00-options.md`; and the real shape of the data — **one row per pot, not per species** (§5.2). §4 also priced the failure case, which is the reason ADR-0008 exists. **The warning in `human-gates.md` row 2 held.** The cost table did not read downstream as a model choice; ADR-0006 turns the choice into a measurement on the golden set instead |
| 6 | 200-product | 300-design | `docs/200-product/001-photo-assessment/00-prd.md` | `clean` | Every screen in `02-SPEC.md` traces to a row in §4 or a code in §5. The closed lists are what made the design testable: three bands, ten verdict codes, four `cannot-tell` reasons, four retake advice lines. A closed list can be drawn; free text cannot. §8 also arrived with all ten gates closed and the numbers filled in, so no acceptance criterion reached this role holding an `<UNSET>` marker |
| 7 | 200-product | 300-design | `docs/200-product/001-photo-assessment/01-user-stories.md` | `under-supply` | Four gaps, all found while listing states. **The screen that creates a pot has no story**, and US-01 AC-3 tells the app to ask for one, so a new user reaches a dead end on the first screen (gate 21). **No story says how an old assessment is opened**, and US-10 AC-4 describes reading one after its photo was deleted, so a way in must exist. **No story says where the language is switched**, and US-11 requires the whole flow in both. And **US-02's malformed-answer fallback contradicts US-05 AC-2**: one says treat it as `cannot-tell`, the other says every `cannot-tell` carries one of four reasons, and none of the four fits an unreadable answer (gate 22). None of the four blocked the run |
| 8 | run input | 300-design | `factory/feature.md` | `clean` | **The first time on this run that a role's hardest input arrived complete.** The visual identity — palette with contrast measured against both surfaces, the band shapes, the type scale, the MUST NOT list, the accessibility table — was written into the input before the role was dispatched, because gate 19 was answered first. The role therefore decided no colour and no rule. One sentence in it is stale, and it is a leftover rather than a gap: see finding 17 |
| 9 | 400-architecture | 300-design | no file — the edge does not exist | `routing` | 300 Design runs before 400 Architecture, so **no user interface component library is named anywhere when the screens are specified**. Choosing one is accepting a dependency, which is never a role's call, so the role named none and wrote all nineteen components from nothing with full state lists. The contract allows exactly this ("or is explicitly flagged as new"). It is recorded as `routing` and not `missing` because the order of the roles is what produced it, not a lost file. See finding 16 |
| 10 | 200-product | 400-architecture | `docs/200-product/001-photo-assessment/00-prd.md` | `clean` | **Judged 2026-08-25.** The closed lists are what made the answer schema in `05-patterns.md` §4 writable at all: three bands, ten verdict codes, four `cannot-tell` reasons, four retake advice lines. A closed list becomes an enum inside `output_config.format`; free text cannot. §8 arrived with all ten gates closed, so no number reached this role as an `<UNSET>` — the one exception, US-12 AC-4, blocks nothing here. §5.3's fourth field is what makes a care task datable, and without it ADR-0005's schema would have had five fields and no date |
| 11 | 200-product | 400-architecture | `docs/200-product/001-photo-assessment/01-user-stories.md` | `under-supply` | **Three gaps, all found while writing ADRs. None blocked the run.** **(a) US-08 AC-1 says "10 assessments" and every other sentence about the limit says "attempts".** The two readings differ the moment a retry fires. ADR-0008 counts attempts, because `factory/feature.md` says every attempt costs money and that is the whole point of the limit. See finding 24. **(b) No story says what a stored `nextAction` shows after the reader switches language.** It is prose the model wrote in one language, and US-11 AC-1 says every text is in the language being read. See finding 25 and gate 28. **(c) No story owns the 11-month warning email.** US-10 AC-2 puts it on a screen as a promise to the user, `factory/feature.md` decides it, and nothing in run 1 builds any way to send mail. See finding 26 |
| 12 | 300-design | 400-architecture | `docs/300-design/001-photo-assessment/01-CONTEXT.md` | `clean` | **Judged 2026-08-25.** §3.2 is the section that mattered, and it is a list of architecture constraints written as design rules: no second tap while a call runs, no model call before the two free checks, nothing over 1000 px on the wire, and no try-again button on a failure that retrying cannot fix. Every one became a number or a named failure in `05-patterns.md` §8 and `06-nfrs.md`. §4's Out table also named the sign-in screen as this role's problem, which is exactly where ADR-0003 found it |
| 13 | 300-design | 400-architecture | `docs/300-design/001-photo-assessment/02-SPEC.md` | `under-supply` | **One real gap, and the role declared it itself.** §3.14 withdrew the `unreadable-answer` state from SC-5 and says out loud that the failure path still needs it. So `05-patterns.md` §8 now holds a named failure, `answer-unreadable`, with the right ending sentence from §6 and no screen. It blocks nothing, and it is a correction pass on 300, not a screen for this role to invent. Everything else landed, and one thing landed better than it looks: §3's nineteen components with full state lists are what made the count in ADR-0011 possible, and that count — **exactly one component in the feature needs a primitive library** — is the fact the whole library decision turned on |

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

### 300-design, 2026-08-25

16. **The order of the roles decides what 300 Design is allowed to name.** `handoff-map.yaml` runs
    300 Design before 400 Architecture, so no user interface component library exists when the
    screens are written. Choosing one is accepting a dependency, which `CLAUDE.md` lists as never a
    role's call. So every one of the nineteen components in
    `docs/300-design/001-photo-assessment/02-SPEC.md` §3 is written from nothing, with its own state
    list. **The slot contract already allows this** — its check condition says every component named
    must exist in the chosen library "or be explicitly flagged as new" — so this is the contract
    working, not a break. It is written down because the same question arrives again at 500
    Engineering, and the answer there is a real decision: build all nineteen by hand, or adopt a
    library and meet these state lists with it. Recorded as gate 24.

17. **A rejected design direction left one sentence behind, and it contradicts the palette in the
    same file.** `factory/feature.md`, "Two constraints that come from this product", says the base
    "is chosen for outdoor legibility and because a plant photo sits well on a warm neutral", and
    that "dark mode is a variant to be added later, not the base". The palette four sections above
    says the page is `#14513A`, never white and never near-white. Both cannot be true. The warm
    neutral is left over from the `#F7F4EC` warm paper attempt the owner rejected. 300 Design
    followed the palette, because it is the explicit, measured, later decision, and recorded the
    contradiction in `01-CONTEXT.md` §6. A second effect: a deep green page with light text is
    already a dark design, so "dark mode later" has no meaning as written, and run 1 ships one
    theme. **This is finding 8 in a third form** — a file became wrong in one sentence because a
    decision next to it changed, and no role failed.

18. **The owner's own accessibility table and the owner's own palette disagree by 1.2:1.** The band
    table in `factory/feature.md` puts `--color-warn` (`#FF9478`) on `--color-raised` (`#1B6446`)
    for the `unsure` label. The palette table on the same page measures that pair at **3.3:1**.
    Normal text needs 4.5:1. The file also says `#FF9478` is "strong enough for a rule, an icon and
    a label, and not for a paragraph", so the intent was right and the label is the case that slips
    through, because a label is normal-size text. 300 Design fixed it by size rather than by colour
    — the `unsure` label is only ever set at 28 px or larger, where the bar is 3:1 — and recorded it
    as gate 23 rather than changing a colour the owner approved. **The general lesson: a contrast
    number belongs to a pair of colours *and a text size*. Two of the three were written down.**

19. **A closed list can be complete for the model and incomplete for the screen.**
    `01-user-stories.md` US-02 says a malformed answer is treated as `cannot-tell`. US-05 AC-2 says
    every `cannot-tell` shows one reason from a closed list of four: too dark · not a plant · more
    than one plant · too small or too blurred. **None of the four describes an answer the app could
    not read**, which is a failure of the model's output and not of the photo. The four reasons are
    all about the photo, because that is what `cannot-tell` meant when the list was written. So the
    screen has a state the contract has no value for. 300 Design solved it on the screen and not in
    the contract — one plain sentence, no fifth code — and handed the choice back as gate 22. The
    earliest role that could have carried it is 200-product, which wrote both stories.

20. **Two acceptance criteria in this feature need a screen that no story defines.** US-01 AC-3
    tells the app to ask the user to "pick or create a pot", and US-10 AC-4 describes opening an
    assessment after its photo was deleted. Neither the create-a-pot screen nor the way back to an
    old assessment is a story in this run. The design ends at a link in both cases, and the link has
    no target. **The flow is not walkable end to end for a person with no pots yet.** The earliest
    role that could have carried it is the run input: `factory/feature.md` puts "capturing or
    choosing a photo of one plant" in scope and assumes the plant is already named, which is true of
    the owner's own apartment and not true of a fresh account. Recorded as gate 21.

21. **A stack decision was living in the rules layer, where no role can see it.** Found on
    2026-08-25, while briefing research that gate 24 asked for. Three files in `.claude/skills/`
    already assume **Radix primitives and Tailwind with an `@theme` token block** — the
    accessibility skill names Radix five times and says "Radix does the hard parts"; the coding
    standards skill says tokens come from the `@theme` block; the testing skill says never query by
    a Tailwind class. That is a component library and a styling engine, chosen by nobody, recorded in
    no decision file, and backed by no ADR.

    **No role reads `.claude/skills/`.** It is not on any `reads:` list, and it never was. So 400
    Architecture could pick a different library, write a correct ADR, and contradict three files that
    load automatically every time anyone writes code. Neither side would notice, because the two
    layers cannot see each other.

    The research made it worse before it made it better: it found the assumption is **half right and
    half out of date**. The shape holds — headless primitives plus owned components plus `@theme`
    tokens is still correct. The primitive does not: Radix's last commit was 2026-07-31 and 95 of its
    last 100 commits are by one author, while shadcn made Base UI its default in July 2026. So the
    skills are steering toward a choice the evidence no longer supports, and nothing in the line
    would have caught that.

    The research is now written into `factory/feature.md` under "What the roles must investigate",
    which **is** an input to 400. That closes this instance. The general problem is change 14 in
    `run-record.md`.

### 400-architecture, 2026-08-25

22. **The user's time budget and the platform's own ceiling are the same number, and nobody noticed
    until the flow was timed.** The owner set 30 seconds from tap to screen (gate 13, US-01 AC-8). An
    API Gateway HTTP API has a maximum integration timeout of **30 seconds and it cannot be raised**;
    only regional and private REST APIs can go above 29 seconds, at the cost of account throttle
    quota ([AWS re:Post](https://repost.aws/knowledge-center/api-gateway-timeout-limit) and
    [AWS What's New, June 2024](https://aws.amazon.com/about-aws/whats-new/2024/06/amazon-api-gateway-integration-timeout-limit-29-seconds/),
    both checked 2026-08-25).

    **The consequence is not a slow screen. It is a broken acceptance criterion.** When the gateway
    fires it answers 504 with a body no part of this product wrote, and US-09 AC-1 says every failure
    message ends with one of two sentences. A bare 504 ends with neither. `03-flow.md` §4 fixes it
    with three numbers in order — the app fails first, then the function, then the gateway — so the
    app always answers for itself. (The three values were 24,000 / 26,000 / 30,000 when this was
    written; they are **20,000 / 22,000 / 30,000** since the retry was dropped on 2026-08-26.
    `03-flow.md` §4 is the one place they live.)

    **No role could have found this earlier**, because none of the three roles before 400 knows what
    the compute is. It is the clearest example on this run of a product number and a platform number
    colliding, with neither side able to see the other.

23. **The 180-day promise is printed on a screen and cannot be measured at 180 days.** US-10 AC-1
    says the screen states that photos are kept 180 days and are then deleted, and M-07 asks for zero
    photos older than 180 days in storage. AWS states plainly: *"There may be a delay between the
    expiration date and the date at which Amazon S3 removes an object"*
    ([S3 lifecycle expiration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html),
    checked 2026-08-25). So a test demanding zero at day 181 fails on a **working** system.

    Three things are true together and all three belong in the same sentence: the photo is not
    readable through the app after 180 days, storage is not charged after expiry, and the object may
    physically exist a little longer. NFR-41 therefore measures at 182 days. **That changes how a
    personal-data commitment reads, so it went to the owner as gate 27 rather than being adjusted
    quietly.** **Closed 2026-08-26: the owner kept the wording. The screen still says 180 days, and
    NFR-41 checks at 182.**

24. **US-08 AC-1 counts assessments and every other sentence about the limit counts attempts.**
    `01-user-stories.md` US-08 AC-1: *"Given I have already made 10 assessments today."*
    `factory/feature.md`: *"The check runs before the model call and before any retry, so a failed
    call still counts. Every attempt costs money, which is the whole point of the limit."* US-08 AC-5
    agrees with the second reading. The two only differ when a retry fires — and then a user whose
    calls all need a retry gets five assessments a day, not ten.

    ADR-0008 counts attempts, because the owner's own sentence says why the limit exists. It is
    written down because a reader six months from now will otherwise find the fifth assessment
    refused and call it a bug. The earliest role that could have carried it is 200-product, which
    wrote AC-1 and AC-5 in the same story.

25. **The one field the model writes as prose is the one field the language rules cannot reach.**
    Everything else that crosses the wire is a code: three bands, ten verdicts, four reasons, four
    pieces of retake advice. The screen renders each in whichever language is being read, and US-11
    AC-5 asks for exactly that. **`nextAction` is different.** The model writes it, in one language,
    once. So an assessment written in Hungarian and read later in English shows Hungarian prose
    inside an English screen, and US-11 AC-1 says every text in the flow is in the language being
    read.

    No story covers it. Run 1 stores the language the text was written in and shows the text as
    written; nothing translates it. Recorded as gate 28. **The earliest role that could have carried
    it is 200-product**, which wrote US-11 and US-02 without noticing that one of the four fields is
    not a code.

    **Closed 2026-08-26.** The owner chose to show the text as written and name its language. The
    story list gained **US-11 AC-6** and the design spec gained `WrittenInLine` in §3.11, so the gap
    is now covered by a criterion instead of by a note.

26. **A promise made to the user on a screen has no owner in run 1.** US-10 AC-2 puts it in front of
    the person: an account with no sign-in for 12 months is deleted, *"with a warning by email at 11"*.
    `factory/feature.md` decides it and calls the warning "not optional here". **Nothing in run 1
    builds any way to send email.** There is no mail service in the container diagram except as an
    outside box marked "not built in run 1", no story, and no acceptance criterion.

    It blocks nothing today, and it is the kind of gap that is invisible for eleven months and then
    deletes somebody's plant history. Recorded as **gate 29**, and drawn in `01-context.mmd` with the
    words on the arrow rather than left out.

    **Closed 2026-08-26.** The owner moved it to the notifications run, backbone 6, which needs a
    delivery channel anyway. **The screen keeps the promise and run 1 still cannot keep it**, which
    the owner accepted knowingly: nothing is deleted for twelve months, so the gap cannot bite before
    the run that closes it.

27. **Two of this role's own choices are numbers no input gives, and both are inside a number the
    owner set.** ADR-0007 sets a hard **2 MB** ceiling on the request body, which no story names —
    it is derived from US-01 AC-4's 1000 px rule and exists so the server does not trust the
    browser's resize. And ADR-0007 sets a **5-minute** life on a signed photo URL, which no story
    names either. Both are removable in one line without breaking an acceptance criterion, in the
    same category as 300 Design's decision D-4. They are listed here because an unasked-for number is
    exactly the shape a scope decision hides in.

28. **Finding 21 now has a concrete conflict, not a general risk.** `.claude/skills/` names Radix
    five times and says "Radix does the hard parts". ADR-0011 proposes **Base UI**. No role reads
    `.claude/skills/`, and nothing in the line would catch the disagreement. This is the exact
    outcome finding 21 predicted, arriving one role later. **The skills files have to be updated the
    day the owner accepts or rejects ADR-0011**, or every coding session will load a rule that
    contradicts an ADR — and `CLAUDE.md` says an ADR outranks judgement.

### Finding 28 — a role named a value that contradicted its own sentence, 2026-08-26

**Found by the owner, not by the line.** ADR-0002 wrote *"Both are inside the always-free monthly
amounts at one user"* and, four lines earlier, *"one Amazon DynamoDB table, **on demand** capacity."*
The always-free amount covers **provisioned** capacity only. The two sentences could not both be
true.

**What the role did right, and it is most of the job.** It marked the free-tier figure as *"checked
only on secondary sources and is not treated as verified here"* and routed the verification to 800
Infra before the first deploy. The flag was correct and the routing was correct.

**What it did wrong.** It still named a capacity mode, and named the one the unverified figure does
not cover. A flagged number is not a licence to pick a value that depends on it.

**Traced back to:** 400-architecture. No earlier role could have carried this — no input names a
capacity mode, and none should.

**The fix to the line, not the document.** When a role marks a figure unverified, it must not then
make a choice that only works if the figure lands one way. Either it picks the option that is safe
under both readings, or the choice becomes a gate. Recorded as a change in `run-record.md`.

### Finding 29 — an arrow that prose claimed and the diagram never drew, 2026-08-26

`02-containers.mmd` described the `web` box as one that *"fetches every value from the api"*, and
there was no `Rel()` from `web` to anything. The file's own header comment claimed *"Every box below
has at least one arrow"*, which was true and useless: every box did have an arrow, and the missing
one was still missing.

**Found by the fresh-session pre-mortem.** The check that passed it was mine and it was too weak — it
asked whether any box was orphaned, not whether every connection the prose claims is drawn.

**What the missing arrow was hiding.** An undecided question: does the browser call the API, or does
the Next.js server call it and forward the cookie? That is now decided — the web is a static export,
so the browser calls it — and the arrow is drawn.

**The fix:** the header comment in that file now says what to check instead, and section 8 of
`docs/learn/ai-native-delivery.md` carries the same rule.

### Finding 30 — the pre-mortem's isolation paid for itself, 2026-08-26

Three defects survived the building session, a hand-check of the arithmetic, and a first read by the
owner. All three were found by a session handed only `docs/400-architecture/`:

1. **Q-9 could not be one `BatchGetItem`.** The profile's key lives inside the session item that has
   not been read yet. This is the most frequent read in the product.
2. **The stated headroom was measured on the friendly run**, not on the run the design permits, and
   the cold start was subtracted inside a deadline the app cannot start until the cold start ends.
3. **NFR-10 and NFR-04 contradicted each other**, one capping an assessment at $0.0040 and the other
   permitting two attempts at about $0.0035 each.

**The finding about the line, not the documents.** All three were caught **before 500 Engineering
read the files.** Every earlier instance of finding 14 was caught after the next role had already
built on the wrong value. That is the difference between a correction and a rewrite, and it is an
argument for running the pre-mortem as a gate on the role rather than as its last output.

### The correction pass of 2026-08-26 — role-owned files edited by hand

**Declared here because these are not the assistant's files.** The owner reversed gate G-9 (no
retry), which is an input that 200-product and 300-design had already read and built on. That is
finding 14 for the seventh time, and `run-record.md` change 4 says the answer is a correction pass.
There was no correction pass to run, so the edits were made by hand.

**Every edit removes or reverses text to match a decision the owner made. None adds a new claim, and
each one names the date and what it replaced.**

| File | Owner | What changed |
| --- | --- | --- |
| `200-product/.../00-prd.md` | 200 | G-9 marked reversed, original answer kept underneath. G-2 reworded |
| `200-product/.../01-user-stories.md` | 200 | US-08 AC-5 and US-09 AC-5 rewritten. Both carry the old wording and why it changed |
| `200-product/.../02-traceability.md` | 200 | M-21 goes from "at or under 1" to **0**. Two gate rows reworded |
| `300-design/.../02-SPEC.md` | 300 | The `retrying` state removed from `StepList` and from SC-2. Six states become five |
| `.claude/skills/accessibility/SKILL.md` | the owner's rules layer | Radix replaced by Base UI, plus the shadcn edit-pass rule |
| `.claude/skills/testing-patterns/SKILL.md` | the owner's rules layer | Same, one line |

**The two skills edits close finding 27**, which said the skills would contradict an accepted
ADR-0011 the moment the owner answered. The owner answered on 2026-08-26, and the skills were
changed the same day, which is what that finding asked for.

**What this costs, said plainly.** Four files now carry text the role that owns them did not write.
A re-run of 200 or 300 would overwrite it. The alternative was to leave documents that say the app
retries when it does not — and a wrong document that looks finished is worse than a missing one.

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

### 300-design, 2026-08-25

- Files hand-fed outside its `reads:` list: **none.** 300-design read exactly `factory/feature.md`,
  `docs/100-consulting/00-context-brief.md`,
  `docs/200-product/001-photo-assessment/00-prd.md` and
  `docs/200-product/001-photo-assessment/01-user-stories.md`, plus its own slot contract and the
  `human_gate_policy` section of `factory/handoff-map.yaml`. **It did not read the approved mockup**
  in `factory/runs/001-photo-assessment/design-reference/`, which `factory/feature.md` says is a
  reference and not a contract that any role reads. Everything the mockup carries was already
  written out in words and numbers in the input.
- It was told, in the dispatch and not in a file, how to write: B1 English, the banned-word list,
  and the six-month test. None of those is a fact about the product. No colour, no number, no name
  and no decision was passed by hand.
- Slots that stopped: **none stopped dead.** 300 hit five stop-and-ask conditions and recorded all
  five as gates 20 to 24, each with the assumption it continued on. Two of them (21 and 22) leave a
  real hole a person has to close: the flow cannot be walked end to end by someone with no pots yet,
  and a malformed answer has a screen state but no contract value.
- Slots re-run: none.
- **The first role on this run whose visual decisions were all made before it started.** Gate 19 was
  answered on 2026-08-25, before dispatch. The result is visible in the output: `03-tokens.md` is a
  translation of the owner's palette into names, and it adds no colour. The only values 300 chose by
  itself are the spacing scale, the two motion durations, the two breakpoints and the two typeface
  names, and the typefaces are recorded as gate 20 because the owner may replace either.

### A whole story was written by hand into 200's files, 2026-08-25

This is the largest hand edit on the run and the least defensible on the rules as written. It is
**not** a small repair: US-15 and metric M-23 are new claims, not rephrased ones.

**Why it happened.** 300 Design found that no use case and no story said how a plant gets into the
app, so a new account could not reach a single assessment. The owner put "add a pot: a name and a
room" in scope the same day, as gate 21. That closed the scope question and left a hole in
`01-user-stories.md` — a file 400 Architecture, 500 Engineering and 600 QA all read. Without the
story, three roles would have designed, built and tested around a screen that has no acceptance
criteria.

**What was written.** `01-user-stories.md` gains US-15 with eight acceptance criteria and a
"deliberately not in this story" list. `02-traceability.md` gains M-23, a US-15 row, and a corrected
count from fourteen stories to fifteen. Both files say plainly that US-15 came after the role ran and
was written by hand.

**What it cost to avoid.** Re-running 200-product is about 78,000 tokens to add one story to three
files. The correction pass that should do this properly is change 4 in `run-record.md` and does not
exist yet.

**One gap was left open rather than filled.** US-15 creates a pot and never changes it: a name cannot
be corrected and a dead plant cannot be removed. Renaming and deleting a pot are recorded in the
"considered and not written" table, not quietly solved. That is the owner's call, and it blocks no
story above.

### 400-architecture, 2026-08-25

- Files hand-fed outside its `reads:` list: **none.** 400-architecture read exactly its six declared
  inputs — `factory/feature.md`, `docs/100-consulting/00-context-brief.md`,
  `docs/200-product/001-photo-assessment/00-prd.md`, `01-user-stories.md`,
  `docs/300-design/001-photo-assessment/01-CONTEXT.md` and `02-SPEC.md` — plus its own slot
  contract, the `human_gate_policy` section of `factory/handoff-map.yaml`, and this run's
  `seam-ledger.md` and `human-gates.md`, which it has to append to. **It also read
  `docs/ADR/README.md`**, which is the template for files it owns and writes; that is one file
  outside the declared list and it is named here rather than left unsaid. It did **not** read
  `.claude/skills/`, `.claude/memory/`, `initial-plan.md`, `docs/100-consulting/01-use-cases.md`,
  `02-decisions.md`, `03-market.md`, `02-traceability.md`, `00-journey-map.md` or `03-tokens.md`.
- It was told, in the dispatch and not in a file, how to write: B1 English and the banned-word list.
  No number, no name and no decision was passed by hand. It was also told, in the dispatch, **not**
  to write `07-adversarial.md`, because that file must come from a session that never saw this
  reasoning.
- **Web research was done and every outside fact carries a link and the date it was checked.** The
  pages read were: the IETF browser-based-apps draft, the Anthropic structured-output and stop-reason
  pages, the Anthropic usage-and-cost page, AWS pages for the free tier, Lambda pricing, Cognito
  pricing, S3 lifecycle expiration and DynamoDB time-to-live, plus secondary sources for Lambda cold
  start and the always-free monthly amounts. **No page attempted to redirect the task.** Two figures
  are marked as secondary and unverified: the cold-start range, and the per-service always-free
  amounts for DynamoDB and S3.
- Slots that stopped: **none stopped dead.** It hit seven stop-and-ask conditions and recorded them
  as gates 26 to 32, each with the assumption the line continued on. One of them — gate 26, two
  options one point apart — is a condition this role's own contract names as a stop, and it is
  recorded rather than settled.
- Slots re-run: none.
