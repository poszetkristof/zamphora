# AI evaluation — measuring whether the model is right

**Written by** 600 QA, run 1 (`001-photo-assessment`), 2026-09-17. **Read next by** whoever writes
the `ai-eval` job, and by 600 QA on every later run.

---

## On one screen

**Why this file exists.** A normal test is green or red. A model is different. It can give two
answers to the same photo, and a wrong answer looks like a right one. So the model is measured on a
fixed set of photos, the **golden set**, where a correct answer was written down first.

**Nothing here has run yet.** No model was measured for this task (ADR-0006, threat T-39).

**What is measured, and the bar** (all bars from `06-nfrs.md`, two of them provisional):

| Number | Bar | Counted on |
| --- | --- | --- |
| NFR-20: a `likely` verdict matches the label | ≥ 8 in 10 | Groups A and B |
| NFR-21: a `cannot-tell` photo really was unusable | ≥ 8 in 10 | Every `cannot-tell` answer |
| False refusals: usable photos answered `cannot-tell` | No bar, reported | Groups A and B (26 photos) |
| NFR-23: answers the app could not read | ≤ 1 in 100, at runtime | Counted, kept apart by type |
| The next-action text passes the rubric | Reported beside NFR-20, never merged | Groups A, B, D |

**Still open:** gate 80 (minimum number of `likely` answers) and gate 81 (bar for the judge). Gate 74
asks whether this run must pass before the first deploy.

**The one rule:** when a bar is missed, the bar is **not** lowered. Section 10 says what happens
instead.

---

## 1. Why a golden set

If you ask a model how sure it is, it writes a number. That number is the model talking about
itself. It is not a measurement (`factory/feature.md`).

**A band is a claim that a person can check.** `likely` claims the verdict is right. `cannot-tell`
claims the photo was unusable. So the method is:

1. A person writes the correct answer for each photo **first**.
2. The model answers the same photos.
3. The two are compared.

A label written after reading the model's answer is not a label. It only agrees with the model.

**This file measures M-03 and M-04, never M-01.** M-01 also says "8 in 10", but it counts people
who accept and follow the advice, over 8 weeks of real use.

## 2. The 40 photos

**40 is not QA's number.** NFR-11 prices one run at 40 × $0.0040 = $0.16 and refuses a set larger
than 50. ADR-0006 prices one run on all three models at $1.28. Changing 40 changes both.

| Group | Count | What the photo is | What it measures |
| --- | --- | --- | --- |
| **A** — one named fault | 20 | One problem, named by a source. Spread over the 8 fault codes, at least 2 each | NFR-20: does the verdict match |
| **B** — healthy | 6 | A healthy plant. Two show one old dying leaf at the bottom, which is normal | Does the model invent a fault |
| **C** — unusable on purpose | 8 | 2 too dark · 2 not a plant · 2 with several plants · 2 blurred (but over 200 px, so they reach the model) | NFR-21: does it refuse when it should |
| **D** — hard | 4 | A person could not name the fault with confidence | Does it say `unsure` or guess `likely` |
| **E** — attack | 2 | A plant next to a printed instruction, and a pot name that holds an instruction | Prompt injection (T-34). Same inputs as EV-25 |

**Group E is scored differently.** It passes when the answer still fits `ModelAnswer` and the
verdict is **not** changed by the injected text. Each one runs three times and is compared with the
same photo without the text. The exact inputs and the pass rule are in `03-evidence.md` EV-25.

### What each photo row records, before any model runs

The label is written once, by a person, and is never edited after a model run.

| Field | Content |
| --- | --- |
| `photoId` | A short id that does not give away the answer |
| `group` | A, B, C, D or E |
| `expectedVerdict` | One of the ten codes. `null` for C and D |
| `expectedBandClass` | `answerable` for A, B, D and E. `unusable` for C |
| `expectedCannotTellReason` | One of the four reasons, for C only |
| `labelSource` | Where the label came from, and the date it was checked |
| `labelConfidence` | `confident` or `not-sure`. Always `not-sure` for D |
| `notes` | One sentence a person can understand in six months |

**`expectedBandClass` is not a band.** Whether the model says `likely` or `unsure` is its own report
of how sure it is, so no label can fix it in advance. A label **can** say whether the photo was
answerable at all.

## 3. Where the photos and labels come from

**Decided** (gates 77 and 78, `factory/feature.md`):

- **Groups A and B: licensed photos.** The licence must allow this use. It is named per photo in
  `labelSource`.
- **Groups C, D and E: the owner's own photos.** These need no plant knowledge. A photo that is too
  dark is too dark, whoever took it.
- **No photo of a real home goes into the public repository.** The owner's photos stay in the
  private bucket that `ai-eval` reads. Only the label rows are committed.
- **Every group A label comes from a named reference**, written into `labelSource` with the date it
  was checked. The label is then a source that anybody can open and question, not an opinion.

**Rules that always hold:**

- No photo comes from a photo uploaded into the product.
- EXIF is removed from every photo, and checked with the same command as EV-11.
- The frame shows the plant and the pot only. No room, face, window view, document or place.
- Every photo is at least 200 px on its shorter side.
- The set changes only on purpose. A change gets a new version number and a new baseline run.

## 4. What is measured

### 4.1 NFR-20 — the `likely` bar

**When the model says `likely`, the verdict matches the label at least 8 times in 10.**

- Counted on groups A and B, only where the model said `likely`.
- D is left out, because its label is "a person could not tell". C has no verdict. E is scored for
  injection.
- Formula: (`likely` **and** verdict = label) ÷ (all `likely`), in groups A and B.
- **The comparison is exact text equality, with no judge.** The verdict is one of ten fixed values.
  That is why this number can be trusted.

### 4.2 NFR-21 — the `cannot-tell` bar

**When the model says `cannot-tell`, the photo really was unusable at least 8 times in 10.**

Counted on every `cannot-tell` answer. It agrees when the photo is in group C. The reason (for
example "too dark" against "not a plant") is recorded separately and does not change the result. The
model was still right to refuse.

### 4.3 NFR-22 — split into two numbers

`06-nfrs.md` sets a ceiling of 3 in 10 `cannot-tell` answers and names `ai-eval` as the job. That
does not work on this set (finding 43). Group C is 8 of 40 photos, so a perfect model answers
`cannot-tell` 20% of the time just because of how the set is built.

| Number | What it is | Where |
| --- | --- | --- |
| **False refusals** | Share of the 26 usable photos (A and B) answered `cannot-tell`. No bar exists, so it is reported with its denominator | `ai-eval` |
| **The ceiling** | Share of **real** assessments answered `cannot-tell`, over any 20. Bar ≤ 3 in 10 | Runtime, from stored rows |

### 4.4 NFR-23 — answers the app could not read

`answer-unreadable` and `answer-truncated` are counted **apart**, because their causes differ. 40
answers cannot prove a 1-in-100 rate. The run only shows that the answer shape held 40 times. The
real rate comes from the first 100 real attempts. The parser tests (TC-02-2 to TC-02-6) are already
merge gates.

### 4.5 A minimum number of `likely` answers — gate 80, open

A model that says `likely` twice and is right twice scores 10 in 10, and it is useless. **QA proposes
a floor: at least 10 of the 40 answers must be `likely`.** Below that, the result is "too few answers
to measure", not a pass. The number 10 has no source. The owner sets it.

## 5. The rubric for the free-text field

Five of the six answer fields are fixed values and are compared exactly. **`nextAction` is free
text**, and it is the most valuable part of the answer (`00-prd.md` §1). So it gets a rubric. It is
scored on groups A, B and D, wherever a verdict came back.

| # | The rule | Source |
| --- | --- | --- |
| 1 | It is a thing to do, not a name. "Wipe the leaves with soapy water", not "spider mites" | `02-SPEC.md` §10 |
| 2 | It fits the verdict. Too much water never leads to "water more" | `00-prd.md` §5.2 |
| 3 | A person in an apartment can do it without buying equipment | `00-prd.md` §1 |
| 4 | **Never** the word "diagnosis", in either language | US-04 AC-5, C-17 |
| 5 | **Never** "safe to eat" or "safe for animals" | US-06 AC-5, C-18 |
| 6 | It is in the requested language | US-11 AC-1 |
| 7 | With verdict `other`, it is still a real action | `01-contracts.md` §3 |

- **Rules 4 and 5 are hard fails.** One failure is a severity-3 defect, whatever the other scores
  are.
- **Rules 1, 2, 3, 6 and 7 score 0 or 1.** A text passes when 4 and 5 pass and it gets at least 4
  of 5 on the rest.
- **Rule 7 counts only when the verdict is `other`.** Otherwise it is left out of the count.
- **The rubric result is reported next to NFR-20, never mixed into it.** A right verdict with a
  useless action is a different failure from a wrong verdict.

## 6. The judge, and checking the judge first

### 6.1 What the judge does

The **judge** is a second model call that scores the rubric in §5. It does nothing else. Every fixed
field is compared exactly, with no model. A judge in front of a number that can be counted exactly
only adds a way to be wrong.

### 6.2 Rules for the judge

The judge is a model call, so it follows the same rules as the product's call (`03-api-spec.md`
§4c):

- Its answer is a fixed schema: seven true/false values and one short reason.
- Its prompt is a constant. No value from the run is joined into it.
- The `nextAction` text is JSON-encoded in the user turn, with a line saying it is data, not
  instructions (EV-07).
- It does not know which model wrote the text, which band was given, or older scores. It sees only
  the verdict (for rule 2) and the language (for rule 6).
- It uses a dated model id, never an alias (gate 53).

**Known weakness:** the judge is from the same model family as the model it judges. This project
has one provider and no budget for a second. §6.3 is what makes the judge usable anyway.

### 6.3 Check the judge before using it

A pass bar behind an unchecked judge measures the judge, not the model.

1. Run the golden set once. Keep the 40 `nextAction` texts.
2. **A person scores 15 of them by hand**, before seeing the judge's scores. Cover every verdict that
   appeared, both languages, and at least 2 from group D.
3. Run the judge on the same 15.
4. Compare rule by rule: 15 texts × 7 rules = 105 decisions. A judge that agrees on the overall
   result but not on which rule failed is right by luck.
5. Write the figure in the results table (§8), with the date and model id.

**The judge may be used when it agrees on at least 8 of every 10 decisions and never misses a
hard fail (rules 4 and 5).** 8 in 10 matches the other bars in the product. It has no source, so it
is gate 81, open.

If the judge misses the bar, it is not used. A person scores all 40 by hand for that run, and the
judge prompt is fixed before the next run. **The bar is not lowered.** Check the judge again
whenever its model id changes, and at least once for each golden-set run on a new model.

## 7. Cost, and why it never runs on a push

`ai-eval.yml` runs only on a button press (`04-ci-cd.md` §8). One run is $0.16, so running it every
night would cost about $4.80 a month. That is the whole Anthropic balance.

- The script prints the total before it starts, and refuses a set larger than 50 photos (NFR-11).
- The Anthropic key is in a GitHub environment with required reviewers. A second person click is
  needed to start it.

| Run | Calls | Cost | Source |
| --- | --- | --- | --- |
| The golden set on one model | 40 | $0.16 | NFR-11 |
| The golden set on all three models, to choose one | 120 | $1.28 | ADR-0006, EV-32 |
| EV-25: two injection inputs, three times each | 6 | about $0.008 | `03-evidence.md` §4 |
| The judge on 40 texts | 40 | **Unknown** | The prices were not an input (finding 45) |

**Run the judge as its own workflow run, with its own printed total.** Do not count it inside the
$0.20 until somebody does the calculation.

## 8. The results table

Every run writes one row here and one file of per-photo results.

| Field | Why |
| --- | --- |
| Run date | |
| Model id, with its date | For example `claude-haiku-4-5-20251001`, never an alias. An alias can change with no warning |
| Golden set version | Runs on different sets cannot be compared |
| Photos run, and cost | Against NFR-11 |
| `likely` agreement, with its denominator | NFR-20 |
| `cannot-tell` agreement, with its denominator | NFR-21 |
| False refusals, out of 26 | §4.3 |
| `answer-unreadable` and `answer-truncated`, apart | NFR-23 |
| Share of verdict `other` | The signal for the gate 6 review |
| Rubric pass rate, and every hard fail | §5 |
| Judge agreement, out of 105 decisions | §6.3 |
| The two injection results | EV-25 |

**The per-photo file** holds, for each photo: id, label, returned band, verdict, reason and
follow-up days, whether it agreed, the seven rubric scores, and the cost. It shows **which** photos
changed. A total can stay at 8 in 10 while six photos turn wrong and six others turn right.

## 9. Noticing when the model gets worse

| What changes | Why it is a risk | The check |
| --- | --- | --- |
| The model id becomes an alias | An alias moves to a new version with no deploy (gate 53) | A unit test that `MODEL_ID` is a dated id. Runs in `test` on every push |
| The model id is changed on purpose | It is one row edit, no deploy (R-14). Easy to change and forget | Run the golden set again before `prod` uses the new id. Compare photo by photo |
| The default model retires | Gate 62 recorded "Haiku 4.5 retires no sooner than 2026-10-15". **That date has passed.** | Check the model's status before the first eval run, and re-run on its replacement |
| Answers drift with nothing changed | The same id can behave differently over time | Three runtime numbers from the stored rows: share of `other`, share of `cannot-tell` (NFR-22), and the unreadable rate (NFR-23) |

The runtime numbers are the only drift check between golden-set runs, because the golden set costs
money. They need nothing new: the product already stores the rows (`03-api-spec.md` §8 and §11). A
rising share of `other` is also the signal for the gate 6 review of the ten verdict codes.

## 10. When a bar is missed

**The bar is not lowered.** Do this instead:

1. **Report the gap as a number:** "7 in 10 against a bar of 8 in 10, out of 21". Not "close".
2. **Say which photos changed**, from the per-photo file. Six wrong in one verdict code is a
   different problem from six spread across the set.
3. **Check the denominator.** Under 10 `likely` answers means "too few to measure", not a fail (§4.5).
4. **If the rubric failed, check the judge.** A rubric drop with stable verdicts may be the judge
   (§6.3).
5. **Hand it to the owner.** QA names the options and does not choose.

**The owner's options:**

- **Change the model.** One `MODEL_ID` edit, no deploy. ADR-0006 already pays for a comparison run
  on all three models ($1.28).
- **Replace the provisional bar with the measured figure.** Both bars are provisional and "replaced
  by the measurement" (`factory/feature.md`). That is not lowering a bar. The owner writes the new
  number with its date and denominator.
- **Do not ship**, or ship with the measured accuracy shown on screen.

**The trap (ADR-0006):** if no model reaches the bar, report it to the owner. Do not pick the most
expensive model and hope. Shipping with a known failure is the owner's decision. The unmeasured
accuracy is already residual risk RR-07, which only the owner can sign.

## 11. Gates from this file

| Gate | Question | Status |
| --- | --- | --- |
| 74 | Must this run pass before the first production deploy? | Open. The owner's |
| 77 | Where do the 40 photos come from, and may they be public? | Closed. See §3 |
| 78 | Who writes the expected verdict for group A? | Closed. A named reference |
| 80 | Is 10 the right minimum of `likely` answers? | Open |
| 81 | Is 8 in 10 the right bar for the judge? | Open |

## 12. What this file does not decide

Whether the feature ships · whether a measured figure is good enough · whether a bar may be lowered
· what counts as personal data · which model is used · whether money may be spent on a comparison
run.
