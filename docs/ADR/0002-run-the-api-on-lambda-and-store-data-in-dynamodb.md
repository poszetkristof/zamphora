# ADR-0002 — Run the API as a function, and put the data in DynamoDB

- **Status:** Accepted
- **Date:** 2026-08-25
- **Corrected 2026-08-26:** the capacity mode was written as **on demand**, which is outside the
  free allowance. It is now **provisioned, fixed at 25/25**. See "The capacity mode" below. Nothing
  had been built on the old value, so this record is corrected rather than superseded.

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

**Data: one Amazon DynamoDB table, provisioned capacity, fixed at 25 write and 25 read units, with
auto scaling switched off.** The key design and every access pattern are in
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

25 read units is 25 strongly consistent reads a second, sustained. One user making ten assessments a
day is nowhere near it.

## Consequences

**What this buys.** Nothing runs between requests, so an untouched week costs nothing. Four managed
pieces, none of which is patched, backed up or restarted by hand. Every one of the eleven questions
is a single operation. The daily limit becomes one atomic conditional write, which is what makes it
correct when ten requests arrive at once (ADR-0008).

**What it costs, and the first cost is the sharpest.** An API Gateway HTTP API cuts a request off at
**30 seconds, and that cannot be raised** — the same number the user was promised. If it fires, the
person gets a 504 whose body nothing in this product wrote. **The application therefore fails at
20 seconds and answers for itself. The three stacked deadlines are in `03-flow.md` §4.**

**The capacity mode has two costs of its own.** The 25 units are **shared across every table in the
account, in one Region**. A second table splits the same allowance and nothing warns you, which is
why run 1 has one table and why a second one is a decision, not a detail. And a burst past 25 units
a second is refused rather than served, so a real spike shows up as failed requests.

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

**Third cost:** the repository layer is written against DynamoDB's key model. Moving to a relational
store later would mean rewriting it. That cost is accepted because the eleven questions would map
onto a relational store without changing a screen or a contract.

**Fourth cost:** DynamoDB's own limits become the app's. Time-to-live deletes *"typically within a
few days after their expiration"* and expired items still come back from reads until then
([DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html),
checked 2026-08-25). So no rule may depend on a TTL firing on time — see NFR-35.

## Alternatives considered

**A container on ECS Fargate or App Runner, with managed Postgres.** Option B, scored 12. It is the
only option that removes the cold start and the gateway ceiling, and it loses on the constraint that
matters most here: a load balancer and a database are charged by the hour and never go idle, so they
spend the credit through every night the app is untouched. It also needs a network with subnets, a
patch window and backups — several new things before the first assessment works.

**A relational store on serverless compute.** Rejected on the same cost shape. It also puts a
connection pool in front of a function that scales by starting more copies of itself, which is a
known sharp edge and would need a proxy to solve.

**One Lambda per route.** Rejected. It multiplies cold starts across a flow that already has a
30-second budget, and it gives one developer many small things to look at instead of one.

**Single-table design with overloaded generic keys (`GSI1PK`, `entityType`).** Rejected. It is the
clever path, and `00-context-brief.md` §5.3 asks for the documented one. Readable prefixes give the
same table with none of the reading cost.

## Agent-Readable Summary

> `apps/api` is one Nest.js application in one Lambda function behind an API Gateway HTTP API, and
> all data is in one DynamoDB table keyed by owner, in **provisioned** capacity mode, fixed at 25
> write and 25 read units. Do not create the table in on demand mode and do not switch it to on
> demand — the free allowance does not cover on demand, and the account closes when the credit is
> gone. Do not turn on auto scaling, and do not raise the 25s. Do not add a second table in run 1;
> it would split the same 25 units. Do not add a second database, a relational
> store, an always-on container or a load balancer. Do not add a DynamoDB secondary index in run 1.
> Do not let any request run past the 20,000 ms application deadline — the gateway cuts the request
> off at 30 seconds and answers with a 504 the app did not write. Do not rely on DynamoDB TTL to
> delete anything on time; always check the expiry in code.
