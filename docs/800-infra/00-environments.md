# Environments — what exists, where it runs, and what is different in each

**Written by** 800 Infra, run 1 (`001-photo-assessment`). **Read next by** 900 Security, 600 QA.

This file says how many copies of zamphora exist, what each copy is for, and which values change
between them. It solves one problem. Without it, "deploy it" has no meaning, because nobody can say
what "it" is or where it goes.

The inputs are `docs/400-architecture/00-options.md`, `02-containers.mmd`, `06-nfrs.md`,
`docs/500-engineering/03-api-spec.md` and the ADRs in `docs/ADR/`, ADR-0001 to ADR-0019. Nothing else
counts as a requirement. Every outside fact carries a link and the date somebody checked it.

**Decided: two AWS environments, `prod` and `dev`, and both are permanent** (gate 87, owner). §2 has
the reasons and the option that lost.

**One question in this file is open and belongs to the owner: gate 88.** It asks whether the `dev`
pipeline may delete test account A's daily counter row before `e2e` and `perf-flow` run. §4 has the
proposal.

---

## 1. The account this all runs on, and why it shapes everything

There is **one AWS account**, on the **Free account plan**. This is not a normal cloud account. That
difference decides most of this document.

AWS says it plainly:

> "The **Free account plan** is ideal for customers experimenting with AWS services and building
> proof of concepts at no cost for up to six months. You will not incur any charges during this
> period until you upgrade to a paid account plan. Your free account plan ends after six months or
> when your credits are fully used - whichever occurs first."

> "**Paid plan** accounts might have `Short-term trial` and `Always Free` offerings active.
> **Free account plan** only have `Always Free` offerings active."

([AWS Billing user guide — Explore AWS services with AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html),
checked 2026-08-27.)

Three things follow, and every later section obeys them.

1. **The account does not send a bill. It ends.** When the credit runs out, the plan stops. Losing
   the account means losing the running system. That is the argument for putting every resource in
   CDK, in git, from the first one. CDK is the AWS Cloud Development Kit: TypeScript code that
   creates the AWS resources. A lost account comes back with one deploy.
2. **A twelve-month trial offer is worth nothing here.** Only Always Free offers are active. Two
   services in this design have no Always Free offer at all. They are named in
   `02-cost-guardrails.md` §2.
3. **The account was opened 2026-07-01, so the window ends 2026-12-31** (`00-options.md` §3,
   ADR-0002). Six months from opening matches the AWS sentence above.

**There is a second, separate account: the Anthropic one.** It holds about $5 of credit. The owner
tops it up by hand. It is *not* AWS (`factory/feature.md` through ADR-0006). Every environment that
makes a real model call spends the same one balance. That is why §4 says `dev` must never call the
real provider.

## 2. The three environments

| Name | Where it runs | Who uses it | Real model calls |
| --- | --- | --- | --- |
| `local` | The developer's own machine | The developer | No — a stub provider |
| `dev` | AWS, always there | The `e2e` and `perf-flow` CI jobs, and `local` for sign-in | No — a stub provider |
| `prod` | AWS, always there | The one real user, and the developer | Yes |

**Decided by the owner: two permanent AWS environments, `prod` and `dev`** (gate 87). `dev` is
where CI tests a pull request against real AWS. It always exists. It is not created for a pull
request and it is not destroyed afterwards.

**Why permanent, in three reasons.**

1. **No pipeline writes a `CONFIG` row.** The owner writes `dev`'s three rows once, by hand, the
   same way as `prod`'s (§4). A copy created for each pull request would start with no rows, so a
   pipeline would have to write them every time.
2. **The DynamoDB arithmetic does not change.** `dev` takes the 5/5 share that gate 43 set (§5). A
   5-unit table running the whole month fits the free allowance exactly.
3. **Everything else that a pull request needs exists already**: the sign-in pool, its two test
   accounts A and B, its client secret, and one stable CloudFront hostname.

**The option that lost: a fresh `preview` copy for each pull request**, created by CI, tested, then
destroyed, with the pipeline writing the `CONFIG` rows into each copy. It lost because it needs a
pipeline that writes the kill-switch row. It also needs a new sign-in pool, test account and secret
for every pull request.

**What it costs: one copy, shared by every pull request.** Two pull requests cannot use it at the
same time. `04-ci-cd.md` §7 says how the second one waits instead of clashing.

**There is no `staging`.** A third always-there copy would need a third share of the DynamoDB
capacity in §5, and 20 plus 5 already uses all 25 units. `dev` is where CI tests run. It is not a
step a release passes through.

**`prod` is the only environment that spends Anthropic credit, and the only one holding real
photos.**

### `local`

Everything that can run without AWS runs without AWS:

- `apps/web` — `next dev`.
- `apps/api` — `nest start`, listening on a local port.
- The table — **DynamoDB Local**, in Docker. It is Amazon's own copy of DynamoDB that runs on the
  developer's machine.
- The photos bucket — **MinIO**, in Docker. It is a file store that answers the same commands as S3.
- Sign-in — the Cognito user pool of the `dev` environment. Amazon Cognito is the AWS service that
  keeps the accounts and shows the sign-in pages, and a user pool cannot be run locally. This is the
  one place `local` touches AWS. The `dev` pool is permanent, so the local setup does not change
  from one pull request to the next.
- The model — a stub `LlmProvider` that returns a fixed answer and sleeps for the budgeted 8,000 ms
  (`06-nfrs.md` NFR-07 already describes this stub).
- The workflow — **Step Functions Local**, in Docker, Amazon's own copy of Step Functions for a
  developer's machine. It runs the same state machine definition against DynamoDB Local and calls
  the `assess` handler as a local process. The stream — the `watch` handler run as a plain Node
  process on a second local port, because response streaming needs no Lambda to work locally.

**Not verified: whether Step Functions Local can run the current state machine.** The definition
keeps a workflow variable, `callsMade`, set with `Assign` (ADR-0018). A workflow variable is a named
value the run keeps from start to end. Nobody has checked whether Step Functions Local supports
variables. Check it on the first local run. If it does not, the retry and refund paths are checked
by `infra-assert` and in `dev` only, and the local run covers the other steps.

**DynamoDB Local and MinIO are both accepted tools** (gate 51, owner, 2026-08-27). Each runs in
Docker on the owner's machine, costs nothing, and never touches the AWS account. Here is why they
are worth two new tools. Without them, local work has only two options. It writes into the real
table and the real bucket, which spends the free allowance and mixes test data with real data. Or it
cannot run at all.

**A plain local folder instead of MinIO was the second-best option.** It is one fewer tool. It lost
because it behaves less like S3, and the photo path is the part most likely to break.

### `dev`

Deployed by the pull request workflow, used by its test jobs, and left running. See `04-ci-cd.md`
§7.

**`06-nfrs.md` requires it.** NFR-01 is measured by "Playwright against a preview deploy", and the
`e2e` and `perf-flow` jobs both say "against a preview deploy". `dev` is that deploy. So `dev` is not
a convenience. Three written requirements cannot be tested without it.

**Each pull request deploys its own code into `dev` first, then tests it.** So `dev` runs the code
of the last pull request that used it, which is not always the code on `main`. That is fine, because
nothing reads `dev` except the tests that deployed it.

### `prod`

The real thing. One CloudFront distribution, four Lambda functions, one state machine, one table,
one bucket, one user pool. CloudFront is Amazon's content delivery network, the layer that answers
the browser. Lambda runs code without a server the project has to keep alive. Step Functions runs
the background assessment as a list of steps written in CDK (ADR-0014).

## 3. What each environment is made of

Every container in `02-containers.mmd` appears here. The CDK construct for each one is in
`01-iac-plan.md` §3.

| Container in the diagram | `local` | `dev` | `prod` |
| --- | --- | --- | --- |
| `edge` — CloudFront | Not present. The two dev servers run side by side | One distribution | One distribution |
| `web` — Next.js static export | `next dev` | Bucket + distribution | Bucket + distribution |
| `api` — Nest.js on Lambda | A normal Node process | One function | One function |
| `workflow` — Step Functions | Step Functions Local, in Docker | One state machine | One state machine |
| `assess` — the model call, on Lambda | A local process called by Step Functions Local | One function, concurrency 1 | One function, concurrency 1 |
| `watch` — the result stream, on Lambda | A Node process on a second port | One function behind a Function URL | One function behind a Function URL |
| `mark-failed` — the net under the workflow | Not present | One function and one EventBridge rule | One function and one EventBridge rule |
| `llm adapter` — `packages/llm` | Stub provider | Stub provider | Anthropic adapter |
| `contracts` — `packages/contracts` | Code. Not a deployed thing anywhere | | |
| `table` — DynamoDB | DynamoDB Local | One table at 5/5 | One table at 20/20 |
| `photos` — S3 | MinIO | One bucket | One bucket |
| Cognito user pool | Uses `dev`'s pool | One pool, Essentials | One pool, Essentials |
| Alarms, dashboard, alarm topic | Not present | **Not present.** Nobody watches `dev` (`03-observability.md` §5) | `ZamphoraOpsStack` and `ZamphoraCloudFrontAlarmsStack` |
| Anthropic Messages API | Never called | Never called. `dev` holds no model key (§8) | Called once per assessment, at most three times |
| Email delivery | Not built in run 1 (`02-containers.mmd`, gate 29) | | |
| AWS Management Console | The admin path. Not a deployed thing (gate 30) | | |

## 4. What changes between environments, and what must never change

**Changes:**

| Value | How it is set |
| --- | --- |
| Resource names | Every name carries the environment: `zamphora-prod-api`, `zamphora-dev-api` |
| The host the app answers on | The CloudFront hostname of that environment's own distribution. §6 |
| The `LlmProvider` used | An environment variable read at start-up. `stub` outside `prod` |
| Log retention | 30 days in `prod`, 7 days in `dev`. Seven, so a run that failed in the evening can still be read the next morning |
| DynamoDB capacity | 20 read / 20 write in `prod`, 5 / 5 in `dev`. §5 |
| Lambda reserved concurrency of `api` | 10 in `prod`, 2 in `dev`. `assess` is 1 everywhere |
| The gateway throttle | 100 requests a second, burst 50, in `prod`. 20, burst 10, in `dev`, because only CI uses it (`01-iac-plan.md` §4.4) |
| Alarms and the dashboard | `prod` only (`01-iac-plan.md` §3) |
| Who writes the three `CONFIG` rows | The owner by hand, in `prod` and in `dev`. The developer in `local`. See below |

**Never changes, in any environment:**

- **Node 24**, in the Lambda runtime, in CI and on the developer's own machine (gate 60,
  `01-iac-plan.md` §4.4). One number, three places.
- **The Cognito Essentials feature plan** (gate 52, owner, 2026-08-31, `01-iac-plan.md` §4.3).
  Lite does not include managed login or page branding; Essentials costs the same $0 at this size.
- The 180-day photo lifecycle rule (ADR-0007, NFR-40). A lifecycle rule is a rule inside S3 that
  deletes an object once it reaches a set age. The `dev` bucket carries the same rule, so the CDK
  assertion test in NFR-40 checks the same code that ships.
- Every cookie rule: `__Host-` prefix, `Secure`, `HttpOnly`, `Path=/`, no `Domain` (ADR-0003,
  ADR-0010).
- The clocks: 20,000 ms in the `api` function, 25,000 ms on the `Assess` task, 18,000 ms on the
  model call, and no timeout on the state machine (`05-patterns.md` §7).
- `maxRetries: 0` on the adapter, the cap of three model calls per run in the workflow's
  `RetryOrStop` state, and `MaxAttempts: 2` only on the retry of a throttled `assess`, which makes
  no model call (ADR-0005, ADR-0018).
- **The kill-switch rule: only the boolean `true` turns the feature on.** A missing `AI_ENABLED` row,
  or an `enabled` value of any other type, means off (ADR-0019).
- The refuse-by-default route guard (ADR-0004).
- The bucket is private with Block Public Access on, everywhere (ADR-0007).
- The circuit breaker's numbers: 5 failures, 10 minutes, one test call
  (`02-cost-guardrails.md` §5).
- `RETAIN` on the table and the photo bucket (`01-iac-plan.md` §4.1, §4.2).

**The rule behind that list:** a value may differ between environments only when it is about size or
cost. A value that is about correctness or safety is the same everywhere. If it is not, the `dev`
environment is testing a different product from the one that ships.

### How a new table gets its three `CONFIG` rows

The `CONFIG` partition holds three rows: `AI_ENABLED`, `DAILY_LIMIT` and `MODEL_ID`
(`03-api-spec.md` §6). Nothing in the application writes them (ADR-0009). A new table holds none of
them. **With no `AI_ENABLED` row, the feature is off** (ADR-0019). So in every environment somebody
has to write the rows, and the feature stays off until they do.

**All three rows are written, not only `AI_ENABLED`.** A missing `DAILY_LIMIT` or `MODEL_ID` row is
safe, because the default is used. But it writes a `config-value-refused` line on every cache
refresh. In `prod` that line fires alarm 1 in `03-observability.md` §5.

This table is a lookup.

| Environment | Who writes the rows | When | Values |
| --- | --- | --- | --- |
| `local` | The developer, with the AWS CLI pointed at DynamoDB Local | Each time the local table is created | `enabled` the boolean `true`. The provider is a stub, so it spends nothing |
| `dev` | **The owner, by hand, in the AWS console** | Once after the first `dev` deploy, and again after a rebuild | `enabled` the boolean `true`, `limit` the number 10, `modelId` `claude-haiku-4-5-20251001`. The provider is a stub and `dev` holds no model key, so `true` spends nothing |
| `prod` | **The owner, by hand, in the AWS console** | Once after the table is created, and again after a rebuild | `enabled` the boolean `true` when the owner decides the feature may spend money |

**Decided: in `prod` and in `dev` the owner writes the rows by hand, and no deploy and no pipeline
ever writes a `CONFIG` row** (gate 87 for `dev`). Three reasons:

1. **The `AI_ENABLED` row decides whether money is spent.** Owning the kill-switch is the owner's,
   and turning the paid feature on is a spending decision. A pipeline must not make it (ADR-0009).
2. **A rebuilt `prod` comes back with the feature off.** When a lost account comes back with one
   deploy, nothing spends Anthropic credit until the owner writes the row. That is the safe side.
3. **It adds nothing.** No custom resource, no extra Lambda function, and no write access to the
   `CONFIG` partition for any CI role.

**What it costs: one more hand step after a rebuild.** It is step 6 of §10. A forgotten step does
not stay hidden. In `prod`, the person sees the normal "turned off" message, and the first
assessment fires alarm 1 with `reason: row-missing`, if the alarm email is confirmed (step 4). In
`dev`, `e2e` fails on its first assessment with `feature-off`.

**`dev`'s rows are written once, because `dev`'s table is permanent.** A pull request deploys new
code into the same table, so the rows stay. The table is `RETAIN`, so even a `cdk destroy` of the
`dev` stacks leaves the table and its rows in place.

**The option that lost for `prod`: a CDK custom resource that writes `enabled = true` once, when the
table is created.** It would put a writer of the kill-switch row into the deploy. A rebuild would
then start spending with nobody deciding to. It would also need a Lambda function and a write
permission that exist only for this one row.

### Test account A's daily limit in `dev` — gate 88

**The problem.** `e2e` and `perf-flow` make their assessments as test account A. The daily limit
counts assessments per account per UTC day, in the row `PK = USER#<sub>, SK = QUOTA#<yyyy-mm-dd>`
(`03-api-spec.md` §5). The `dev` table is permanent, so that row stays from one run to the next. So
every pull request on one UTC day spends the same 10. The first runs of the day pass. A later run
gets `daily-limit-reached` and fails, though nothing in its code is wrong.

**The proposal: a pipeline step deletes today's counter row of test account A, at the start of
`e2e` and at the start of `perf-flow`.** Each job then begins with the full daily limit. Account B
needs no reset, because 600 QA's test plan (`docs/600-qa/001-photo-assessment/00-test-plan.md`
§4.1) has B send at most one assessment, and only when B has none yet, so B never reaches the
limit.

```
aws dynamodb delete-item --table-name <the dev table> \
  --key '{"PK":{"S":"USER#<test account A sub>"},"SK":{"S":"QUOTA#'"$(date -u +%F)"'"}}'
```

- **The permission is as small as it can be.** The `zamphora-github-dev` role gets
  `dynamodb:DeleteItem` on the `dev` table only. The IAM condition key `dynamodb:LeadingKeys`
  limits it to the partition `USER#<test account A sub>`. So it cannot touch the `CONFIG`
  partition, any other account's rows, or the `prod` table (`04-ci-cd.md` §4).
- **Only one run uses `dev` at a time** (`04-ci-cd.md` §7), so no other run is counting on that row
  when it is deleted.
- **Nothing is spent.** `dev` uses the stub provider and holds no model key.
- **No requirement loses its test.** The daily limit itself, NFR-12, is tested by the `test` job
  with a stub, not in `dev`.
- **Each job must make at most 10 assessments**, the `limit` in `dev`'s row. If 600 QA's test plan
  needs more in one job, the owner raises `dev`'s `limit` row to at most 20, which is the code's
  maximum (`03-api-spec.md` §6).

**Why this is the owner's question.** It is a pipeline step that deletes data. The owner's answer to
gate 87 was that no pipeline writes a `CONFIG` row. This step never touches `CONFIG`, but a CI role
that may change table data is the same kind of decision, so the owner makes it.

**If the owner says no**, test account A has 10 assessments a UTC day for all runs together. Later
runs on a busy day fail with `daily-limit-reached`, and the owner deletes the row by hand to unblock
them. More test accounts only move the ceiling higher; they do not remove it. `dev.yml` does not
exist yet, so nothing is built on this proposal.

## 5. The DynamoDB capacity, split between two tables

**Decided by the owner on 2026-08-27, gate 43.**

```
prod     20 read units / 20 write units
dev       5 read units /  5 write units
          -----------------------------
total    25 / 25  — the whole free allowance, and nothing over it
```

**The question this answered.** The DynamoDB free allowance is 25 read and 25 write capacity units
**per Region, per payer account**, shared by every table in that Region. An AWS Region is one
geographic location that holds AWS resources. A capacity unit is the room DynamoDB holds open for
one request a second. `06-nfrs.md` needs a deploy to test against, and that deploy needs a second
table. A single table at 25/25 and a second table cannot both fit inside the allowance.

**Why splitting won.** The total stays at 25, so the free allowance is whole and no credit is spent.
`prod` gives up a fifth of its spare capacity. At one user nobody notices that: 20 read units is
still 20 strongly consistent reads a second, sustained, against a workload of ten assessments a day.

**The allowance is measured in unit-hours, not in units.** AWS bills provisioned capacity per
**capacity-unit-hour**, so the free amount is not a ceiling that applies at every moment. It is
about **18,250 unit-hours per Region per month**. `prod` at 20 units for a full month uses 14,600 of
them, which leaves 3,650 — exactly enough for the 5-unit `dev` table to run for the **whole month**.

Two things follow, and they change how this is operated:

- **An always-on `dev` table costs nothing.** It uses exactly the 3,650 unit-hours that are left.
  `02-cost-guardrails.md` §4 checks every other service for the same question.
- **There is exactly one `dev` table, so the total is fixed.** No pull request creates a table. A
  second table beside `dev` would push the month over the allowance. **The 20/5 split is kept even
  though the price of going over is small**, about $0.00065 per write-unit-hour. It keeps the
  monthly total inside the free allowance with no arithmetic to redo each time.

**The rejected options, so nobody re-opens this by accident:**

- **Both tables at 25/25**, going over the allowance. It lost because it spends credit every hour,
  and the split spends none.
- **No `dev` environment at all.** It lost because it leaves NFR-01 — the 30-second promise made to
  the person standing in front of the plant — with no CI job behind it.
- **A fresh table for each pull request.** It lost with the per-pull-request `preview` copy (gate 87,
  §2).

**ADR-0002 states the same rule**: a total across every table in the Region, not 25/25 per table.

## 6. The host — the free CloudFront hostname

**Decided by the owner on 2026-08-27, gate 45.**

`02-containers.mmd` and ADR-0010 need **one host** for the whole product. That is what makes the
`__Host-` cookie prefix usable, and it is what removes every cross-origin rule from the design.

**The host is the CloudFront distribution's own name**, something like
`d111111abcdef8.cloudfront.net`. It is one host, it is HTTPS, and the certificate is CloudFront's
own. `__Host-` cookies work on it, because the prefix cares about "one host", not about a pretty
name. **It costs nothing.**

**A bought domain was rejected for run 1.** Serving one needs a Route 53 hosted zone at **$0.50 per
hosted zone per month, with no free tier** ([Route 53 pricing](https://aws.amazon.com/route53/pricing/),
checked 2026-08-27). A hosted zone is the set of DNS records AWS keeps for one domain name. At
expected use that would be the **single largest AWS line item in the whole product** — bigger than
the compute, the storage and the gateway together (`02-cost-guardrails.md` §4).

**Three things this removes from the plan**, and they are the real saving:

- No `ZamphoraCertStack`. A CloudFront certificate must live in `us-east-1`, so a bought domain
  would have meant a second Region and `crossRegionReferences: true` on the CDK app. None of that
  is built.
- No certificate to renew.
- No domain registration to pay for or transfer.

**The one real cost, named now so nobody is surprised later.** A `__Host-` cookie is tied to exactly
one host. Moving to a real domain later changes the host, so every signed-in person is signed out
once and has to sign in again. With one user that is one sign-in.

**Each environment has its own CloudFront hostname**, so `dev` and `prod` are different hosts and
their cookies cannot reach each other. That is a small extra safety the free name gives for
nothing. `dev`'s hostname is permanent too, so the sign-in callback address in `dev`'s pool is
written once (`01-iac-plan.md` §4.3).

## 7. The Region — `eu-central-1`, Frankfurt

**Decided by the owner on 2026-08-27, gate 44.**

Every stack in `01-iac-plan.md` deploys to **`eu-central-1`**. The table, the photo bucket, the user
pool, the function and the log groups all live there.

**Three reasons, the strongest first.**

1. **The photos stay under EU data rules.** A photograph of the inside of someone's home is personal
   data (ADR-0003, ADR-0007). Keeping it in the EU means the question of moving personal data out of
   the EU never has to be answered.
2. **It is the closest large Region to Hungary**, so the app is faster for the only person who uses
   it.
3. **Every service in the plan exists there.**

**`eu-west-1`, Ireland, was the second-best option** — also in the EU, sometimes cheaper, and
further away. **`us-east-1` was rejected.** Personal data would leave the EU, which is a question
the owner would then have to answer. Its only gain was keeping everything in one Region for a
certificate, and gate 45 made that certificate unnecessary.

**Two things that follow from a single Region.**

- The DynamoDB free allowance of 25 read and 25 write units is **per Region**, so §5's arithmetic is
  the whole account's arithmetic. Adding a second Region would add a second allowance and also a
  second of everything to look after.
- CloudFront itself is not in a Region. It is global, and it reaches the `eu-central-1` origins.

## 8. Secrets, and where they are not

Two secrets exist in run 1:

| Secret | Who needs it | Where it lives |
| --- | --- | --- |
| The Cognito app client secret | The `api` function (ADR-0003 — a confidential client) | Parameter Store, `SecureString`. One for `prod` and one for `dev` |
| The Anthropic API key | **The `assess` function only**, through `packages/llm`. The `api` function's role cannot read it (ADR-0014) | Parameter Store, `SecureString`. **`prod` only** |

**`dev` holds no Anthropic key, on purpose.** `dev` always uses the stub provider. With no key in
`dev`, a wrong provider setting there still cannot make a paid call. The owner never writes
`/zamphora/dev/anthropic/api-key` (`01-iac-plan.md` §6).

**Parameter Store, standard tier, `SecureString`, encrypted with the AWS-managed key.** Parameter
Store is the AWS service that keeps named values, and a `SecureString` is a value it keeps
encrypted. Standard parameters have no charge, and the AWS-managed key has no monthly charge. A key
this project created and owned would carry one. `01-iac-plan.md` §6 has the paths and the rules.

**A third credential exists and deliberately never reaches any server.** US-12 compares this app's
call count with Anthropic's own record, and that needs an **admin** API key. `03-api-spec.md` §8 and
NFR-13 both say it stays on the developer's machine and the comparison is a local script. Nothing in
this plan puts it in AWS or in CI.

**CDK writes no secret.** A value passed to CDK ends up in the CloudFormation template, and CDK
prints values in the deploy difference, the list of changes it shows before a deploy. The owner
writes each parameter once, by hand, with the AWS CLI. CDK only ever names the parameter.

**The repository is public** (gate 47, owner, 2026-08-27), so this rule is not a preference. Nothing
secret may be in the repository at all. Every key lives in Parameter Store, and
`.claude/settings.json` already denies reading any `.env` file.

**One value that is not secret and still stays out of the repository:** the alarm email address
(gate 58, `03-observability.md` §5). It unlocks nothing. It is a personal address, and publishing it
buys nothing.

## 9. Who may touch what

| Person or thing | Reaches | How |
| --- | --- | --- |
| The plant keeper | The one host | HTTPS, and nothing else |
| The developer, as admin | The DynamoDB table directly | The AWS console, with their own AWS sign-in (gate 30, ADR-0009) |
| GitHub Actions, deploy | The `prod` stacks | A role assumed with OpenID Connect, where GitHub proves who it is with a short-lived token. Restricted to the `main` branch. No stored access key |
| GitHub Actions, dev | The `dev` stacks only. If gate 88 says yes, also deleting test account A's rows in the `dev` table (§4) | A second role, restricted to pull requests. It never writes a `CONFIG` row |
| The `api` function | The table, the bucket, the Cognito secret, and starting the one state machine | Its own execution role, with only those permissions |
| The `assess` function | The model key, two `CONFIG` rows, the breaker row, the photo object | Its own role. The smallest in the product, and the only one with the model key |
| The `watch` function | The session and assessment rows, read only | Its own role. Reached only through CloudFront |
| The state machine | The assessment, counter and rollup rows, and invoking `assess` | Its own role |
| The web files | Nothing | ADR-0010: the web app has no role, no client and no credential |

**Nobody creates their own account in run 1.** Cognito self sign-up is off, and the owner creates
every account by hand (gate 49, `01-iac-plan.md` §4.3).

**The admin path is not part of the product, and that is on purpose.** `02-containers.mmd` draws the
admin reaching the table through the AWS console and never through the API. So the kill-switch flip
leaves no application log. AWS's own record of console activity is the only place it appears
(ADR-0009, `03-observability.md` §8).

## 10. What has to be true before the first deploy

A checklist, in order. Each line is a thing a person does once. The pipeline half of it is in
`04-ci-cd.md` §10.

**After a rebuild of a lost account, run steps 1 to 6 again.** The new tables have no `CONFIG` rows,
so the feature stays off until step 6 is done (§4).

1. The owner runs `cdk bootstrap` once, in **`eu-central-1`**, from their own machine. **Then the
   owner deploys the `dev` stacks once from the same machine.** CI deploys `dev` after that, but the
   first `dev` run in CI would fail without the table rows and the two test accounts that steps 3, 5
   and 6 add.
2. The owner creates the three GitHub OpenID Connect roles for `poszetkristof/zamphora`
   (`04-ci-cd.md` §4). This step can never be automated: CI cannot create the role it needs in order
   to sign in.
3. The owner writes the `SecureString` parameters by hand: the Cognito client secret and the
   Anthropic key for `prod`, and the Cognito client secret only for `dev` (§8).
4. **The owner adds the alarm email address in the SNS console and confirms it** (gate 58). CDK
   creates the topic with no subscriber, so until this is done every alarm fires into nothing. AWS
   sends a confirmation link that has to be clicked, so no code could do this step anyway.
5. The owner creates the one real account in the `prod` Cognito pool, because self sign-up is off.
   The `dev` pool gets two test accounts, A and B, at the same time. The tests need two, because
   they check that one account cannot see the other's data (`04-ci-cd.md` §7).
6. **The owner writes the three `CONFIG` rows by hand, into the `prod` table and into the `dev`
   table**: `AI_ENABLED`, `DAILY_LIMIT`, `MODEL_ID` (`03-api-spec.md` §6). These are data, not
   infrastructure, and ADR-0009 says nothing in the application writes them. **Until the
   `AI_ENABLED` row exists with `enabled` as the boolean `true`, the feature is off** (ADR-0019). In
   the DynamoDB console, choose the attribute type **Boolean** for `enabled`, never String: the
   string `"true"` also means off. Write `limit` as the **Number** 10. After the first assessment in
   `prod`, alarm 1 in `03-observability.md` §5 must stay quiet. If it fires, the query for refused
   values in `03-observability.md` §7 names the row and the reason.
7. **Write `MODEL_ID` as `claude-haiku-4-5-20251001`, the default** (ADR-0017). The app accepts
   exactly three ids: `claude-haiku-4-5-20251001`, `claude-haiku-5-5` and `claude-sonnet-5-5`. It
   refuses any other value and uses the default instead, so a typing mistake here is not sent to
   the API (`03-api-spec.md` §6). Each allowed id names one fixed version. For Haiku 4.5 that is the
   dated id, never the alias `claude-haiku-4-5` (gate 53). A provider can move an alias to a newer
   version, and that would change the cost, the timing and the answers with no deploy and no
   warning.
8. **Re-check the retirement dates of the three allowed models** (gate 62, ADR-0017). Haiku 4.5 is
   the default, and its earliest retirement date, **2026-10-15**, has passed. The other two retire
   no sooner than 2027. ADR-0017 has the table, checked 2026-10-29. **The date is written down
   because a default model reaching end of life is otherwise found by an error message.** Anthropic
   emails a notice at least 60 days before it retires a model. That email is the trigger to run the
   golden set on the two Haiku models (gate 85) and switch the default. The switch is one edit to
   the `CONFIG` row and no deploy, as long as the new id is on the list. Re-check the dates again
   whenever the golden set runs.

**Four more come from the security review of this pack** (`../900-security/02-mitigations.md` §4 and
R-05). Each one is a promise that nobody has tested:

9. **Flip the kill-switch once on purpose, time it, and write the number down.** The promise is 60
   seconds and the cache is 30 (ADR-0009, NFR-34). A switch nobody has flipped is a paragraph, in
   the same way §9 of `01-iac-plan.md` says a rollback nobody has run is a plan.
10. **Run level 3 of the rollback once on purpose** (`01-iac-plan.md` §9). Same reason.
11. **Read the `zamphora-github-dev` role's policy after creating it in step 2, and confirm it names
    no `Zamphora-Prod-*` stack and no write to the `CONFIG` partition.** If gate 88 says yes, also
    confirm that its one DynamoDB permission is `dynamodb:DeleteItem` on the `dev` table, limited to
    test account A's partition. This is the one property of R-05 that could not be checked from a
    document, because the policy does not exist until step 2 writes it. The other two walls — no
    fork pull request runs the deploy workflow, and the trust claim is pinned to
    `repo:poszetkristof/zamphora:pull_request` — are verified in `04-ci-cd.md` §4.
12. **Confirm multi-factor sign-in is on for the AWS account**, on the root user and on any user the
    owner signs in as (gate 71, R-10). That one credential opens everything and there is no backup
    behind it, because point-in-time recovery is off (gate 46). **This is a hard stop before the
    first deploy, not a nice-to-have.**

## 11. What this document does not decide

Whether anything is deployed · whether any cost is acceptable · who is on call, and whether anyone
is · when open sign-up joins the product, which gate 49 records as a run-2 story · whether the `dev`
pipeline may delete test account A's daily counter row, which is gate 88.
