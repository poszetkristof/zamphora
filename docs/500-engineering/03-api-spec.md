# API spec — `apps/api`

**Written by** 500 Engineering, run 1 (`001-photo-assessment`). **Date:** 2026-08-26.
**Read next by** 800 Infra, 900 Security, 600 QA.

Every route in the product, what it takes, what it answers, and which decorator it carries. The
shapes themselves are in `01-contracts.md`; this file does not repeat them.

**`docs/400-architecture/05-patterns.md` is the authority for the key shapes, the cookies, the answer
schema and the failure names.** Where this file and that one disagree, that one wins.

---

## 1. What `apps/api` is

One Nest.js application, compiled into **one** Lambda function behind an API Gateway HTTP API, using
the Express adapter (ADR-0002). One function, not one per route, so there is one place to look and
one cold start to pay.

It owns everything the browser is not allowed to own: the session, the ownership rule, the daily
limit, the kill-switch and the one model call (ADR-0010). It is the only part of the product with
credentials.

**Base path is `/api`.** CloudFront sends `/api/*` here and everything else to the static web files.
There is no second origin and no CORS configuration anywhere (ADR-0010).

## 2. Every route

`Dec.` is the decorator. **A route with no decorator does not run, for anybody** (ADR-0004,
`05-patterns.md` §3), and a test walks the router on every build to prove none is missing (NFR-32).

| Method and path | Dec. | Takes | Answers | Story |
| --- | --- | --- | --- | --- |
| `GET /api/health` | `@Anonymous()` | — | `200 { ok: true }` | — |
| `GET /api/auth/sign-in` | `@Anonymous()` | `?locale=hu\|en` | `302` to Cognito. Sets `__Host-oauth` | US-07 |
| `GET /api/auth/callback` | `@Anonymous()` | `?code&state` | `302` to `/<locale>`. Sets `__Host-session`, clears `__Host-oauth` | US-07 |
| `POST /api/auth/sign-out` | `@Roles('USER')` | — | `204`. Deletes the session row and clears the cookie | US-07 |
| `GET /api/me` | `@Roles('USER')` | — | `200 MeResponse` | US-07, US-08 |
| `GET /api/pots` | `@Roles('USER')` | — | `200 PotListResponse` | US-01, US-15 |
| `POST /api/pots` | `@Roles('USER')` | `CreatePotRequest` | `201 Pot` | US-15 |
| `POST /api/assessments` | `@Roles('USER')` | `multipart/form-data`: `potId`, `locale`, `photo` | `201 AssessmentResponse` | US-01 to US-06, US-08, US-09, US-11, US-13 |
| `GET /api/assessments/:assessmentId` | `@Roles('USER')` | — | `200 Assessment` | US-02, US-11 |
| `GET /api/assessments/:assessmentId/photo-url` | `@Roles('USER')` | — | `200 PhotoUrlResponse` | US-10 |
| `DELETE /api/assessments/:assessmentId/photo` | `@Roles('USER')` | — | `204` | US-10 |
| `DELETE /api/me/photos` | `@Roles('USER')` | — | `204` | US-10 AC-7 |
| `POST /api/care-tasks` | `@Roles('USER')` | `CreateCareTaskRequest` | `201 CareTask` | US-03 |
| `DELETE /api/care-tasks/:careTaskId` | `@Roles('USER')` | — | `204` | US-03 AC-7 |

**`:assessmentId` and `:careTaskId` are composite and must be URL-encoded.** They are the DynamoDB
sort key without its prefix (`01-contracts.md` §2.1), so they contain a `#`. An unencoded `#` in a
URL starts a fragment and cuts the value in half.

**Thirteen routes and a health check. None of them is an admin route, and that is deliberate.**
The owner moved admin screens and admin routes out of run 1 on 2026-08-26 (gate 30). `@Roles('ADMIN')`
is declared and carried by nothing (`05-patterns.md` §12). Do not build `POST /api/admin/ai-enabled`
or any other admin route in this run (ADR-0009).

**`@Roles('USER')` matches the account type exactly.** In run 1 nobody needs an `ADMIN` account to
use the product: the admin's only path is the AWS website, and the containers diagram draws it
reaching the table directly and never reaching the API.

**Every failure is the `Problem` envelope from `01-contracts.md` §8.** The status codes are in that
same table and are not repeated here. **The API never answers 403** — a row belonging to another
account answers exactly as a row that does not exist (ADR-0004, US-07 AC-2).

## 3. Sign-in, and the two reads on every request

**The protocol is OpenID Connect, authorization code flow with PKCE, against a Cognito user pool,
with this API as the backend for the frontend** (ADR-0003, `05-patterns.md` §2). No access token, ID
token or refresh token ever reaches the browser, a response body, a URL, `localStorage` or
`sessionStorage`. The API is a **confidential** client: it holds the client secret, and it is the
only thing that ever sees a token.

Two cookies, both with the `__Host-` prefix. Both carry `Secure`, `HttpOnly`, `Path=/` and **no**
`Domain` attribute, which is what the prefix requires:

| Cookie | Life | `SameSite` | Holds |
| --- | --- | --- | --- |
| `__Host-oauth` | 10 minutes | `Lax` | The PKCE verifier and the `state` |
| `__Host-session` | 30 days | `Strict` | An opaque session id, and nothing else |

**`__Host-oauth` must be `Lax`.** The return from Cognito is a cross-site top-level navigation, and a
`Strict` cookie is not sent on it, so the flow would break every time. `__Host-session` is `Strict`
because nothing in the product needs it on a cross-site navigation (`05-patterns.md` §2).

**One addition this spec makes, and it is not in `05-patterns.md`:** `__Host-oauth` also carries the
locale the person started from, so the callback knows whether to redirect to `/hu` or `/en`. A person
signing in for the first time has no profile yet, so there is nowhere else to keep it for the ten
minutes it is needed.

**The one cost of `Strict`, named so nobody is surprised.** The 11-month warning email links back
into the app. On that first click the cookie is not sent, so the person sees a signed-out page and is
signed in after one more navigation. That is accepted (ADR-0003, `05-patterns.md` §2).

**Sign-out is a row delete**, not a token to revoke and not a clock to wait out.

### The two reads

Every request that carries a role decorator does two reads, **in this order**:

| # | Item | Key |
| --- | --- | --- |
| 1 | Session | `PK = SESSION#<opaque id>`, `SK = SESSION` |
| 2 | Profile | `PK = USER#<sub>`, `SK = PROFILE` |

**They cannot be one `BatchGetItem`.** That needs every key before it starts, and the profile's key
is inside the session item, which has not been read yet (`05-patterns.md` §1, Q-9). The alternative —
putting the user id in the cookie — is rejected, because it undoes the point of an opaque session.

- The session's expiry is checked **in code**. A session older than 30 days is refused even though
  the row is still in the table, because DynamoDB TTL deletes late (NFR-35, `05-patterns.md` §2).
- **The account type is read from the profile on every request**, never from the session and never
  from a token claim, so a changed account type decides the very next request (US-14 AC-4).
- Neither read is cached (ADR-0002).

**The profile item also holds a language, and nothing in run 1 reads it** (`05-patterns.md` §1). The
locale of a screen comes from the route, and the locale of an assessment comes from the request. The
field is there for a later run; leaving it unread is deliberate, not an oversight.

**The owner id comes from the session and from nowhere else.** Never from a path parameter, never
from a query string, never from a request body (ADR-0004, `05-patterns.md` §3). The repository
layer's key builder takes a branded `UserId`, and `UserId` is only ever created where the session is
read, so a query with no owner does not compile (NFR-30).

## 4. `POST /api/assessments` — the one path that spends money

Every step is in order, and the order is the specification. **Nothing calls the provider around
this.**

| # | Step | Fails with | Why here |
| --- | --- | --- | --- |
| 1 | The guard: session, expiry, profile, account type | `not-signed-in` | No session means no model call, and the guard runs before the controller (US-07 AC-5, NFR-36) |
| 2 | Body size. Reject over `MAX_PHOTO_BYTES` (2 MB) before reading it all | `photo-too-large` | ADR-0007 |
| 3 | Parse the text fields with Zod. `potId` present, `locale` one of two | `no-pot-picked`, `invalid-request` | US-01 AC-3 |
| 4 | Read the pot: `PK = USER#<sub>`, `SK = POT#<potId>` | `not-found` | Ownership is the key, not a check (ADR-0004) |
| 5 | Re-check the photo: type in `ACCEPTED_PHOTO_TYPES`, shorter side ≥ 200, longer side ≤ 1000 | `wrong-format`, `photo-too-small`, `photo-too-large` | A check that only runs in the browser is not a check (ADR-0007). US-01 AC-2, AC-4, AC-5 |
| 6 | Read the kill-switch from the `CONFIG` cache | `feature-off` | US-13 AC-1, AC-3. NFR-34 |
| 7 | **The daily limit: one conditional `UpdateItem`** | `daily-limit-reached` | US-08 AC-1, AC-3. NFR-12. §5 below |
| 8 | Write the photo to S3 at `photos/<userId>/<potId>/<createdAt>.jpg` | `unknown` | ADR-0007, amended 2026-08-26 (gate 38). **The timestamp, not the assessment id** — the id contains a `#` |
| 9 | **One** call to `LlmProvider.assess()`, timeout 18,000 ms | `provider-timeout`, `provider-throttled`, `provider-unavailable`, `provider-bad-request`, `no-credit` | ADR-0005. NFR-03, NFR-04, NFR-05 |
| 10 | Read `stop_reason` **before** the content | `provider-refused`, `answer-truncated` | ADR-0005, `05-patterns.md` §4 |
| 11 | Parse with `ModelAnswer` and run the refinement | `answer-unreadable` | `01-contracts.md` §4.1 |
| 12 | Normalise `followUpDays`: outside 1 to 30 becomes `null` | — **not a failure** | US-03 AC-6 |
| 13 | Compute the cost from the `usage` block the API returned | — | ADR-0006. NFR-10 |
| 14 | Write the assessment item and add to the day rollup | — | §8 below |
| 15 | Answer `201 AssessmentResponse` | — | |

**Six things about this order that are easy to get wrong.**

- **The limit is counted before the call, so a failed call still counts** (US-08 AC-5, ADR-0008).
  The money was spent whether or not an answer came back.
- **The limit is counted before the photo is written**, so a refused request leaves no object behind.
- **The photo is written before the call**, which is the order ADR-0007 sets. A failed assessment
  therefore leaves one object in the bucket. It is covered by the same 180-day lifecycle rule and by
  the same delete-on-demand path, so nothing else has to chase it.
- **A `cannot-tell` answer is a finished assessment, not an error** (US-05 AC-3). It reaches step 14
  and is stored, and the attempt counts against the limit (US-05 AC-5).
- **`followUpDays` is `null` when the verdict is `nothing-wrong`**, and that is a correct answer, not
  a broken one (`05-patterns.md` §4). No task is offered (US-02 AC-7).
- **A failure at any step from 9 to 11 is stored with its reason**, as a failure record and not as an
  assessment, so the count in M-08 can be taken (US-09 AC-6) and NFR-23 can be measured.

**There is no retry. Anywhere.** Not a timeout, not a 429, not a 503, not an unreadable answer
(owner, 2026-08-26; ADR-0005; NFR-05). The Anthropic client is built with `maxRetries: 0`, because
the SDK retries on its own by default and that default would break NFR-04 in silence.

## 5. The daily limit

One atomic conditional increment, in this API, before the model call (ADR-0008,
`05-patterns.md` §5):

```
UpdateItem
  Key                  PK = USER#<sub>, SK = QUOTA#<yyyy-mm-dd>
  UpdateExpression     ADD attempts :one
  ConditionExpression  attribute_not_exists(attempts) OR attempts < :limit
```

- **The day is the UTC calendar day and it is part of the key**, so yesterday's counter is never read
  and never needs clearing. Never compute the day from a timezone sent by the browser — two
  timezones would give one account two resets.
- The condition failing is `daily-limit-reached`, with `quotaResetsAt` in `Problem.details` as the
  UTC instant of the next reset. The screen renders it in the reader's own local time (US-08 AC-2).
- **Never read the counter and then write it back.** Ten requests arriving together must produce
  exactly ten successes, and a read-then-write would let all ten read 9 and all ten proceed. That is
  the exact script this limit exists to stop.
- **Never decrement it when a call fails**, and never cache it (ADR-0002, ADR-0008).
- The item carries a time-to-live so the table does not grow, and **nothing depends on that firing on
  time**.

`GET /api/me` and the `AssessmentResponse` both carry `assessmentsLeftToday`. That number is for
display only — it draws `LimitNote` — and it is never used to decide whether a call may run.

## 6. The kill-switch and the other configuration

Three values live in the `CONFIG` partition and are read on one memory cache in the function
(ADR-0006, ADR-0008, ADR-0009, `05-patterns.md` §6):

| Item | Field | Compiled-in default |
| --- | --- | --- |
| `PK = CONFIG, SK = AI_ENABLED` | `enabled` | `true` |
| `PK = CONFIG, SK = DAILY_LIMIT` | `limit` | `10` |
| `PK = CONFIG, SK = MODEL_ID` | `modelId` | `claude-haiku-4-5-20251001` |

`05-patterns.md` §1 lists only the first of the three. The other two are put in the same partition by
ADR-0006 and ADR-0008, both of which say the value sits beside the kill-switch.

```ts
export const CONFIG_CACHE_MS = 30_000;
```

**30,000 ms, not 60,000.** Gate G-8 promises 60 seconds; thirty leaves the rest as headroom so a
slow read still lands inside the promise (NFR-34). Do not raise it.

Four rules, each one a "do not" in ADR-0009 or ADR-0006:

- **Do not read the row on every request.** The cache is the design.
- **A failed read keeps the last known value.** The switch does not flip itself on a network blip.
- **If there has never been a known value, the call does not run.** A function that cannot read its
  own configuration should not be spending money.
- **Every value is checked against a closed list or a range on read**, and an invalid value falls
  back to the compiled-in default rather than being used. A bad value in this partition would
  otherwise break three things at once.

**The model id is always fully dated.** Never a moving alias such as `claude-haiku-latest`, because a
silent upgrade would move the accuracy measurement with nothing in the repository changing
(ADR-0006).

**The `AI_ENABLED` row holds one field.** `05-patterns.md` §1 still describes it as holding "on or
off, who changed it, when". ADR-0009 was corrected on 2026-08-26 and its summary now says: **do not
add `changedBy` or `changedAt`** — nothing in the application writes this row. The ADR wins.

## 7. Deadlines

**One clock per request, checked before every step that can block** (`05-patterns.md` §7). Three
numbers are stacked and the order matters:

```
30,000 ms   API Gateway cuts the request off. Cannot be raised. Its 504 has a body nobody here wrote
20,000 ms   REQUEST_DEADLINE_MS — the app gives up first and answers `deadline-passed`
18,000 ms   MODEL_TIMEOUT_MS   — the ceiling on the one call that cannot be interrupted any other way
```

```ts
export const REQUEST_DEADLINE_MS = 20_000;   // NFR-02
export const MODEL_TIMEOUT_MS    = 18_000;   // NFR-03
```

`REQUEST_DEADLINE_MS` is applied by one Nest interceptor over the whole request, so no route can
forget it. A unit test asserts it is 20,000 and that it sits below the function's own timeout, which
`06-nfrs.md` NFR-02 names as 22,000 ms and 800 Infra sets.

**`MODEL_TIMEOUT_MS` is a ceiling, not a second clock.** The `AbortSignal` handed to the adapter
fires at whichever comes first: 18,000 ms, or the time left on the request deadline. That keeps
NFR-03's number real and still obeys `05-patterns.md` §7 — **do not give each step its own generous
timeout and hope the total works out.** One clock, checked often, plus one abort on the one step that
waits on somebody else.

## 8. What is written down, so US-12 can be answered later

US-12 has no route in run 1. **The three numbers are still recorded on every assessment**, so the
developer can read them straight from the table with AWS credentials and run the comparison as a
local script (gate 30, ADR-0009, NFR-13).

Every assessment adds to one day rollup item with an atomic `ADD`, so ten at once do not lose a
count:

```
UpdateItem   PK = USAGE, SK = <yyyy-mm-dd>
```

| Field | What it counts | Used by |
| --- | --- | --- |
| `assessmentsStarted` | Requests that passed the daily limit | US-12 AC-1 |
| `modelCalls` | Calls actually made to the provider | US-12 AC-1, AC-2, NFR-13 |
| `costMicroUsd` | **Cost in millionths of a dollar, as a whole number** | US-12 AC-1, NFR-10, NFR-14 |

**The cost is stored in millionths of a dollar and never as a decimal.** `05-patterns.md` §1 fixes
the unit, and the reason it matters here is `ADD`: adding floating-point numbers into one item loses
precision, and one assessment costs about $0.0035, which is 3,500 in this unit. The dollar figure is
made when it is read, not when it is written. The per-call cost is still **computed from the `usage`
block the API returns**, never estimated (ADR-0006).

**The rollup holds numbers only. No photo and no assessment text** (US-12 AC-3).

**One credential deliberately stays off the server.** US-12 AC-2 compares the app's count with
Anthropic's own record, which needs an **admin** API key — a different and stronger credential than
the one the app uses. It does not go on the server. The comparison is a local script
(`05-patterns.md` §12, NFR-13).

### 8.1 The items this API reads and writes

Copied from `05-patterns.md` §1, which is the authority. The sort key prefixes are readable on
purpose, and `GSI1PK` style generic keys are forbidden there.

| Item | PK | SK |
| --- | --- | --- |
| Profile | `USER#<sub>` | `PROFILE` |
| Session | `SESSION#<opaque id>` | `SESSION` |
| Pot | `USER#<sub>` | `POT#<potId>` |
| Assessment | `USER#<sub>` | `ASSESS#<potId>#<iso timestamp>` |
| Care task | `USER#<sub>` | `TASK#<due date>#<taskId>` |
| Today's attempts | `USER#<sub>` | `QUOTA#<yyyy-mm-dd>` |
| A day's usage | `USAGE` | `<yyyy-mm-dd>` |
| Configuration | `CONFIG` | `AI_ENABLED`, `DAILY_LIMIT`, `MODEL_ID` |

**No secondary index in run 1**, and **no second table** — a second table would split the same 25
capacity units (ADR-0002). The first index arrives in run 3, for backbone 6's query across accounts.

## 9. Photos

- One object per photo, in one private bucket, at `photos/<userId>/<potId>/<createdAt>.jpg` — the
  timestamp, **not** the assessment id, which carries a `#` (ADR-0007, gate 38)
  (ADR-0007). **`<assessmentId>` is the composite id**, so the key repeats the pot id and carries a
  `#`. Both are legal in S3 and both must be encoded when the URL is signed. See `01-contracts.md`
  §11 — whether the ADR should be amended is a question for the owner.
- **No thumbnail, no resized copy, no cached copy, no second copy anywhere** (NFR-42,
  `05-patterns.md` §9). US-10 AC-3 says every copy must go, and the cheapest way to satisfy that is
  never to make one.
- **A photo is read through a signed URL that lasts at most 5 minutes.** Never a public object, never
  through CloudFront or any cache.

```ts
export const PHOTO_URL_TTL_MS = 300_000;   // NFR-43
```

- `DELETE /api/assessments/:id/photo` deletes the object **and then** clears the photo key on the
  assessment row, in that order. The assessment text stays and `photoStatus` becomes `removed`
  (US-10 AC-3, AC-4, ADR-0007 point 6).
- `DELETE /api/me/photos` does the same for every assessment of the caller. It is a `Query` under one
  partition with `SK` beginning `ASSESS#`, never a `Scan` (US-10 AC-7).
- A signed URL is only ever produced from a row the caller already owns, so another account's photo
  cannot be reached and the answer is the same as for a photo that does not exist (US-07 AC-2).
- **Deletion at 180 days is an S3 lifecycle rule in CDK. No application code deletes on a schedule**
  (US-10 AC-6, ADR-0007, `05-patterns.md` §9). 800 Infra owns the rule; NFR-40 asserts it on the
  synthesised template.

## 10. `POST /api/care-tasks`

The task route is where three acceptance criteria are enforced at once, and the order of the checks
is the specification:

1. Read the assessment by id, under the caller's partition. Not there → `not-found`.
2. Band is `cannot-tell` → `task-not-possible`. **No way to create a task exists for this band at
   all** (US-03 AC-5).
3. `verdict` is `nothing-wrong` → `task-not-possible` (US-02 AC-7). `followUpDays` is already `null`
   in this case (`05-patterns.md` §4), so the next check would catch it too. Both are written down,
   because the reason a person is refused should be the real one.
4. `followUpDays` is `null` → `task-not-possible` (US-03 AC-6).
5. Band is `unsure` and `confirmedUnsure` is not `true` → `confirmation-required`. **This is the
   whole of NFR-31**, and the web opens SC-6 rather than showing the failure (US-03 AC-4).
6. Write the task at `SK = TASK#<due date>#<taskId>`. `dueDate` is the **UTC calendar day of the
   assessment plus `followUpDays`** (US-03 AC-2). The item carries the pot, the assessment it came
   from and the action text (US-03 AC-3, `05-patterns.md` §1).

**The task date uses the UTC calendar day.** No input names a timezone for it. UTC is chosen so the
product has one definition of "day", the same one the daily limit already uses, and so nothing
depends on a timezone the browser sends (ADR-0008). **This is an assumption and it should be checked
with the owner** — see §13.

`DELETE /api/care-tasks/:id` removes the task and leaves the assessment text alone (US-03 AC-7).

**Nothing in run 1 reads a task back.** The schedule engine and the notification that delivers it are
later runs (US-03, note on the border).

## 11. Logging

800 Infra decides where the logs go and which alarms read them. This section says what the API must
put in them, because two requirements depend on it.

**Always recorded, on every assessment:** the assessment id, the pot id, the failure code if there
was one, the model id, the input and output token counts, the computed cost, and the duration of each
step in §4.

**The provider failures are recorded by their own names**, even where the person sees one screen for
several of them. `provider-timeout`, `provider-throttled` and `provider-unavailable` are three
different events, and so are `provider-refused`, `answer-truncated` and `answer-unreadable`. That
difference is the whole signal for 800 Infra, and NFR-23 counts two of them apart (ADR-0005,
`05-patterns.md` §8).

**Never logged:** the photo bytes, the pot name, the next-action text, the verdict sentence, any
cookie value, and any token. A pot name is typed by a person and can hold anything, and the photo is
of the inside of a home.

**Nothing records who flipped the kill-switch**, because nothing in this application runs when it
happens. AWS keeps its own record of the console change (ADR-0009, gate 30).

## 12. Story to endpoint

| Story | Endpoint |
| --- | --- |
| US-01 Send one photo of one named pot | `POST /api/assessments`, `GET /api/pots` |
| US-02 Verdict, band, action, follow-up | `POST /api/assessments`, `GET /api/assessments/:id` |
| US-03 Turn the action into a task | `POST /api/care-tasks`, `DELETE /api/care-tasks/:id` |
| US-04 An `unsure` result, honestly | `POST /api/assessments` (band `unsure`), `POST /api/care-tasks` |
| US-05 `cannot-tell` with a reason | `POST /api/assessments` (band `cannot-tell`) |
| US-06 Know it came from an AI model | `POST /api/assessments`, `GET /api/assessments/:id` — the answer carries `writtenInLocale`, and the two notice lines are drawn from message files |
| US-07 Sign in once, see only my own | `GET /api/auth/sign-in`, `GET /api/auth/callback`, `POST /api/auth/sign-out`, `GET /api/me`, **and the guard on every other route** |
| US-08 Stopped at my own limit | `POST /api/assessments` (429), `GET /api/me` |
| US-09 A message that says if trying again helps | **Every route.** The `Problem` envelope carries `retryHint` |
| US-10 How long photos are kept, and delete | `GET /api/assessments/:id/photo-url`, `DELETE /api/assessments/:id/photo`, `DELETE /api/me/photos` |
| US-11 Hungarian or English | Every route takes or returns a `Locale`. The API sends codes, never prose |
| US-12 An admin reads the figures | **No endpoint.** Moved out of run 1 by the owner, gate 30. The three numbers are written on every assessment (§8) and read from the table |
| US-13 The feature can be turned off | **No endpoint.** The row is edited in the AWS website. Its effect is step 6 of §4 |
| US-14 A normal account is refused | **No endpoint of its own, and that is the point.** It is the global guard, applied to all thirteen routes, plus the router test (NFR-32) |
| US-15 Add a pot | `POST /api/pots`, `GET /api/pots` |

**Three stories have no endpoint, and all three are decisions rather than gaps.** US-12 and US-13
were moved out by the owner on 2026-08-26 (gate 30). US-14 is a property of every route, not a route
of its own — its acceptance criterion 3 is about the admin route that does not exist yet, which is
exactly why the guard has to be right now.

## 13. What this file does not decide

The function timeout, the memory size and the log destination, which are 800 Infra's · whether SSE-S3
is enough, which ADR-0007 hands to 900 Security · the unit test runner · whether the care task date
should follow the reader's timezone instead of UTC · whether ADR-0007's photo key should be amended
now that the assessment id is composite.
