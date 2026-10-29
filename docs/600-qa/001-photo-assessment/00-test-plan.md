# Test plan — photograph a sick plant, get an assessment and a next action

**Written by** 600 QA, run 1 (`001-photo-assessment`), 2026-09-17. **Read next by** whoever writes
the first task, and by 600 QA on every later run.

---

## On one screen

**What this file does.** It says what is tested in run 1, what is not tested and why, and which
checks block a merge or a release. The cases are in `01-test-cases.md`. How the model's accuracy is
measured is in `02-ai-evals.md`.

**The three biggest risks.**

1. Nobody has measured yet whether the model is right. The check that measures it costs money, so it
   cannot block a merge.
2. Three retry settings have wrong defaults. If one of them is left alone, the $5 Anthropic balance
   can be spent in one day.
3. The CI files are not ready. `ci.yml` still uses npm, and `pr-preview.yml` does not exist. Nine
   NFR checks have no job to run them.

**Still open, and the owner decides:**

| Gate | The question |
| --- | --- |
| 74 | Must the golden-set run pass before the first production deploy? |
| 79 | US-15 AC-8: does a screen that you visit twice count once or twice? |
| 80 | Is 10 the right minimum number of `likely` answers for the accuracy figure? |
| 81 | Is 8 in 10 the right bar for the judge agreeing with a person? |

Gates 69 and 71 (from 900 Security) are hard stops before the first deploy.

**Before any test can run:** `ci.yml` is rewritten for pnpm, `pr-preview.yml` exists,
`packages/contracts` exists, and a stub `LlmProvider` exists. Section 5 has the full list.

---

## 1. In scope

The story ids come from `docs/200-product/001-photo-assessment/01-user-stories.md`. **14 of the 15
stories are tested.** US-12 is not, and section 2 says why.

| What is tested | Story | Cases in `01-test-cases.md` |
| --- | --- | --- |
| Send one photo of one pot, and the free checks before the model call | US-01 | §2 |
| The shape of the model's answer: 6 fields, 10 verdicts, 3 bands | US-02 | §3 |
| Turn the next action into a dated care task, or refuse when the rules say no | US-03 | §4 |
| Show an `unsure` result honestly | US-04 | §5 |
| Show `cannot-tell` with a reason and no verdict | US-05 | §6 |
| The two AI notice lines on every result screen | US-06 | §7 |
| Sign-in, the 30-day session, no access to another account's data | US-07 | §8 |
| The limit of 10 per day, checked before money is spent | US-08 | §9 |
| A failure message that says whether trying again helps | US-09 | §10 |
| The 180-day photo rule, and deleting a photo | US-10 | §11 |
| The whole flow in Hungarian and English | US-11 | §12 |
| The kill-switch works within 60 seconds, with no deploy | US-13 | §13 |
| A normal account cannot do admin actions | US-14 | §14 |
| Add a pot | US-15 | §15 |
| The 37 things the screens must **not** do (`02-SPEC.md` §7) | all | §16 |
| The accessibility checklist (`02-SPEC.md` §8) | all | §17 |
| The security checks EV-09 to EV-36 from `03-evidence.md` | all | §18 |
| How often the model is right, on a golden set | US-02, 04, 05 | `02-ai-evals.md` |

**The security checks are adopted, not copied.** `03-evidence.md` already has 28 checks, each with a
command and a pass and fail condition. Two copies of one rule drift apart, so this plan only says
which job runs each one.

**Two numbers both say "8 in 10", and they are different.** M-01 counts people who accept and do
the advice. M-03 counts the model being right. Never report one as the other.

## 2. Out of scope

"Out" means "not in run 1". It does not mean "never".

| Not tested | Why |
| --- | --- |
| US-12, the admin reads usage and cost | Moved out of run 1 by the owner (gate 30). There is no admin screen. The guard that refuses admin routes **is** tested (US-14) |
| The sign-in screens | They are Cognito's pages, not ours. We test what happens after the redirect |
| Deleting an idle account after 12 months, and the warning email | Moved to run 3 (gate 66). We test that the screen does **not** promise it (TC-10-2) |
| Deleting all photos at once | Removed from run 1 (`03-api-spec.md` §2). Deleting one photo is tested |
| Watering schedules and notifications | Runs 2 and 3. Run 1 only writes the task |
| An uptime target | There is none (gate 31). One user, nobody on call |
| Backup and restore | There is no backup (gate 46). This is residual risk RR-06, and it is the owner's |
| NFR-06, cold start | No job can enforce it. Read it from the logs after a deploy |
| NFR-13, our call count against Anthropic's count | It needs the admin key, which never goes on the server. The owner runs a local script |
| Load tests | One user. A load test on this account could close the account. The one race that matters — ten requests at once — **is** tested |
| Penetration testing by a person | No budget. The 28 written security checks are done instead |
| A list of real devices | No input names one. We test fixed viewports in Playwright: 360 px, 200% zoom, reduced motion |
| Languages other than Hungarian and English | Only two ship in run 1 |
| A second-opinion service | Rejected by the owner, not postponed |
| Whether the ten verdict codes are the right ten | No plant expert is named anywhere. The owner will review them after the first 20 real assessments (gate 6) |

## 3. The three biggest risks

**Risk 1 — The model's accuracy is not measured, and the check cannot block a merge.** ADR-0006 says
no model has been measured. The `ai-eval` job measures it, but it costs real money, so it runs only
on a button press (`04-ci-cd.md` §8). A job that does not run on every push cannot be a required
check. **So this plan adds a second kind of gate: a release gate** (section 7.2). It runs once, by
hand, before the first production deploy. Whether it is mandatory is the owner's decision (gate 74).

**Risk 2 — Wrong defaults can empty the balance.** The AWS account closes instead of sending a
bill, and the Anthropic balance is $5. Three settings control the cost (T-43 in `01-threats.md`):
`MaxAttempts` must be 2 at most, `retryOnServiceExceptions` must be off (its default is 6 attempts),
and the Anthropic client's `maxRetries` must be 0. **Two of these three have a wrong default.** A
fourth risk is a typing mistake in `DAILY_LIMIT` (T-14): 10,000 per day costs about $40 per day.
**The owner set the valid range to 1–20 (gate 75).** Every one of these settings has a test that
runs on every push: TC-NF-05a, TC-NF-05b, TC-09-5, TC-09-6, TC-08-7 and TC-13-7.

**Risk 3 — The CI files are not ready.** `04-ci-cd.md` §3 lists seven workflows. Only `ci.yml` and
`codeql.yml` exist. And `ci.yml` is wrong: it uses `npm` in a pnpm workspace, and it has no
`infra-assert` job (`04-ci-cd.md` §6.1). So nine NFR checks have no job today: NFR-01, 07, 08, 33,
37 and 50 (in `pr-preview.yml`), and NFR-05, 38 and 40 (in `infra-assert`). **Section 5 makes both
files an entry rule.**

## 4. Test levels

Prove each rule at the cheapest level that can prove it.

| Level | Job | What it proves | Cost |
| --- | --- | --- | --- |
| Unit | `test` | A constant, a schema, a mapping. No network | Free |
| Integration | `test` | One route or handler, with a stub model and a local table | Free |
| Template | `infra-assert` | What the CDK output says: lifecycle rule, retry list, roles. No AWS call | Free |
| End to end | `e2e`, `perf-flow` | What a real browser does, against a preview deploy | A preview stack |

**Two checks never run in CI.** The golden-set run costs money (`ai-eval`, button press). The
bucket audit needs AWS credentials (`retention-audit`, monthly).

**The preview never calls the real model.** `LLM_PROVIDER` is `stub` there. EV-16 checks that a
missing or misspelled value falls back to the stub, not to the real model.

## 5. Entry rules — what must be true before testing starts

1. `ci.yml` uses pnpm, with the six fixes in `04-ci-cd.md` §6.1, and an `infra-assert` job inside
   `ci-ok`.
2. `pr-preview.yml` exists, with `bundle-budget`, `e2e` and `perf-flow`. `preview-ok` is added to
   the branch rules **in the same change, never before**. A required check that never reports blocks
   every merge.
3. `packages/contracts` exists, and every test reads its values from it. A test with its own copy of
   a list only tests that copy.
4. A stub `LlmProvider` exists. It can return any answer, throw each retryable error a set number of
   times, return each failure, and wait a set number of milliseconds.
5. Two test accounts exist in the `preview` Cognito pool, made by hand. Self sign-up is off (gate
   49). Two accounts are needed to prove that one cannot read the other's data.
6. The golden set exists, before any `ai-eval` run. Where the photos and labels come from is decided
   (gates 77 and 78). The set still has to be built.

**Rules 1 and 2 fail without a sign.** Everything looks green, because the job that would fail was
never there.

## 6. Exit rules — when QA's work on run 1 is done

This is **not** the release decision. That belongs to the owner.

| # | Condition | Shown in |
| --- | --- | --- |
| 1 | Each of the 14 stories has at least one passing positive and one passing negative case | `01-test-cases.md` §19 |
| 2 | Each NFR row in section 8 has a test that ran, or a written reason why it cannot | Section 8 |
| 3 | Each of the 37 "must not" rules has a check | `01-test-cases.md` §16 |
| 4 | `ci-ok` and `preview-ok` are green, and CodeQL has no alert above the owner's threshold | The pull request |
| 5 | The golden set ran once on the dated model, and the results are written down | `02-ai-evals.md` §8 |
| 6 | The judge was checked against a person's scores, and the figure is written down | `02-ai-evals.md` §6 |
| 7 | Every `03-evidence.md` check that does not need `prod` has its output, date and result filled in | EV-09 to EV-28, EV-33 to EV-36 |
| 8 | Every open defect is fixed with a guard test, or recorded with a priority **a person** set | Section 10 |
| 9 | Every gate QA raised is answered or recorded as open | Section 12 |

**Condition 5 costs money and needs a person.** One run is about $0.16 on one model and $1.28 on
all three. The Anthropic key is in a GitHub environment with required reviewers, so a second person
click is needed to start it.

## 7. What blocks a merge, what blocks a release, what only gets read

### 7.1 Merge gates

A change cannot reach `main` unless these pass (`04-ci-cd.md` §9).

| Gate | Jobs | File | NFRs it carries |
| --- | --- | --- | --- |
| `ci-ok` | `quality`, `audit`, `test`, `infra-assert`, `build` | `ci.yml` | 02, 03, 04, 05, 10, 12, 23, 30, 31, 32, 34, 35, 36, 38, 40, 42, 43, 52 |
| `preview-ok` | `bundle-budget`, `e2e`, `perf-flow` | `pr-preview.yml` | 01, 07, 08, 33, 37, 50 |
| CodeQL | `analyze` | `codeql.yml` | A code-scanning rule, not a status check |

- **A skipped required check counts as a pass.** So each gate job needs `if: always()` and a step
  that turns each result into pass or fail. `04-ci-cd.md` §9 has the exact shape.
- **A pull request that deletes a test file fails**, unless the commit message says
  `DELETE_TESTS: <reason>`.

### 7.2 Release gates — by hand, once, before the first production deploy

These cannot block a merge. Each one costs money, needs AWS credentials, or needs `prod`.

| # | Check | Why not a merge gate | Written in |
| --- | --- | --- | --- |
| 1 | The golden-set run (NFR-20, NFR-21, false refusals) | Costs money, needs a reviewer's click | `02-ai-evals.md` |
| 2 | EV-29: turn the kill-switch off, time it, turn it back on | Needs `prod` | `03-evidence.md` §5 |
| 3 | EV-30: run the rollback once on purpose | Needs `prod` | `03-evidence.md` §5 |
| 4 | EV-31: multi-factor sign-in on the AWS account | An account setting. Gate 71 is a hard stop | `03-evidence.md` §5 |
| 5 | EV-25: prompt injection through a photo and a pot name | Needs the real model, about $0.008 | `03-evidence.md` §4 |
| 6 | EV-08: is `cloudfront.net` on the Public Suffix List | Never run yet | `03-evidence.md` §2 |
| 7 | The preview IAM role cannot touch a `Prod` stack | The roles do not exist yet | `02-mitigations.md` R-05 |
| 8 | Measure SC-1 and replace the 170 KB guess in NFR-50 | No screen is built yet | `06-nfrs.md` §8 |

**Which of these is mandatory is the owner's decision (gate 74).** None is marked mandatory here.

### 7.3 Runtime checks — nothing blocks, somebody reads the number

| Check | When | Bar |
| --- | --- | --- |
| NFR-41: no photo older than 182 days (`retention-audit`) | Monthly | 0 |
| NFR-06: cold start p95, from the logs | After a deploy | ≤ 2,000 ms |
| NFR-14: Anthropic spend to 2026-12-31 | From the day totals | < $5.00 |
| NFR-22: share of `cannot-tell` answers | Any 20 real assessments | ≤ 3 in 10 |
| NFR-23: share of answers the app could not read | Any 100 attempts | ≤ 1 in 100 |
| Review of the ten verdict codes (gate 6) | After the first 20 real assessments | A rising share of `other` is the warning sign |

NFR-22 and NFR-23 also have a parser test in `ci-ok`. The test proves the app handles the case. The
runtime number shows how often the case happens. Both are needed.

## 8. Every NFR, and what checks it

**33 rows, one for each requirement in `06-nfrs.md`.** Four have no job, and each says why. A
number with nothing checking it is only a wish.

| NFR | Requirement | Case | Job | Merge gate? |
| --- | --- | --- | --- | --- |
| 01 | Tap to confirmed waiting screen ≤ 30,000 ms p95 | TC-01-10 | `perf-flow` | Yes |
| 02 | The `api` function's request ≤ 20,000 ms | TC-NF-02 | `test` | Yes |
| 03 | The model call's abort ≤ 18,000 ms per attempt | TC-NF-03 | `test` | Yes |
| 04 | 1 model call normally, never more than 3 | TC-09-5, TC-09-6 | `test` | Yes |
| 05 | Only the workflow retries: `MaxAttempts: 2`, `maxRetries: 0` | TC-NF-05a, 05b | `test`, `infra-assert` | Yes |
| 06 | Cold start ≤ 2,000 ms p95 | none | none | No. Read from the logs with the query in `03-observability.md` §4 |
| 07 | Tap to result on screen ≤ 60,000 ms p95 | TC-01-11 | `perf-flow` | Yes |
| 08 | Stream delivers ≤ 1,000 ms after the row is written | TC-02-8 | `e2e` | Yes |
| 10 | ≤ $0.0040 per call, ≤ $0.012 per photo | TC-NF-10 | `test` | Yes |
| 11 | One `ai-eval` run ≤ $0.20 | TC-EV-1 | `ai-eval` | No, release gate. The judge's cost is not in the $0.20 (finding 45) |
| 12 | ≤ 10 assessments per account per day | TC-08-1, 2, 5 | `test` | Yes |
| 13 | Our call count matches Anthropic's | none | none | No. Needs the admin key. The owner runs a local script |
| 14 | Anthropic spend < $5.00 to 2026-12-31 | none | none | No. A number to watch |
| 20 | A person agrees with a `likely` verdict ≥ 8 in 10 | `02-ai-evals.md` §4 | `ai-eval` | No, release gate |
| 21 | A person agrees a `cannot-tell` photo was unusable ≥ 8 in 10 | `02-ai-evals.md` §4 | `ai-eval` | No, release gate |
| 22 | `cannot-tell` share ≤ 3 in 10 | `02-ai-evals.md` §4.3 | `ai-eval` + runtime | No. Split in two (finding 43) |
| 23 | Unreadable answers ≤ 1 in 100 | TC-02-2 to 6 | `test`, then runtime | The parser test is a merge gate. The rate is not |
| 30 | Reads of another account's data = 0 | TC-07-2, TC-07-4 | `test`, `type-check` | Yes |
| 31 | Tasks from `unsure` with no explicit yes = 0 | TC-03-2 | `test` | Yes |
| 32 | Routes with no role decorator = 0 | TC-14-3 | `test` | Yes |
| 33 | Tokens or account data in browser storage = 0 | TC-07-6 | `e2e` | Yes |
| 34 | Kill-switch to no new model call ≤ 60,000 ms | TC-13-1, 2 | `test`, then EV-29 | The constant is a merge gate. The real timing is a release gate |
| 35 | A session older than 30 days is accepted = 0 | TC-07-3 | `test` | Yes |
| 36 | Model calls with no signed-in user = 0 | TC-07-5 | `test` | Yes |
| 37 | Result screens with no AI notice = 0 | TC-06-1 | `e2e` | Yes |
| 38 | Refunds where a call was made = 0 | TC-08-7, TC-NF-38 | `test`, `infra-assert` | Yes |
| 40 | Lifecycle rule deletes photos at exactly 180 days | TC-10-5 | `infra-assert` | Yes |
| 41 | Photos older than 182 days = 0 | TC-10-6 | `retention-audit` | No, monthly |
| 42 | Copies of a photo outside the bucket = 0 | TC-10-3 | `test` | Yes |
| 43 | A signed photo URL lives ≤ 300,000 ms | TC-10-8 | `test` | Yes |
| 50 | JavaScript for SC-1 ≤ 170 KB gzipped | TC-NF-50 | `bundle-budget` | Yes. 170 KB is a guess; measure the real screen |
| 51 | A pull-request run ≤ 10 minutes | none | none | No. Read the duration in Actions. At 15 minutes the repository-split trigger fires |
| 52 | Every workflow has a `paths` filter | TC-NF-52 | `test` | Yes |

## 9. Test data

**No real personal data in a test.** No real photo of a home, no real email, no real cookie, no
real pot name of a real person. Test files end up in a public repository.

**The golden set is the one hard case**, because it needs real plant photos. The owner decided it
(gate 77): licensed photos for groups A and B, the owner's own photos for groups C, D and E, and
**no photo of a real home in the public repository**. The owner's photos stay in the private bucket
that `ai-eval` reads. Only the label rows are committed. **No golden-set photo may come from a photo
uploaded into the product.**

**Test data changes across 12 fields**, so the suite finds more than one kind of bug:

| Field | Values used |
| --- | --- |
| Photo type | JPEG · PNG · WebP · GIF (refused) · a text file named `.jpg` · a JPEG with extra bytes |
| Photo size | 2,000 × 1,500 · 1,000 × 1,000 · 250 × 199 (refused) · 2.5 MB (refused) · 30,000 × 30,000 from under 2 MB (refused) |
| Photo content | A real plant · a plant next to printed instructions · a photo with GPS · a dark photo · no plant |
| Pot | None · one · two with the same name · another account's · 30-character Hungarian name · 61 characters (refused) |
| Room | Filled · empty (refused) · 60 characters · 61 characters (refused) |
| Language | `hu` · `en` · any other (refused) |
| Band | `likely` · `unsure` · `cannot-tell` · any other (unreadable) |
| Verdict | All ten codes, and one outside them. `nothing-wrong` and `other` each on their own |
| `followUpDays` | `null` · 0 · 1 · 30 · 31 · 2.5 |
| Session | None · valid · older than 30 days · another account's · no profile row |
| `requestId` | New · the same one twice · new after a reported failure · the same one after no answer |
| Kill-switch and breaker | On · off · changed during a run · breaker open |

## 10. Defects

**Every defect has six fields.**

| Field | Content |
| --- | --- |
| Title | The effect on the person, in one sentence. Not the name of a component |
| Repro | The fewest numbered steps that still show it, with real values |
| Expected | What should happen, and the story, AC or NFR that says so |
| Actual | What happened, with the real output |
| Severity | How bad it is. **QA sets it** |
| Priority | When it gets fixed. **A person sets it. QA never does** |

| Severity | Meaning in this product |
| --- | --- |
| 1 — Trivial | Nobody notices. No money, no data |
| 2 — Small | One failed request, or a few cents |
| 3 — Real | A promise on a screen is broken, or the feature stops until a person acts |
| 4 — Serious | Personal data reaches the wrong person, or the Anthropic balance is emptied |
| 5 — Severe | The AWS account closes, or a credential that opens everything is lost |

The scale uses the same words as the impact scale in `01-threats.md` §1.

**Four things are never lowered to make a run green:** a pass bar, a severity, the scope of a check,
and the list of required checks. Each one is a question for a person.

## 11. Every fix ships with a guard test

1. The guard test goes in the **same** pull request as the fix.
2. The guard tests the condition, not only the one input that failed. A bug found with a 199 px
   photo gets a test at 199, 200 and 201.
3. A pull request that deletes a test file fails without `DELETE_TESTS: <reason>`.

**One review has a date, not a trigger.** After the first 20 real assessments, QA reviews the ten
verdict codes (gate 6). A rising share of `other` is the early warning. It is not a test and it
blocks nothing.

## 12. Questions handed to a person

| Gate | Question | Status |
| --- | --- | --- |
| 74 | Must the golden-set run (and the other release gates in §7.2) pass before the first production deploy? | **Open.** The owner's |
| 75 | What is the valid range for `DAILY_LIMIT`? | **Closed: 1 to 20.** `03-api-spec.md` §6 names it, and TC-13-7 tests it |
| 76 | After a failed assessment, may the person send the same photo again? | **Closed.** A new `requestId` when the API **answered** with a failure. The same `requestId` when the request got **no answer**. Cases TC-09-9 and TC-09-10. `02-web-spec.md` §4.2 holds the rule |
| 77 | Where do the 40 golden-set photos come from? | **Closed.** See section 9 |
| 78 | Who writes the expected verdict for each photo in group A? | **Closed.** A named reference, written in `labelSource` with the date it was checked |
| 79 | US-15 AC-8: is SC-1 counted once or twice? | **Open.** Goes back to 200-product. TC-15-7 runs with "count once" |
| 80 | Is 10 the right minimum of `likely` answers? | **Open.** QA's proposal, no source |
| 81 | Is 8 in 10 the right bar for the judge? | **Open.** QA's proposal, no source |
| 82 | Does a failed assessment count against the 10 per day? | **Closed.** Yes, whenever the model was called. A try is given back only when no call was made (ADR-0016) |

Gates 64, 69 and 71 are also open. They come from 900 Security. 69 and 71 are hard stops before the
first deploy.

## 13. Seams — facts QA needed and did not get

A **seam** is a place where the line gave a role less than it needed. These are findings 41 to 50 in
`factory/runs/001-photo-assessment/seam-ledger.md`. The full text is there.

| Finding | What was wrong | Label | Effect |
| --- | --- | --- | --- |
| 41 | Three files together made the try-again button do nothing for 10 minutes: `02-web-spec.md` §4.2, US-09 AC-2, `03-api-spec.md` §4a | contradiction | Answered by gate 76 |
| 42 | `03-evidence.md` EV-23 expected `201` and counted `modelCalls`. The API answers `202` since ADR-0014, and the daily limit counts `attempts` | stale | Repaired. EV-23 and TC-08-2 both count `attempts` |
| 43 | NFR-22 is measured on a golden set that holds unusable photos on purpose. The result then describes the set, not the model | ambiguous | `02-ai-evals.md` §4.3 splits it in two |
| 44 | `docs/300-design/03-tokens.md` was not an input | under-supply | §16 and §17 of the cases name tokens, not values |
| 45 | The prices in `00-context-brief.md` §4 were not an input | under-supply | The judge's cost cannot be computed |
| 46 | `human-gates.md` was not an input | under-supply | QA could name gates 64, 69, 71 but not read them |
| 47 | `docs/400-architecture/05-patterns.md` was not an input. Two engineering files say it wins over them | under-supply | Any case could be wrong where that file disagrees |
| 48 | `01-CONTEXT.md` was not an input. `02-SPEC.md` says its MUST NOT list is part of the spec | under-supply | Only the 37 rules in `02-SPEC.md` §7 are covered |
| 49 | `docs/800-infra/03-observability.md` was not an input | under-supply | NFR-06 has no check, and §7.3 names no alarm |
| 50 | `01-contracts.md` has no single `const` list of failure codes | thin | TC-09-1 asserts that the list exists |

## 14. What this file does not decide

Whether the feature ships · when a defect is fixed · whether a known failure may ship · whether a
pass bar may be lowered · what counts as personal data · which alarms exist · the CodeQL threshold ·
what gets built first.
