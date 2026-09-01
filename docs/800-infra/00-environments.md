# Environments — what exists, where it runs, and what is different in each

**Written by** 800 Infra, run 1 (`001-photo-assessment`). **Date:** 2026-08-27.
**Updated** 2026-08-28 with the owner's answers to gates 43 to 63.
**Read next by** 900 Security, 600 QA.

This file says how many copies of zamphora exist, what each copy is for, and which values change
between them. It solves one problem. Without it, "deploy it" has no meaning, because nobody can say
what "it" is or where it goes.

The inputs are `docs/400-architecture/00-options.md`, `02-containers.mmd`, `06-nfrs.md`,
`docs/500-engineering/03-api-spec.md` and the thirteen ADRs. Nothing else counts as a requirement.
Every outside fact carries a link and the date somebody checked it.

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
makes a real model call spends the same one balance. That is why §4 says a preview environment must
never call the real provider.

## 2. The three environments

| Name | Where it runs | Who uses it | Real model calls |
| --- | --- | --- | --- |
| `local` | The developer's own machine | The developer | No — a stub provider |
| `preview` | AWS. Created for a pull request, then destroyed | The `e2e` and `perf-flow` CI jobs | No — a stub provider |
| `prod` | AWS, always there | The one real user, and the developer | Yes |

**There is no `staging`.** A third always-there copy would take a third share of the DynamoDB
capacity in §5. It would also cost credit every hour, for a product with one user. `preview` exists
only for the minutes a pull request needs it.

**`prod` is the only environment that spends Anthropic credit, and the only one holding real
photos.**

### `local`

Everything that can run without AWS runs without AWS:

- `apps/web` — `next dev`.
- `apps/api` — `nest start`, listening on a local port.
- The table — **DynamoDB Local**, in Docker. It is Amazon's own copy of DynamoDB that runs on the
  developer's machine.
- The photos bucket — **MinIO**, in Docker. It is a file store that answers the same commands as S3.
- Sign-in — the Cognito user pool of the `preview` environment. Amazon Cognito is the AWS service
  that keeps the accounts and shows the sign-in pages, and a user pool cannot be run locally. This
  is the one place `local` touches AWS.
- The model — a stub `LlmProvider` that returns a fixed answer and sleeps for the budgeted 8,000 ms
  (`06-nfrs.md` NFR-01 already describes this stub).

**DynamoDB Local and MinIO are both accepted tools** (gate 51, owner, 2026-08-27). Each runs in
Docker on the owner's machine, costs nothing, and never touches the AWS account. Here is why they
are worth two new tools. Without them, local work has only two options. It writes into the real
table and the real bucket, which spends the free allowance and mixes test data with real data. Or it
cannot run at all.

**A plain local folder instead of MinIO was the second-best option.** It is one fewer tool. It lost
because it behaves less like S3, and the photo path is the part most likely to break.

### `preview`

Created by the pull request workflow, used by three CI jobs, then destroyed. See `04-ci-cd.md` §7.

**`06-nfrs.md` requires it.** NFR-01 is measured by "Playwright against a preview deploy", and the
`e2e` and `perf-flow` jobs both say "against a preview deploy". So a preview environment is not a
convenience. Three written requirements cannot be tested without it.

### `prod`

The real thing. One CloudFront distribution, one Lambda function, one table, one bucket, one user
pool. CloudFront is Amazon's content delivery network, the layer that answers the browser. Lambda
runs code without a server the project has to keep alive.

## 3. What each environment is made of

Every container in `02-containers.mmd` appears here. The CDK construct for each one is in
`01-iac-plan.md` §3.

| Container in the diagram | `local` | `preview` | `prod` |
| --- | --- | --- | --- |
| `edge` — CloudFront | Not present. The two dev servers run side by side | One distribution | One distribution |
| `web` — Next.js static export | `next dev` | Bucket + distribution | Bucket + distribution |
| `api` — Nest.js on Lambda | A normal Node process | One function | One function |
| `llm adapter` — `packages/llm` | Stub provider | Stub provider | Anthropic adapter |
| `contracts` — `packages/contracts` | Code. Not a deployed thing anywhere | | |
| `table` — DynamoDB | DynamoDB Local | One table at 5/5 | One table at 20/20 |
| `photos` — S3 | MinIO | One bucket | One bucket |
| Cognito user pool | Uses `preview`'s pool | One pool, Lite | One pool, Lite |
| Anthropic Messages API | Never called | Never called | Called once per assessment |
| Email delivery | Not built in run 1 (`02-containers.mmd`, gate 29) | | |
| AWS Management Console | The admin path. Not a deployed thing (gate 30) | | |

## 4. What changes between environments, and what must never change

**Changes:**

| Value | How it is set |
| --- | --- |
| Resource names | Every name carries the environment: `zamphora-prod-api`, `zamphora-preview-pr-142-api` |
| The host the app answers on | The CloudFront hostname of that environment's own distribution. §6 |
| The `LlmProvider` used | An environment variable read at start-up. `stub` outside `prod` |
| Log retention | 30 days in `prod`, 1 day in `preview` |
| DynamoDB capacity | 20 read / 20 write in `prod`, 5 / 5 in `preview`. §5 |
| Lambda reserved concurrency | 10 in `prod`, 2 in `preview` |

**Never changes, in any environment:**

- **Node 24**, in the Lambda runtime, in CI and on the developer's own machine (gate 60,
  `01-iac-plan.md` §4.4). One number, three places.
- **The Cognito Essentials feature plan** (gate 52, reopened and closed again 2026-08-31,
  `01-iac-plan.md` §4.3). Lite does not include managed login or page branding; Essentials costs the
  same $0 at this size.
- The 180-day photo lifecycle rule (ADR-0007, NFR-40). A lifecycle rule is a rule inside S3 that
  deletes an object once it reaches a set age. A preview bucket carries the same rule, so the CDK
  assertion test in NFR-40 checks the same code that ships.
- Every cookie rule: `__Host-` prefix, `Secure`, `HttpOnly`, `Path=/`, no `Domain` (ADR-0003,
  ADR-0010).
- The three stacked deadlines: 30,000 ms gateway, 20,000 ms application, 18,000 ms model
  (`03-api-spec.md` §7).
- `maxRetries: 0` (ADR-0005).
- The refuse-by-default route guard (ADR-0004).
- The bucket is private with Block Public Access on, everywhere (ADR-0007).
- The circuit breaker's numbers: 5 failures, 10 minutes, one test call
  (`02-cost-guardrails.md` §5).

**The rule behind that list:** a value may differ between environments only when it is about size or
cost. A value that is about correctness or safety is the same everywhere. If it is not, the preview
environment is testing a different product from the one that ships.

## 5. The DynamoDB capacity, split between two tables

**Decided by the owner on 2026-08-27, gate 43.**

```
prod     20 read units / 20 write units
preview   5 read units /  5 write units
          -----------------------------
total    25 / 25  — the whole free allowance, and nothing over it
```

**The question this answered.** The DynamoDB free allowance is 25 read and 25 write capacity units
**per Region, per payer account**, shared by every table in that Region. An AWS Region is one
geographic location that holds AWS resources. A capacity unit is the room DynamoDB holds open for
one request a second. `06-nfrs.md` needs a preview environment, and a preview environment needs a
second table. ADR-0002's summary said *"Do not add a second table in run 1; it would split the same
25 units."* The two could not both hold.

**Why splitting won.** The total stays at 25, so the free allowance is whole and no credit is spent.
`prod` gives up a fifth of its spare capacity. At one user nobody notices that: 20 read units is
still 20 strongly consistent reads a second, sustained, against a workload of ten assessments a day.

**Corrected 2026-08-31: the allowance is measured in unit-hours, not in units.** AWS bills
provisioned capacity per **capacity-unit-hour**, so the free amount is not a ceiling that applies at
every moment. It is about **18,250 unit-hours per Region per month**. `prod` at 20 units for a full
month uses 14,600 of them, which leaves 3,650 — exactly enough for a 5-unit `preview` table to run
for the **whole month**.

Three things follow, and they change how this is operated:

- **A `preview` table left running by accident does not take capacity away from `prod`.** It costs a
  small amount of money at the end of the month. That is a much smaller problem than the one this
  section originally feared.
- **The "only one preview environment at a time" rule in `04-ci-cd.md` is no longer needed**, and it
  is withdrawn. It brought `cancel-in-progress: true` with it, which can cut a `cdk deploy` in half
  and leave a stack stuck in `UPDATE_IN_PROGRESS`. That is a worse risk than the one it avoided.
- **The rejected option "both tables at 25/25" was rejected for a reason that was not true** —
  "nobody verified the per-unit price". The price is public and small, about $0.00065 per
  write-unit-hour. The 20/5 split is kept anyway, because it keeps the monthly total inside the free
  allowance with no arithmetic to redo each time.

**The two rejected options, so nobody re-opens this by accident:**

- **Both tables at 25/25**, going over the allowance only for the minutes a pull request runs. It
  lost because nobody verified the per-unit price, so the amount would be unknown. An unknown charge
  on an account that closes is worse than a known small loss of spare capacity.
- **No preview environment at all.** It lost because it leaves NFR-01 — the 30-second promise made
  to the person standing in front of the plant — with no CI job behind it.

**ADR-0002 was corrected in place on 2026-08-31** and now states the rule as a **total** across
every table in the Region rather than a per-table 25/25, with the unit-hour arithmetic above. So the
ADR and this section agree. `docs/context/stack.md` §3 and its gotcha table were corrected in the
same pass.

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

**Each environment has its own CloudFront hostname**, so `preview` and `prod` are different hosts
and their cookies cannot reach each other. That is a small extra safety the free name gives for
nothing.

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
certificate, and gate 45 has now made that certificate unnecessary.

**Two things that follow from a single Region.**

- The DynamoDB free allowance of 25 read and 25 write units is **per Region**, so §5's arithmetic is
  the whole account's arithmetic. Adding a second Region would add a second allowance and also a
  second of everything to look after.
- CloudFront itself is not in a Region. It is global, and it reaches the `eu-central-1` origins.

## 8. Secrets, and where they are not

Two secrets exist in run 1:

| Secret | Who needs it | Where it lives |
| --- | --- | --- |
| The Cognito app client secret | `apps/api` (ADR-0003 — a confidential client) | Parameter Store, `SecureString` |
| The Anthropic API key | `apps/api`, through `packages/llm` | Parameter Store, `SecureString` |

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
| GitHub Actions, preview | The `preview` stacks only | A second role, restricted to pull requests |
| The API function | The table, the bucket, two parameters | Its own execution role, with only those permissions |
| The web files | Nothing | ADR-0010: the web app has no role, no client and no credential |

**Nobody creates their own account in run 1.** Cognito self sign-up is off, and the owner creates
every account by hand (gate 49, `01-iac-plan.md` §4.3).

**The admin path is not part of the product, and that is on purpose.** `02-containers.mmd` draws the
admin reaching the table through the AWS console and never through the API. So the kill-switch flip
leaves no application log. AWS's own record of console activity is the only place it appears
(ADR-0009, `03-observability.md` §8).

## 10. What has to be true before the first deploy

A checklist, in order. Each line is a thing a person does once. The pipeline half of it is in
`04-ci-cd.md` §10, and the changes owed in other roles' files are in `04-ci-cd.md` §6.2.

1. The owner runs `cdk bootstrap` once, in **`eu-central-1`**, from their own machine.
2. The owner creates the two GitHub OpenID Connect roles for `poszetkristof/zamphora`
   (`04-ci-cd.md` §4). This step can never be automated: CI cannot create the role it needs in order
   to sign in.
3. The owner writes the two `SecureString` parameters by hand.
4. **The owner adds the alarm email address in the SNS console and confirms it** (gate 58). CDK
   creates the topic with no subscriber, so until this is done every alarm fires into nothing. AWS
   sends a confirmation link that has to be clicked, so no code could do this step anyway.
5. The owner creates the one real account in the Cognito console, because self sign-up is off. The
   `preview` pool gets one test account at the same time (`04-ci-cd.md` §7).
6. The owner writes the three `CONFIG` rows into the table by hand: `AI_ENABLED`, `DAILY_LIMIT`,
   `MODEL_ID` (`03-api-spec.md` §6). These are data, not infrastructure, and ADR-0009 says nothing
   in the application writes them.
7. **Write `MODEL_ID` as `claude-haiku-4-5-20251001`, the dated snapshot** (gate 53). Both id forms
   are real. `claude-haiku-4-5` is an alias that points at that snapshot today
   ([models overview](https://platform.claude.com/docs/en/about-claude/models/overview), checked
   2026-08-28). The dated one is used because a provider can move an alias to a newer version, and
   that would change the cost, the timing and the answers with no deploy and no warning.
8. **Re-check when Claude Haiku 4.5 retires** (gate 62). The date on record is **2026-10-15**, which
   is about seven weeks after this plan was written, and Haiku 4.5 is the default model (same page,
   checked 2026-08-28). **The date is written down because a default model reaching end of life is
   otherwise found by an error message.** The fix is cheap: ADR-0006 keeps the model id in a
   DynamoDB row and not in code, so moving to another model is one edit and no deploy. Moving to
   Sonnet 5 now was rejected on cost — gate row 62 has the arithmetic. **Re-check again if run 1 is
   still running in October 2026.**

## 11. What this document does not decide

Whether anything is deployed · whether any cost is acceptable · who is on call, and whether anyone
is · when open sign-up joins the product, which gate 49 records as a run-2 story.
