# Pre-mortem — why this feature failed

**Written by** a fresh reviewer with no history on this project. **Date:** 2026-08-25.
**Read next by** 500 Engineering, 800 Infra, 900 Security, 600 QA, and the owner.

This document does one job. It stands in August 2027 and assumes the photo-assessment feature
failed. It works backwards and says why. Every failure below is tied to a number, a step, a box or
a score that these six files actually contain:

`00-options.md` · `01-context.mmd` · `02-containers.mmd` · `05-patterns.md` · `06-nfrs.md` ·
`001-photo-assessment/03-flow.md`

Nothing else in the repository was read. That is on purpose. Where the design only makes sense with
a fact that lives somewhere else, the gap is written down as a finding, not looked up. Section 6
lists everything I could not judge for that reason.

**A note on tone.** The architecture pack is careful. It labels its own guesses, it cites sources
with dates, and it writes down what it does not decide. That is unusually good. None of it protects
the feature from the thirteen failures below, and a pre-mortem that praised the labelling would be
useless. So this document is only about what breaks.

---

## 0. What happened to these findings

**Added 2026-08-26. This file is a record of what a fresh session found, and it is not edited to
match the fixes.** Read it as history. This table says where each one ended up.

| Finding | What happened |
| --- | --- |
| F-1 model slower than 8,000 ms | **Fixed.** With no retry the model has room to about 18,000 ms. `03-flow.md` §6 |
| F-2 every constant obeyed, promise still broken | **Fixed.** The deadline is 20,000 ms and the cold start is budgeted outside it. `03-flow.md` §4 |
| F-3 no cap on the photo in bytes | **Open.** For 500 Engineering to put in the contract |
| F-4 CloudFront answers 504 first | **Open.** For 800 Infra, which sets the distribution timeouts |
| F-5 Q-9 cannot be one `BatchGetItem` | **Fixed.** Two reads in order. `05-patterns.md` §1 |
| F-6 account closes with nothing running | **Open.** A schedule question, and the owner's |
| F-7 the retry breaks the cost ceiling | **Fixed.** The retry is gone, decided 2026-08-26 |
| F-8 quality bars cost the whole budget | **Open.** For 600 QA, which owns the eval plan |
| F-9 photos outlive their accounts | **Open.** Gate 29 — nothing sends the warning mail |
| F-10 kill-switch cache moves the question | **Open.** Recorded, accepted for run 1 |
| F-11 nothing stops AWS money | **Open.** For 800 Infra, and the reason cost is a correctness property |
| F-12 photos rejected, sideways, or with a home address | **Open.** For 900 Security and 500 Engineering |
| F-13 the same photo assessed twice | **Open.** For 500 Engineering |

**Its one recommended first change — drop the retry — was taken.**

---

## 1. Thirteen ways it failed

Each one has four lines: **how likely**, **how bad**, **the earliest signal**, and **what would
have to change**. The earliest signal is the point of the whole exercise. A failure you can only
see at the end is a failure you cannot prevent.

Likelihood is `high` / `medium` / `low`. Damage is `fatal` (the feature does not ship or does not
work), `bad` (it ships and disappoints), or `costly` (it works but eats money or time).

---

### F-1 — The model was slower than 8,000 ms, so every assessment failed instead of being slow

> **FIXED 2026-08-26.** With no retry the model has room to about 18,000 ms. `03-flow.md` §6.

`03-flow.md` step 10 budgets **8,000 ms** for the model call and labels it *"Guessed. No source at
all. The weakest number here."* `06-nfrs.md` NFR-03 then sets the per-attempt timeout at
**9,000 ms**, and says out loud that 9,000 was chosen "because that is what leaves room for the
retry, not because 9,000 is a nice number".

Those two numbers are 1,000 ms apart. That is the entire margin for error on a number with no
source. If a real Haiku 4.5 vision call with a 1,296-token image plus a prose answer in Hungarian
takes 10 seconds, then:

- attempt 1 is cut off at 9,000 ms → `provider-timeout`
- the code waits 1,000 ms and retries
- attempt 2 is cut off at 9,000 ms → `provider-timeout`
- the user sees a failure screen, and **two** attempts have been taken off their daily ten

The feature does not get slower. It stops working, for everyone, all the time. And it burns the
daily limit twice as fast while doing it.

`03-flow.md` §6 says *"If the model call turns out to take 15 seconds instead of 8, the budget
breaks"* and calculates 39,230 ms. That calculation is wrong about what actually happens. The
budget does not break, because the 9,000 ms timeout never lets a 15-second call finish. What breaks
is the success rate, and it goes to zero. The file names the right measurement and then describes
the wrong failure.

- **How likely:** high. Nobody has made one call. The number is admitted to have no source.
- **How bad:** fatal.
- **Earliest signal:** the very first real model call, timed. Not a test — one `curl`.
- **What would have to change:** make that call before any more of the pack is written, and before
  the 9,000 ms constant enters any code. See section 5.

---

### F-2 — Every server constant was obeyed and the 30-second promise still broke

> **FIXED 2026-08-26.** The deadline is 20,000 ms and the cold start is budgeted outside it,
> because the app cannot start its clock until the function has started. `03-flow.md` §4.

This is an arithmetic problem inside `03-flow.md`, and it survives because the file checks the
friendly worst case instead of the permitted one.

`05-patterns.md` §7 and `06-nfrs.md` NFR-02 set one server deadline at **24,000 ms**. That is a
permission: the handler is allowed to take 24,000 ms and still be correct.

Now add the parts of `03-flow.md` §2 that are **outside** that deadline, at their own budget
values:

| Step | Where | Budget |
| --- | --- | --- |
| 1 — check format and shorter side | Browser | 20 |
| 2 — resize | Browser | 400 |
| 3 — send the photo | Network | 4,000 |
| 14 — answer travels back | Network | 200 |
| 15 — paint the result | Browser | 100 |
| | **Client and network total** | **4,720** |

4,720 + 24,000 = **28,720 ms**. Add step 4, the cold start, at its 800 ms budget:
**29,520 ms**. The promise is 30,000.

**The design's own worst legal case leaves 480 ms.** Not 4,770 ms. `03-flow.md` §3 reports 4,770 ms
of headroom, but that figure comes from a run where the model answers in 8,000 ms. The 24,000 ms
deadline permits far more than that and nothing in the pack forbids it.

There is a second problem stacked on the first. §4 computes the server's share as
25,230 − 20 − 400 − 4,000 − 200 − 100 = 20,510 ms. That subtraction leaves the 800 ms cold start
**inside** the server's 24,000 ms. But `05-patterns.md` §7 says the deadline is "set when the
request arrives", and a handler cannot set a deadline before the function that holds it exists. So
either the cold start is inside the deadline (and the handler must read the gateway's own request
time, which no file says it does) or it is outside (and the real ceiling is 24,800 ms). **Nobody
wrote which, and the unanswered question is 800 ms — bigger than the 480 ms of slack that is left.**

- **How likely:** high. Nothing here needs an unlucky day. It needs the deadline to be used.
- **How bad:** bad. Users meet the failure screen on a network the design says it supports.
- **Earliest signal:** `perf-flow` in CI would not catch it, because NFR-01 pins the stub to
  8,000 ms. The signal is the first real assessment on a phone on 400 kbps, timed end to end.
- **What would have to change:** derive the server deadline from the promise, not from the platform.
  Today 24,000 comes from "stay under API Gateway's 30 seconds". It should come from
  "30,000 minus the measured client and network share, minus the cold start". Then check that the
  result is still under the gateway ceiling. The order is backwards.

---

### F-3 — Nothing caps the photo in bytes, so the upload budget was fiction

`03-flow.md` step 3 budgets 4,000 ms for the upload and shows the working: *"About 200 KB. 1 Mbps
up gives 1.6 s, 400 kbps gives 4 s."* The arithmetic is right — 400 kbps is 50 KB/s, and
200 ÷ 50 = 4. `06-nfrs.md` NFR-01 then tests the whole 30-second budget with *"a fixed 200 KB
photo"*.

**No file in this pack caps a photo in bytes.** The only rule is a pixel rule: at most 1000 px on
the longer side (`02-containers.mmd`, `03-flow.md` step 2). Pixels are not bytes. A 1000×1000 JPEG
at high quality is 300–600 KB. A 1000×1000 PNG is 1–3 MB. And the accepted input list is JPEG,
PNG, GIF and WebP (`00-options.md` §8) — no file says which format the browser re-encodes **to**
after the resize. If the answer is "the same format it came in", a PNG stays a PNG.

At 400 kbps, the numbers are:

| Photo size after resize | Upload time at 400 kbps |
| --- | --- |
| 200 KB (the assumed size) | 4.0 s |
| 400 KB | 8.0 s |
| 1 MB | 20.0 s |
| 3 MB (a 1000 px PNG) | 60.0 s |

The 30-second promise dies somewhere between the second and third row, and the user never sees a
message, because the request has not reached the app yet.

There is a hard ceiling underneath as well. The photo travels in the request body to a Lambda
function. **Lambda's synchronous invocation payload limit is 6 MB and cannot be raised**, and API
Gateway's request body limit is 10 MB, also fixed
([Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html),
[API Gateway quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html),
both checked 2026-08-25). API Gateway base64-encodes a binary body into the Lambda event, which
adds about 33%, so the real ceiling is around 4.5 MB of photo. A 1000 px PNG from a modern phone can
reach it.

- **How likely:** high. The rule that exists (pixels) does not control the thing that matters (bytes).
- **How bad:** bad, and silent. A failure before the request arrives has no `FailureNote`, which
  breaks US-09 AC-1 in a place the pack never looks.
- **Earliest signal:** log the byte size of the resized photo on the very first real assessment.
  One number, printed once.
- **What would have to change:** add a byte cap next to the pixel cap, in the same rule
  (`00-options.md` §8 lists three plain-code checks before the model call — this is a fourth). Name
  the output format of the resize. Re-encode to JPEG or WebP at a fixed quality, and loop the
  quality down until the file is under the cap.

---

### F-4 — CloudFront answered 504 before the app could, and the pack only counted API Gateway

`03-flow.md` §4 is careful about one ceiling: *"An API Gateway HTTP API has a maximum integration
timeout of 30 seconds, and it cannot be raised."* That is correct — HTTP APIs are fixed at 30
seconds, and only regional and private REST APIs can be raised past 29
([API Gateway quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html),
[AWS re:Post](https://repost.aws/knowledge-center/api-gateway-timeout-limit), checked 2026-08-25).
The whole three-number table — 24,000 / 26,000 / 30,000 — is built on it.

But `02-containers.mmd` puts a box in front of API Gateway: `edge`, *"CloudFront, one domain"*, and
every `/api/*` request goes through it. **CloudFront has its own origin response timeout. The
default is 30 seconds.** It can be raised to 60 seconds, and above that only with a quota increase,
to a maximum of 180
([CloudFront origin settings](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html),
[AWS re:Post](https://repost.aws/knowledge-center/cloudfront-custom-origin-response), both checked
2026-08-25).

So there are **three** ceilings, not two, and the pack names two. Worse, CloudFront's clock starts
earlier than API Gateway's: CloudFront is waiting for the origin from the moment it forwards the
request, while API Gateway's integration timeout only starts once it invokes the function. Add the
cold start and the two are not the same 30 seconds.

When CloudFront gives up it returns its own error page — HTML, not the app's `problem+json`, and
certainly not a sentence ending in one of the two required by US-09 AC-1. That is the exact failure
`03-flow.md` §4 exists to prevent, arriving through the door it did not lock.

- **How likely:** medium. It needs a slow request, which F-1 and F-2 both produce.
- **How bad:** bad. It also makes the failure hard to read: the app's logs show a request that
  finished, and the user saw an AWS error page.
- **Earliest signal:** an assessment where the app's log says it answered in about 25 seconds and
  the user says they saw an error page. If those two ever disagree, this is why.
- **What would have to change:** name CloudFront's response timeout as a fourth constant in the
  table in §4, set it explicitly in the CDK rather than taking the default, and put it above the
  gateway's 30 seconds so the gateway is always the tighter of the two. Then the pack's one-ceiling
  reasoning becomes true again.

---

### F-5 — Q-9 cannot be one `BatchGetItem`, and the pattern says it is

> **FIXED 2026-08-26.** Two reads in order, and the cookie still carries nothing. `05-patterns.md` §1.

`05-patterns.md` §1 gives the key design:

| Item | PK | SK |
| --- | --- | --- |
| Profile | `USER#<sub>` | `PROFILE` |
| Session | `SESSION#<opaque id>` | `SESSION` |

and then answers Q-9 — *"Session and account type"* — with **"One `BatchGetItem` for both items"**.
`03-flow.md` step 5 budgets it as one call, 12 ms typical, 15 ms budget, and the sequence diagram
draws it as one arrow.

This does not work. `BatchGetItem` needs every key up front. The profile key is `USER#<sub>`. The
`sub` is stored **inside the session item**, which is the other half of the same batch. The cookie
is described in §2 as *"one cookie carrying an id that means nothing on its own"*, so the browser
does not supply the `sub` either.

Reading a session therefore takes two round trips, not one, and they cannot be parallel. Every
request pays it.

The milliseconds are small. The reason it belongs on this list is what it says about the rest: this
is the single most-repeated operation in the product — `00-options.md` §1 marks Q-9 as running
"every request" — and the pack's data design does not support it. If the most common operation was
not checked against the key layout, the less common ones were not either.

There is a second-order effect worth naming. The obvious fix is to put the `sub` in the cookie
alongside the session id. That would work, and it would quietly undo §2's *"an id that means
nothing on its own"*, which is one of the reasons the Backend-For-Frontend shape was chosen. The
fix has to be made on purpose.

- **How likely:** certain. It is a contradiction inside one file.
- **How bad:** costly, not fatal. Two reads instead of one, and one design claim that has to be
  re-decided.
- **Earliest signal:** the first time anyone writes the key builder. It cannot be written.
- **What would have to change:** either store the profile under `SESSION#<id>` as a second item so
  one `Query` gets both, or accept two sequential reads and correct the 12/15 ms in `03-flow.md`
  and the claim in `05-patterns.md`. Both are fine. Silently doing one while the document says the
  other is not.

---

### F-6 — The AWS account closed on 2026-12-31 and there was still no running code

This one is not about the architecture. It is about the calendar the architecture is written
against, and it is derivable from numbers inside these files.

`00-options.md` §3 C-1: *"The account was opened 2026-07-01, so the window ends 2026-12-31."* The
pack is dated 2026-08-25. That is **128 days**. `06-nfrs.md` NFR-14 measures Anthropic spend over
`2026-07-01 to 2026-12-31` — the measurement window and the life of the cloud account are the same
window.

On the day this pack was written, the state was: four roles still to run (500, 600, 800, 900), no
code, no deploy, no CDK, and — by `00-options.md` §3 C-3 — one part-time developer with *"Nest.js
and AWS both listed as things to learn rather than things known"*.

The pack also opens at least five gates that are still open: 26 (option A versus D), 27 (the
lifecycle grace), 28 (the language of an old assessment), 29 (the admin key), 30 (no availability
target). `00-options.md` §6 says gate 26 *"is a stop-and-ask"* and then continues on Option A.
Whatever the right answer is, the design is standing on a question it says must be asked.

- **How likely:** high.
- **How bad:** fatal, and it costs the feature everything downstream of a deploy: NFR-06's real
  cold start, step 10's real model latency, step 3's real upload spread, NFR-50's real bundle size.
  All six of the pack's admitted guesses are only replaced by running code.
- **Earliest signal:** it is already visible. 128 days, four roles, zero lines.
- **What would have to change:** put a date on the first deploy and treat it as the constraint the
  documents are written against. `00-options.md` §10 says the build order and the release date are
  not this document's to decide — true, and that means somebody else has to decide them now, not
  later.

---

### F-7 — The cost ceiling was broken by the retry, on a path the design calls normal

> **FIXED 2026-08-26.** The owner dropped the retry. One model call per assessment. `03-flow.md` §3.

Two requirements in `06-nfrs.md` contradict each other:

- **NFR-10:** *"Cost of one **assessment** ≤ $0.0040 on Haiku 4.5"*
- **NFR-04:** *"Attempts per **assessment**: at most 2"*

A retried assessment makes two model calls. Both are billed. So a designed, expected, tested path
produces an assessment that costs roughly twice the ceiling. NFR-10 is not a ceiling; it is a
ceiling for the half of the cases that do not retry.

The published prices make the margin thin even for one attempt. Claude Haiku 4.5 is $1.00 per
million input tokens and $5.00 per million output tokens. Claude counts an image as
`⌈width / 28⌉ × ⌈height / 28⌉` visual tokens, so a 1000×1000 photo is 36 × 36 = **1,296 tokens**
— the vision page lists exactly that figure
([Vision](https://platform.claude.com/docs/en/build-with-claude/vision), checked 2026-08-25).

| Part of one attempt | Tokens | Cost |
| --- | --- | --- |
| The photo, 1000×1000 | 1,296 in | $0.00130 |
| Prompt, plant name, answer schema | ~900 in | $0.00090 |
| The answer, six fields with prose | ~250 out | $0.00125 |
| **One attempt** | | **≈ $0.0035** |
| **One attempt plus a retry** | | **≈ $0.0070** |

$0.0035 is under $0.0040. It is under it by 13%, which is not a margin — it is a rounding error on
a token estimate.

And one token count is not the same for both languages. `05-patterns.md` §10 says `nextAction` is
prose, written by the model in the reader's language. Hungarian generally costs more tokens than
English for the same sentence. **NFR-10 is one flat number with no language in it**, and the
`ai-eval` golden set will almost certainly be labelled in one language, so the measured cost will
be the cheaper one.

- **How likely:** high for the retry case (NFR-04 designs it in), medium for the token estimate.
- **How bad:** costly. It compounds with F-8 and F-11.
- **Earliest signal:** the `usage` block on the first real call. NFR-10 already says the cost is
  computed from `usage` and never estimated — good — so the number arrives on day one, if anybody
  looks at it.
- **What would have to change:** state whether NFR-10 is per attempt or per assessment, and pick
  per attempt so it can be measured against one `usage` block. Then add a second number for the
  assessment, at twice the first. Measure both languages.

---

### F-8 — The quality bars could not be reached, because reaching them costs the whole budget

`06-nfrs.md` §1 is honest about the arithmetic and then does not follow it through.

- The golden set is **40 photos**. One `ai-eval` run is 40 × $0.0040 = **$0.16**. Correct.
- Nightly would be $0.16 × 30 = **$4.80 a month**, *"which is the entire credit balance"*. Correct.
- So `ai-eval` runs **on demand only**.

Follow that one step further. NFR-20 and NFR-21 both require *"≥ 8 in 10"* agreement, measured by
`ai-eval`. Prompts do not reach that bar on the first try. Getting there means changing the prompt
and running the set again. Every iteration is $0.16. Ten iterations — which is few, for a vision
prompt that must produce ten verdict codes, three bands, four refusal reasons and prose in two
languages — is **$1.60**, a third of the entire NFR-14 budget of $5.00, spent before one real user
has assessed one real plant.

The balance figures also disagree with each other. `06-nfrs.md` NFR-14 says under $5.00, which at
$0.0040 buys **1,250 attempts**. `00-options.md` §8 argues against a chain of two calls because it
*"doubles the cost of every assessment against a balance of a few hundred calls"*. A few hundred
and 1,250 are not the same balance. One of the two arguments is built on the wrong figure, and
§8's rejection of the second call is the one that leans on it.

There is a third problem, and it is about counting rather than money. NFR-20's window is *"the
first 20 real assessments"*. NFR-22 caps `cannot-tell` at 3 in 10. So in 20 assessments, up to 6
are `cannot-tell` and an unknown share are `unsure`. The `likely` verdicts that NFR-20 actually
measures might be 6 or 8 of the 20. **"8 in 10" measured on 6 samples means one disagreement is a
17% miss.** The bar cannot be read at the stated volume.

- **How likely:** high.
- **How bad:** bad. The two numbers that say whether the feature is any good become unmeasurable,
  and the design's own §4 note says a model hiding behind `cannot-tell` *"fails quietly"*.
- **Earliest signal:** the first `ai-eval` run. Count how many of the 40 come back `likely`. If it
  is under 20, NFR-20 has no sample.
- **What would have to change:** separate the eval budget from the product budget, so prompt work
  does not spend the users' calls. Give NFR-20 a minimum sample size, not just a ratio. And say who
  sources and labels 40 photos of sick houseplants — nothing in the pack assigns that work, and it
  is days, not hours.

---

### F-9 — Photos outlived the accounts that made them, and no code could delete them

`05-patterns.md` §9 is the clearest position in the pack: *"Deletion belongs to the storage rule,
not to code."* A photo goes at 180 days by an S3 lifecycle rule. Nothing else deletes anything.

Now read `02-containers.mmd`:

```
Rel(api, photos, "PutObject once. Signs a 5-minute read URL when a screen needs the picture", "AWS SDK, IAM role")
```

**There is no `DeleteObject` anywhere in the pack.** No arrow, no operation, no route. Three things
follow, and all three are bad:

1. **Orphan photos.** `03-flow.md` step 8 writes the photo to S3 **before** the model call at step
   10. Every failed call — `provider-timeout`, `provider-refused`, `answer-truncated`, a passed
   deadline — leaves a photo in the bucket with no assessment row pointing at it. Nothing knows it
   is there. It sits for 180 days. Given F-1, that could be every photo.
2. **Account deletion cannot finish.** `01-context.mmd` names the 11-month warning and the 12-month
   deletion. Deleting an account deletes rows under `USER#<sub>`. The photos are objects in a
   bucket, keyed by something no file describes, and there is no delete path. A deleted account's
   photos stay for up to 180 more days. A photograph of the inside of someone's home is personal
   data — `05-patterns.md` §2 says so itself, in the sentence that justifies the whole sign-in shape.
3. **The "no second copy" promise is not quite true.** §9 says the cheapest way to satisfy US-10
   AC-3 is never to make a copy. But the browser caches the image it fetches from the signed URL.
   That is a copy, on a device, that the app cannot reach. NFR-42 tests that no *code path* writes
   a second copy, which is a different claim from the one on the screen.

- **How likely:** high for orphans (it needs one failed call), certain for account deletion.
- **How bad:** bad, and it is the one on this list with a legal edge to it.
- **Earliest signal:** count objects in the bucket against assessment rows in the table. They
  should match. On day one they will not.
- **What would have to change:** write the photo **after** a successful answer, not before — the
  bytes are already in memory and nothing before step 11 needs them in S3. That removes the orphan
  case entirely and costs nothing. Then add an explicit delete for account deletion, and say in
  ADR-0007 that the lifecycle rule is the floor, not the only mechanism.

---

### F-10 — The kill-switch cache moved the hard question instead of answering it

`05-patterns.md` §6 rejects reading the switch on every request with this reason:

> with no cached value, somebody has to decide what happens when that read itself fails, on or off,
> and there is no good answer to write down.

Caching does not remove that question. It moves it to the refresh. At 31 seconds old, the cached
copy has expired, a request arrives, the re-read is attempted, and DynamoDB returns an error. Now
somebody has to decide: serve the stale value (and break the 60-second promise in gate G-8 if the
switch was just turned off) or refuse (and turn a brief database blip into a feature outage).
**The pack does not write down which.** It says the caching made the question go away, and it did not.

There is a second, sharper problem next to it. `05-patterns.md` §3 makes a strong claim:

> **Whose data this is** is not a check at all. It is the partition key.

That is true for everything under `USER#<sub>`. It is **not** true for the two partitions that
carry no owner: `CONFIG` (the kill-switch) and `USAGE` (the money figures). Those are protected by
exactly one mechanism — the `@Roles('ADMIN')` decorator. And NFR-32 tests only that *"every route
carries `@Anonymous()`, `@Roles('USER')` or `@Roles('ADMIN')`"*. A route that flips the kill-switch
and is decorated `@Roles('USER')` by mistake **passes NFR-32**. The test checks that a decorator
exists, not that it is the right one.

So the product's strongest safety claim ("true by construction") does not cover the two rows an
attacker would most want, and the test that backs it up cannot tell a correct decorator from a
wrong one.

- **How likely:** medium for the failed refresh, low but severe for the wrong decorator.
- **How bad:** bad. The kill-switch is the only lever the owner has over spending.
- **Earliest signal:** for the refresh, the first DynamoDB throttle or timeout in the logs — look at
  what the request did next. For the decorator, nothing signals it. That is the problem.
- **What would have to change:** write the failed-refresh rule into ADR-0009 as a named choice with
  a reason. And make the admin routes carry a second, different guard — for example, the route
  handler also asserts the profile's account type on the item it just read — so one wrong decorator
  is not the whole defence.

---

### F-11 — The kill-switch stops Anthropic money. Nothing stops AWS money, and AWS closes the account

`CLAUDE.md` and `00-options.md` §3 C-1 agree on the stakes: the free plan gives $200 of credit and
then **closes the account**. `00-options.md` §6 repeats that a shape which spends while idle
"is spending it on nothing".

Every control in this pack points at the wrong meter:

| Control | What it limits | Which money |
| --- | --- | --- |
| Daily attempt counter, 10/day (NFR-12) | Model calls per **signed-in account** | Anthropic credit |
| Kill-switch (NFR-34) | Model calls | Anthropic credit |
| `no-credit` failure (`05-patterns.md` §8) | Nothing — it reports | Anthropic credit |
| NFR-14, under $5.00 | Nothing — *"a number to watch, not a number that is enforced"* | Anthropic credit |

**Not one of them limits AWS spend.** Yet AWS is the account that closes. Lambda invocations,
CloudFront requests, DynamoDB reads, S3 `PutObject` calls and CloudWatch log ingestion all happen
before the daily limit is reached and continue after the kill-switch is off. `05-patterns.md` §3
allows `@Anonymous()` routes, so some traffic never touches the counter at all. A crawler, a
mistaken client retry loop, or a script pointed at the CloudFront domain drives AWS cost with every
model-side control switched off.

Two smaller things sit under the same heading, and both undercut C-1's score of **5** for Option A:

- **"Nothing runs between requests" is not the same as "nothing is charged between requests."**
  A domain name and a Route 53 hosted zone are monthly charges. So is whatever stores the Anthropic
  API key. So is CloudWatch log storage, which grows forever unless a retention period is set —
  and no file in this pack sets one. `00-options.md` scores B at **1** on this constraint and
  admits *"The exact monthly figures were not checked first-party and are not written here."* The
  gap between 5 and 1 was decided without a single price.
- **`00-options.md` §10 says which hosting product runs the Next.js server is not decided.** The
  `web` box in `02-containers.mmd` is in the path of every screen, and its cost, its cold start and
  its idle charge are all unknown. **Option A won the cost constraint with one of its two compute
  boxes unpriced.**

- **How likely:** medium for a real runaway, high for the slow leak (logs, monthly charges).
- **How bad:** fatal. `CLAUDE.md` is right that a closed account is an availability incident.
- **Earliest signal:** AWS Budgets at $5, $20 and $50 of the $200. It costs nothing and it is the
  only thing on this list that gives warning rather than a post-mortem.
- **What would have to change:** the pack needs an AWS-side ceiling that is not the credit balance.
  A per-account throttle on the CloudFront distribution and the HTTP API, a CloudWatch log retention
  period on every log group, and a budget alarm. `06-nfrs.md` §10 hands alarms to 800 Infra — fine,
  but the architecture should name the requirement, because right now no document owns it.

---

### F-12 — The photos were rejected, sideways, or carried the user's home address

Four separate problems, all in one place: what happens to the file between the shutter and the API.

**The format list rejects the phone that most people hold.** `00-options.md` §8: *"the file must be
one of JPEG, PNG, GIF or WebP"*. That list is copied from Anthropic's supported formats, and it is
correct for the API ([Vision](https://platform.claude.com/docs/en/build-with-claude/vision), checked
2026-08-25). It is not the right list for a **file picker on a phone**. iPhones store photos as
HEIC. Whether the browser hands your app a JPEG or the original HEIC depends on the browser, the
picker and the setting. Nothing in the pack says what happens when it is HEIC, and step 1 rejects
it before a byte is sent — *"A refusal here costs nothing"*, says the sequence diagram, which is
true about money and false about the user.

**Rotation.** Phone photos carry EXIF orientation. A browser canvas resize commonly drops it. So
the plant arrives sideways, and Anthropic's own page lists *"rotated"* images among the conditions
where the model *"might hallucinate or make mistakes"*, and says plainly that **"Claude does not
parse or receive any metadata from images"** (same page, checked 2026-08-25). No file mentions EXIF.

**The 200 px floor sits exactly on the documented danger line.** `00-options.md` §8 requires the
shorter side to be at least 200 px. The same Anthropic page names *"very small images under 200
pixels"* as an accuracy limit. The floor is at the edge of the problem, not above it. Worse, the
rule is on the *shorter side only* and the resize rule is on the *longer side only*, so a
200 × 1000 px sliver of a stem passes both. That image is 8 × 36 = 288 visual tokens — very little
for the model to work with, and it counts straight against NFR-22's ceiling of 3-in-10
`cannot-tell`.

**EXIF and privacy.** Phone photos can carry GPS coordinates. Nothing in the pack says the resize
strips EXIF, and the resized photo is what gets written to S3 for 180 days. `05-patterns.md` §2
justifies the whole sign-in design by saying *"A photograph of the inside of someone's home is
personal data"*. The coordinates of that home are worse, and no line of these six files touches them.

- **How likely:** high for rotation and HEIC, medium for GPS, medium for the sliver.
- **How bad:** bad. It shows up as "the AI is not very good", which is the hardest failure to
  diagnose and the easiest to blame on the model.
- **Earliest signal:** look at the first ten stored photos with your own eyes, and run `exiftool`
  over them. If any is sideways or carries a location, this is happening.
- **What would have to change:** re-draw the photo through a canvas at a fixed orientation, which
  strips EXIF and fixes rotation in the same operation. Add HEIC handling or say out loud that it
  is rejected. Put a floor on the shorter side **after** the resize, not before, and put a floor on
  total pixels rather than on one side.

---

### F-13 — The same photo was assessed twice and paid for twice

`03-flow.md` §5 draws one `POST /api/assessments` and nothing else. There is no request id, no
idempotency key, no "have I already seen this?" step.

The design's own budget says the upload takes up to 4,000 ms on a weak signal, and §3 says the
4,770 ms of headroom *"belongs to step 3"* because the signal is *"the number with the widest
spread and the least control"*. A weak signal is exactly the condition where a user taps twice, or
where the browser or the phone re-sends a request whose answer never arrived.

Every duplicate is a full second run: a second `UpdateItem` on the quota, a second photo in the
bucket, a second model call, a second assessment row, a second charge. The user sees one result and
loses two of their ten attempts.

- **How likely:** medium, rising with every second of F-1 and F-2.
- **How bad:** costly. It also quietly breaks NFR-13's *"difference = 0"* reconciliation in the
  user's mind, though not in the arithmetic.
- **Earliest signal:** two assessment rows for one pot within a few seconds of each other.
- **What would have to change:** the browser generates an id per shutter tap and sends it. The
  handler writes the quota increment and the assessment under that id with a condition that it does
  not already exist. `05-patterns.md` §5 already uses a conditional write — this is the same tool
  applied one step earlier.

---

## 2. The numbers that do not survive contact

`03-flow.md` §6 and `06-nfrs.md` §8 both list their own guesses, which is good practice and rare. I
checked the arithmetic in both files and then asked a harder question of each guess: **what breaks
if this number is wrong by a factor of two?**

### The arithmetic is correct

I re-added every column. All of it holds:

- §2 typical: 10+250+1,600+0+12+0+15+80+0+6,000+5+15+12+120+60 = **8,179** ✓
- §2 budget: 20+400+4,000+800+15+15+20+100+1,500+8,000+25+20+15+200+100 = **15,230** ✓
- Steps 1–8 budget = **5,370** ✓ · steps 11–15 budget = **360** ✓
- §3 retry case: 5,370+1,500+9,000+1,000+8,000+360 = **25,230**, headroom 30,000 − 25,230 =
  **4,770** ✓
- §4 server share: 25,230 − 20 − 400 − 4,000 − 200 − 100 = **20,510** ✓
- NFR-11: 40 × $0.0040 = **$0.16** · × 30 = **$4.80** ✓

**No addition in the pack is wrong. Every conclusion drawn from those additions is about the wrong
case.** §3 adds up a run where the model answers in 8,000 ms. The constants permit a 9,000 ms
attempt and a 24,000 ms request. Those are different runs, and only the friendly one was added up.
See F-2.

### At 2× — which guesses are fatal and which are noise

| Guess | Where | At double | Verdict |
| --- | --- | --- | --- |
| **8,000 ms model call** | flow step 10 | Every call is cut off at the 9,000 ms attempt timeout | **Fatal.** Not slower — broken. F-1 |
| **4,000 ms upload** | flow step 3 | Worst legal case 29,520 → **33,520 ms**. Past the promise | **Fatal.** And 2× is only a 400 KB photo. F-3 |
| **$0.0040 per attempt** | NFR-10 | $5.00 buys 625 attempts. One user at the daily limit empties it in **63 days** | **Fatal.** Permanent `no-credit`, no alarm. F-7, F-11 |
| **800 ms cold start** | flow step 4 | Eats 800 ms of the 480 ms that F-2 leaves | **Fatal on its own.** The slack is already gone |
| **400 ms resize** | flow step 2 | Eats 400 ms of the same 480 | **Survives alone. Does not survive with anything else** |
| **1,500 ms schema compile** | flow step 9 | 25,230 → 26,730. Still inside 30,000 | **Safe.** The one guessed number that is |
| **170 KB bundle** | NFR-50 | 340 KB gzipped at 400 kbps ≈ **6.8 s** before the first screen | **Bad, and invisible.** See below |
| **1 in 100 unreadable** | NFR-23 | 2 in 100 | **Noise.** Nothing depends on it |

**Three guesses share one pot of slack, and the pack promises the whole pot to one of them.**
`03-flow.md` §3 says *"The headroom is not spare — it belongs to step 3."* The upload, the resize
and the cold start are three separate guesses that all draw on the same 4,770 ms, and once the
deadline is used as permitted (F-2) there is 480 ms left, not 4,770. Any two of them being modestly
wrong at the same time ends the promise.

**NFR-50 is worse than "least sure of".** `06-nfrs.md` §7 calls 170 KB *"the number this document
is least sure of"* and treats it as a size question. It is a time question that sits **outside every
budget in the pack**. `03-flow.md` §1 starts the clock *"the moment the operating system hands the
photo file back to the app"* — so the app is already open and already loaded. On a first visit, on
the 400 kbps network the pack designs for, 170 KB gzipped is about 3.4 seconds of loading before
anything at all appears, and the user is counting from when they opened the app, not from the
shutter. The chosen clock is defensible and the file argues for it well. Nobody wrote down that it
hides the whole first visit.

**Two documents disagree about the size of the balance.** NFR-14 says under $5.00, which is 1,250
attempts at $0.0040. `00-options.md` §8 says *"a balance of a few hundred calls"*. That is a 3×
disagreement between two files written the same day by the same role, and §8's rejection of a
second model call rests on the smaller figure.

**The daily limit does not defend the total budget.** NFR-12 permits 10 attempts per account per
day. 10 × $0.0040 × 184 days (2026-07-01 to 2026-12-31) = **$7.36 for one single user staying
inside every rule.** The ceiling in NFR-14 is $5.00. The only reason the two do not collide is that
nobody is using the app.

---

## 3. What the diagrams do not show

`02-containers.mmd` states its own rule in a comment: *"Every box below has at least one arrow. No
connection is described in prose that has no arrow."* Judged against that rule, here is what is
missing.

**1. There is no arrow from `web` to `api`.** The `web` box's own description says it *"fetches
every value from the api"*. No such arrow exists. This is not tidiness — it hides a real decision
nobody has made. Either the browser calls `/api/*` through the edge (and the `web` box does not
fetch anything; the browser does, which changes how every screen is written) or the Next.js server
calls the api server-to-server and must forward the `__Host-session` cookie (which changes the
cookie handling, the render model and the latency of every page). The two answers produce different
applications. The diagram shows neither.

**2. The `api → table` arrow lists three operations and the design needs seven.** The arrow says
*"GetItem, Query, and one atomic conditional increment"*. `05-patterns.md` §1 requires `PutItem`
(Q-5, Q-7), `BatchGetItem` (Q-9) and `Scan` (Q-11), and §2 requires a delete for signing out. Four
operations the diagram does not carry. The one that matters most is `Scan`: it is the only operation
in the product that reads across all accounts, and it is invisible.

**3. Nothing runs the monthly jobs.** Q-11 (accounts idle 11 or 12 months) runs *"once a month"*.
NFR-41's `retention-audit` runs *"Scheduled, monthly"* against the real bucket. There is no
scheduler box, no second function, and no arrow. Both jobs also need credentials that `infra-assert`
was deliberately designed to avoid needing — NFR-41 says so directly: *"Cannot run without AWS
credentials."* Long-lived AWS keys in GitHub Actions on a personal free account is a decision, and
it has not been drawn or named.

**4. There is no `DeleteObject`, anywhere.** Covered in F-9. The diagram is the reason it was
possible to miss.

**5. The Anthropic API key has no home.** `llm adapter` talks to `anthropic` over HTTPS. Where the
key lives — Secrets Manager, SSM Parameter Store, a Lambda environment variable — is not shown, and
each answer has a different monthly cost and a different security position. `05-patterns.md` §12 is
careful about the *admin* key ("That key does not go on the server") and silent about the one that
does.

**6. The signed S3 URL breaks the one-origin claim.** `edge` is described as *"One origin for the
whole product"*, and that claim carries real weight — it is what removes CORS and permits the
`__Host-` cookie prefix. But `api → photos` signs a five-minute read URL, so the browser fetches
the photo directly from S3, on a different host, outside CloudFront. That is a second origin, it
needs a content-security-policy entry, and it is not on the diagram.

**7. `contracts` and `llm` are drawn as containers and they are not.** In C4, a container is
something that runs. These are npm packages that compile into `api`. Drawing them as peers of
`api`, `web` and `table` will make 800 Infra ask whether they get their own function and their own
deploy. They do not.

**8. Nothing shows how many of anything.** Lambda scales out. `05-patterns.md` §6 caches the
kill-switch *"in memory in the function"* — one copy per execution environment, and the diagram's
single `api` box makes that look like one cache. It also makes the daily counter look safe by
drawing one writer, when the real guarantee comes from the conditional write and not from the shape.

**9. No error paths.** `05-patterns.md` §8 defines twelve named failures. The sequence diagram in
`03-flow.md` §5 draws the happy path plus three `Note over` boxes. Twelve failure names, twelve
screens, and no arrow for any of them.

**10. Neither diagram shows the deadline.** The 24,000 ms deadline is the single most important
rule in the design — everything in `03-flow.md` §4 exists to serve it. It is prose in two files and
it appears in no picture.

---

## 4. The one thing I would change first

**Take the retry out of run 1.**

Not the model call. Not the architecture. The retry — the second attempt described in
`03-flow.md` §3, NFR-04 and `05-patterns.md` §8.

Here is what one change does:

- **It removes F-1 completely.** The 9,000 ms per-attempt timeout only exists to leave room for a
  second attempt. `05-patterns.md` §7 says exactly that: *"The model attempt gets 9,000 ms because
  that is what leaves room for the retry."* With no retry, the single attempt gets the whole
  remaining budget — about 18,000 ms — and a model that takes 12 seconds produces a **slow answer**
  instead of a guaranteed failure. That is the difference between a feature that disappoints and a
  feature that does not work.
- **It buys back the time F-2 lost.** 5,370 + 1,500 + 18,000 + 360 = 25,230 ms, the same total as
  today, but now spent on answering instead of on waiting to fail.
- **It fixes F-7 by arithmetic.** With one attempt, NFR-10's $0.0040 and NFR-04 stop contradicting
  each other. One assessment, one call, one price.
- **It doubles what the daily limit means.** `05-patterns.md` §5 admits the counter counts attempts,
  so *"A user whose calls all need a retry gets five assessments that day, not ten."* Ten attempts
  becomes ten assessments.
- **It is the smallest change on this list.** Delete a constant, delete a branch, delete three rows
  from the "auto retry? yes" column. Nothing else in the pack moves.

**Why this one and not the measurement.** Making the first real model call is the more urgent
*action*, and section 1 names it as the earliest signal for F-1, F-3 and F-7. It is not a *change*
— it is the thing that tells you which changes are needed. The retry is the one design decision that
can be made **before** the measurement and is right either way. If the model turns out to be fast,
you add the retry back in run 2 with a real number under it. If it turns out to be slow, removing
the retry is what stops the feature failing 100% of the time while you find that out.

`03-flow.md` §3 already says the doubling wait *"becomes right in run 3, when the assessment runs in
the background and nobody is standing there."* The same sentence applies to the retry itself. It is
a run-3 idea that has been budgeted into run 1, and paying for it costs the run-1 user 9,000 ms of
their 30 seconds and half of their daily limit.

---

## 5. What I could not judge

These six files do not contain the answer, and I did not go and look. Each one is a gap in the pack,
not a gap in my reading — a reader in six months will hit the same wall.

**Everything the pack cites but does not carry.** `factory/feature.md` is quoted twenty-odd times as
the source of the 30 seconds, the two attempts, the 10 a day, the 60-second kill-switch, the 30-day
session, the 180 days, and the six split-readiness rules. `00-prd.md`, `01-user-stories.md`,
`01-CONTEXT.md`, `02-SPEC.md` and `00-context-brief.md` are the source of every AC reference. So
**I cannot tell whether any acceptance criterion is actually satisfied.** Every US-nn and AC-n above
is taken on trust. If one of those documents says something different, some of this pre-mortem is
aimed at the wrong target.

**The credit balance.** NFR-14 says under $5.00. `00-options.md` §8 says "a few hundred calls". The
real figure is in `factory/feature.md`. Until it is in an architecture file, the whole cost argument
in `06-nfrs.md` §3 rests on a number the reader cannot see. **I could not judge whether the feature
is affordable, only that the pack disagrees with itself about it.**

**Every ADR.** Eleven ADRs are named in `00-options.md` §7 and cited throughout. The decisions, the
rejected alternatives and the "do not" clauses are all in them. So I could not check: whether
ADR-0009 answers the failed-refresh question in F-10; whether ADR-0007 has a delete path missing
from F-9; whether ADR-0002 explains the session key layout that F-5 says cannot work; whether
ADR-0011's component library is settled.

**How the photo actually travels.** The pack shows one `POST` with the photo in it. It never says
`multipart/form-data` or base64 JSON, and the two have different size limits and different memory
costs in the function. F-3's 6 MB Lambda ceiling is real either way, but the margin depends on this.

**Where the Next.js server runs.** `00-options.md` §10 lists it as not decided. That is honest and
it is also a hole in a document whose whole argument is about cost while idle and time to first
byte. **The winning option's cost score cannot be checked until this is answered.**

**Whether gate 26 was ever answered.** `00-options.md` §6 says the one-point gap between Option A
and Option D *"is a stop-and-ask"*, records it as gate 26, and continues on A. Whether a human
answered it lives in the run ledger, which I did not read. If nobody has, then everything downstream
of `02-containers.mmd` is built on an open question.

**The design spec.** `02-SPEC.md` is referenced for SC-1 to SC-7, for the failure-state table in
`05-patterns.md` §8, and for the withdrawn `unreadable-answer` state. **I could not check whether
the twelve failure names have twelve screens.** The pack admits one does not.

**Anthropic model pinning.** `00-options.md` §7 says the model is *"Haiku 4.5 until the measurement
exists"*. Anthropic's structured-outputs page lists support against the dated snapshot
`claude-haiku-4-5-20251001` rather than a floating alias
([Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs),
checked 2026-08-25). Which string goes in the code is a 500 Engineering decision that no file here
makes, and `05-patterns.md` §4 rule 1 — *"Make a bad answer nearly impossible"* — depends on it.

**One good thing I checked and could not break.** `05-patterns.md` §4 and `03-flow.md` §5 both use
`output_config.format`. That is the current parameter name; the older `output_format` is deprecated,
and no beta header is required any more. Haiku 4.5 is on the supported list. And §4's claim that
numeric ranges cannot go in the schema is correct — numerical constraints such as `minimum` and
`maximum` are documented as not supported, which is why the 1-to-30 check belongs in Zod (same page,
checked 2026-08-25). The grammar-compile behaviour in step 9 checks out too: compiled grammars are
cached for 24 hours from last use, and the cache is thrown away whenever the schema structure
changes — so every prompt iteration in F-8 pays the compile cost again. **This part of the pack is
right, and it is right for the reason it gives.**

---

## Sources

Every outside fact asserted above, with the date it was checked. Anything not on this list is
either arithmetic done here or a quotation from the six files.

- [AWS Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html) —
  synchronous invocation payload 6 MB, request and response. Checked 2026-08-25.
- [Quotas for an HTTP API in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html)
  and [AWS re:Post](https://repost.aws/knowledge-center/api-gateway-timeout-limit) — HTTP API
  maximum integration timeout 30 seconds, cannot be increased; request body 10 MB. Checked
  2026-08-25. **This confirms the pack's own claim in `03-flow.md` §4.**
- [CloudFront origin settings](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html)
  and [AWS re:Post](https://repost.aws/knowledge-center/cloudfront-custom-origin-response) —
  origin response timeout defaults to 30 seconds, raisable to 60, and to 180 only with a quota
  increase. Checked 2026-08-25.
- [Anthropic vision](https://platform.claude.com/docs/en/build-with-claude/vision) — visual tokens
  are `⌈width / 28⌉ × ⌈height / 28⌉`; a 1000×1000 image is 1,296 tokens; supported formats are
  JPEG, PNG, GIF, WebP; *"Claude does not parse or receive any metadata from images"*; accuracy
  limits name *"rotated"* images and *"very small images under 200 pixels"*. Checked 2026-08-25.
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
  — `output_config.format` is current and needs no beta header; `claude-haiku-4-5-20251001` is on
  the supported list; numerical and string-length constraints are not supported; compiled grammars
  are cached 24 hours from last use and the cache is invalidated when the schema structure changes.
  Checked 2026-08-25.
- Claude Haiku 4.5 pricing, $1.00 per million input tokens and $5.00 per million output tokens.
  Checked 2026-08-25 against Anthropic's published model pricing.
- [Amazon Cognito pricing](https://aws.amazon.com/cognito/pricing/) — 10,000 monthly active users
  free on the Lite and Essentials tiers. Checked 2026-08-25. **This confirms the pack's claim in
  `00-options.md` §5.**

**Unchecked claims, named as unchecked.** I did not verify the AWS free plan's $200-then-close
behaviour, the Cognito free tier's non-expiry, the DynamoDB TTL delay, or the IETF browser-apps
draft. All four are cited in the pack with links and dates, and no failure above depends on any of
them.
