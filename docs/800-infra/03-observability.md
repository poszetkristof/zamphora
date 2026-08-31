# Observability — what is recorded, what raises an alarm, and what is deliberately not watched

**Written by** 800 Infra, run 1 (`001-photo-assessment`). **Date:** 2026-08-27.
**Updated** 2026-08-27 with the owner's answers to gates 43 to 61.
**Read next by** 900 Security, 600 QA.

This file says where the logs go and which numbers are measured. It lists the ten alarms. It says
which questions can be answered afterwards. It solves one problem. Several requirements in
`06-nfrs.md` are marked "runtime only", which means no test can check them. If nothing records them,
they are not requirements at all.

**The free CloudWatch allowance shapes this whole design, and that is said up front.** Ten custom
metrics and ten alarms is the budget (`02-cost-guardrails.md` §2). Everything below is chosen inside
it.

---

## 1. There is no availability target, so nothing here watches uptime

`06-nfrs.md` §9 is clear and the owner closed it as gate 31 on 2026-08-26: **there is no
availability target in run 1.** The reasoning is written there in full — one user, no second copy of
anything, nobody on call, a model balance topped up by hand, and an AWS account that ends on
2026-12-31 by design.

That decision has a direct effect on this file. **Every alarm below is about money or about
correctness. None of them is about uptime.** Building an alarm against an availability promise that
does not exist would be building against a fiction, and `06-nfrs.md` says so in those words.

**The trigger to change this is the day the app is offered to a second person.** That is the same
trigger as gate 5 and as the admin route in ADR-0009, and all three should be answered together.

## 2. What the API must put in a log line

`03-api-spec.md` §11 sets this, and it is repeated here because the alarms depend on it.

**Always recorded, on every assessment:**

- the assessment id
- the pot id
- the failure code, if there was one
- the model id
- the input and output token counts
- the computed cost
- the duration of each of the fifteen steps in `03-api-spec.md` §4

**Recorded by their own names, never merged.** The person sees one screen for several failures. The
log keeps them apart:

```
provider-timeout   provider-throttled   provider-unavailable
provider-refused   answer-truncated     answer-unreadable
```

`03-api-spec.md` says why: *"That difference is the whole signal for 800 Infra."* A rise in refusals
and a rise in timeouts are two different problems with two different answers. NFR-23 counts
`answer-unreadable` and `answer-truncated` apart for the same reason.

**Three more events the circuit breaker adds** (gate 50, `02-cost-guardrails.md` §5). Each is one
log line with its own fixed `msg`, so the whole life of a breaker can be read back:

| Event | When | Also carries |
| --- | --- | --- |
| `breaker.opened` | The fifth failed model call in a row | The five failure codes, and the moment it may next test |
| `breaker.rejected` | A request arrived while it was open | Nothing else. This is a count, not a story |
| `breaker.test` | The one call let through after 10 minutes | Whether it worked, and so whether service returned |

**Never logged:**

- the photo bytes
- the pot name — a person types it and it can hold anything
- the next-action text and the verdict sentence
- any cookie value
- any token

**The privacy reason is the first reason, and there is a second one.** The photo is of the inside of
a home. It is also the fastest way to fill the 5 GB CloudWatch allowance
(`02-cost-guardrails.md` §3).

## 3. The shape of a log line

**One JSON object per line, written to standard output.** Lambda sends it to CloudWatch Logs. There
is no log shipping agent and no second destination. A second destination would be a second cost, and
a second place where personal data could end up.

Every line carries:

| Field | What it is |
| --- | --- |
| `level` | `debug`, `info`, `warn`, `error` |
| `msg` | A short fixed string. Never a sentence built from user data |
| `requestId` | The Lambda request id, so a whole request can be read together |
| `route` | For example `POST /api/assessments` |
| `userIdHash` | A hash of the owner id, **not the id itself** |
| `durationMs` | For the whole request |
| `env` | `prod` or `preview` |

**`userIdHash`, not `userId`, and this is a choice worth explaining.** With one user, grouping lines
by person is useful, and naming the person adds nothing. A hash is a short string computed from the
id, and the id cannot be read back out of it. So a hash gives the grouping without putting an
account identifier in a log that is read on a laptop. **900 Security should check this**, because it
touches what counts as personal data.

**One log group per function, named in CDK, with retention set** (`01-iac-plan.md` §4.4). If Lambda
creates the group itself, retention is "never expire".

## 4. The numbers, and where each one is read from

Not everything needs a custom metric. Three sources cost nothing and cover most of the list.

### AWS's own metrics — free, and they do not count against the ten

| Metric | From | Answers |
| --- | --- | --- |
| `Invocations`, `Errors`, `Throttles` | Lambda | Is the API running, and is it being held back |
| `Duration` (with `p95`) | Lambda | NFR-02, the server's 20-second share |
| `ConcurrentExecutions` | Lambda | Is anything looping |
| `ReadThrottleEvents`, `WriteThrottleEvents` | DynamoDB | Has the table's own capacity been hit |
| `ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits` | DynamoDB | How much of the free allowance is used |
| `Count`, `4xx`, `5xx`, `Latency` | API Gateway | Requests the function never saw |
| `Requests`, `4xxErrorRate`, `5xxErrorRate` | CloudFront | The front door |

**API Gateway's *detailed* metrics are charged as custom metrics. Do not turn them on.** The basic
ones above are free.

**The DynamoDB throttle metrics matter more now than they did.** `prod` runs at 20 read and 20 write
units rather than 25, because gate 43 gave 5 of each to the `preview` table
(`00-environments.md` §5). The alarm threshold does not change — one throttled request is still one
too many — but the ceiling it guards is a fifth lower.

### The cold start, and a correction to how NFR-06 is written

**NFR-06 says to read the cold start "from the `InitDuration` CloudWatch metric after a deploy".
There is no such CloudWatch metric.**

AWS's list of Lambda metrics contains `Invocations`, `Errors`, `Throttles`, `Duration`,
`PostRuntimeExtensionsDuration`, `ConcurrentExecutions` and others, and `InitDuration` is not among
them. The same page says of `Duration`: *"`Duration` does not include cold start time."*
([Types of metrics for Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html),
checked 2026-08-27.)

**`InitDuration` appears in the `REPORT` line that Lambda writes to the log group at the end of a
cold invocation.** So it is read with a Logs Insights query, not with a metric graph:

```
filter @type = "REPORT"
| filter ispresent(@initDuration)
| stats count(*) as coldStarts,
        avg(@initDuration) as avgMs,
        pct(@initDuration, 95) as p95Ms
        by bin(1d)
```

**The method changed here, and the number changed on 2026-08-31.** NFR-06 is now 2,000 ms at p95 over a rolling
7 days. It is still not tested in CI, because a cold start depends on the platform on the day.
**`06-nfrs.md` belongs to 400 Architecture**, so the correction to its wording is named in the list
in `04-ci-cd.md` §6.2 rather than made here.

### The six custom metrics

Written with the CloudWatch embedded metric format, which means they are produced by writing a
specially shaped JSON log line. No extra API call, no extra permission, no extra latency.

| Metric | Unit | Answers |
| --- | --- | --- |
| `zamphora/ModelCalls` | Count | NFR-04, NFR-13, and the runaway alarm |
| `zamphora/CostMicroUsd` | Count, in millionths of a dollar | NFR-10, NFR-14, and the spend alarm |
| `zamphora/AssessmentFailures` | Count | How often the model path fails at all |
| `zamphora/BreakerOpened` | Count | The circuit breaker protected the balance. Alarm 8 |
| `zamphora/CannotTellAnswers` | Count | NFR-22, the ceiling of 3 in 10 |
| `zamphora/UnreadableAnswers` | Count | NFR-23, the ceiling of 1 in 100 |

**Six, not ten, and four slots are left spare on purpose.** The free allowance is ten custom
metrics.

**The failure reason is not a dimension on `AssessmentFailures`, and this is the trap that would
have used up the allowance.** In CloudWatch, each unique combination of name and dimension values is
a separate custom metric. Six provider failure names as a dimension would be six metrics from one
name. The whole budget would be gone in one line of code. **The reasons live in the log line and
are counted with a Logs Insights query** (§7), which costs nothing beyond the 5 GB the logs already
use.

**The same trap applies to a CloudWatch Logs metric filter**, which also creates a custom metric. Use
a query, not a filter.

## 5. The ten alarms

**Ten is the free allowance, so there are exactly ten.** An eleventh alarm is a decision about
spending money, not an addition.

| # | Alarm | Fires when | Why it exists |
| --- | --- | --- | --- |
| 1 | API function errors | Lambda `Errors` ≥ 1 in 5 minutes | Something is broken and nobody is watching a screen |
| 2 | API function throttles | Lambda `Throttles` ≥ 1 in 5 minutes | Reserved concurrency of 10 was hit. Either a loop, or ten real people |
| 3 | Slow requests | Lambda `Duration` p95 > 20,000 ms over 15 minutes | The application deadline is being reached, so people are seeing `deadline-passed` (NFR-02) |
| 4 | DynamoDB read throttles | `ReadThrottleEvents` ≥ 1 in 5 minutes | The table's fixed read units were hit. This is the free tier working, and it means something is wrong |
| 5 | DynamoDB write throttles | `WriteThrottleEvents` ≥ 1 in 5 minutes | The same, on writes |
| 6 | **Runaway model calls** | `zamphora/ModelCalls` sum > 30 in 1 hour | Expected use is about 30 a **month**. Thirty in an hour is a loop or an attack |
| 7 | **Runaway spend** | `zamphora/CostMicroUsd` sum > 100,000 in 1 hour | 100,000 millionths is $0.10. At $5 of balance, one dollar an hour empties it in an evening |
| 8 | **The breaker opened** | `zamphora/BreakerOpened` ≥ 1 in 5 minutes | The product stopped calling the model on its own. Something is wrong with the provider, or with us |
| 9 | Gateway 5xx | API Gateway `5xx` ≥ 1 in 5 minutes | A 504 from the gateway means a request passed 30 seconds. The app should have answered at 20 |
| 10 | Front door 5xx | CloudFront `5xxErrorRate` > 1% over 15 minutes | The distribution or an origin is broken. **Lives in `us-east-1`, see below** |
| 11 | **Front door flood** | CloudFront `Requests` sum > 50,000 in 1 hour | Expected use is a few hundred a day. This is the only warning of a flood that stops at the edge and never reaches the throttled gateway. **Lives in `us-east-1`** |

**Alarms 6, 7, 8 and 11 are the ones this project actually needs.** The others are the ordinary ones
any system has. These four are about a balance that ends a feature and an account that ends a
product.

**Alarms 10 and 11 cannot live in `eu-central-1`, and this was wrong until 2026-08-31.**
**CloudFront publishes its metrics only to `us-east-1`**
([CloudFront metrics](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html),
checked 2026-08-31). Alarm 10 was written against the same Region as everything else. It would have
deployed with no error and **never fired**, and dashboard row 5 would have drawn an empty graph. Both
alarms now live in `ZamphoraCloudFrontAlarmsStack` in `us-east-1` (`01-iac-plan.md` §7), which holds
alarms and nothing else.

**Alarm 11 is new, and it closes the last hole in the cost story.** `01-iac-plan.md` §4.4 throttles
API Gateway at 100 requests a second, which caps what reaches the function. Nothing caps what
reaches **CloudFront**, and CloudFront bills per request once the 10 million free ones are used.
There is no automatic defence for that on this account. This alarm is the manual one: it fires, and
the response is to disable the distribution by hand.

**Alarm 8 changed shape when gate 50 was answered, and the change is worth understanding.** Before
the answer, this alarm *was* the circuit breaker: it counted failures and asked a person to flip the
kill-switch. Now the breaker is automatic and lives in the API
(`02-cost-guardrails.md` §5), so the alarm no longer has a job to do in the moment. **Its job is to
tell the owner that the product has already protected itself.** By the time the email arrives, the
spending has stopped. That makes it a message rather than a request for help. It is the better
shape, because the fix does not depend on anybody being awake.

**Alarm 8 watches `BreakerOpened`, not a failure count, on purpose.** A threshold that copied the
breaker's own rule — five failures in a row — would be the same logic written twice, in two places
that could stop matching. One event, one alarm.

**The numbers in 6 and 7 are chosen against expected use, and they are guesses.** Expected use is
about 30 assessments a month (NFR-14). Thirty in an hour is thirty times the monthly rate, which
cannot be a person. **Re-check both after the first month of real use** and write the real numbers
down here. A threshold like this is either never reached or reached all the time, and only real
traffic shows which.

### Where an alarm goes, and why the address is not in this repository

**Decided by the owner on 2026-08-27, gate 58.**

- **CDK creates one SNS topic, `zamphora-<env>-alarms`, with no subscriber at all.**
- **The owner adds the email address by hand in the SNS console, once, and confirms it.** AWS sends
  a confirmation link that has to be clicked, so this step could never have been fully automatic
  anyway.
- **Nothing about the address touches this repository, the workflow files or GitHub.**

**The reason is not a security hole, and saying that plainly matters.** A personal email address in
a public repository is an address published for no gain. It is not a key and it unlocks nothing. It
simply does not need to be there.

**Two rejected options.** A GitHub secret passed into CDK was the obvious answer, and it fails for
two reasons. It puts a personal address into GitHub. CDK also prints the value in the deploy
difference, where anyone reading the log can see it. Dropping email alarms altogether was rejected
because the alarms and the circuit breaker both exist for the case where nobody is looking.

**Until the subscription is confirmed, every alarm fires into nothing.** It is step 4 of the
before-first-deploy checklist in `00-environments.md` §10.

**`treatMissingData: NOT_BREACHING` on all ten.** This product is idle most of the time. An alarm
that goes red because nobody used the app last night is an alarm somebody learns to ignore.

**An alarm firing is not an incident.** Declaring an incident is a person's decision, always. **No
alarm in this list takes an action.** The one thing in this product that acts by itself is the
circuit breaker, and it lives in the application, not in CloudWatch.

## 6. The dashboard

**One dashboard, `zamphora-prod`.** The free allowance is three. One is enough, and the other two
stay spare.

Five rows, in this order, because that is the order a question gets asked in:

1. **Money.** `CostMicroUsd` per day, `ModelCalls` per day, and the running total for the NFR-14
   window.
2. **Is it working.** `Invocations`, `Errors`, `Throttles`, and `BreakerOpened`.
3. **Is it fast.** `Duration` at p50 and p95, with a line drawn at 20,000 ms.
4. **Is the answer any good.** `CannotTellAnswers` and `UnreadableAnswers` as a share of
   `ModelCalls`, against the NFR-22 and NFR-23 ceilings.
5. **The free allowances.** `ConsumedReadCapacityUnits` and `ConsumedWriteCapacityUnits` against the
   table's own 20, and CloudFront requests against 10 million.

**Row 5 is the one nobody thinks to build and it is the one that matters here.** It shows how close
the product is to leaving the free allowances, on a graph, before the credit moves.

## 7. The queries that answer the questions no metric answers

Written out so they exist before somebody needs them at 22:00.

**Which provider failures happened, and how many of each** — the query that replaces six custom
metrics:

```
fields @timestamp, failureCode
| filter ispresent(failureCode)
| stats count(*) by failureCode
| sort by count(*) desc
```

**The whole life of a circuit breaker**, from the failures that opened it to the test call that
closed it:

```
fields @timestamp, msg, failureCode
| filter msg like /^breaker\./ or ispresent(failureCode)
| sort @timestamp asc
```

**The cold start, for NFR-06** — the query in §4.

**One request, end to end** — every step duration from `03-api-spec.md` §4:

```
fields @timestamp, @message
| filter requestId = "<the request id>"
| sort @timestamp asc
```

**The cannot-tell share, for NFR-22:**

```
fields @timestamp, band
| filter ispresent(band)
| stats count(*) as total,
        sum(band = "cannot-tell") as cannotTell,
        sum(band = "cannot-tell") / count(*) as share
        by bin(7d)
```

**The daily reconciliation, for NFR-13**, is *not* a Logs Insights query. It reads the day rollup
items straight from the DynamoDB table and compares them with Anthropic's own usage report. The
admin key it needs does not go on the server, so it is a local script the owner runs
(`03-api-spec.md` §8, NFR-13).

## 8. What is deliberately not watched

Four things nothing records. Each is a decision that was already made, and each is written here so
nobody spends an evening looking for a log that was never going to exist.

**1. Who flipped the kill-switch.** ADR-0009: nothing in the application runs when it happens, so
the app's own logs show the effect — model calls stopping — and never the cause. AWS's own record of
console activity is the only place it appears, and it is a different place from every other log in
this system. **Look there first when model calls stop for no reason** — and check `BreakerOpened`
before you do, because the circuit breaker stops calls too and **that** one does leave a log line.

**2. The admin path.** `02-containers.mmd` draws the admin reaching the table directly through the
AWS console, never through the API (gate 30). So no route, no guard and no application log sits on
it. The same AWS console record is the trail.

**3. Distributed tracing.** AWS X-Ray is not turned on in run 1. There is one function and one
outside call, and the duration of every step is already in the log line
(`03-api-spec.md` §11). Turning it on would add a permission, a sampling decision and a cost that
was not verified. **The trigger to turn it on: a second compute unit joins the flow** — which is
exactly what Option C in `00-options.md` §6 would add.

**4. Anything about uptime.** §1.

## 9. Which requirement each of these serves

A check that this file covers what `06-nfrs.md` says can only be measured at runtime.

| Requirement | Marked in `06-nfrs.md` as | Covered here by |
| --- | --- | --- |
| NFR-02, the 20,000 ms server share | `test`, plus real behaviour | Alarm 3, dashboard row 3 |
| NFR-06, cold start ≤ 2,000 ms p95 | **runtime only** | §4, the Logs Insights query |
| NFR-10, ≤ $0.0040 per assessment | `test`, plus the rollup | `CostMicroUsd`, dashboard row 1 |
| NFR-13, the app's count matches the provider's | **a local script** | §7, read from the table |
| NFR-14, under $5.00 to 2026-12-31 | **runtime only** | Dashboard row 1, the running total |
| NFR-22, cannot-tell ≤ 3 in 10 | `ai-eval`, plus real answers | `CannotTellAnswers`, §7 |
| NFR-23, unreadable ≤ 1 in 100 | `test` for the parser, **runtime for the rate** | `UnreadableAnswers`, §7 |
| NFR-34, kill-switch inside 60,000 ms | `test` | Not watched at runtime — §8 point 1 says why |
| NFR-41, no photo older than 182 days | `retention-audit`, monthly | `04-ci-cd.md` §8 |
| The circuit breaker (gate 50) | **no NFR yet** | `BreakerOpened`, alarm 8, §7 |

**Three rows in that table are the reason this file exists.** NFR-06 and NFR-14 have no job behind
them at all in `06-nfrs.md`. Without a query and a graph, they are numbers nobody could ever check.
The circuit breaker is newer than `06-nfrs.md` and has no requirement row of its own yet — **600 QA
should be asked whether it needs one**, because a breaker nobody tests is a breaker that opens once,
in the wrong direction, at the wrong moment.

## 10. What this document does not decide

Whether to declare an incident · who is on call, and whether anybody is · whether `userIdHash` is an
acceptable thing to log, which is 900 Security's · whether any of these numbers is acceptable ·
whether the circuit breaker needs a requirement row, which is 600 QA's.
