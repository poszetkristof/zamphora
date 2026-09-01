# Non-functional requirements — the numbers, and what checks them

**Written by** 400 Architecture, run 1 (`001-photo-assessment`). **Date:** 2026-08-25.
**Read next by** 500 Engineering, 800 Infra, 900 Security, 600 QA.

Every row below has four things: a number, the window it is measured over, how it is tested, and
the job that runs the test. A row missing any of the four is not a requirement, it is a wish.

**Two of these budgets are the ones this project cannot skip**, because both can kill it rather than
slow it down: what the model costs (NFR-10 to NFR-14), and how often the answer is right (NFR-20 to
NFR-23). On an account that closes instead of billing, cost is a correctness property.

**`M-nn` in the last column is the metric id in `docs/200-product/001-photo-assessment/02-traceability.md`.**
Where a row has no `M-nn`, this document is the only place the number exists.

---

## 1. The continuous integration jobs named below

GitHub Actions on a personal free account. Minutes are limited, so what runs when is part of the
design, not a detail.

| Job | Runs when | Why then |
| --- | --- | --- |
| `lint` · `type-check` · `test` | Every push | Fast, free, and catches most of it |
| `infra-assert` | Every push that touches `infra/` | CDK assertions. No AWS call, so no cost and no credential |
| `bundle-budget` | Every pull request | One measurement, on the built output |
| `e2e` | Every pull request to `main` | Playwright against a preview deploy |
| `perf-flow` | Every pull request to `main` | The 30-second budget, on a throttled connection |
| `ai-eval` | **On demand only. Never on a push** | It costs real money. See NFR-11 |
| `retention-audit` | Scheduled, monthly | Reads the real bucket. Cannot run without AWS credentials |

**`ai-eval` is deliberately not automatic, and the arithmetic is the reason.** The golden set is 40
photos. At $0.0040 an assessment on Haiku 4.5 that is $0.16 a run. Nightly would be about $4.80 a
month, which is the entire credit balance in `factory/feature.md`. A test that empties the balance
it is testing is not a test.

## 2. Speed

| # | The requirement | Number | Window | How it is tested | Job | Metric |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-01 | Tap to something on screen | **≤ 30,000 ms**, p95 | Every assessment, measured over a rolling 20 | Playwright against a preview deploy, network throttled to 400 kbps up, a fixed 200 KB photo, the provider replaced by a stub. **Run twice: the stub sleeps 8,000 ms, then 18,000 ms. Both must pass** | `perf-flow` | **M-12** |
| NFR-02 | The server's own share of that budget | **≤ 20,000 ms**, hard | Every request | Two tests. A unit test that the deadline constant is 20,000 and is below the 22,000 ms function timeout. An integration test with a stub that sleeps past it, asserting the app answers with `deadline-passed` and not a 504 | `test` | — |
| NFR-03 | The model call's own timeout | **≤ 18,000 ms** | Every call | A unit test on the constant, plus an integration test with a stub that never answers. The number is what is left of the 20,000 ms deadline after the other steps — see `03-flow.md` §4 | `test` | — |
| NFR-04 | Model calls per assessment | **exactly 1** | Every assessment | A stub provider counts calls. **Every** case gives 1 — timeout, 429, 503, refusal, truncation, bad request, empty balance, rejected photo. There is no retry in run 1 | `test` | M-22 |
| NFR-05 | Retries **of the model call** | **0** | Always | A test that no failure path calls the provider twice, and that no wait-and-try-again code wraps `LlmProvider`. Dropping the retry is what makes NFR-04 and NFR-10 agree. **This row is about `LlmProvider` only — AWS SDK retries stay at their defaults** | `test` | — |
| NFR-06 | Cold start of the API function | **≤ 2,000 ms**, p95 | Rolling 7 days | **Not tested in CI.** There is no `InitDuration` CloudWatch metric — read it with the Logs Insights query in `03-observability.md` §4 after a deploy | none — runtime only | — |

**NFR-06 is the honest one.** No job can enforce it, because a cold start is a property of the
platform on the day. It is written down so that a run that regularly passes the number is recognised
as a change rather than as bad luck.

**The number was 800 ms and was raised to 2,000 ms on 2026-08-31.** The 200–800 ms range came from
articles measuring a **plain Node.js handler**. This is not a plain handler: it is Nest.js plus
Express plus multer plus Zod plus the AWS SDK clients plus the Anthropic SDK, all loaded before the
handler runs. A published `InitDuration` for a bundled Nest mono-Lambda is about **905 ms for a
near-empty application**. With this dependency list at 1024 MB on ARM64, a realistic p95 is 1,200 to
2,500 ms.

**The 30-second promise still holds, and here is the arithmetic redone.** `03-flow.md` §4 subtracted
800 ms for the cold start and kept 4,480 ms of slack. With 2,000 ms the slack becomes **3,280 ms**
and every other number is unchanged. Nothing else in the design moves.

**Replace it with the first real reading**, as section 8 says. This is still an estimate, only an
honest one about the right kind of application.

## 3. Money

| # | The requirement | Number | Window | How it is tested | Job | Metric |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-10 | Cost of one assessment | **≤ $0.0040** on Haiku 4.5 | Every assessment | The cost is computed from the `usage` block the API returns, never from an estimate. A unit test on the arithmetic against the published prices. An integration test that a recorded cost above the ceiling is written to the day's rollup so it is visible | `test` | M-05 |
| NFR-11 | Cost of one `ai-eval` run | **≤ $0.20** | Every run | The eval script prints its total before it starts and refuses to run if the set is larger than 50 photos | `ai-eval` | — |
| NFR-12 | Model calls per account per day | **≤ 10** | A UTC calendar day | Two tests. The 11th call is refused with no provider call. Ten parallel requests give exactly ten successes. **With no retry, 10 a day now means 10 assessments**, not 5 assessments and 5 retries | `test` | M-14 |
| NFR-13 | The app's model-call count matches the provider's own record | **difference = 0** | Any finished day | A local script the owner runs, comparing the day's rollup against `/v1/organizations/usage_report/messages`. **Not automated in CI, because the admin key it needs does not go on the server** — see `05-patterns.md` §12 | none — a local script | M-15, US-12 AC-2 |
| NFR-14 | Anthropic spend for this feature | **< $5.00** | 2026-07-01 to 2026-12-31 | The sum of the day rollups over the range, read from the table directly — there is no admin route in run 1 (gate 30) | none — runtime only | M-05 |

**NFR-14 is a watch number and the daily limit does not guarantee it.** Two arithmetics, both true:
expected use is about 30 assessments a month, which over six months is 180 calls and about **$0.63**.
One person using all 10 every day for 184 days is 1,840 calls and about **$6.44**, which is over the
ceiling. The daily limit protects against a script, not against enthusiasm. The real stop is the
credit balance emptying — see the note below.

**There is no cap that stops spending, and that is a decision, not a gap.**
`factory/feature.md`, 2026-08-25: the credit balance reaching zero is the stop. NFR-14 is therefore
a number to watch, not a number that is enforced. When the balance empties, the feature returns
`no-credit`, which is a named failure state and is never retried. Nothing else in the product stops.

## 4. How often the answer is right

These four are 600 QA's to run. They are here because the architecture has to make them possible,
and two of them changed shape because of a decision in `05-patterns.md`.

| # | The requirement | Number | Window | How it is tested | Job | Metric |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-20 | A person agrees with a `likely` verdict | **≥ 8 in 10** | The first 20 real assessments, then re-measured | The golden set: real photos, each with a verdict a person wrote down first. Agreement is counted, not scored by a model | `ai-eval` | M-03 |
| NFR-21 | A person agrees a `cannot-tell` photo was unusable | **≥ 8 in 10** | The first 20 real assessments | The same golden set, restricted to the `cannot-tell` answers | `ai-eval` | M-04 |
| NFR-22 | Share of answers that come back `cannot-tell` | **≤ 3 in 10** | Any 20 assessments | Counted from the stored assessments. A model hiding behind the refusal fails quietly, so this one is a ceiling and not a floor | `ai-eval` | M-19 |
| NFR-23 | Answers the app could not read | **≤ 1 in 100** | Any 100 attempts | Counted from the stored failures by name. `answer-unreadable` and `answer-truncated` are counted apart, because they have different causes | `test` for the parser, runtime for the rate | — |

**NFR-20 has no bar for the middle band, and that is not an oversight.**
`docs/200-product/001-photo-assessment/00-prd.md` §9 point 4 records it: `factory/feature.md` sets a
bar for `likely` and one for `cannot-tell` and none for `unsure`. US-04 is measured on behaviour
instead — an `unsure` result never writes a task without an explicit yes, which is NFR-31 below.

**NFR-23 exists because of a decision, not because of a story.** `05-patterns.md` §4 requires
structured output, which is what makes a broken answer rare. Without a number, "rare" cannot be
checked, and a model upgrade that quietly breaks the schema would look like ordinary bad luck. The
1-in-100 figure is **a guess** — see section 8.

## 5. Safety and honesty

| # | The requirement | Number | Window | How it is tested | Job | Metric |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-30 | Reads of another account's data | **0** | Always | Sign in as A, ask for B's pot, photo and assessment by id. Expect the same answer as for a thing that does not exist. Plus a type-level check: the key builder cannot be called without a user id, so a query with no owner does not compile | `test`, `type-check` | M-06 |
| NFR-31 | Care tasks written from an `unsure` result with no explicit yes | **0** | Always | An integration test that the task route refuses an `unsure` assessment unless the confirm flag is present | `test` | — |
| NFR-32 | Routes with no role decorator | **0** | Every build | A test walks the whole Nest.js router and asserts every route carries `@Anonymous()`, `@Roles('USER')` or `@Roles('ADMIN')`. A new route with none fails the build. This is the mechanism behind US-14 AC-3 | `test` | M-18 |
| NFR-33 | Tokens or account data in browser storage | **0** | Every pull request | After signing in, assert `localStorage` and `sessionStorage` are empty, and that the only cookie is `__Host-session` with `HttpOnly`, `Secure` and `SameSite=Strict` | `e2e` | M-13 |
| NFR-34 | Time from flipping the kill-switch to no new model call | **≤ 60,000 ms** | Every flip | A unit test that the cache lifetime constant is at most 30,000 ms. An integration test that flips the row, waits past the lifetime, and asserts the provider is not called | `test` | M-10 |
| NFR-35 | A session older than 30 days is accepted | **0** | Always | A test that a session item with an expiry in the past is refused, **even though the row is still in the table**, because DynamoDB TTL does not delete on time | `test` | — |
| NFR-36 | Model calls made with no signed-in user | **0** | Always | A test that the assessment route with no cookie refuses before the provider is reached | `test` | M-06, US-07 AC-5 |
| NFR-37 | Result screens with no AI notice | **0** | Every pull request | A Playwright assertion on SC-3, SC-4 and SC-5, in both languages, that both notice lines are present and not inside a collapsed section | `e2e` | M-11 |

## 6. Keeping and deleting

| # | The requirement | Number | Window | How it is tested | Job | Metric |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-40 | The bucket carries a lifecycle rule that expires objects at 180 days | **exactly 180** | Every build | A CDK assertion test on the synthesised template. This is the only part of the retention promise that can be checked without AWS | `infra-assert` | M-07 |
| NFR-41 | Objects in the bucket older than 180 days | **0, with a 48-hour grace** | Monthly | A scheduled job lists the bucket and asserts no object has a creation date older than **182 days** | `retention-audit` | M-07 |
| NFR-42 | Copies of a photo outside the one bucket | **0** | Every build | A test that no code path writes an image anywhere except the one bucket prefix, and that no photo URL is ever served through a cache | `test` | US-10 AC-3 |
| NFR-43 | Life of a signed read URL for a photo | **≤ 300,000 ms** | Every signature | A unit test on the constant | `test` | — |

**NFR-41 is 180 days plus two, and the two days are not slack.** AWS states plainly: *"There may be
a delay between the expiration date and the date at which Amazon S3 removes an object"*
([S3 lifecycle expiration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html),
checked 2026-08-25). So a test that demands zero objects at day 181 would fail on a working system.
Two days is chosen as the window because the same page describes the process as running daily.

**This changes how M-07 has to be read, and the owner should see it**, because the 180 days is a
promise printed on a screen (US-10 AC-1). The photo is not billed for after it expires, and it is
not readable through the app, because the app only ever signs a URL for a row that still exists. But
the object can sit in the bucket for a short time after the date.

**Gate 27, closed by the owner on 2026-08-26: the wording on the screen stays as it is.** "Deleted
after 180 days" is what a person means by deleted — they cannot see it and nobody is paying to keep
it. NFR-41 checks at 182 days so a working system passes.

## 7. Size and build

| # | The requirement | Number | Window | How it is tested | Job |
| --- | --- | --- | --- | --- | --- |
| NFR-50 | JavaScript sent to draw SC-1, gzipped | **≤ 170 KB** — **a guess, replace it with a measurement** | Every pull request | `size-limit` on the built route, checked against the number in the config | `bundle-budget` |
| NFR-51 | Whole CI run for a pull request | **≤ 10 minutes** | Every pull request | The workflow's own duration. At 15 minutes, the repository ADR's split trigger fires | none — read from Actions | — |
| NFR-52 | Every workflow is filtered by path | **all of them** | Every build | A test that reads the workflow files and asserts each names a `paths` filter. Split-readiness rule 6 | `test` | — |

**NFR-50 is the number this document is least sure of.** `factory/feature.md` says the component
library sizes are the projects' own published figures and asks for one real screen to be built and
measured before committing. 170 KB is a placeholder that gives `bundle-budget` something to fail
against on day one. **Replace it with the measurement of SC-1 in the first web task**, and record
what it actually was.

## 8. Every number in this file that is a guess

| Number | Row | Why it is a guess | What replaces it |
| --- | --- | --- | --- |
| 8,000 ms for the model call | NFR-01, NFR-03 | No source at all | The first real call |
| 18,000 ms model timeout | NFR-03 | What is left of the 20,000 ms deadline after the other steps. The 8,000 ms guess sets how much slack that leaves, not the number itself | Re-derived once the real latency is known. **This row said 9,000 ms until 2026-08-26** — that belonged to the two-attempt rule the owner dropped |
| **2,000 ms cold start** | NFR-06 | Estimated for a bundled Nest+Express Lambda. Was 800 ms, from sources measuring a plain Node handler | The Logs Insights query in `03-observability.md` §4 — there is no `InitDuration` metric |
| 1 in 100 unreadable answers | NFR-23 | Nobody has run one call yet | The first 100 attempts |
| 170 KB for SC-1 | NFR-50 | No screen has been built | The measurement of the real screen |
| 10 minutes of CI | NFR-51 | No pipeline exists | The first ten pull requests |

Every other number in this file comes from `factory/feature.md`, from `00-prd.md`, or from a source
linked next to it with the date it was checked.

## 9. The requirement with no test approach

**Availability.** No input names an uptime target, an error-rate ceiling or a recovery time. Nothing
in the 15 stories asks for one, and the product has one user, an unattended credit balance and a
cloud account that closes on 2026-12-31 by design.

This role's contract says an NFR with no test approach is a stop-and-ask, so it was raised as a gate
rather than answered with a number invented here.

**The owner closed it on 2026-08-26 (gate 31): there is no availability target in run 1, and that is
written down as a position rather than left as a gap.** The reasoning, in full, so nobody has to
rebuild it: this app has one user, no second copy of anything, nobody on call, a model credit
balance topped up by hand, and an AWS account that closes on 2026-12-31 by design. A promise like
"up 99% of the month" would be untestable and unkeepable, and writing one down would make the next
role build alarms against a fiction.

**The trigger to set a number is the day the app is offered to a second person.** That is the same
trigger as gate 5, the EU AI Act position, and the same trigger as the admin route in ADR-0009. All
three should be answered in one sitting, because they are all consequences of the app having exactly
one user today.

## 10. What this document does not decide

Whether any of these numbers is acceptable · whether the spend is acceptable · which alarms exist
and where they point, which is 800 Infra's · what a defect is worth, which is a person's · whether
the feature ships.
