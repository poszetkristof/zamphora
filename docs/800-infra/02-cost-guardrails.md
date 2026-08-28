# Cost guardrails — what is free, what is not, and what stops a runaway

**Written by** 800 Infra, run 1 (`001-photo-assessment`). **Date:** 2026-08-27.
**Updated** 2026-08-28 with the owner's answers to gates 43 to 63. §5 was rewritten by gate 50.
**Read next by** 900 Security, 600 QA.

This file lists every service in the plan with its free allowance. It says what happens when an
allowance is passed. It names the mechanisms that stop the product spending money by accident. It
solves one problem. On this account, the money running out does not produce a bill. It ends the
account and takes the running system with it.

**Cost here is a correctness property, not an accounting one.** A retry loop on a model call is not
an expensive mistake. It is a mistake that ends in an outage.

---

## 1. Two balances, and they fail in different ways

| Balance | Holds | Runs out how | What happens then |
| --- | --- | --- | --- |
| **The AWS credit** | Up to $200, ending 2026-12-31 at the latest | Any AWS resource that is not Always Free | The Free account plan ends. The resources go |
| **The Anthropic credit** | About $5, topped up by hand | One model call at a time | Every assessment answers `no-credit`. Nothing else in the product stops |

**They are separate accounts and they do not protect each other.** No AWS alarm and no AWS budget can
see a model call, because Anthropic bills that call and AWS does not (gate 9). An empty Anthropic
balance does not save AWS credit.

**The ten-a-day cap is the application's own limit, not an AWS one.** It is a counter in the DynamoDB
table, and the API checks it before every model call (ADR-0008). That limit and the circuit breaker
in §5 are what hold Anthropic spending down. No AWS setting can do that job.

**The Anthropic one fails gently and the AWS one does not.** `no-credit` is a named failure with a
screen and no retry (`06-nfrs.md` §3). An AWS account plan ending is the whole product going away.

## 2. Every service, its allowance, and what happens when it is passed

**Read the "Offer" column first.** AWS has two kinds of free offer, and on this account only one of
them is switched on:

> "**Paid plan** accounts might have `Short-term trial` and `Always Free` offerings active.
> **Free account plan** only have `Always Free` offerings active."
> ([AWS Billing user guide](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html),
> checked 2026-08-27.)

So a service whose free offer is a twelve-month trial gets **nothing** here. It bills from the first
request, against the credit.

| Service | Offer | Monthly allowance | What happens when it is passed |
| --- | --- | --- | --- |
| **AWS Lambda** | Always Free | "one million requests and 400,000 GB-seconds per month" ([Lambda pricing](https://aws.amazon.com/lambda/pricing/), checked 2026-08-25 in ADR-0002) | Charged per request and per GB-second, against the credit |
| **Amazon DynamoDB** | Always Free | 25 GB of storage, 25 write and 25 read capacity units, **per Region, per payer account**. Provisioned capacity and the Standard table class only ([DynamoDB provisioned pricing](https://aws.amazon.com/dynamodb/pricing/provisioned/), checked 2026-08-26 in ADR-0002) | Capacity above 25 is charged. **A burst past the table's own units is refused, not served** — that is the guardrail, see §6 |
| **Amazon CloudFront** | Always Free. "This always free service is on the Free and paid plan" | "1 TB of Data Transfer Out", "10 Million HTTP or HTTPS Requests" ([AWS free networking](https://aws.amazon.com/free/networking/), checked 2026-08-27) | Charged per GB and per 10,000 requests |
| **Amazon Cognito** | Free tier that "does not automatically expire at the end of your 12-month AWS Free Tier term" | 10,000 monthly active users, on **Lite** and on Essentials ([Cognito pricing](https://aws.amazon.com/cognito/pricing/), checked 2026-08-25 in ADR-0003) | Charged per monthly active user. **The tier is Lite** (gate 52). Both tiers include managed login, and Essentials only adds a visual editor this project does not use. Past 10,000 users, Lite is **$0.0055** and Essentials **$0.015** (same page, checked 2026-08-28) |
| **Amazon API Gateway** | **No Always Free offer.** The free amount is a twelve-month trial ([API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/), checked 2026-08-26 in ADR-0002) | **Nothing** | **Bills from the first request**, at $1.00 per million HTTP API calls |
| **Amazon S3** | **No Always Free offer.** "5 GB of Amazon S3 Standard storage, 20,000 Get Requests, 2,000 Put Requests… each month for one year" ([S3 free tier](https://aws.amazon.com/free/storage/s3/), checked 2026-08-27) | **Nothing** | **Bills from the first object.** The per-GB and per-request prices were **not verified first-party** in this run |
| **Amazon CloudWatch** | Free tier, described with no twelve-month qualifier | 5 GB of log data (ingestion, archive storage and Logs Insights scanning together), 10 custom metrics, 10 alarm metrics, 3 dashboards, 1 million API requests ([CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/), checked 2026-08-27) | Charged per GB and per metric. **Whether these are Always Free on a Free account plan was not verified first-party.** Treat the numbers as a budget, not as a promise |
| **AWS Systems Manager Parameter Store** | Standard parameters have no charge | Standard tier only. Advanced parameters are charged | **Not verified first-party in this run.** Never create an advanced parameter |
| **Amazon SNS** | Free tier for email notifications | Used only for alarm emails. **The exact free number was not verified first-party in this run** | A handful of alarm emails a month is far below any published figure |
| **CloudFront Functions** | Free allowance for invocations | Used for the URL rewrite (`01-iac-plan.md` §4.6). **Not verified first-party in this run** | Charged per million invocations |
| **AWS KMS** | AWS-managed and AWS-owned keys have no monthly charge | **This design creates no key of its own** | Not applicable — see §6 |
| **Amazon Route 53** | **No free tier for hosted zones.** "$0.50 per hosted zone per month" ([Route 53 pricing](https://aws.amazon.com/route53/pricing/), checked 2026-08-27) | **Not used.** Gate 45 chose the free CloudFront hostname, so no hosted zone exists | Not applicable |
| **AWS Certificate Manager** | Public certificates have no charge | **Not used.** No domain, so no certificate | Not applicable |
| **NAT Gateway** | None. There is no free offer | **This design has no VPC and therefore no NAT Gateway** | Not applicable — see §6 |
| **DynamoDB point-in-time recovery** | None. Charged per gigabyte | **Off** (gate 46, §8) | Not applicable |
| **GitHub Actions** | Not AWS. Free and unlimited on a public repository | Unlimited minutes, and CodeQL scanning at no charge (gate 47) | Not applicable while the repository is public |
| **Anthropic Messages API** | Not AWS. A separate account | About $5, topped up by hand | The feature answers `no-credit` and never retries |

**Three findings from that table are worth saying in words.**

1. **"The whole stack is free" is not true, and it was never claimed.** ADR-0002 already wrote this
   about API Gateway. This run found the same shape for **S3** and for **Route 53**. Two of the
   three still apply. The third does not, because gate 45 removed the hosted zone entirely. A hosted
   zone is where Route 53 keeps the DNS records for one domain.
2. **The amounts are tiny at one user.** §4 does the arithmetic.
3. **Five rows in that table carry a "not verified first-party" mark, and between them they hold six
   numbers.** The five rows are S3, CloudWatch, Parameter Store, SNS and CloudFront Functions. Five
   rows but six numbers, because the S3 row names two prices: one for storage and one for requests.
   First-party means checked against the provider's own page, not against a blog post or a memory.
   Each unchecked number is small enough that it does not change a decision. They are marked anyway,
   because a number nobody checked and a number somebody checked look identical once they are
   written down.

## 3. Where the free allowances actually get spent, and the settings that stop it

Three of the allowances above are the ones this product can really use up. Each has a setting.

### CloudWatch logs — the 5 GB

**The default is the danger.** If Lambda creates its own log group, that group never expires. Logs
count against the 5 GB when they arrive (ingestion) *and* again while they sit there (archive
storage). So a log group left to run forever spends the same allowance twice.

- **Set the log group in CDK, with `retention: 30 days` in `prod` and `1 day` in `preview`.**
- **The lasting record of spend is not the logs.** It is the day rollup item in DynamoDB
  (`03-api-spec.md` §8), which has no expiry. Thirty days of logs is enough to look at an incident.
  The numbers for NFR-13 and NFR-14 come from the table.
- **Never log the photo bytes.** `03-api-spec.md` §11 forbids it for privacy. It is also the fastest
  way to fill 5 GB.

### DynamoDB — the 25 units, now split between two tables

`prod` runs at 20 read and 20 write units, `preview` at 5 and 5, and the two add up to exactly 25
(gate 43, `00-environments.md` §5).

- **20 read units is 20 strongly consistent reads a second, without a break.** A strongly consistent
  read always returns the newest value. One user making ten assessments a day is nowhere near it.
- **The rule to keep: the total across every table in `eu-central-1` must never pass 25.** A third
  table is not forbidden by arithmetic. It is forbidden by that total.
- **Fixed, with auto scaling off.** Auto scaling would raise the numbers past the free line without
  asking.
- **Storage is capped by design.** The table holds no photo bytes. The daily counter and the circuit
  breaker row both carry a time-to-live, which is a time after which DynamoDB deletes the row on its
  own. The biggest item is an assessment's text.

### S3 — no allowance at all

Storage grows with photos. The 180-day lifecycle rule caps it (ADR-0007). One user taking 30
assessments a month, at about 200 KB each, adds about 6 MB a month. Once the rule starts deleting,
the total settles at roughly 36 MB.

- **The lifecycle rule is the storage cap.** It is also the retention promise. One rule, two jobs.
- **No thumbnail and no second copy** (ADR-0007, NFR-42). Every copy would be a second object with a
  second PUT charge and a second thing to delete.
- **The web bucket is tiny and stops growing**, because `BucketDeployment` replaces it each deploy.

## 4. What this costs at expected use

`06-nfrs.md` NFR-14 sets expected use at about 30 assessments a month.

| Line | Per month, roughly | Why |
| --- | --- | --- |
| Lambda | $0 | Far inside 1 million requests and 400,000 GB-seconds |
| DynamoDB | $0 | Inside 20/20 plus 5/5, and inside 25 GB |
| CloudFront | $0 | Inside 1 TB and 10 million requests |
| Cognito | $0 | One monthly active user against 10,000, on Lite |
| CloudWatch | $0 | Inside 5 GB, 10 metrics, 10 alarms |
| **Route 53** | **$0** | **No hosted zone. Gate 45 chose the free CloudFront hostname** |
| **GitHub Actions** | **$0** | Unlimited on a public repository (gate 47) |
| API Gateway | About $0.002 | $1.00 per million calls, at roughly 2,000 calls a month |
| S3 | A fraction of a cent | About 36 MB and about 30 PUTs. **Price not verified first-party** |
| **Anthropic** | **About $0.11** | 30 assessments at $0.0035 each (ADR-0005) |

**The whole AWS side is under a cent a month at expected use.** That is the direct result of gate
45. With a bought domain, the $0.50 hosted zone would have been the largest AWS line in the product.
It would have been bigger than the compute, the storage and the gateway together. Removing it
removed about 99% of the AWS bill.

**One thing can move the Anthropic line, and it has a date.** Claude Haiku 4.5 retires no sooner
than **2026-10-15** (gate 62). A different model would change the per-assessment cost, so the date is
step 8 of the before-first-deploy checklist in `00-environments.md` §10.

**These figures are for the expected case and prove nothing about the bad case.** §5 and §6 are
about the bad case.

## 5. The seven guardrails on the one endpoint that spends money

`POST /api/assessments` is the only route in the product that costs anything per call. Every AI
endpoint needs all seven of these. Here is each one, where it is written, and how honest it is.

### 1. Time budget — three deadlines, stacked

```
30,000 ms   API Gateway cuts the request off. Cannot be raised
22,000 ms   The Lambda function's own timeout        <- set by this plan
20,000 ms   REQUEST_DEADLINE_MS, the app gives up and answers `deadline-passed`
18,000 ms   MODEL_TIMEOUT_MS, the ceiling on the one call
```

The function timeout sits **above** the application deadline, so the app always answers for itself.
It sits **below** the gateway's cut, so the person never sees a 504 that nothing in this product
wrote (ADR-0002, `03-api-spec.md` §7, NFR-02).

**One clock per request**, checked before every step that can block. The abort signal handed to the
model adapter fires at whichever comes first: 18,000 ms, or the time left on the request deadline.

### 2. Cost cap — measured, not estimated

- **$0.0040 per assessment** on Haiku 4.5 (NFR-10).
- **Computed from the `usage` block the API returns**, never from an estimate (ADR-0006).
- **Stored in millionths of a dollar as a whole number**, because the day rollup uses an atomic
  `ADD` and adding decimal numbers loses precision (`03-api-spec.md` §8).
- **`max_tokens: 1024` is not a cost control.** Anthropic charges for the tokens the model writes,
  not for the ceiling. `03-api-spec.md` says it plainly: **do not tune that number down to save
  money, it does not save any**. A tight ceiling causes `answer-truncated`, which ends the person's
  attempt with no way forward.

**There is no cap that stops spending, and that is a recorded decision rather than a gap.**
`06-nfrs.md` §3: the credit balance reaching zero is the stop. NFR-14's $5.00 over six months is a
number to watch, not a number that is enforced. NFR-14 also carries the arithmetic that shows the
daily limit does not guarantee it: one person using all ten every day for 184 days spends about
$6.44.

### 3. Retry cap — zero, everywhere

**There is no retry. Anywhere.** Not a timeout, not a 429, not a 503, not an unreadable answer
(ADR-0005, NFR-05, owner 2026-08-26).

**`maxRetries: 0` on the Anthropic client, and it is not optional.** The SDK retries twice by
default. Left alone, an 18,000 ms timeout becomes 54,000 ms of real time. That is past the
application deadline and past the gateway's hard cut. So the default breaks the money *and* the
deadline, and it reports nothing (`03-api-spec.md` §4).

**A test enforces it.** NFR-04: a stub provider counts calls, and **every** failure case gives
exactly 1 — timeout, 429, 503, refusal, truncation, bad request, empty balance, rejected photo.

**The circuit breaker in guardrail 6 is not a retry and does not become one.** A retry makes a
second call for the same person's same photo. The breaker makes **fewer** calls, never more.

### 4. Checkpointing — what it means when there is nothing to resume

There is one call and no retry, so there is no partial run to pick up. What exists instead is an
order of writes chosen so that a failure never loses the count and never leaves a mess:

- **The daily counter increments before the call**, so a failed call still counts. The money was
  spent whether or not an answer came back (ADR-0008).
- **The counter increments before the photo is written**, so a refused request leaves no object
  behind.
- **A failure from step 9 to step 11 is stored by name**, as a failure record and not as an
  assessment, so the count in NFR-23 can be taken (`03-api-spec.md` §4).

**Say it plainly: this endpoint has no checkpoint, because one call cannot be half done.** When the
assessment moves to a background job in run 3, that changes and this line has to be rewritten.

### 5. Fallback — there is none, and that is the honest answer

**Nothing can produce a verdict when the model call fails.** `00-options.md` §8 works through it:
plain code cannot turn a photograph into a verdict, there is no second opinion service by the
owner's decision, and there is no cached answer for a photo nobody has sent before.

So the fallback is a **named failure with a screen and a retry hint**, never a made-up verdict:
`provider-timeout`, `provider-throttled`, `provider-unavailable`, `provider-refused`,
`answer-truncated`, `answer-unreadable`, `no-credit`, `deadline-passed`, `feature-off`,
`daily-limit-reached`.

**A guessed verdict would be worse than a failure**, because a person acts on it and the plant is
harmed. An AI feature with no fallback answer must fail where the person can see it.

### 6. Circuit breaker — automatic, and it heals itself

**Decided by the owner on 2026-08-27, gate 50.** This role recommended keeping the breaker human and
was overruled. The owner wanted an automatic breaker, and wanted it **without reversing ADR-0009**.
The shape below does both.

**The rule, in three numbers.**

```
5 failed model calls in a row   ->  the breaker opens
10 minutes                      ->  no model call is made at all
then exactly 1 call             ->  a test. If it works, normal service returns
```

**Where it lives.** In the API, as **its own row** in the DynamoDB table. The row holds three
things: how many calls have failed in a row, the moment the breaker opened, and the moment it may
next let one call through. It carries a time-to-live, so it does not sit in the table forever.
**The row's shape has to be written into two files that belong to other roles** —
`docs/400-architecture/05-patterns.md` §1 and `docs/500-engineering/03-api-spec.md` §8.1. Both are
in the list in `04-ci-cd.md` §6.2.

**The rule that must never be broken.** The breaker **never touches `PK = CONFIG, SK = AI_ENABLED`**.
That row is the owner's kill-switch. So two things stay true at once, and neither weakens the other:

- **The kill-switch is the owner's alone.** Nothing in the application writes it, exactly as
  ADR-0009 says. A switch the owner turned off stays off until the owner turns it back on. A breaker
  that has healed cannot turn it on.
- **A runaway that starts overnight stops itself**, without waiting for a person to read an email.

**Where the check runs in the request.** Straight after the kill-switch is read and **before** the
daily limit is counted — between step 6 and step 7 of `03-api-spec.md` §4. That order matters: an
open breaker means no call was made, so it must not spend one of the person's ten. It is the same
reasoning as US-08 AC-3, which requires that a refusal costs no money.

**What the person sees while it is open.** This role's reading is that the existing
`provider-unavailable` is the right answer. It needs no new failure code, no new screen and no
contract change. From the person's side, a breaker that is open and a provider that is down are the
same thing: the model cannot be reached, and trying again in a few minutes may work.
**Naming failure codes belongs to 500 Engineering.** If a separate code is wanted instead, the two
files it would touch are named as a conditional entry at the end of `04-ci-cd.md` §6.2.

**Which failures count, and this is a detail the gate did not settle.** This file reads "failed
model call" as the call itself going wrong — `provider-timeout`, `provider-throttled`,
`provider-unavailable` and `no-credit`. It does **not** read `provider-refused` or
`answer-truncated` as breaker failures, because in both of those the provider answered normally and
the money was spent on a working service. **Confirm this list when the row shape is written into
`05-patterns.md`.**

**What it costs to open, and what it saves.** Five failures at about $0.0035 each is **$0.0175**
spent before the breaker opens. While it is open, the most the product can spend is **one call every
ten minutes**, which is six an hour.

**How much that is worth today, said honestly.** With self sign-up off and one account, the daily
limit already caps spending at ten calls a day, which is about $0.035. So the breaker saves little
money in run 1. **Its value is speed and its value is the future.** Speed: it stops in seconds. A
person reading an email stops it in minutes, or in hours if it happens at night. The future: the
moment gate 49's open sign-up story ships, the daily limit stops being a ceiling on the whole
product and becomes a ceiling per account. Then this breaker is the only thing that caps the total.

**The two rejected shapes**, so nobody rebuilds them:

- **The breaker flips the real kill-switch.** Rejected: it is a direct reversal of ADR-0009, and the
  owner would find the feature switched off by something that is not the owner.
- **Both, a breaker and a kill-switch flip together.** Rejected for the same reason.

### 7. Kill-switch — the owner's, and nobody else's

```
PK = CONFIG
SK = AI_ENABLED
   enabled   true or false
```

- Read into the function's memory and re-read when the copy is more than **30,000 ms** old. Gate G-8
  promises 60 seconds. Thirty leaves the rest as spare time (NFR-34, ADR-0009).
- **A failed read keeps the last known value.** The switch does not flip itself on a network blip.
- **If there has never been a known value, the call does not run.** A function that cannot read its
  own configuration should not be spending money.
- **Flipped by editing the row in the AWS console.** No route, no screen, no copied cookie
  (ADR-0009, gate 30).
- **Nothing in the application records who flipped it**, because nothing in the application runs
  when it happens. AWS's own record of console activity is the only place it appears.
- **The circuit breaker never writes this row.** Guardrail 6.

**Owning this switch is on the list of decisions that are never a model's.** This document defines
where it lives. It does not hold it.

## 6. The guardrails that are structural, not watched

The seven above are about one endpoint. These are about the whole account, and they are better,
because none of them depends on anybody reading an email.

| Guardrail | Setting | What it stops |
| --- | --- | --- |
| **Provisioned DynamoDB, 20/20 plus 5/5** | `01-iac-plan.md` §4.1 | A runaway loop is **throttled**, so the requests fail and somebody notices. On demand, the same loop succeeds and eats the credit (ADR-0002) |
| **Lambda reserved concurrency 10** | `01-iac-plan.md` §4.4 | A loop cannot start a thousand copies of a function that each wait 18 seconds on a paid call. Ten is the largest number any requirement asks for (NFR-12) |
| **Lambda timeout 22 seconds** | `01-iac-plan.md` §4.4 | A hung request cannot burn GB-seconds forever |
| **Cognito self sign-up off** | `01-iac-plan.md` §4.3 | Strangers cannot create accounts against a shared $5 balance (gate 49) |
| **No VPC, so no NAT Gateway** | `01-iac-plan.md` §4.4 | A NAT Gateway is charged by the hour with no free offer, and would be the single largest line item in the product (ADR-0002) |
| **No cache service** | ADR-0002 | ElastiCache and DAX are charged by the hour, save 24 ms out of 8,191, and would force the function into a VPC |
| **AWS-managed keys only** | `01-iac-plan.md` §4.2, §6 | A key this project created would carry a monthly charge and a per-request charge. This design creates none |
| **No hosted zone, no certificate** | `01-iac-plan.md` §7 | $0.50 a month, every month, avoided (gate 45) |
| **S3 lifecycle at 180 days** | `01-iac-plan.md` §4.2 | Storage stops growing. It is also the retention promise |
| **Log retention 30 days** | `01-iac-plan.md` §4.4 | The 5 GB CloudWatch allowance is not eaten by logs that never expire |
| **No AWS WAF** | `01-iac-plan.md` §4.6 | WAF costs money per rule and per request |
| **No always-on anything** | ADR-0002, ADR-0010 | No load balancer, no container, no managed database, no Next.js server. An untouched week costs nothing |
| **`ai-eval` never runs on a push** | `04-ci-cd.md` §8 | 40 photos at $0.0040 is $0.16 a run. Nightly is about $4.80 a month, which is the whole Anthropic balance (NFR-11) |
| **A person starts every deploy** | `04-ci-cd.md` §8 | A merge cannot spend money without somebody deciding to (gate 48) |
| **The preview environment never calls the real provider** | `04-ci-cd.md` §7 | A pull request cannot spend the $5 balance |

**A blunt request cap at the gateway is allowed and is not the daily limit.** ADR-0008 rejected API
Gateway throttling *as the per-account daily limit*. It cannot express "10 per calendar day", and it
cannot tell one account from another. It said nothing against a plain volume ceiling. Setting the
default stage throttle to a low rate — say 20 requests a second, burst 10 — costs nothing and stops
a flood before it reaches the function. **Read that as a rough ceiling on total traffic, not as the
per-account daily limit.**

## 7. Watching the balances

**The structural guardrails above are the real protection. This section is the second line.**

### The AWS credit

- **A weekly look at the Billing console's remaining-credit figure, on a fixed day.** One person, one
  minute. It is written here as a routine because there is no reliable automatic version of it. The
  usual billing alarm watches an estimated *charge*, and on a Free account plan the credit goes down
  instead of a charge appearing. **Whether an alarm can watch the credit going down on this plan was
  not verified first-party in this run.**
- **An AWS Budget with an alert.** The first budgets carry no charge on most accounts, and this
  would need one. **The exact free number was not verified first-party.** Worth setting up once the
  account details are settled.
- **The strongest signal is free and needs no setup:** the DynamoDB throttle alarms in
  `03-observability.md` §5. A table that is being throttled is a workload that has gone wrong. The
  alarm fires long before the credit moves.

### The Anthropic credit

- **`costMicroUsd` on the day rollup** is the app's own record, written on every assessment.
- **NFR-13 compares it with Anthropic's own record**, as a local script, monthly. The admin key it
  needs does not go on the server (`03-api-spec.md` §8).
- **NFR-14 sums the rollups over 2026-07-01 to 2026-12-31** and compares against $5.00. It is a
  watch number, not an enforced one.
- **An alarm on hourly spend** fires long before the balance empties (`03-observability.md` §5).
- **The circuit breaker acts on its own**, and it is the only one of these that does not need a
  person (§5, guardrail 6).

## 8. What losing the account actually costs

**The infrastructure is safe.** Everything in `01-iac-plan.md` is CDK, in git. A destroyed account
comes back with `cdk bootstrap` and one `cdk deploy --all`. That is the whole argument for putting
every resource in code from the first one, and it is worth more here than on a paid account.

**The data is not safe, and that is now a decision rather than a gap.** Gate 46, owner, 2026-08-27:
**DynamoDB point-in-time recovery is off in run 1**, because it is charged per gigabyte with no free
allowance. At one user with test data, losing rows is survivable, and that is what made it
acceptable.

What does not come back:

- Every assessment and every pot in the DynamoDB table.
- Every photo in the bucket.
- Every account in the Cognito user pool.

**How long AWS keeps data after an account plan ends was not verified first-party in this run.** Do
not plan against a grace period nobody checked. So the replacement for a backup is a calendar entry:

> **Export the table and the photo bucket to the owner's own machine before 2026-12-31.**

**The trigger to turn point-in-time recovery on is real data, not a date.** The moment the table
holds a person's plant history rather than test rows, the small per-gigabyte charge is worth it and
gate 46 should be re-opened.

## 9. What this document does not decide

Whether any cost is acceptable · whether the account moves to a paid plan · who owns the
kill-switch, which is the owner · when to declare an incident · which failure codes count as a
breaker failure, which is confirmed when the breaker's row shape is written into
`docs/400-architecture/05-patterns.md` — see the list in `04-ci-cd.md` §6.2.
