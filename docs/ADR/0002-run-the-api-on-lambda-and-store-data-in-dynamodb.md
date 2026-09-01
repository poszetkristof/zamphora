# ADR-0002 — Run the API as a function, and put the data in DynamoDB

- **Status:** Accepted
- **Date:** 2026-08-25
- **Corrected 2026-08-26:** the capacity mode was written as **on demand**, which is outside the
  free allowance. It is now **provisioned, fixed at 25/25**. See "The capacity mode" below. Nothing
  had been built on the old value, so this record is corrected rather than superseded.
- **Corrected 2026-08-31, two changes.** First, the free allowance is billed in **capacity-unit
  hours per month**, not as a ceiling that applies at every moment. Second, gate 43 (owner,
  2026-08-27) split the allowance across **two** tables — `prod` at 20/20 and `preview` at 5/5 —
  because `06-nfrs.md` needs a preview environment. This record still said "fixed at 25/25" and
  "do not add a second table", which contradicted the built system. The rule is now a total, not a
  per-table number. See "The capacity mode" below. Nothing had been built on the old text.
- **Corrected 2026-09-01, after an outside review of the compute choice. The decision does not
  change; two pieces of reasoning do.** First, the "fifth cost" said ADR-0004 does the work of least
  privilege. It does not — it answers a different threat, and the text now says which. Second, the
  cold-start figure quotes a plain Node.js number that does not carry over to a Nest.js application.
  Both are in "Consequences" below. The review also confirmed the shape of this decision against
  outside practice: a whole framework in one function is a named, recommended pattern at this size,
  and it scales per function, not per account. Nothing had been built on the old text.

## Context

The AWS free plan gives up to $200 of credit and then **closes the account**. It does not bill:
*"You won't be charged unless you convert to a Paid plan"*
([AWS Free Tier](https://aws.amazon.com/free/), checked 2026-08-25). The account was opened
2026-07-01, so the window ends 2026-12-31. Anything that costs money while nobody is using the app
is spending that credit on nothing.

There is one part-time developer, with Nest.js and AWS both listed in `00-context-brief.md` §5.3 as
things to learn rather than things known. The brief asks for the documented path over the clever one.

The eleven questions the data has to answer are listed in `00-options.md` §1. Ten of them name one
user or one day. The eleventh looks across all accounts and runs once a month. There is no join, no
search, and no report over a large set.

`00-options.md` scored four whole-system shapes and Option A won at 16 against 15, 13 and 12.

## Decision

**Compute: `apps/api` is compiled into one AWS Lambda function behind an API Gateway HTTP API.**
Nest.js runs inside it through its Express adapter. One function, not one per route, so there is one
place to look and one cold start to pay.

**Data: one DynamoDB table per environment, provisioned capacity, auto scaling switched off. The
total across every table in the Region must never pass 25 write and 25 read units.** Today that is
`prod` at 20/20 and `preview` at 5/5 (gate 43). The key design and every access pattern are in
`docs/400-architecture/05-patterns.md` §1. Summary:

- The owner id is the partition key of everything a person owns.
- Sort keys are readable prefixes: `POT#`, `ASSESS#`, `TASK#`, `QUOTA#`.
- **No secondary index in run 1.** The first one arrives in run 3, keyed on the task due date,
  because backbone 6 needs a query that crosses accounts.
- The idle-account sweep is a monthly `Scan`. That is correct at this size and wrong at any larger
  one, and it is written down as such.

**Both are inside the always-free monthly amounts at one user.** Lambda includes *"one million
requests and 400,000 GB-seconds per month"*
([AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/), checked 2026-08-25). DynamoDB
includes 25 GB of storage with 25 write and 25 read capacity units, each month, per Region, per
payer account.

**API Gateway is not.** Checked 2026-08-26: its free amount is a **12-month trial**, not an Always
Free one — *"one million API calls received for HTTP APIs…per month for up to 12 months"*
([API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/)) — and this plan runs Always
Free offers only. So it bills from the first request, at **$1.00 per million calls**. At one user
that is about a cent a month, so it changes nothing here. It is written down because the sentence
above would otherwise read as "the whole stack is free", and it is not. **800 Infra picks this up in
`02-cost-guardrails.md`.**

### The capacity mode

**Verified first-party on 2026-08-26, and it changed the decision.** The free amount does not cover
on demand capacity. AWS states it on the pricing page: *"It uses **provisioned capacity** and the
DynamoDB Standard table class"*
([DynamoDB provisioned pricing](https://aws.amazon.com/dynamodb/pricing/provisioned/), checked
2026-08-26). The on demand pricing page names no free amount at all
([DynamoDB on demand pricing](https://aws.amazon.com/dynamodb/pricing/on-demand/), checked
2026-08-26). An on demand table spends credit on its first read.

The free amounts are the only free offers this account has. AWS: *"**Free account plan** only have
`Always Free` offerings active"*
([AWS Billing user guide](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html),
checked 2026-08-26). That is also why no relational option is open: RDS was a twelve-month trial,
Aurora had no free offer, and trials are switched off on this plan.

**Provisioned is not the better engineering choice, and that is written down on purpose.** AWS's own
guidance says *"On-demand mode is the default and recommended throughput option for most DynamoDB
workloads"*
([DynamoDB throughput capacity](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html),
checked 2026-08-26). This is a free-plan decision, the same kind that chose serverless in
`00-options.md`. On a paid account, on demand would be the answer.

**It also fails in the better direction.** At a fixed 25/25 a runaway loop is throttled by DynamoDB.
The requests fail and somebody notices. On demand, the same loop succeeds and eats the credit that
keeps the account open. Auto scaling is off for the same reason: it would raise the numbers past the
free line without asking.

20 read units is 20 strongly consistent reads a second, sustained. One user making ten assessments a
day is nowhere near it.

**The allowance is measured in unit-hours per month, and that changes the arithmetic.** AWS bills
provisioned capacity per **capacity-unit-hour**. So the free amount is not "25 units at every
moment"; it is 25 units held for a whole month, which is about **18,250 unit-hours per Region per
month**. `prod` at 20 units for a full month uses 14,600 of them. That leaves 3,650 — exactly enough
for a 5-unit `preview` table to run for the whole month as well. **This is why two tables fit inside
one allowance**, and why a preview table that is left running by accident costs a small amount
rather than taking capacity away from `prod`.

### Why there is no cache in front of the table

**Asked and answered on 2026-08-26.** A cache such as ElastiCache or DAX is not added, and the
reason is arithmetic. The reads it would remove are the session and the profile: **24 ms out of a
typical 8,191 ms run** (`../400-architecture/001-photo-assessment/03-flow.md` §2, step 5). That is
0.3% of one assessment, against a model call of 6,000 to 8,000 ms.

A cache in front of DynamoDB is normally bought for latency or for read units. Neither applies:
DynamoDB already answers in single-digit milliseconds, and one user is nowhere near 25 read units.

**It would also cost twice.** Neither ElastiCache nor DAX has an Always Free offer — ElastiCache
changed to credits for accounts opened after 2025-07-15 — and both are charged by the hour whether
anyone uses the app or not. That is the shape `00-options.md` rejected in Option B. Worse, both live
in a VPC, so the API function would have to move into that VPC and lose its default route to the
internet. The model call goes out over the internet, so getting it back needs a NAT gateway, which
is also charged by the hour with no free offer.

**The free cache is already in the design.** The function stays alive between requests, so a value
in memory survives to the next call. ADR-0009 does exactly this for the kill switch. **Do not cache
the session** — a cached session keeps a signed-out person signed in for as long as the cache lives.
**Do not cache the daily count** — ADR-0008 needs an atomic conditional write to stay correct.

## Consequences

**What this buys.** Nothing runs between requests, so an untouched week costs nothing. Four managed
pieces, none of which is patched, backed up or restarted by hand. Every one of the eleven questions
is a single operation. The daily limit becomes one atomic conditional write, which is what makes it
correct when ten requests arrive at once (ADR-0008).

**What it costs, and the first cost is the sharpest.** An API Gateway HTTP API cuts a request off at
**30 seconds, and that cannot be raised** — the same number the user was promised. If it fires, the
person gets a 504 whose body nothing in this product wrote. **The application therefore fails at
20 seconds and answers for itself. The three stacked deadlines are in `03-flow.md` §4.**

**The capacity mode has two costs of its own.** The allowance is **shared across every table in the
account, in one Region**, and nothing warns you when a new table eats into it. That is why the
number in this record is a **total** and why adding a table is a decision, not a detail: whoever
adds one has to subtract its units from somewhere. And a burst past a table's own units is refused
rather than served, so a real spike shows up as failed requests.

**The way back is open, and here is the trigger.** On demand becomes right the day this app is
offered to a second person, or the day the account leaves the free plan — the same trigger as gates
5 and 31. Switching costs nothing but minutes: on demand to provisioned **at any time**, provisioned
to on demand **up to four times in a 24-hour rolling window**, no downtime and the data untouched
([switching capacity modes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-switching-capacity-modes.html),
checked 2026-08-26).

**Second cost:** a cold start on the first request after a quiet period. Published figures put an
optimised Node.js cold start at roughly 200 to 800 ms
([Sedai](https://sedai.io/blog/what-is-cold-starts-in-lambda-understanding), checked 2026-08-25).
Secondary source, budgeted at the top of the range in `03-flow.md`.

**Corrected 2026-09-01: expect more than that, and the range above is the wrong kind of
measurement.** It is for a plain Node.js function. This is a Nest.js application, whose cold start
also has to build the dependency-injection container before it can answer. A published measurement
of a Nest.js application in one Lambda function reports about **1.0 to 1.1 seconds**. That is one
app, not a promise about this one, and NFR-06's 2,000 ms still leaves room. **Replace this whole
paragraph with the measured number** once `03-observability.md` §4's query returns one.

**Third cost:** the repository layer is written against DynamoDB's key model. Moving to a relational
store later would mean rewriting it. That cost is accepted because the eleven questions would map
onto a relational store without changing a screen or a contract.

**Fourth cost:** DynamoDB's own limits become the app's. Time-to-live deletes *"typically within a
few days after their expiration"* and expired items still come back from reads until then
([DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html),
checked 2026-08-25). So no rule may depend on a TTL firing on time — see NFR-35.

**Fifth cost, and it is the honest price of one function: there is one IAM execution role.**
`GET /api/health` runs with the same DynamoDB and S3 permissions as `POST /api/assessments`. One
function per route would let each one carry only the permissions it needs, which is what least
privilege asks for. That is given up here on purpose: the trade is a real one, and at one developer
with one function the reading cost of many small roles is worse than the risk.

**Reworded 2026-09-01, because the old text claimed more cover than it had.** It said the border
doing the work instead is ADR-0004. Two different problems are being mixed there, and they need
separating:

- **A route with a missing ownership check.** ADR-0004 answers this one, and answers it well. The
  owner id comes from the session and the key builder will not compile without it, so a bug in one
  route still cannot read another person's data.
- **A compromised execution context** — a poisoned dependency, or a crafted image reaching the
  decode path. **ADR-0004 does nothing here.** That code holds the whole role, over every row and
  every object, because at that point there is no "route" left to constrain. Least privilege exists
  for exactly this case, and OWASP's serverless guidance names role-per-function for it.

**The trade is still accepted, and now for the stated reason:** one developer, one function, and
data that is plant photos and care schedules. It is not accepted because ADR-0004 covers it. **900
Security owns this when that role runs**, and should look at it with the `sharp` decode path in
`01-iac-plan.md` §4.4 in mind. If the API is ever split, split the role with it.

## Alternatives considered

**A container on ECS Fargate or App Runner, with managed Postgres.** Option B, scored 12. It is the
only option that removes the cold start and the gateway ceiling, and it loses on the constraint that
matters most here: a load balancer and a database are charged by the hour and never go idle, so they
spend the credit through every night the app is untouched. It also needs a network with subnets, a
patch window and backups — several new things before the first assessment works.

**This is the right answer once cost stops being the binding constraint, so it is written out in
full rather than only rejected.** `docs/learn/aws-and-the-pipeline.md` §7 draws the whole container
shape — load balancer, a queue so the phone stops waiting for the model, Postgres, a cache — and
puts a rough monthly number on it. The short version: roughly $150 a month while nobody uses the
app, against about two cents today. The move becomes right when the account is off the free plan
**and** traffic is steady rather than a few requests a day — the same trigger as gates 5 and 31.

**A relational store on serverless compute.** Rejected on the same cost shape. It also puts a
connection pool in front of a function that scales by starting more copies of itself, which is a
known sharp edge and would need a proxy to solve.

**One Lambda per route.** Rejected. It multiplies cold starts across a flow that already has a
30-second budget, and it gives one developer many small things to look at instead of one.

**Added 2026-09-01: the trigger to revisit this, and which route goes first.** Scale is not the
trigger. AWS states the scaling rate **per function** — 1,000 more copies every 10 seconds — so one
function holding twelve routes scales as well as twelve functions would
([Lambda scaling behavior](https://docs.aws.amazon.com/lambda/latest/dg/scaling-behavior.html),
checked 2026-09-01). The table gives up first: 20 read units is about 20 reads a second, roughly one
sixth of what the default 1,000-copy account limit already allows through.

The real trigger is **one function's copies being shared by routes with very different shapes**. An
assessment holds its copy for six to eight seconds; reserved concurrency is 10; so ten assessments
at once refuse every other route with a 429 for those seconds. **When that shows up, split
`POST /api/assessments` out first, and only that one.** It fixes three things at once: the fast
routes stop queueing behind the slow one, every other route stops paying for image-sized memory, and
the paid route gets its own smaller IAM role — the "fifth cost" above. Splitting the small read
routes buys almost nothing and should not be done for symmetry.

**Do not read this as permission to split now.** It is the written trigger so that the decision is
made by a measurement rather than a feeling.

**Single-table design with overloaded generic keys (`GSI1PK`, `entityType`).** Rejected. It is the
clever path, and `00-context-brief.md` §5.3 asks for the documented one. Readable prefixes give the
same table with none of the reading cost.

## Agent-Readable Summary

> `apps/api` is one Nest.js application in one Lambda function behind an API Gateway HTTP API, and
> all data is in one DynamoDB table per environment, keyed by owner, in **provisioned** capacity
> mode. Today that is `prod` at 20/20 and `preview` at 5/5. Do not create a table in on demand mode
> and do not switch one to on demand — the free allowance does not cover on demand, and the account
> closes when the credit is gone. Do not turn on auto scaling. **The total provisioned capacity
> across every table in `eu-central-1` must never pass 25 write and 25 read units** (gate 43); if
> you add a table, take its units from an existing one. Do not add a second database, a relational
> store, an always-on container or a load balancer. Do not add a DynamoDB secondary index in run 1.
> Do not add ElastiCache, DAX or any other cache service — it saves 24 ms, it is charged by the
> hour, and it would drag the function into a VPC and force a NAT gateway. Cache in the function's
> own memory instead, as ADR-0009 does, and never cache the session or the daily count.
> Do not let any request run past the 20,000 ms application deadline — the gateway cuts the request
> off at 30 seconds and answers with a 504 the app did not write. Do not rely on DynamoDB TTL to
> delete anything on time; always check the expiry in code.
> Do not split the API into more than one function in run 1, and do not argue for it from scaling —
> Lambda scales per function, and the table's 20 units give up first. The one written trigger is
> fast routes being refused while assessments hold the reserved concurrency, and the only route to
> split then is `POST /api/assessments`.
