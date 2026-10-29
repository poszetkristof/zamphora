# Test cases — photo assessment

**Written by** 600 QA, run 1 (`001-photo-assessment`), 2026-09-17. **Read next by** whoever writes
the first task.

---

## 1. How to read this file

Read `00-test-plan.md` first. It says what is in scope and which checks block a merge.

- **Kind:** `P` is positive — the feature works. `N` is negative — the feature refuses, fails
  safely, or does **not** do something it must not do.
- **Job:** the CI job from `04-ci-cd.md` §3. `test` runs unit and integration tests. `infra-assert`
  checks the CDK output. Both are inside `ci-ok`. `e2e`, `perf-flow` and `bundle-budget` are inside
  `preview-ok`. Both gates block a merge.
- **AC** is an acceptance criterion in `01-user-stories.md`. **NFR** is in `06-nfrs.md`. **C-n** is
  a "must not" rule in `02-SPEC.md` §7. **EV-n** is a check in `03-evidence.md`.
- **Every value a test uses** — a band, a verdict code, a failure code, a photo limit — **comes from
  `@zamphora/contracts`.** A test with its own copy of a list only tests that copy.

**Counts: 119 cases. 47 positive, 72 negative.** 14 of the 15 stories are covered, each with at
least one positive and one negative case. US-12 is out of run 1.

---

## 2. US-01 — Send one photo of one pot

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-01-1 | P | Add a photo with the camera, then from the phone's gallery | Both work. Exactly two ways are offered, no third | AC-1 | `e2e` |
| TC-01-2 | N | Choose a GIF | Refused before any model call. The message names JPEG, PNG and WebP | AC-2, gate 68 | `test` |
| TC-01-3 | N | Send a text file named `fake.jpg`, and a JPEG with extra bytes | Both refused with `wrong-format`. Neither reaches the bucket or the model. The re-encode refuses them, not the declared type | AC-2, EV-12 | `test` |
| TC-01-4 | N | Send with no pot | `no-pot-picked`, 400, before any model call | AC-3 | `test` |
| TC-01-5 | P | Send a 4,000 × 3,000 photo | The browser sends at most 1,000 px on the longer side. The API checks again | AC-4 | `e2e` |
| TC-01-6 | N | Send a 250 × 199 photo | `photo-too-small`, 400, no model call. Test 199, 200 and 201 | AC-5 | `test` |
| TC-01-7 | N | Send a 2.5 MB body | `photo-too-large`. The body is refused before it is fully read | step 2 | `test` |
| TC-01-8 | P | One valid send | Exactly one background run and one model call | AC-6, NFR-04 | `test` |
| TC-01-9 | N | Tap send twice quickly | The button is `busy`, so the second tap does nothing. If a second request arrives, it has the same `requestId` and gets the same assessment id | AC-7, C-7 | `e2e` |
| TC-01-10 | P | Full journey at 400 kbps upload, 200 KB photo, stub waits 8,000 ms; then again with 18,000 ms | Tap to the confirmed waiting screen ≤ 30,000 ms p95 in both runs. The stub's wait must not change it, because the `202` comes before the model call | AC-8, NFR-01 | `perf-flow` |
| TC-01-11 | P | Same journey, plus a run where the stub times out twice and then answers | Tap to result on screen ≤ 60,000 ms p95 in all three runs | NFR-07 | `perf-flow` |
| TC-01-12 | N | Send a PNG under 2 MB that decodes to 30,000 × 30,000 px | Refused in time, with `wrong-format` or `photo-too-large`. The function does not run out of memory (`limitInputPixels`) | T-20, EV-13 | `test` |
| TC-01-13 | N | Send a file that cannot be decoded | `wrong-format` | EV-12 | `test` |
| TC-01-14 | N | Send a JPEG with GPS, `Make` and `Model` | The stored bytes and the bytes sent to the model have none of them. `.withMetadata()` appears nowhere in the module | T-17, EV-11 | `test` |

## 3. US-02 — Get a verdict, a band, a next action and a follow-up date

The stub model drives every case here. None of them costs money.

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-02-1 | P | Stub returns a good `likely` answer | Six fields, one of the ten verdicts, one of the three bands. SC-3 shows the verdict, the next action and the task button | AC-1 to AC-4 | `test`, `e2e` |
| TC-02-2 | N | Stub returns a verdict outside the ten | `answer-unreadable`. No verdict shown, no task written, another photo offered. Stored as a failure | AC-2 | `test` |
| TC-02-3 | N | Stub returns a band outside the three | `answer-unreadable`, same handling | AC-3 | `test` |
| TC-02-4 | N | `likely` with `verdict: null`, then with `nextAction: null` | `answer-unreadable` both times. **Never** turned into `cannot-tell` — a broken answer means nothing was looked at | §4.1 | `test` |
| TC-02-5 | N | Stub adds an extra field | Refused (`z.strictObject`). `answer-unreadable`. Model output is untrusted input | §4 | `test` |
| TC-02-6 | N | `followUpDays` of 0, 31 and 2.5 | 0 and 31 are stored as `null`: the verdict and action still show, no task is offered. 2.5 is `answer-unreadable`. Test 0, 1, 30 and 31 | AC-6 | `test` |
| TC-02-7 | N | Read every result screen in both languages | No percentage, score or "how sure" number anywhere | AC-5, C-1 | `e2e` |
| TC-02-8 | P | Time from the row being written to the event in the browser | Arrives with no tap, ≤ 1,000 ms p95 | AC-8, NFR-08 | `e2e` |
| TC-02-9 | N | Stub sets `stop_reason: refusal` | `provider-refused`. Exactly one call, never retried. `stop_reason` is read before the content | NFR-04 | `test` |
| TC-02-10 | N | Stub sets `stop_reason: max_tokens` | `answer-truncated`. One call, never retried. A separate log line, because NFR-23 counts it apart | NFR-04, NFR-23 | `test` |
| TC-02-11 | P | Stub returns `nothing-wrong` with `followUpDays: null` | A correct answer, not a broken one. Verdict and action shown. No task button at all | AC-7, C-16 | `test`, `e2e` |

## 4. US-03 — Turn the next action into a dated care task

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-03-1 | P | `likely` with `followUpDays: 7`, tap the task button | Task created with no typing. Date = the assessment's UTC day + 7. It holds the pot, the assessment, the date and the action. The assessment's `careTaskId` is set | AC-1 to AC-3 | `test`, `e2e` |
| TC-03-2 | N | Create a task for `unsure` with `confirmedUnsure` missing, then `false` | `confirmation-required`, 409, both times. No task | AC-4, NFR-31 | `test` |
| TC-03-3 | P | Same, with `confirmedUnsure: true` after an explicit yes on SC-6 | Task written. SC-6 closes, SC-4 shows the task | AC-4 | `e2e` |
| TC-03-4 | N | Create a task for `cannot-tell`, and look at SC-5 | `task-not-possible`, 409. SC-5 has no way to create a task | AC-5, C-14 | `test`, `e2e` |
| TC-03-5 | N | `likely` with `followUpDays: null` | `task-not-possible`. Verdict and action still shown | AC-6, C-15 | `test`, `e2e` |
| TC-03-6 | N | Ask for a second task from the same assessment | `task-not-possible`. One assessment, one task | §10 | `test` |
| TC-03-7 | P | Delete a task | Task gone, assessment text kept, `careTaskId` cleared | AC-7 | `test` |

## 5. US-04 — See an `unsure` result honestly

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-04-1 | P | Stub returns `unsure` with one retake tip | SC-4 shows the verdict, one sentence that it may be wrong, and at least one tip. The band has a rule and a warning triangle, not only a colour | AC-1, C-34 | `e2e` |
| TC-04-2 | N | Stub returns a retake tip outside the fixed four | `answer-unreadable` | AC-2 | `test` |
| TC-04-3 | P | Stub returns `unsure` with an empty tip list | Not a failure. The screen shows "take another photo in daylight". The missing field is logged | AC-2 | `test`, `e2e` |
| TC-04-4 | N | Leave an `unsure` result alone | No task is ever created | AC-3 | `test` |
| TC-04-5 | N | Read SC-4 in both languages | No word "diagnosis". No sentence that a plant is safe to eat or safe for animals | AC-5, C-17, C-18 | `e2e` |
| TC-04-6 | P | Tap "take another photo, same pot" | The photo buttons open on the same screen | AC-6 | `e2e` |

## 6. US-05 — See `cannot-tell` with a reason and no verdict

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-05-1 | P | Stub returns `cannot-tell` with `too-dark` | SC-5 shows no verdict and no action. One reason from the fixed four. The bad photo is shown full size | AC-1, AC-2, C-2, C-4 | `e2e` |
| TC-05-2 | N | `cannot-tell` with no reason | `answer-unreadable` | §4.1 | `test` |
| TC-05-3 | N | `likely` with a `cannotTellReason` | `answer-unreadable` | §4.1 | `test` |
| TC-05-4 | P | Read the stored row after `cannot-tell` | `state: done`. A refusal is a correct result, not an error | AC-3 | `test` |
| TC-05-5 | P | Tap "send another photo, same pot" | Photo buttons open, same pot, one tap | AC-4 | `e2e` |
| TC-05-6 | P | Count today's attempts after `cannot-tell` | It counts, because the money was spent. The screen says so | AC-5 | `test` |
| TC-05-7 | N | Try to create a task from SC-5, also by calling the route | Nothing drawn. The route answers `task-not-possible` | US-03 AC-5, C-14 | `test`, `e2e` |

## 7. US-06 — Know the answer came from an AI model

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-06-1 | P | Open SC-3, SC-4 and SC-5 in both languages | Both notice lines on all six screens. Not hidden behind a link, tooltip or fold. In the screen's language | AC-1 to AC-4, NFR-37, C-19 | `e2e` |
| TC-06-2 | N | Build a result screen without `ResultLayout` | The build fails. `ResultLayout` is what enforces the two lines | NFR-37 | `test` |
| TC-06-3 | N | Read every result text, including the ten verdict sentences | No sentence says a plant is safe to eat or safe for animals | AC-5, C-18 | `e2e` |

## 8. US-07 — Sign in once, and see only my own things

This section needs **two** test accounts in `preview`.

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-07-1 | P | Come back with a 29-day-old session | No new sign-in | AC-3 | `test` |
| TC-07-2 | N | As A, ask for B's pot, assessment and photo URL. Then ask for an id that does not exist | 404 `not-found` every time. B's real id and the made-up id get the **same body, byte for byte**. Never 403 | AC-2, NFR-30, EV-19 | `test`, `e2e` |
| TC-07-3 | N | A session past its expiry that is still in the table | Refused. DynamoDB deletes expired rows late, so code checks the date | NFR-35 | `test` |
| TC-07-4 | N | Call the key builder with no user id | Does not compile. Only the session code creates a `UserId` | NFR-30 | `type-check` |
| TC-07-5 | N | `POST /api/assessments` with no cookie | 401 `not-signed-in`. No model call, the day total does not change | AC-5, NFR-36, EV-18 | `test` |
| TC-07-6 | N | Sign in, then read browser storage | `localStorage` and `sessionStorage` empty. Only `__Host-session`, with `HttpOnly`, `Secure`, `SameSite=Strict`, no `Domain` | NFR-33, EV-20 | `e2e` |
| TC-07-7 | N | Callback with a `state` that does not match the `__Host-oauth` cookie | Refused. No session. The cookie is cleared | R-07, EV-21 | `test` |
| TC-07-8 | N | Callback with a valid `state` and no cookie | Refused. A missing cookie is never a fresh sign-in | R-07, EV-21 | `test` |
| TC-07-9 | N | Valid session, missing profile row | `not-signed-in`, logged. Never treated as `USER` (ADR-0004 forbids this fail-open) | §3 | `test` |
| TC-07-10 | N | Post a form to `/api/care-tasks` from another site | 401. `SameSite=Strict` keeps the cookie out. No task | T-09, EV-22 | `e2e` |

## 9. US-08 — Be stopped at my limit, before money is spent

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-08-1 | N | Make 10 assessments, then an 11th | 429 `daily-limit-reached`. No model call. Refused before the photo is written | AC-1, AC-3, NFR-12 | `test` |
| TC-08-2 | N | Send 10 requests at the same time on a new day, then one more | Exactly ten `202`, then a refusal. `assessmentsStarted` is exactly 10. (EV-23 still says `201` and `modelCalls` — finding 42) | NFR-12, EV-23 | `test` |
| TC-08-3 | P | Read the refusal and the screen | It says the limit is reached and when it resets. `quotaResetsAt` is UTC; the screen shows local time | AC-2 | `test`, `e2e` |
| TC-08-4 | N | Use 3, then 8 | With 7 left, no limit message. `LimitNote` shows only at 2 or fewer | AC-4 | `e2e` |
| TC-08-5 | N | Make the model call fail, then read the counter | The failed attempt counts. The workflow's own retries do not count again | AC-5, NFR-12 | `test` |
| TC-08-6 | P | Turn the kill-switch off while a run waits, and separately make `StartExecution` fail | The attempt is given back, because no call was made | AC-5, NFR-38 | `test` |
| TC-08-7 | N | Fail **after** the call was made | The counter does not go back | NFR-38 | `test` |

## 10. US-09 — A message that says whether trying again helps

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-09-1 | N | Go through every failure code | Each has exactly one retry hint and one message. The message map's keys are exactly the failure codes. The codes exist as **one** `const` list covering `01-contracts.md` §8.1 and §8.2 (finding 50) | AC-1 | `test` |
| TC-09-2 | P | Fail the upload, go back to SC-1 | The pot and photo are still there. The photo is kept in memory, never in browser storage | AC-2, NFR-33 | `e2e` |
| TC-09-3 | P | Stub times out three times | "Trying again may work", a try-again button, no task | AC-3 | `test`, `e2e` |
| TC-09-4 | N | Kill-switch off, send a photo | "The feature is off, trying again will not work now". No try-again button | AC-4, C-10 | `test`, `e2e` |
| TC-09-5 | N | Stub throws timeout ×3, then throttled ×3, then unavailable ×3 | Exactly three calls each time, never four. Only these three are retried, and only in the workflow | AC-5, NFR-04 | `test` |
| TC-09-6 | N | Stub returns bad request, refused, no credit, rejected photo | Exactly one call each. None retried. `no-credit` is a normal failure; the rest of the app works | AC-5, NFR-04 | `test` |
| TC-09-7 | P | Read the row after each failure | `state: failed` with its own `failureCode` | AC-6 | `test` |
| TC-09-8 | N | Draw `FailureNote` for every `will-not-work` code | No try-again button. Every `may-work` code has one | AC-1, C-10 | `test` |
| TC-09-9 | P | The API reports `state: failed` with a `may-work` code. Tap try again with the same photo | The browser makes a **new** `requestId`. A new run starts with a new assessment id. One attempt is used (gate 82) | AC-1, AC-3, gate 76 | `test`, `e2e` |
| TC-09-10 | N | The request reaches the API, but the network drops before the `202` arrives. Tap try again | The browser sends the **same** `requestId`. The API answers `202` with the first assessment id. One run, one charge | AC-7 of US-01, gate 76 | `test`, `e2e` |

**The rule behind TC-09-9 and TC-09-10 (gate 76).** If the API **answered** with a failure, the next
try is a new request, so it gets a new id. If the request got **no answer**, the phone does not know
whether it worked, so it sends the same id again. The API then returns the first run instead of
charging twice. `02-web-spec.md` §4.2 still says "a new one is only made when a new photo is
picked". It needs a 500-engineering repair before the screen is built.

## 11. US-10 — How long photos are kept, and deleting them

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-10-1 | P | Open SC-7 in both languages | Photos kept 180 days, then deleted. Assessment text kept as long as the pot exists | AC-1, AC-2 | `e2e` |
| TC-10-2 | N | Search all screens and message files for the 12-month rule and the 11-month email | Neither appears. Run 1 does not build them (gate 66), so the screen must not promise them | AC-2 | `test`, `e2e` |
| TC-10-3 | N | Check every code path that writes an image or serves a photo URL | Images are written only to the one bucket prefix. No thumbnail, no copy. No photo URL goes through a cache | NFR-42, AC-3 | `test` |
| TC-10-4 | P | Delete one photo | Object deleted first, then `photoStatus: removed`. The assessment text stays and says the photo was removed | AC-3, AC-4 | `test`, `e2e` |
| TC-10-5 | P | Check the CDK output | `ExpirationInDays: 180` on `photos/`. All four public-access blocks `true`. No versioning | NFR-40, EV-14 | `infra-assert` |
| TC-10-6 | P | List the real bucket monthly | No object older than 182 days. AWS may delete a little late, so the bar is 180 + 2 | NFR-41 | `retention-audit` |
| TC-10-7 | N | Request a photo with no signature | 403. All four public-access settings `true` | T-18, EV-28 | `retention-audit` |
| TC-10-8 | N | Use a signed URL again after more than 5 minutes | Fails. The constant is 300,000 ms | NFR-43, EV-28 | `test` |
| TC-10-9 | N | Ask for a signed URL for another account's photo | `not-found`, same body as a missing photo | US-07 AC-2 | `test` |

## 12. US-11 — The whole flow in Hungarian or English

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-11-1 | P | Do the whole flow in Hungarian | Every text is Hungarian: verdict, band, tips, reason, failures, AI notice, photo rules | AC-1 | `e2e` |
| TC-11-2 | P | Do it in English | Every text is English | AC-2 | `e2e` |
| TC-11-3 | N | Add a key to `hu.json` but not to `en.json` | The build fails and shows the missing keys | AC-4 | `test` |
| TC-11-4 | N | Remove one verdict sentence from one file | The build fails. Every code in `VERDICT_CODES` needs a key | AC-5 | `test` |
| TC-11-5 | P | Name a pot `legénypálma`, switch language | The name is shown exactly as typed, never translated | AC-3 | `e2e` |
| TC-11-6 | P | Read a `hu` assessment in `en`, then one in the same language | `WrittenInLine` shows in the first case and is not drawn at all in the second. No second model call | AC-6 | `e2e` |
| TC-11-7 | N | Search all schemas for `required_error`, `invalid_type_error`, `errorMap` | None found. Zod 4 ignores all three without a warning and shows English text on a Hungarian screen | AC-1, §9a | `test` |
| TC-11-8 | N | Read the markup of every result screen | Every text block has `lang="hu"` or `lang="en"`, not only `<html>` | C-35 | `e2e` |

## 13. US-13 — Turn the AI feature off without a deploy

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-13-1 | P | Read the config cache constant | `CONFIG_CACHE_MS` ≤ 30,000. The promise is 60 seconds. Do not raise it | NFR-34 | `test` |
| TC-13-2 | P | Turn it off, wait past the cache, send a photo | No model call. `feature-off`, 503 | AC-1, NFR-34 | `test` |
| TC-13-3 | P | Turn it off while a run waits in the workflow | The run stops before its call. The attempt is given back | AC-1, NFR-38 | `test` |
| TC-13-4 | N | Turn it off while a call is running | That call finishes, because it is already paid. The result is saved | AC-4 | `test` |
| TC-13-5 | P | Turn it back on | Normal use continues | AC-5 | `test` |
| TC-13-6 | N | Make the config read fail; then start a function that never read a value | A failed read keeps the last value. With no value ever read, the call does not run | §6 | `test` |
| TC-13-7 | N | Write `DAILY_LIMIT` 0, 21 and 10,000, and a `MODEL_ID` that does not exist | Each bad value is refused and the built-in default is used. **Valid range is 1 to 20** (gate 75). Runs once `03-api-spec.md` §6 names the range | T-14 | `test` |

The real kill-switch timing is EV-29, run once on `prod`. It is a release gate.

## 14. US-14 — A normal account cannot do admin actions

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-14-1 | N | As `USER`, call a test route with `@Roles('ADMIN')` | Refused. Nothing changes. The answer does not say whether the action exists. Never 403 | AC-1, AC-2 | `test` |
| TC-14-2 | P | Change the account type in the profile row, make a request | The new type decides. The type is read from the profile every time, never from the session or a token | AC-4 | `test` |
| TC-14-3 | N | Add a controller method with no decorator | The build fails and names it. The test walks the whole router | AC-3, NFR-32, EV-09 | `test` |
| TC-14-4 | N | Look for a `@Public()` style escape, and try to turn off the router test | Neither exists | AC-3 | `test` |

## 15. US-15 — Add a pot

| # | Kind | Test | Expected | AC | Job |
| --- | --- | --- | --- | --- | --- |
| TC-15-1 | P | Open SC-8, fill both fields, save | Exactly two fields. After saving, SC-1 opens with the new pot picked | AC-2, AC-7 | `e2e` |
| TC-15-2 | N | Empty name, filled room | Refused with a clear message. Focus goes to the name. The room keeps its text | AC-4 | `e2e` |
| TC-15-3 | N | Filled name, empty room | Refused. The room tells two pots with the same name apart | AC-9 | `test`, `e2e` |
| TC-15-4 | N | 61-character name and 61-character room | Both refused. Test 0, 1, 60 and 61 | AC-4, AC-9 | `test` |
| TC-15-5 | P | Two pots, same name, different rooms | Both accepted, no warning | AC-6 | `test` |
| TC-15-6 | P | 30-character Hungarian name in `PotPicker` at 360 px and at 200% zoom | Nothing cut off, nothing overlaps. Use the Hungarian text | AC-5 | `e2e` |
| TC-15-7 | P | New account: count screens from sign-in to the first photo | At most three. **Assumes a screen visited twice counts once** (Cognito → SC-1 → SC-8 → SC-1 = 3). Gate 79 asks 200-product to confirm | AC-8 | `e2e` |
| TC-15-8 | N | As another account, ask for this pot | `not-found`, same body as a missing pot | AC-3, NFR-30 | `test` |

## 16. The 37 "must not" rules, as checks

`02-SPEC.md` §7 lists what the screens must **not** do. Rows that need a size or colour name the
token, not the number, because `03-tokens.md` was not an input (finding 44). The first web task adds
the numbers.

| C | Must not happen | Checked by | Job |
| --- | --- | --- | --- |
| 1 | A percentage or "how sure" number | TC-02-7, and a schema check | `e2e`, `test` |
| 2 | A verdict on `cannot-tell` | TC-05-1 | `e2e` |
| 3 | A verdict outside a `VerdictGroup` with its band | Component test | `test` |
| 4 | A next action on `cannot-tell` | TC-05-1 | `e2e` |
| 5 | A verdict text for an unknown code | TC-02-2 | `test` |
| 6 | An unknown band | TC-02-3 | `test` |
| 7 | Send tapped twice for one assessment | TC-01-9 | `e2e` |
| 8 | A model call before the format and pot checks | TC-01-2, TC-01-4 | `test` |
| 9 | A photo over 1,000 px sent | TC-01-5 | `e2e` |
| 10 | A try-again button where retrying cannot help | TC-09-4, TC-09-8 | `test`, `e2e` |
| 11 | An automatic retry from a screen | Search `apps/web` for retry code, and TC-09-5 | `test` |
| 12 | A photo queued while offline | Offline e2e: nothing is sent or queued | `e2e` |
| 13 | A task from `unsure` with no explicit yes | TC-03-2 | `test` |
| 14 | Any way to create a task on `cannot-tell` | TC-03-4, TC-05-7 | `test`, `e2e` |
| 15 | A task when `followUpDays` is missing or outside 1–30 | TC-02-6, TC-03-5 | `test` |
| 16 | A task for `nothing-wrong` | TC-02-11 | `test` |
| 17 | The word "diagnosis" | TC-04-5, and a search of both message files | `test`, `e2e` |
| 18 | "Safe to eat" or "safe for animals" | TC-06-3, and a search of both message files | `test`, `e2e` |
| 19 | The AI notice hidden | TC-06-1 | `e2e` |
| 20 | A failure shown only by colour or icon | Component test: only `FailureNote` draws failures, and it always has words | `test` |
| 21 | `#FFFFFF` or a white page background | Search the built CSS, and check the page background | `test` |
| 22 | Purple, indigo or a gradient | Search the built CSS, check no token is purple or indigo | `test` |
| 23 | A radius other than `--radius-card` and `--radius-pill` | Search the built CSS | `test` |
| 24 | A shadow other than `--shadow-sheet` on the confirm sheet | Search the built CSS | `test` |
| 25 | A centred hero with one button, or three icon cards in a row | **Review only.** A machine cannot check it, and a fake check is worse | review |
| 26 | An emoji as an icon | Search components and message files | `test` |
| 27 | The accent colour on more than 10% of a screen | At most one `PrimaryButton` visible at a time | `e2e` |
| 28 | A fade-in on load or on a list | The `loading` skeleton has no animation on SC-1 and SC-3 | `e2e` |
| 29 | A hex colour inside a component | A lint rule in `apps/web` | `test` |
| 30 | `outline: none` with no replacement | A lint rule, and a review of copied components | `test` |
| 31 | `user-scalable=no` or `maximum-scale` | Check the viewport meta tag | `e2e` |
| 32 | A tap target under 44 × 44 px, or two closer than 24 px | Playwright over every interactive element | `e2e` |
| 33 | Something reachable only by hover | A keyboard-only pass over the whole flow | `e2e` |
| 34 | A band shown by colour alone | TC-04-1, and check each band's shape | `e2e` |
| 35 | Text that relies on `<html lang>` only | TC-11-8 | `e2e` |
| 36 | "image" as a photo's alt text | `PhotoPreview`'s alt text names the pot | `e2e` |
| 37 | Animation under `prefers-reduced-motion: reduce` | Every duration token is `0ms`; the sheet appears without motion | `e2e` |

## 17. The accessibility checklist, as checks

From `02-SPEC.md` §8 and `02-web-spec.md` §10.

| Rule | Check | Job |
| --- | --- | --- |
| Visible focus ring, 2 px, 3:1 contrast | Tab through every screen; each stop shows the ring from `--focus-ring-*`. The 3:1 needs the token values (finding 44) | `e2e` |
| Tap targets 44 × 44, 24 px apart | Rule 32 above | `e2e` |
| Pinch zoom works | Rule 31 above | `e2e` |
| Text works at 200% zoom | The 44 px verdict with a long Hungarian word: nothing cut off or overlapping | `e2e` |
| Each text block declares its language | TC-11-8 | `e2e` |
| The photo has real alt text | Rule 36 above | `e2e` |
| Verdict and band are read together | One labelled group whose accessible name holds both. Otherwise a screen reader turns an unsure answer into a sure one | `e2e` |
| A failure is described in words | Rule 20 above | `test` |
| Motion respects reduced motion | Rule 37 above | `e2e` |
| Screen order matches markup order | At 600 and 1024 px the markup is verdict, then photo. Only CSS moves the photo | `e2e` |
| A busy button is announced | `PrimaryButton` sets `aria-busy` and changes its label during a send | `e2e` |

## 18. The security checks, adopted from `03-evidence.md`

The command, input and pass/fail rules stay in `03-evidence.md`. This table only says where each
one runs.

| Check | What it proves | Job | Gate |
| --- | --- | --- | --- |
| EV-09 | Every route has a decorator | `test` | Merge |
| EV-10 | The three `sharp` guards are set | `test` | Merge |
| EV-11 | No EXIF in stored or sent photos | `test` | Merge |
| EV-12 | A file that is not an image is refused | `test` | Merge |
| EV-13 | A decompression bomb is refused | `test` | Merge |
| EV-14 | The 180-day rule is in the template | `infra-assert` | Merge |
| EV-15 | The timeouts are in the right order | `test`, `infra-assert` | Merge |
| EV-16 | `LLM_PROVIDER` falls back to the stub | `test` | Merge |
| EV-17 | No secret in the repository | `test`, plus two GitHub settings | Merge |
| EV-18 to EV-24 | Preview checks: no session, other account, cookies, `state`, cross-site post, daily limit, one tap one charge | `e2e` | Merge |
| EV-25 | Prompt injection through a photo and a pot name | `ai-eval`, real model | Release |
| EV-26 | Model text is never run as code | `e2e` | Merge |
| EV-27 | The Content Security Policy is real and the app works | `e2e` | Merge |
| EV-28 | The bucket needs a signed URL | `retention-audit` | Runtime |
| EV-29 to EV-32 | Kill-switch timing, rollback, AWS multi-factor sign-in, model comparison | By hand, once | Release |
| EV-33 to EV-35 | Workflow retry and refund, stream URL, the `api` role | `infra-assert` | Merge |
| EV-36 | A stream with no session answers nothing | `e2e` | Merge |

**Three checks need a fix before they run.** EV-23 expects `201` and `modelCalls` (finding 42).
EV-24 part two must follow gate 76 (TC-09-9, TC-09-10). EV-08 was never run.

**Each check has three empty fields: output, date, result.** Filling them with real output is the
work. A sentence instead of output does not count.

## 19. Traceability — every story and its cases

| Story | Positive | Negative | Metric |
| --- | --- | --- | --- |
| US-01 Send one photo | TC-01-1, 5, 8, 10, 11 | TC-01-2, 3, 4, 6, 7, 9, 12, 13, 14 | M-02 |
| US-02 Verdict, band, action | TC-02-1, 8, 11 | TC-02-2, 3, 4, 5, 6, 7, 9, 10 | M-03 |
| US-03 Care task | TC-03-1, 3, 7 | TC-03-2, 4, 5, 6 | M-01 |
| US-04 `unsure` | TC-04-1, 3, 6 | TC-04-2, 4, 5 | M-17 |
| US-05 `cannot-tell` | TC-05-1, 4, 5, 6 | TC-05-2, 3, 7 | M-04 |
| US-06 AI notice | TC-06-1 | TC-06-2, 3 | M-11 |
| US-07 Sign in, own data only | TC-07-1 | TC-07-2 to 10 | M-06 |
| US-08 Daily limit | TC-08-3, 6 | TC-08-1, 2, 4, 5, 7 | M-14 |
| US-09 Retry message | TC-09-2, 3, 7, 9 | TC-09-1, 4, 5, 6, 8, 10 | M-08 |
| US-10 Photo rules | TC-10-1, 4, 5, 6 | TC-10-2, 3, 7, 8, 9 | M-07 |
| US-11 Two languages | TC-11-1, 2, 5, 6 | TC-11-3, 4, 7, 8 | M-09 |
| US-12 Admin figures | none | none | M-15. Out of run 1 (gate 30) |
| US-13 Kill-switch | TC-13-1, 2, 3, 5 | TC-13-4, 6, 7 | M-10 |
| US-14 Admin refused | TC-14-2 | TC-14-1, 3, 4 | M-18 |
| US-15 Add a pot | TC-15-1, 5, 6, 7 | TC-15-2, 3, 4, 8 | M-23 |

**Some metrics come only from real use.** M-01, M-02, M-20 and M-23 are counted over the first 8
weeks. M-19 is counted over 20 real assessments. A test proves the behaviour exists. Only real use
gives the number. M-15 is out with US-12.

## 20. Cases for an NFR only

Eight cases that belong to no single story. Four positive, four negative.

| # | Kind | Test | Expected | NFR | Job |
| --- | --- | --- | --- | --- | --- |
| TC-NF-02 | P | Read the deadline constant; run a request with a slow step | `REQUEST_DEADLINE_MS` is 20,000, below the 22,000 ms function timeout. The app answers `deadline-passed`, not a platform 504 | NFR-02 | `test` |
| TC-NF-03 | P | Read the model timeout; use a stub that never answers | `MODEL_TIMEOUT_MS` is 18,000, passed as an abort signal per attempt | NFR-03 | `test` |
| TC-NF-05a | N | Search for a second model call or retry code around `LlmProvider` | None. The adapter has `maxRetries: 0`. The SDK retries by default, which would turn 3 calls into 9 | NFR-05 | `test` |
| TC-NF-05b | N | Read the retry list in the CDK output | Only `ProviderTimeout`, `ProviderThrottled`, `ProviderUnavailable`, `Lambda.TooManyRequestsException`. `MaxAttempts: 2`. `retryOnServiceExceptions` off. Type `STANDARD`, no `TimeoutSeconds` — that would skip every `Catch` and leave the row `running` | NFR-05, EV-33 | `infra-assert` |
| TC-NF-10 | P | Compute cost from a recorded `usage` block, one above the limit | Matches the published prices. Cost comes from `usage`, never an estimate. Over-limit calls show in the day total. Stored as whole millionths of a dollar, because adding decimals loses precision | NFR-10 | `test` |
| TC-NF-38 | N | Check which states lead to `Refund` | Only the two refusal branches. Never a state after `Assess` made a call | NFR-38, EV-33 | `infra-assert` |
| TC-NF-50 | P | Measure the gzipped JavaScript for SC-1 | Within the `size-limit` number. 170 KB is a guess; replace it with the real measurement in the first web task | NFR-50 | `bundle-budget` |
| TC-NF-52 | N | Read every workflow file | Each has a `paths` filter | NFR-52 | `test` |

## 21. What this file does not decide

Which defect is fixed first · whether a failing case may ship · whether a pass bar may be lowered ·
the exact words of any sentence · whether the feature ships.
