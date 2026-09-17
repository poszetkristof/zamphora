# Assets — what this product has that is worth protecting

**Written by** 900 Security, run 1 (`001-photo-assessment`). **Date:** 2026-09-01.
**Updated 2026-09-17, twice.** First for ADR-0014 to ADR-0016, then by an audit of the whole pack.
Both sets of corrections are listed in §6, as the rule in "How this file grows" asks.
**Read next by** 600 QA, and by 900 Security on every later run.

Security work has to start from a list of things. Without one, every review turns into an argument
about what matters. This file is that list. It names what the product holds, who it belongs to,
how long it lives, and **how much is lost if it goes wrong, as a number**.

An **asset** is anything an attacker would want, or anything whose loss would hurt. It is not only
data. Money is an asset here, and so is the ability to turn the feature off.

---

## How this file grows

**This file belongs to the whole product, not to one feature.** Every row below stays true after
run 1 finishes. A later run **adds** rows and **adds** a section at the bottom. It never rewrites
the register and never deletes a row that an earlier run wrote.

The rule for a later run:

1. Read this whole file first.
2. Add new assets to the register in §2, with the run that added them in the last column.
3. Add a new section at the bottom, named for that run's feature.
4. If a fact in an old row is now wrong, correct that row **and say in the new section that you
   corrected it, and why**. Do not delete the old fact silently.

---

## 1. What an asset row means, and the two numbers on it

Every row carries two things a normal data list does not.

**How long it lives.** Personal data that has no end date is a promise nobody can keep. Every row
says either a number of days or the event that ends it.

**Blast radius, as a real number.** "Many users could be affected" is not a number. In run 1 this
product has **one account**, because self sign-up is off and the owner creates every account by
hand (`docs/800-infra/01-iac-plan.md` §4.3, gate 49). So most rows say "1 person". That is not a
reason to relax. It is the honest size of the loss today, and it is the number that changes first
when the product opens to other people.

**Where the counts come from.** A person may run 10 assessments a day (`factory/feature.md`,
2026-08-24). A photo is kept 180 days (`factory/feature.md`, 2026-08-24). So the largest number of
photos one account can hold is **10 × 180 = 1,800**. Real use is expected at about 30 assessments a
month (`factory/feature.md`), which is about **180 photos in six months**. Both numbers appear
below, because the first is the ceiling and the second is what will actually be there.

---

## 2. The asset register

**C, I, A** are the three properties each row needs most: **C**onfidentiality (nobody else sees
it), **I**ntegrity (nobody else changes it), **A**vailability (it is there when needed). The letters
in bold are the ones that matter most for that row.

| # | Asset | Where it lives | How long it lives | Blast radius, as a number | Most needs | Added by |
| --- | --- | --- | --- | --- | --- | --- |
| A-01 | The plant photo | S3, one private bucket, `photos/<userId>/<potId>/<createdAt>.jpg` | 180 days, then an S3 lifecycle rule deletes it (ADR-0007) | 1 person. At most 1,800 photos; about 180 in six months | **C** | run 1 |
| A-02 | The place the photo was taken (EXIF GPS) | Only in the bytes that arrive. Removed by the re-encode at step 5b | Should be zero seconds. It must never reach the bucket or the provider | 1 person's home address | **C** | run 1 |
| A-03 | The assessment text and the history it builds | DynamoDB, `USER#<sub>` / `ASSESS#...` | As long as the pot exists. No clock (ADR-0007, `factory/feature.md`) | 1 person. About 180 rows in six months | **C**, I | run 1 |
| A-04 | The pot names and rooms | DynamoDB, `USER#<sub>` / `POT#...` | As long as the account exists | 1 person. A room name says something about a home | C | run 1 |
| A-05 | The session cookie value | The browser (`__Host-session`), and one row `SESSION#<id>` | 30 days (gate G-7) | 1 person. Holding it gives every screen and every photo for up to 30 days | **C** | run 1 |
| A-06 | The Cognito account: email and password | The Cognito user pool | Until the account is deleted | 1 person. Holding it gives everything A-05 gives, and it does not expire | **C** | run 1 |
| A-07 | The Cognito app client secret | Parameter Store, `SecureString` | Until it is rotated. **No rotation is planned** | The whole sign-in flow. It makes the API a confidential client (ADR-0003) | **C** | run 1 |
| A-08 | The Anthropic API key used by the server | Parameter Store, `SecureString`, cached in the memory of **the `assess` function only** (corrected 2026-09-17, §6). The `api` function's role cannot read it | Until it is rotated. **No rotation is planned** | The whole Anthropic balance: **$5**, which is about **1,250 assessments** on Haiku 4.5 | **C** | run 1 |
| A-09 | The Anthropic **admin** API key | The owner's own machine only. Never on a server, never in CI (`03-api-spec.md` §8) | Until it is rotated | The whole Anthropic organisation account, not only this project | **C** | run 1 |
| A-10 | The Anthropic credit balance | The Anthropic account. Topped up by hand | Until it reaches zero | **$5.** At zero the feature goes dark and stays dark until a person pays | **A** | run 1 |
| A-11 | The AWS account and its credit | AWS | The free window ends **2026-12-31** (`factory/feature.md`) | **$200 of credit.** When it is gone the account **closes** and takes the table, the bucket and the user pool with it | **A** | run 1 |
| A-12 | The AWS console sign-in of the owner | The owner | Until it is changed | Everything in A-11, plus the only way to flip the kill-switch (ADR-0009) and the only admin path (`02-containers.mmd`) | **C**, **I**, **A** | run 1 |
| A-13 | The two GitHub deploy roles | AWS IAM, assumed with OpenID Connect (`00-environments.md` §9) | Until they are deleted | Everything in A-11. A deploy role can create and change every stack | **C**, **I** | run 1 |
| A-14 | The three `CONFIG` rows: `AI_ENABLED`, `DAILY_LIMIT`, `MODEL_ID` | DynamoDB, `PK = CONFIG` | Until a person edits them | The kill-switch, the daily spend ceiling and which model answers. A wrong value breaks three things at once (ADR-0009) | **I**, **A** | run 1 |
| A-15 | The daily attempt counter | DynamoDB, `USER#<sub>` / `QUOTA#<date>` | One UTC day, plus a time-to-live for tidying | The spend ceiling for one account: 10 assessments × up to 3 calls × $0.0040 = **$0.12 a day** on Haiku 4.5 (corrected 2026-09-17, §6) | **I** | run 1 |
| A-16 | The day usage rollup: calls and cost | DynamoDB, `PK = USAGE` | No end date set. Numbers only, no photo and no text (US-12 AC-3) | The only record of what was spent. Losing it means US-12 cannot be answered | I | run 1 |
| A-17 | The specifications in `docs/` | This repository, which is **public** (gate 47) | Forever | None, on purpose. See §5 | — | run 1 |
| A-18 | The model's answer, as a value that writes a care task | In flight, then the assessment row | As long as A-03 | 1 person's plant. A wrong verdict said with confidence is the product's own worst outcome | **I** | run 1 |
| A-19 | The state machine definition and its `Retry` cap | CDK, in git, and the deployed state machine | Until it is changed by a deploy | A changed `MaxAttempts` is a cost control removed in silence: 10 photos a day × more calls each, against the **$5** balance | **I** | 2026-09-17 |
| A-20 | The `watch` function's URL | AWS, reachable only through CloudFront with origin access control | Until the function is deleted | If it became public, anybody could hold a 55-second stream open against the Lambda allowance, and read an assessment by guessing its id under a stolen session | **C**, **A** | 2026-09-17 |

**Two rows are worth reading twice.**

**A-02 is the sharpest one in the list.** A phone photo of a plant on a windowsill carries the GPS
position of the window. That is a home address, arriving in a file the person did not know carried
it. The design already removes it, by decoding and re-encoding the photo on the server
(`03-api-spec.md` §4b). This register exists partly so nobody removes that step to save 200 ms.

**A-11 is not a normal money row.** This AWS account does not send a bill. It **closes**. So a cost
problem here is an availability incident, not an accounting one — the product stops existing. That
is why cost appears in a security document at all.

---

## 3. The trust boundaries in `02-containers.mmd`

A **trust boundary** is a line where something stops being under our control, or where one side has
a permission the other side does not. Every threat in `01-threats.md` sits on one of these lines.

Every arrow in `docs/400-architecture/02-containers.mmd` is covered below. TB-15 is not an arrow in
that diagram; it comes from `docs/800-infra/00-environments.md` §9, and it is a real boundary, so it
is here too.

| # | The line | What crosses it | Who is on the untrusted side |
| --- | --- | --- | --- |
| TB-1 | The public internet → `edge` (CloudFront) | Every request the product ever sees | Anybody on the internet |
| TB-2 | `edge` → `web` (the static bucket) | The built HTML, CSS and JavaScript | Nobody. Read through origin access control only |
| TB-3 | `edge` → `api` (`/api/*` → API Gateway → Lambda) | Every request that can change data or spend money | Anybody on the internet, signed in or not |
| TB-4 | `web` (the browser) → `edge` | Every value the screens read and write | **The browser is untrusted.** A script is not the browser |
| TB-5 | `api` → `table` | Sessions, profiles, pots, assessments, tasks, the counter, `CONFIG` | The API is trusted here. Its execution role is the boundary |
| TB-6 | `api` → `photos` | The re-encoded photo, and a 5-minute signed read URL | Same. The signed URL crosses back out to the browser |
| TB-7 | `api` → `llm adapter` (a package border) | The re-encoded photo bytes, the plant nickname, the language | **The photo and the nickname are untrusted input** |
| TB-8 | `llm adapter` → Anthropic Messages API | The photo, the nickname, the prompt. Back: the answer | **A third party, outside the EU.** The answer is untrusted |
| TB-9 | The plant keeper → Cognito | Email and password, on Cognito's own pages | The person, and anybody pretending to be them |
| TB-10 | `api` → Cognito | The one-time code, the client secret. Back: the ID token | Cognito is trusted. The code arriving at the callback is not |
| TB-11 | The admin (the developer) → the AWS console | The kill-switch edit, and reading the usage rows | AWS credentials. **This path never touches the product** |
| TB-12 | The AWS console → `table` | Direct reads and writes on any row | Same. No guard, no application log (gate 30) |
| TB-13 | `api` → email delivery | The 11-month warning | **Not built in run 1** (gate 29). Named so it is not forgotten |
| TB-14 | `contracts` → `web` and `api` | Every schema, at build time | A build-time border, not a run-time one |
| TB-15 | GitHub Actions → AWS | A deploy, and a whole preview environment | **The repository is public, so anybody can open a pull request** |
| TB-16 | `edge` → `watch` (the one stream path → a Lambda Function URL) | A session cookie and an assessment id in. A stream of state events out | Anybody on the internet, signed in or not. **Added 2026-09-17** |
| TB-17 | `api` → `workflow` (`StartExecution`) | The assessment key. Nothing from the browser goes into the run's input except that key | The API is trusted here. Its role may start this one machine and nothing else |
| TB-18 | `workflow` → `assess` | The assessment key. Back: a parsed answer, a named failure, or one of three thrown errors | The workflow is trusted. `assess` has the smallest role in the product and the only model key |
| TB-19 | `workflow` → `table` | The state, the answer, the rollup, the refund | The workflow's own role, on the assessment, counter and rollup rows only |

**TB-4 is drawn on purpose.** ADR-0010 gives the web app no role, no client and no credential. So
the browser is on the far side of a real line, and every check that matters runs on the API side of
it. `03-api-spec.md` §4 steps 2 and 5 already re-check what the browser checked, for exactly this
reason.

**TB-12 is unusual and it is not a mistake.** The admin path deliberately goes around the product.
That removes a whole class of risk — there is no admin route to attack, because there is no admin
route. It adds one: nothing in the application records that the kill-switch was flipped.

---

## 4. What is deliberately not an asset

Saying what does **not** need protecting is as useful as the list above, because it stops a later
reader adding a control that buys nothing.

| Not an asset | Why |
| --- | --- |
| The specifications in `docs/` | The repository is public (gate 47). **Nothing in this design relies on being secret.** The key shapes, the deadlines, the daily limit and the failure names are all public and all still work. That is the correct property to have |
| The system prompt | It is a module-level constant with no secret in it (`03-api-spec.md` §4c). It is in a public repository. Losing it costs nothing |
| The `assessmentId` and `careTaskId` values | They are opaque to the browser and only work under the caller's own partition key. Holding somebody else's id gets you the same answer as holding a made-up one (ADR-0004) |
| The photo object key | The bucket is private and the key contains a Cognito `sub`, which is a UUID. There is no path that reads an object without a signed URL |
| The account type on a run-1 screen | No run-1 response carries one (`01-contracts.md` §2.2). There is nothing to leak |

---

## 5. What run `001-photo-assessment` added

This was the first run, so it created every row above. Three of them exist **because** this feature
was chosen first, and a later run should know that:

- **A-01 and A-02, the photo and the place it was taken.** No other backbone feature takes a
  photograph. Watering intervals and placement advice hold no image at all.
- **A-08 and A-10, the model key and the credit balance.** This is the first feature that spends
  money per use. Backbone features 1, 2, 4 and 5 do not call a model.
- **A-14, the kill-switch.** A switch only exists because there is something worth switching off.

**One asset this run did not create and a later run will:** the push subscription for backbone
feature 6. It is named in this role's contract as one of this product's assets, and run 1 does not
have one, because notification delivery is out of scope (`factory/feature.md`). **The run that adds
notifications adds that row here.**

---

## 6. What the 2026-09-17 architecture change added and corrected

On 2026-09-17 the owner moved the assessment into a background workflow (ADR-0014), the result onto
a stream (ADR-0015), and allowed a refund when no call was made (ADR-0016). Still inside run 1, so
the rows carry the date instead of a run name.

**Corrected.** A-08 said the model key was cached in "the function's memory", meaning the one API
function. There are now four functions, and only `assess` can read the key. That is the change
gate 70 asked for, and it shrinks the blast radius of T-19 in `01-threats.md`.

**Corrected 2026-09-17, second pass.** A-15 said the daily ceiling for one account was
10 × $0.0040 = $0.040 a day. That arithmetic assumed one model call per assessment, which was true
until ADR-0014. One assessment may now take three calls, so the ceiling is **$0.12 a day**. The
counter still counts assessments started, not calls, so the limit of ten has not changed — only what
ten of them can cost. `02-cost-guardrails.md` §5 and `01-threats.md` T-43 already use $0.12.

**Added.** A-19, the state machine and its retry cap, because a retry cap is a cost control and a
cost control is an availability asset on this account. A-20, the `watch` function's URL, because a
Function URL is a second front door and has to be known as one. TB-16 to TB-19, the four new lines
in `02-containers.mmd`.

**Not an asset, and said so.** The dead-letter queue holds only the identifiers of failed events,
never a photo or a name. The EventBridge rule carries no data of its own.
