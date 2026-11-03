# Observability — what is recorded, what raises an alarm, and what is deliberately not watched

**Written by** 800 Infra, run 1 (`001-photo-assessment`). **Read next by** 900 Security, 600 QA.

This file says where the logs go and which numbers are measured. It lists the alarms. It says
which questions can be answered afterwards. It solves one problem. Several requirements in
`06-nfrs.md` are marked "runtime only", which means no test can check them. If nothing records them,
they are not requirements at all.

**The free CloudWatch allowance shapes this whole design, and that is said up front.** Ten custom
metrics and ten alarms is the budget (`02-cost-guardrails.md` §2). Everything below is chosen inside
it, **with one exception: there are twelve alarms, not ten.** §5 says what that costs and who
decides.

**Everything in this file watches `prod`.** `dev` writes logs, and nothing else here applies to it:
no alarms, no dashboard, no metric filters (§5).

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
- the duration of each step in `03-api-spec.md` §4, from whichever of the three functions ran it.
  The assessment id joins the `api`, `assess` and `watch` lines of one run

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

**One more event: a refused `CONFIG` value.** When a function reads the `CONFIG` partition and
refuses a value, it writes one `warn` line, `config-value-refused` (`03-api-spec.md` §6). For
`AI_ENABLED`, a refused row turns the feature off (ADR-0019). Alarm 1 in §5 reads this line.

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
| `env` | `prod` or `dev` |

**One line has its own shape: `config-value-refused`.** `03-api-spec.md` §6 fixes its fields
exactly: `level`, `event`, `function`, `configKey`, `reason`, `refusedValue` and `usedValue`. It
belongs to a cache read, not to a request, so it has no `requestId`, `route` or `userIdHash`. Its
fixed string is in `event`, not in `msg`. The metric filter in §4 matches on `event`.

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
| `ExecutionsStarted`, `ExecutionsSucceeded`, `ExecutionsFailed`, `ExecutionsTimedOut`, `ExecutionTime` | Step Functions | Did the background run finish, and how long it took |
| `Invocations`, `Errors` on `assess` | Lambda | The paid function on its own. Its `Errors` count is the retried failures, by design |

**API Gateway's *detailed* metrics are charged as custom metrics. Do not turn them on.** The basic
ones above are free.

**The DynamoDB throttle metrics matter more with the split.** `prod` runs at 20 read and 20 write
units rather than 25, because gate 43 gave 5 of each to the `dev` table (`00-environments.md` §5).
The alarm threshold is the same — one throttled request is still one too many — but the ceiling it
guards is a fifth lower.

### The cold start, read from the logs

**There is no `InitDuration` CloudWatch metric.** AWS's list of Lambda metrics contains
`Invocations`, `Errors`, `Throttles`, `Duration`, `PostRuntimeExtensionsDuration`,
`ConcurrentExecutions` and others, and `InitDuration` is not among them. The same page says of
`Duration`: *"`Duration` does not include cold start time."*
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

**NFR-06 is 2,000 ms at p95 over a rolling 7 days, read with this query.** It is not tested in CI,
because a cold start depends on the platform on the day.

**Expect a bigger number than ADR-0002 budgets, and know why before the first measurement lands.**
ADR-0002 cites 200 to 800 ms for a Node.js cold start. That figure is for a plain Node.js function.
This one is a Nest.js application, and a Nest.js cold start also has to build the
dependency-injection container — work out the module graph and construct every provider — before it
can answer anything. One published measurement of a Nest.js application in one Lambda function
reports an init duration of about **1.0 to 1.1 seconds**. That is one app with its own module count,
not a promise about this one, and NFR-06's 2,000 ms still leaves room. **The point is that a generic
Node.js figure does not carry over.** When the query above returns a real number, write it into
ADR-0002 and delete the 200-to-800 range.

### The seven custom metrics

Six are written with the CloudWatch embedded metric format, which means they are produced by writing
a specially shaped JSON log line. No extra API call, no extra permission, no extra latency. The
seventh comes from a metric filter, for the reason below the table.

| Metric | Unit | Answers |
| --- | --- | --- |
| `zamphora/ModelCalls` | Count | NFR-04, NFR-13, and the runaway alarm |
| `zamphora/CostMicroUsd` | Count, in millionths of a dollar | NFR-10, NFR-14, and the spend alarm |
| `zamphora/AssessmentFailures` | Count | How often the model path fails at all |
| `zamphora/BreakerOpened` | Count | The circuit breaker protected the balance. Alarm 8 |
| `zamphora/CannotTellAnswers` | Count | NFR-22, the ceiling of 3 in 10 |
| `zamphora/UnreadableAnswers` | Count | NFR-23, the ceiling of 1 in 100 |
| `zamphora/ConfigValueRefused` | Count | A `CONFIG` value was refused, NFR-39 at runtime. Alarm 1. **Made by a metric filter** |

**Seven, not ten, and three slots are left spare on purpose.** The free allowance is ten custom
metrics.

**Only `prod` may write these metrics.** CloudWatch turns every embedded-format line into a metric,
whatever log group it is in. So if `dev` wrote the same lines, `perf-flow`'s stub calls would be
counted in `prod`'s `ModelCalls` and `CostMicroUsd`, and they could fire alarms 6 and 7. **The rule:
outside `prod`, the app writes the same log line without the embedded metric block.** It reads
`ENV_NAME` to decide. The `dev` line still carries every field, so a failed CI run can be read with
the queries in §7. The code belongs to 500 Engineering, and `03-api-spec.md` carries the rule.
The `ConfigValueRefused` filter is in `ZamphoraOpsStack`, which `dev` does not deploy, so that one
needs no change.

**The failure reason is not a dimension on `AssessmentFailures`, and this is the trap that would
have used up the allowance.** In CloudWatch, each unique combination of name and dimension values is
a separate custom metric. Six provider failure names as a dimension would be six metrics from one
name. The whole budget would be gone in one line of code. **The reasons live in the log line and
are counted with a Logs Insights query** (§7), which costs nothing beyond the 5 GB the logs already
use.

**A CloudWatch Logs metric filter has the same trap.** A metric filter is a rule that turns matching
log lines into a metric. AWS: *"Metrics extracted from log events are charged as custom metrics."*
([PutMetricFilter, AWS API reference](https://docs.aws.amazon.com/sdkfornet/v3/apidocs/items/CloudWatchLogs/TPutMetricFilterRequest.html),
checked 2026-10-29.) Every dimension value is one more custom metric. So a filter is used only where
an alarm needs a count and the line cannot carry the embedded format, and it never has a dimension.
For every other count, use a query.

**`ConfigValueRefused` is the one case.** `03-api-spec.md` §6 fixes the fields of the
`config-value-refused` line exactly, and the embedded format would add a field to it. So a metric
filter reads the line instead:

```
logs.MetricFilter   on the api log group, and a second one on the assess log group
  filterPattern     { $.event = "config-value-refused" }
  metricNamespace   zamphora
  metricName        ConfigValueRefused
  metricValue       1
  dimensions        none
```

**Two filters, one metric.** Both functions read `CONFIG`, so each log group needs its own filter.
Both write the same name with no dimension, and CloudWatch knows a metric by its namespace, name and
dimensions. So the two filters make one custom metric, not two. Which key was refused, and why, is
in the line itself, and the query in §7 reads it.

## 5. The alarms — twelve of them, and the free allowance is ten

- **The CloudWatch Always Free allowance is ten alarm metrics.** This list uses **twelve**.
- **Two of them are therefore charged.** A standard-resolution alarm is a small fixed amount per
  alarm metric per month — cents, not dollars. *The exact figure was not confirmed first-party.* AWS
  is clear on the shape of the charge: *"Each CloudWatch alarm incurs charges for the metric it
  monitors."*
- **This does not put the account at risk.** It is far below every other number in
  `02-cost-guardrails.md` §4. It is still written down, because $0 and ten are easy numbers to
  assume.

**This is the owner's decision, not this document's** (`02-cost-guardrails.md` §9). Two ways out,
and doing nothing is a legitimate third:

1. **Keep twelve and pay cents a month.** Alarm 11 is the only warning of a flood that stops at the
   edge and never reaches the throttled gateway. It is one of the four alarms this project actually
   needs. Alarm 12 is the only sign that a run died with nothing to catch it. Alarm 1 is the only
   sign that a hand edit of `CONFIG` went wrong.
2. **Drop two of alarms 2, 4 and 5**, the ordinary ones any system has, and stay at ten.

**Whatever is chosen, the rule from here is unchanged: an alarm is a decision, not an addition.**
Whoever adds the thirteenth has to say which one it replaces, or accept another charge.

This table is a lookup, one row per alarm.

| # | Alarm | Fires when | Why it exists |
| --- | --- | --- | --- |
| 1 | **Refused `CONFIG` value** | `zamphora/ConfigValueRefused` sum ≥ 1 in 5 minutes | A value the owner typed into the `CONFIG` partition was refused (`03-api-spec.md` §6). For `AI_ENABLED` the feature is then off, and this is the only signal that names why. For the other two, the product runs on a default nobody chose |
| 2 | API function throttles | Lambda `Throttles` ≥ 1 in 5 minutes | Reserved concurrency of 10 was hit. Either a loop, or ten real people |
| 3 | **Failed runs** | Step Functions `ExecutionsFailed` + `ExecutionsTimedOut` ≥ 1 in 5 minutes | A run that failed outside its own error handling is the thing nothing else reports. The `api` duration has no alarm, because the assessment route answers in about a second (ADR-0014) |
| 4 | DynamoDB read throttles | `ReadThrottleEvents` ≥ 1 in 5 minutes | The table's fixed read units were hit. This is the free tier working, and it means something is wrong |
| 5 | DynamoDB write throttles | `WriteThrottleEvents` ≥ 1 in 5 minutes | The same, on writes |
| 6 | **Runaway model calls** | `zamphora/ModelCalls` sum > 30 in 1 hour | Expected use is about 30 a **month**. Thirty in an hour is a loop or an attack |
| 7 | **Runaway spend** | `zamphora/CostMicroUsd` sum > 100,000 in 1 hour | 100,000 millionths is $0.10. At $5 of balance, one dollar an hour empties it in an evening |
| 8 | **The breaker opened** | `zamphora/BreakerOpened` ≥ 1 in 5 minutes | The product stopped calling the model on its own. Something is wrong with the provider, or with us |
| 9 | Gateway 5xx | API Gateway `5xx` ≥ 1 in 5 minutes | Every call to the `api` function passes the gateway, so this alarm also catches an `api` function error. A 504 means a request passed 30 seconds; the app should have answered at 20 |
| 10 | Front door 5xx | CloudFront `5xxErrorRate` > 1% over 15 minutes | The distribution or an origin is broken. **Lives in `us-east-1`, see below** |
| 11 | **Front door flood** | CloudFront `Requests` sum > 50,000 in 1 hour | Expected use is a few hundred a day. This is the only warning of a flood that stops at the edge and never reaches the throttled gateway. **Lives in `us-east-1`** |
| 12 | **Dead letters** | The dead-letter queue's `ApproximateNumberOfMessagesVisible` ≥ 1 | A `mark-failed` invocation that failed twice. A row may be stuck at `running`. Nothing reads this queue, so the alarm is the only way anybody learns |

**Alarms 6, 7, 8 and 11 are the ones this project actually needs.** The others are the ordinary ones
any system has. These four are about a balance that ends a feature and an account that ends a
product.

**There is no separate alarm on the `api` function's Lambda `Errors`.** Every call to `api` passes
the gateway, so a function error reaches alarm 9 as a 5xx. A second alarm would watch the same
failure twice and cost one alarm metric. That slot holds alarm 1. The `Errors` metric is still on the
dashboard (§6).

**Alarm 1 watches the one set of values a person types by hand.** Nothing in the application writes
the `CONFIG` rows (ADR-0009), so a typing mistake there has no other check. A refused `AI_ENABLED`
turns the feature off (ADR-0019), and the person sees only the normal "turned off" message. Three
facts about this alarm:

- **It fires only when the app is used.** A function writes the line when it refreshes its cache,
  and a cache refreshes only when a request arrives. A bad edit at night, with nobody using the app,
  fires nothing until the next request. That is enough, because an unused app spends nothing.
- **It sends one email, not a stream.** While a bad value stays in the table, each warm function
  writes about two lines a minute and the alarm stays in `ALARM`. An alarm acts only when its state
  changes, so the email comes once. It comes again only after the row is fixed and the alarm has
  gone back to `OK`.
- **It also fires when a row is missing.** A new table has no `CONFIG` rows, so the first assessment
  after a rebuild fires it with `reason: row-missing`. That is the reminder for step 6 of the
  checklist in `00-environments.md` §10, if the alarm email is confirmed (step 4).

**Alarms 10 and 11 cannot live in `eu-central-1`.** **CloudFront publishes its metrics only to
`us-east-1`**
([CloudFront metrics](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html),
checked 2026-08-31). An alarm on a CloudFront metric in `eu-central-1` deploys with no error and
**never fires**, and a dashboard row on one draws an empty graph. So both alarms live in
`ZamphoraCloudFrontAlarmsStack` in `us-east-1` (`01-iac-plan.md` §7), which holds alarms and nothing
else.

**Alarm 11 closes the last hole in the cost story.** `01-iac-plan.md` §4.4 throttles API Gateway at
100 requests a second, which caps what reaches the function. Nothing caps what reaches
**CloudFront**, and CloudFront bills per request once the 10 million free ones are used. There is no
automatic defence for that on this account. This alarm is the manual one: it fires, and the response
is to disable the distribution by hand.

**Alarm 8 tells the owner that the product has already protected itself.** The circuit breaker is
automatic and lives in the `assess` function (gate 50, `02-cost-guardrails.md` §5), so the alarm has
no job to do in the moment. By the time the email arrives, the spending has stopped. That makes it a
message rather than a request for help, and the fix does not depend on anybody being awake.

**Alarm 8 watches `BreakerOpened`, not a failure count, on purpose.** A threshold that copied the
breaker's own rule — five failures in a row — would be the same logic written twice, in two places
that could stop matching. One event, one alarm.

**The numbers in 6 and 7 are chosen against expected use, and they are guesses.** Expected use is
about 30 assessments a month (NFR-14). Thirty in an hour is thirty times the monthly rate, which
cannot be a person. **Re-check both after the first month of real use** and write the real numbers
down here. A threshold like this is either never reached or reached all the time, and only real
traffic shows which.

### `dev` has no alarms, and what that leaves open

**Only `prod` deploys `ZamphoraOpsStack` and `ZamphoraCloudFrontAlarmsStack`** (`01-iac-plan.md`
§3). `dev` is used only by CI. Its test runs would fire alarms that mean nothing: `perf-flow` alone
makes several assessments in a few minutes, and alarm 1 fires on purpose when a test reads a refused
value. Twelve more alarms would also be twelve more charged alarm metrics.

**What `dev` keeps instead.** It never calls the real provider and holds no model key, so it cannot
spend Anthropic credit. Its gateway is throttled at 20 a second (`01-iac-plan.md` §4.4). Its table
is throttled by its own 5 units.

**One gap is left, and it is named so nobody assumes it is covered.** A flood against `dev`'s
CloudFront hostname spends the same 10 million free CloudFront requests as `prod`, and alarm 11
does not see it. The `dev` hostname is not secret: it can appear in the public CI logs. **Closing the
gap is the owner's choice**, because it costs one more alarm metric: alarm 11 would add `dev`'s
`Requests` to `prod`'s with metric math, and an alarm is billed for each metric it reads. It is
listed in `02-cost-guardrails.md` §9 beside the other alarm-count decision.

### Where an alarm goes, and why the address is not in this repository

**Decided by the owner on 2026-08-27, gate 58.**

- **CDK creates one SNS topic, `zamphora-prod-alarms`, with no subscriber at all.**
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

**`treatMissingData: NOT_BREACHING` on all twelve.** This product is idle most of the time. An alarm
that goes red because nobody used the app last night is an alarm somebody learns to ignore.

**Ten is a ceiling, not a comfortable number, and this list is already two past it** — see the top
of this section. Adding an alarm is a decision, the same way adding a DynamoDB table is one in
`01-iac-plan.md` §4.1: whoever adds one has to say which one it replaces, or accept the charge.
**Composite alarms are not the way out.** A composite alarm combines several alarm states into one
to cut down on emails. It is billed per alarm per hour from the first hour, and is counted
separately from the free ten, so it would add cost rather than remove it.

**The Region rule for anything touching CloudFront, stated once so the next person does not repeat
the near-miss.** CloudFront publishes its own measurements **only to `us-east-1`**, and there is no
setting that changes it. So: **any alarm or dashboard row whose metric is native to CloudFront lives
in the `us-east-1` alarms stack. Everything else lives in `eu-central-1`.** A metric that comes from
the origin behind CloudFront — the function, the gateway, the table — is not a CloudFront metric and
stays in `eu-central-1`. The same is true of `ConfigValueRefused`, because its log groups are in
`eu-central-1`. The rule is written here so that the next CloudFront metric goes into the right
Region the first time.

**An alarm firing is not an incident.** Declaring an incident is a person's decision, always. **No
alarm in this list takes an action.** The one thing in this product that acts by itself is the
circuit breaker, and it lives in the application, not in CloudWatch.

## 6. The dashboard

**One dashboard, `zamphora-prod`.** The free allowance is three. One is enough, and the other two
stay spare.

Five rows, in this order, because that is the order a question gets asked in:

1. **Money.** `CostMicroUsd` per day, `ModelCalls` per day, and the running total for the NFR-14
   window.
2. **Is it working.** `Invocations`, `Errors`, `Throttles`, `BreakerOpened` and
   `ConfigValueRefused`.
3. **Is it fast.** Step Functions `ExecutionTime` at p50 and p95, with a line drawn at 60,000 ms
   (NFR-07), and `api` `Duration` at p95 next to it, which should sit near one second.
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

**Which `CONFIG` value was refused, and why** — the detail behind alarm 1. Run it against the `api`
and `assess` log groups at once:

```
fields @timestamp, function, configKey, reason, refusedValue, usedValue
| filter event = "config-value-refused"
| sort @timestamp desc
| limit 20
```

`reason` is one of `row-missing`, `wrong-type`, `out-of-range` and `not-on-list`
(`03-api-spec.md` §6). For `AI_ENABLED`, `usedValue` is always `false`. `refusedValue` is written
with `JSON.stringify`, so a string keeps its quotes. A `refusedValue` of `"true"`, with the quotes,
means the string was typed where the boolean belongs.

**The cold start, for NFR-06** — the query in §4.

**One assessment, end to end** — every step duration from `03-api-spec.md` §4, across the three
functions. Run it against all three log groups at once; the assessment id is the join:

```
fields @timestamp, @message
| filter assessmentId = "<the assessment id>"
| sort @timestamp asc
```

**Which runs were retried, and how often** — the count NFR-04 caps at three:

```
fields @timestamp, assessmentId, msg
| filter msg = "assess.attempt"
| stats count(*) as attempts by assessmentId
| filter attempts > 1
```

**A throttled try is not in this count, and that is correct.** When Lambda refuses `assess` with
`Lambda.TooManyRequestsException`, the function never starts, so it writes no line and makes no
model call. The workflow retries it without a model call (ADR-0018), though each retry is still one
state transition (`02-cost-guardrails.md` §2). The `Throttles` metric on `assess` counts those tries
instead.

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

**Every query here also works on `dev`'s log groups**, which keep 7 days. That is how a failed CI run
is read.

## 8. What is deliberately not watched

Three things nothing records, and one thing that is recorded. Each is a decision that was already
made, and each is written here so nobody spends an evening looking for a log that was never going to
exist.

**1. Who flipped the kill-switch.** ADR-0009: nothing in the application runs when it happens, so
the app's own logs show the effect — model calls stopping — and never the cause. AWS's own record of
console activity is the only place it appears, and it is a different place from every other log in
this system. **Look there first when model calls stop for no reason** — and check two signals
before you do, because both stop calls too and both **do** leave a log line: `BreakerOpened`, and
alarm 1 with the `config-value-refused` query in §7. A row that was deleted or typed with the wrong
type turns the feature off (ADR-0019).

**That record has a name and a limit.** It is **AWS CloudTrail**, the service that records who
called which AWS API. It is on for every account with no setup, and it keeps **90 days** of
management events at no charge — *"The first copy of management events is free"*
([CloudTrail pricing](https://aws.amazon.com/cloudtrail/pricing/), checked 2026-09-01). So the trail
this document leans on twice reaches back **90 days and no further**. If a longer record is ever
needed, a management-events-only trail is also free to create and only the S3 storage for the
exported events costs anything — which would be tiny here. **Do not turn on Data events or Insights
events.** Both bill from the first event.

**2. The admin path.** `02-containers.mmd` draws the admin reaching the table directly through the
AWS console, never through the API (gate 30). So no route, no guard and no application log sits on
it. The same CloudTrail record is the trail, with the same 90-day limit.

**3. Distributed tracing is on.** AWS X-Ray draws where time went across several hops. With one
function and one outside call it would not be worth drawing, because every step duration is already
in the log line. The trigger for turning it on was "a second compute unit joins the flow", and
ADR-0014 added three: the state machine, `assess` and `watch`. So X-Ray is on, with
`tracingEnabled: true` on the state machine and active tracing on the four functions
(`01-iac-plan.md` §4.4b). It is free at this size: 100,000 traces recorded a month sit inside
CloudWatch's always-free tier
([CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/), checked 2026-09-01), and this
product sends a few hundred. Sampling stays at the default. **Do not turn on X-Ray Insights**, which
bills on its own.

**4. Anything about uptime.** §1.

## 9. Which requirement each of these serves

A check that this file covers what `06-nfrs.md` says can only be measured at runtime. This table is
a lookup.

| Requirement | Marked in `06-nfrs.md` as | Covered here by |
| --- | --- | --- |
| NFR-02, the 20,000 ms server share | `test`, plus real behaviour | Dashboard row 3, the `api` line |
| NFR-04, at most 3 calls per photo | `test` | The retry query in §7 |
| NFR-06, cold start ≤ 2,000 ms p95 | **runtime only** | §4, the Logs Insights query, on each of the functions |
| NFR-07, the result inside 60,000 ms | `perf-flow`, plus real behaviour | Alarm 3, dashboard row 3, `ExecutionTime` |
| NFR-10, ≤ $0.0040 per call, ≤ $0.012 per photo | `test`, plus the rollup | `CostMicroUsd`, dashboard row 1 |
| NFR-13, the app's count matches the provider's | **a local script** | §7, read from the table |
| NFR-14, under $5.00 to 2026-12-31 | **runtime only** | Dashboard row 1, the running total |
| NFR-22, cannot-tell ≤ 3 in 10 | `ai-eval`, plus real answers | `CannotTellAnswers`, §7 |
| NFR-23, unreadable ≤ 1 in 100 | `test` for the parser, **runtime for the rate** | `UnreadableAnswers`, §7 |
| NFR-34, kill-switch inside 60,000 ms | `test` | Not watched at runtime — §8 point 1 says why |
| NFR-39, no model call while the `AI_ENABLED` row cannot be used | `test` | A refused row in `prod` shows as alarm 1, `ConfigValueRefused` and the `CONFIG` query in §7 |
| NFR-41, no photo older than 182 days | `retention-audit`, monthly | `04-ci-cd.md` §8 |
| The circuit breaker (gate 50) | **no NFR yet** | `BreakerOpened`, alarm 8, §7 |

**Three rows in that table are the reason this file exists.** NFR-06 and NFR-14 have no job behind
them at all in `06-nfrs.md`. Without a query and a graph, they are numbers nobody could ever check.
The circuit breaker has no requirement row of its own in `06-nfrs.md` — **600 QA should be asked
whether it needs one**, because a breaker nobody tests is a breaker that opens once, in the wrong
direction, at the wrong moment.

## 10. What this document does not decide

Whether to declare an incident · who is on call, and whether anybody is · whether `userIdHash` is an
acceptable thing to log, which is 900 Security's · whether any of these numbers is acceptable ·
whether the circuit breaker needs a requirement row, which is 600 QA's · whether to pay for the two
alarms over the free ten, and whether alarm 11 should also watch `dev`'s distribution, which are the
owner's.
