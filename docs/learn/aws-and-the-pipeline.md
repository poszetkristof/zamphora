# AWS and the pipeline

**How this project runs on AWS, and how the build reaches AWS without any password existing.**

Written 2026-08-27, after 800 Infra ran and the owner closed 17 decisions.
Rewritten 2026-08-31, after a full review of the pack. The running system now comes first.

This is the third learning note. `ai-native-delivery.md` is about the **process**.
`monorepo-architecture.md` is about the **shape of the code**. This one is about the **running
system** — what is in the cloud, who is allowed to change it, and what stops it costing money.

**Part A is the system.** Read it in order, once. It is the part worth understanding six months from
now, because the shape of the running system is what you have to hold in your head before you can
change anything.

**Part B is the pipeline** — how code gets from your machine to AWS safely. Read it once too. After
that, it mostly looks after itself.

**Part C is lookup.** Come back to it when you need a number.

---

## Contents

**Part A — the running system**

1. [The account, and why that changes everything](#1-the-account-and-why-that-changes-everything)
2. [The seven stacks, and the picture they make](#2-the-seven-stacks-and-the-picture-they-make)
3. [The path of one request](#3-the-path-of-one-request)
4. [Four clocks, stacked](#4-four-clocks-stacked)
5. [One table, and the "wrong" choice made on purpose](#5-one-table-and-the-wrong-choice-made-on-purpose)
6. [The photo path](#6-the-photo-path)
7. [The function itself, and the build that nearly did not work](#7-the-function-itself-and-the-build-that-nearly-did-not-work)
8. [What stops it costing money](#8-what-stops-it-costing-money)
9. [What you can see when it breaks](#9-what-you-can-see-when-it-breaks)
10. [Two switches that look the same and are not](#10-two-switches-that-look-the-same-and-are-not)

**Part B — the pipeline**

11. [How the build signs in to AWS with no password](#11-how-the-build-signs-in-to-aws-with-no-password)
12. [A public repository, and the two walls](#12-a-public-repository-and-the-two-walls)
13. [What has to be green before a merge](#13-what-has-to-be-green-before-a-merge)

**Part C**

14. [Lookup: what was chosen, and what lost](#14-lookup-what-was-chosen-and-what-lost)

---

# Part A — the running system

## 1. The account, and why that changes everything

This runs on the **AWS free account plan**. That plan does not send a bill. When you go past what is
free, it **closes the account** and takes the resources with it.

So a runaway loop is not an accounting problem. It is the product disappearing. That is why every
resource is written in CDK and kept in git: a lost account is one deploy away from coming back.

**Two facts that surprise most people.**

**First, AWS has two kinds of free offer, and this plan only has one of them switched on:**

- **Always Free** — free forever. Lambda, DynamoDB, CloudFront, Cognito.
- **Twelve-month trial** — free for a year on a *paid* plan. **This account gets none of it.**

So **API Gateway, S3 and Route 53 bill from the very first request.** The amounts are tiny at one
user — under a cent a month — but "the whole stack is free" was never true, and the plan says so.

**Second, the DynamoDB free amount is measured in hours, not in a ceiling.** This is the fact that
is easiest to get wrong, and it changed a decision here. The free amount is not "25 capacity units,
at every moment". It is 25 units held for a whole month, which is about **18,250 capacity-unit-hours
a month, per Region**. A capacity unit is room held open for one request a second.

That difference matters because it changes what a mistake costs:

| If you think it is a ceiling | What is actually true |
| --- | --- |
| A second table steals capacity from the first | A second table spends unit-hours. The first table keeps its own speed |
| A preview table left running breaks production | It costs a small amount of money at the end of the month |
| Two open pull requests cannot both have a preview | They can. A pull request that lives a few hours costs a fraction of a cent |

This project ran on the wrong model for four days. It split `prod` down to 20/20 to make room for a
`preview` table at 5/5, and wrote a rule saying only one preview may exist at a time. The split is
kept because it keeps the monthly total inside the free amount with no arithmetic to redo. The rule
was withdrawn, because it was protecting against something that does not happen.

---

## 2. The seven stacks, and the picture they make

Everything is CDK. A **stack** is one group of AWS resources that is created, updated and deleted
together. There are seven, and each is a separate deployable unit — so one can be replaced without
touching the others.

One Region: **eu-central-1**, Frankfurt, because a photo of the inside of a home is personal data
and it should stay under EU rules. There is one exception, and it is explained below.

```mermaid
flowchart TD
    U["Plant keeper, on a phone"] --> CF

    subgraph EDGE ["ZamphoraEdgeStack — the one front door"]
        CF["CloudFront distribution<br/>one host name for everything"]
    end

    subgraph WEBS ["ZamphoraWebStack"]
        WEB[("S3 bucket<br/>the pages, built ahead of time")]
    end

    subgraph APIS ["ZamphoraApiStack"]
        GW["API Gateway<br/>HTTP API"] --> FN["Lambda<br/>the whole Nest.js API<br/>in one function"]
    end

    subgraph DATA ["ZamphoraDataStack"]
        DDB[("DynamoDB<br/>one table")]
    end

    subgraph PHOTOS ["ZamphoraPhotosStack"]
        PH[("S3<br/>one object per photo")]
    end

    subgraph AUTH ["ZamphoraAuthStack"]
        COG["Cognito<br/>the sign-in pages"]
    end

    CF -->|"everything except /api/*"| WEB
    CF -->|"/api/* only"| GW
    FN --> DDB
    FN --> PH
    FN --> COG
    FN --> ANT["Anthropic API<br/>one call per assessment"]

    style WEB fill:#e8f4ea
    style DDB fill:#e8f4ea
    style PH fill:#e8f4ea
```

The seventh stack is **`ZamphoraOpsStack`** — the alarms, the dashboard and the notification topic.
It is not part of the product. It watches it. Section 9 covers what it can see.

**Four things to notice, because each one is a decision and not an accident.**

- **The web pages hold no credentials and reach no database.** They are plain files, built ahead of
  time and put in a bucket. Every piece of data goes through the API. That is why the browser only
  ever has one cookie, and why a bug in the web app cannot read or write anything.
- **There is one Lambda, not one per route.** One deployable unit is easier to reason about, one
  cold start is paid instead of many, and the free amount is a million requests a month. The honest
  price is in section 7.
- **There is no VPC.** A VPC is a private network inside AWS. It would need a NAT Gateway to reach
  Anthropic, and a NAT Gateway is charged by the hour with no free offer. It would be the largest
  line in the whole product.
- **The API is the only thing with credentials.** It holds the Cognito client secret, the Anthropic
  key, and the permissions on the table and the bucket. Nothing else in the product holds any.

**The one thing outside eu-central-1.** CloudFront publishes its measurements only to **us-east-1**,
and there is no way to change that. So the two alarms that watch the front door live in a small
extra stack in that Region. It holds alarms and nothing else — no function, no table, no bucket. The
rule "one Region for everything that serves a request" still holds.

**The host name is CloudFront's own**, like `d111111abcdef8.cloudfront.net`. A bought domain needs a
Route 53 hosted zone at **$0.50 every month**, which at this size would cost more than the compute,
the storage and the gateway put together. A hosted zone is the DNS record set for a domain name.

---

## 3. The path of one request

Everything arrives at one CloudFront distribution, on one host name. CloudFront then looks at the
path and sends the request to one of two places. That single routing rule is the whole reason the
product has no CORS configuration anywhere.

**CORS** is the set of browser rules for talking to a different host than the page came from. Every
one of those rules is a place where a wrong value either breaks the app or opens it. Because
everything here is one host, none of them exists.

```mermaid
flowchart LR
    R["A request"] --> CF{"CloudFront<br/>looks at the path"}
    CF -->|"/api/*"| B1["Behaviour 1<br/>caching: OFF<br/>forward everything except Host<br/>readTimeout: 25 s"]
    CF -->|"everything else"| B2["Behaviour 2<br/>caching: ON<br/>a CloudFront Function<br/>fixes the path first"]
    B1 --> GW["API Gateway → Lambda"]
    B2 --> S3[("The web bucket")]

    style B1 fill:#fdf3e8
    style B2 fill:#e8f4ea
```

**Three traps live in that small picture, and all three are silent.**

**Caching must be OFF for `/api/*`.** A cached `GET /api/me` would hand one person another person's
answer. Nothing would report an error. It would simply be wrong, for whoever asked second.

**The `Host` header must not be forwarded.** API Gateway refuses a request that arrives carrying
somebody else's `Host`. Forwarding the viewer's `Host` is the usual first mistake, and it produces a
403 that looks exactly like a permission problem — so you spend an afternoon in IAM. Everything else
*must* be forwarded, including cookies and the query string, or the session cookie never reaches the
API. The CDK setting that does both is `ALL_VIEWER_EXCEPT_HOST_HEADER`.

**A static export needs the path fixed before it reaches the bucket.** Next.js with
`output: 'export'` writes `/hu/index.html`. A browser asks for `/hu`. A bucket reached through
origin access control answers **403** for `/hu`, not 404 — so the error tells you nothing. A small
**CloudFront Function** adds `index.html` to any path that names a folder. It does one more job at
the same time: it sends `/` to `/hu` or `/en`, because a static site has no server to read the
browser's language.

**Where the session lives, on this path.** The browser holds one cookie, `__Host-session`, and it is
an opaque id — a string that means nothing on its own. No access token, ID token or refresh token
ever reaches the browser. The API swaps the code for tokens, reads what it needs, throws the tokens
away, and writes a session row in the table. That shape has a name: **backend for frontend**. It is
why signing out is a row delete rather than a token to revoke.

The `__Host-` prefix is a browser rule that only works if the cookie has no `Domain` attribute — so
it is sent to exactly one host and no other, not even a sibling subdomain. **One host name is what
makes that prefix usable at all.** The domain shape was never a deployment detail; it decided which
cookie protections were available.

---

## 4. Four clocks, stacked

This is the most useful thing in the note for any project, not only this one.

The product promises **30 seconds** from the tap that takes the photo to something on screen. The
slowest part is a call to a model, which takes several seconds and has no fixed length. So the
question is: when the model is slow, **who answers first — your application, or the platform?**

If the platform answers first, the person gets a **504** with a body nobody in the product wrote. It
has no explanation, no next step, and none of the two sentences every failure message here must end
with.

So the application must fail **before** the platform does. Four clocks, in this order:

```mermaid
flowchart TD
    A["<b>18,000 ms</b> — the model call<br/>an AbortSignal in the adapter"]
    B["<b>20,000 ms</b> — the whole request<br/>one Nest interceptor. The app answers here"]
    C["<b>22,000 ms</b> — the function<br/>the Lambda setting. The net under the net"]
    D["<b>25,000 ms</b> — CloudFront<br/>readTimeout on the /api/* origin"]
    E["<b>30,000 ms</b> — API Gateway<br/>hard limit. Cannot be raised"]

    A --> B --> C --> D --> E

    style B fill:#e8f4ea
    style D fill:#fde8e8
    style E fill:#fde8e8
```

**Only the green one should ever fire.** It is the one where the application writes its own answer:
a failure message that says whether trying again will help. The two red ones must never be reached.

**Three things about this that are easy to get wrong.**

**The cold start sits outside the deadline.** The code that starts the clock cannot run until the
function has started. So the start-up time is spent before the app knows a request exists. It has to
be budgeted separately, not subtracted from the app's own number. Most people subtract it and are
wrong.

**CloudFront has its own clock, and it is easy to forget.** A CloudFront custom origin times out at
**30 seconds by default and 60 seconds at most**. This project never set it, so CloudFront — not API
Gateway — was quietly the outermost clock, and it was the last open path to a 504 the app did not
write. It is now 25 seconds, which puts it between the app and the gateway.

That 60-second ceiling is also worth remembering for later: it means "escape the 30-second limit"
is bounded by CloudFront, not only by API Gateway.

**Reserve time for the work after the answer.** The model can answer at 19,900 ms. Then the app still
has to check the answer, validate it, work out the cost and write two rows. If there is no budget
left for that, the call was **already paid for**, one of the person's ten attempts was **already
spent**, and the result is thrown away.

So there is a constant, `WRITE_BUDGET_MS = 1500`, and the model's abort fires at
`min(18,000, time left − 1,500)`. The rule behind it, written down so nobody deletes the constant
later: **once the model has answered, the write always finishes, because the money is already
spent.**

---

## 5. One table, and the "wrong" choice made on purpose

All the data is in **one DynamoDB table**. DynamoDB is a key-value store: you reach an item by its
key, and there is no join and no search.

Everything a person owns has the **same partition key** — their user id. The sort key says what kind
of thing it is, using a readable prefix:

```
PK = USER#<sub>          SK = PROFILE                      the account
PK = USER#<sub>          SK = POT#<potId>                  one plant pot
PK = USER#<sub>          SK = ASSESS#<potId>#<timestamp>   one assessment
PK = USER#<sub>          SK = TASK#<due date>#<taskId>     one care task
PK = USER#<sub>          SK = QUOTA#<yyyy-mm-dd>           today's attempt count
PK = USER#<sub>          SK = IDEM#<requestId>             one claimed request
PK = SESSION#<opaque id> SK = SESSION                      one sign-in
PK = CONFIG              SK = AI_ENABLED | BREAKER | ...   settings
```

**This removes the most common access-control bug by construction, not by a check.** If the owner id
*is* the key, a query with no owner cannot be written. The repository layer takes a branded `UserId`
type, and that type can only be created where the session is read — so a query without an owner does
not compile. Nobody can forget the check, because there is no check to forget.

**And the API never answers 403.** A row belonging to somebody else answers exactly like a row that
does not exist. A 403 tells an attacker "this exists, you just cannot have it". A 404 tells them
nothing.

### The choice that AWS itself recommends against

DynamoDB has two ways to pay: **on demand** (you pay per request) and **provisioned** (you reserve a
fixed rate and pay for holding it). AWS's own documentation says on demand is *"the default and
recommended throughput option for most DynamoDB workloads"*.

**This project uses provisioned, fixed, with auto scaling switched off.** Two reasons, and the
second one is the interesting one.

**First: the free amount only covers provisioned.** An on-demand table spends credit on its first
read. That alone settles it here.

**Second, and this is the part worth carrying to other projects: it fails in the better direction.**

| | A runaway loop hits the table |
| --- | --- |
| **Provisioned, fixed** | DynamoDB **refuses** the extra requests. Things break loudly. An alarm fires. Somebody notices |
| **On demand** | DynamoDB **serves** every one of them, perfectly, and eats the credit that keeps the account open |

Auto scaling is off for the same reason. It would quietly raise the numbers past the free line
without asking anybody.

**When you write down a choice like this, write down that it is the worse engineering choice and
why.** ADR-0002 does exactly that — it quotes AWS recommending the opposite, and then explains why
the constraint here outranks the recommendation. On a paid account, on demand would be the answer.

### Changing the shape of an item

DynamoDB has no schema and no migration tool. And an assessment row has **no clock** — the text is
kept as long as the pot exists. So an item written today can still be read in three years.

Every item carries **`v`**, a whole number, `1` today. Three rules go with it:

1. **A reader ignores a field it does not know.** So adding a field is always safe.
2. **Never rename a field and never change what one means.** Write a new field, stop writing the old
   one, leave the old one alone.
3. **Raise `v` only when a reader must behave differently**, and keep the code that reads the older
   version until nothing on disk uses it.

Three sentences now. A hand-written scan-and-rewrite later.

---

## 6. The photo path

Photos are the only large thing this product stores, and the only thing in it that is clearly
personal data. One object per photo, in one private S3 bucket, at
`photos/<userId>/<potId>/<timestamp>.jpg`.

```mermaid
flowchart LR
    P["Phone<br/>resize to 1000 px"] -->|"the photo, in the request body"| API["Lambda"]
    API -->|"1. decode and re-encode"| RE["clean JPEG<br/>no EXIF"]
    RE --> S3[("Private bucket<br/>BLOCK_ALL<br/>SSE-S3")]
    RE --> ANT["Anthropic"]
    S3 -.->|"read back later<br/>signed URL, 5 minutes"| B["Browser"]
    S3 -.->|"180 days"| X["Deleted by a lifecycle rule"]

    style RE fill:#fdf3e8
    style X fill:#fde8e8
```

**Four decisions in that picture.**

**The photo goes through the API, not straight from the browser to S3.** The usual pattern is a
*presigned PUT* — the server hands the browser a short-lived link and the browser uploads directly.
It was rejected here, and the reason is worth remembering: **a presigned PUT validates nothing.**
Whatever bytes the browser sends land in the bucket. Nothing checks the size, the type or the
contents. Going through the function costs a little time and buys every check.

**The API re-encodes the photo before doing anything else with it.** It decodes the image and writes
a fresh JPEG. That single step does three jobs:

- **It strips EXIF.** A phone photo carries the GPS position where it was taken. For a plant on a
  windowsill, that is the person's home. Without this step it would sit in the bucket for 180 days
  *and* be sent to a third party.
- **It makes the type check real.** Checking the declared type is not a check — an extension is not
  evidence. A file that will not decode is not an image.
- **It fixes rotation.** Orientation is stored in the EXIF that is being removed, so it has to be
  applied first or the photo arrives sideways.

**The bucket is never a CloudFront origin.** Photos are read back through a **signed URL** — a link
that carries its own permission and lasts at most five minutes. A cache in front of it would make a
copy, and a copy is something the delete-my-photo promise would then have to find and delete too.

**Deletion at 180 days is a lifecycle rule in S3, not application code.** A rule inside the storage
service keeps working when the application is broken, stopped, or has a bug in its delete path. This
is the general shape: *if a promise must survive the application, do not put it in the
application.*

**One number to keep in mind.** S3 lifecycle expiry is late by up to a day, and DynamoDB's
time-to-live deletion is late by *"typically a few days"*. So no rule may depend on either firing on
time. The retention audit checks at day **182**, not 180. And session expiry is checked **in code**,
never by trusting that the row is gone.

---

## 7. The function itself, and the build that nearly did not work

One Lambda function holds the entire Nest.js API.

| Setting | Value | Why |
| --- | --- | --- |
| Runtime | `nodejs24.x` | Patched until 2028-04-30. Node 22 stops a year earlier |
| Architecture | `ARM_64` | Cheaper per second of compute |
| Memory | 1024 MB | Lambda gives CPU in proportion to memory. This is a starting value, to be measured |
| Timeout | 22 seconds | The net under the app's own 20-second deadline (section 4) |
| Reserved concurrency | **10** in prod, 2 in preview | A cost guard, not a performance setting |

**Reserved concurrency is the one worth understanding.** It is the largest number of copies of the
function that may run at the same time. Set it to 10 and a runaway loop cannot start a thousand
copies that each wait 18 seconds on a **paid** model call. Ten is the largest number any written
requirement asks for.

### The pattern has a name: Lambdalith

One function holding a whole framework is called a **Lambdalith**. It is a recognised pattern, not a
mistake. The alternative — one function per route — was rejected here because it multiplies cold
starts across a flow that already has a 30-second budget, and gives one developer many small things
to look at instead of one.

**The honest price is IAM.** One function means **one execution role**. `GET /api/health` runs with
the same DynamoDB and S3 permissions as the route that spends money. One function per route would
let each carry only what it needs, which is what least privilege asks for.

That is given up on purpose. The border doing the real work is the key design in section 5: the
owner id comes from the session and the key builder will not compile without it, so a bug in one
route still cannot read another person's data. **If the API is ever split, split the role with it.**

### The build trap that fails silently

This one cost nothing to fix and would have cost an afternoon to find.

Nest.js works out what to inject into a constructor by reading **decorator metadata** — extra
information TypeScript writes into the compiled output when `emitDecoratorMetadata` is on.

**esbuild does not support `emitDecoratorMetadata`, and it never will.** CDK's `NodejsFunction`
bundles with esbuild. So pointing it at the TypeScript source produces a function that builds
cleanly, deploys cleanly, and then throws `Nest can't resolve dependencies` on its very first
request.

```
Wrong:  NodejsFunction  ->  apps/api/src/main.ts     (esbuild only)
Right:  nest build      ->  apps/api/dist/main.js  ->  NodejsFunction
```

`nest build` is `tsc`, which writes the metadata correctly. esbuild then bundles the compiled
JavaScript, which needs no decorator support at all.

**The general lesson:** when a tool works by reading extra information the compiler emits, check
that every build path in the project emits it. This project already knew the failure sentence — it
had switched the same setting on for the test runner — and still missed it on the deploy path,
because those are two different builds and nobody compared them.

---

## 8. What stops it costing money

On an account that closes instead of billing, cost is a correctness property. So the defences are
layered, and each layer catches something the others cannot.

```mermaid
flowchart TD
    F["A flood arrives"] --> L1{"CloudFront"}
    L1 -->|"no automatic limit"| A1["Alarm 11 fires.<br/>You disable it by hand"]
    L1 --> L2{"API Gateway<br/>100 req/s, burst 50"}
    L2 -->|"over the rate"| D1["Refused. Cheap"]
    L2 --> L3{"Lambda<br/>reserved concurrency 10"}
    L3 -->|"over 10 at once"| D2["Throttled. Alarm 2 fires"]
    L3 --> L4{"DynamoDB<br/>fixed 20/20"}
    L4 -->|"over the units"| D3["Refused. Alarms 4 and 5 fire"]
    L4 --> L5{"Daily limit<br/>10 per account per day"}
    L5 -->|"the 11th"| D4["Refused before any money is spent"]
    L5 --> L6{"Circuit breaker<br/>5 failures in a row"}
    L6 --> M["The model call"]

    style A1 fill:#fdf3e8
    style D1 fill:#e8f4ea
    style D2 fill:#e8f4ea
    style D3 fill:#e8f4ea
    style D4 fill:#e8f4ea
```

**Read that diagram from the bottom up, because that is the order the layers were built in.** The
daily limit and the circuit breaker protect the **Anthropic** balance — the $5 that buys the
feature. The throttle, the concurrency limit and the fixed capacity protect the **AWS** balance —
the credit that keeps the account open. Those are two different balances, and for a while only the
first one had any defence.

**The gateway throttle is the layer people forget, and it is the biggest hole when it is missing.**
Left unset, an API Gateway stage inherits the account default of **10,000 requests a second**. API
Gateway has no free offer, so it bills from request one: a flood at that rate is roughly **$36 an
hour**. And authentication happens *inside* the function, so a stranger who is not signed in still
costs a gateway request and an invocation.

Reserved concurrency does **not** help here. It caps the function's work. It does not cap billed
gateway requests. Those are different meters.

**One layer has no automatic defence, and it is written down as such.** A flood that stops at the
CloudFront edge is billed once the 10 million free requests are used, and nothing on this account
can stop it automatically. The honest answer is a manual one: an alarm fires on request count, and
you disable the distribution by hand. **An accepted risk written down is worth more than a defence
that does not exist.**

**Two things that spend money quietly, and both are switched off.**

- **Detailed API Gateway metrics** are charged as custom metrics. The basic ones are free.
- **CloudWatch Logs ingestion** is a classic free-tier killer. Log retention is 30 days in `prod`
  and 1 day in `preview`.

There is also a small trap in how measurements are counted. Putting the failure code on a metric
**dimension** — a label that splits a measurement into separate series — turns 6 custom metrics into
36, each billed. The failure code is read with a Logs Insights query instead, which is free.

**And there are no backups.** Point-in-time recovery is charged per gigabyte with no free amount.
The replacement is a calendar entry: export the table and the photo bucket by hand before the free
plan ends. That is written down plainly rather than implying a protection that is not there.

---

## 9. What you can see when it breaks

Eleven alarms and one dashboard, in `ZamphoraOpsStack`. Most are the ordinary ones any system has.
**Four are the ones this project actually needs**, and they are the ones about a balance:

| Alarm | Fires when | What it means |
| --- | --- | --- |
| **Runaway model calls** | more than 30 in an hour | Expected use is about 30 a **month**. Thirty in an hour is a loop or an attack |
| **Runaway spend** | more than $0.10 in an hour | At $5 of balance, a dollar an hour empties it in an evening |
| **The breaker opened** | 5 model calls failed in a row | The product stopped calling the model on its own |
| **Front door flood** | more than 50,000 CloudFront requests in an hour | The only warning of a flood that never reaches the throttled gateway |

**Two things about measurements that are easy to get wrong, and both were found here.**

**There is no `InitDuration` CloudWatch metric.** Cold start time is written into the log line at the
end of every cold invocation, not published as a measurement. So it is read with a Logs Insights
query. A plan that says "read the `InitDuration` metric" describes something that does not exist.

**CloudFront measurements only exist in `us-east-1`.** An alarm on them, created in another Region,
deploys with no error and **never fires**. A graph of them draws an empty box. This is the worst kind
of monitoring bug: everything looks configured, and nothing is watching.

**One number that was wrong for a good reason, and is worth remembering.** The cold-start budget was
800 ms, taken from published figures. Those figures measure a **plain Node.js handler**. This is a
bundled Nest.js application with six libraries loaded before the handler runs, and a published
measurement of that shape is about **905 ms when nearly empty**. The budget is now 2,000 ms.

The lesson is not "800 was too low". It is: **check that a borrowed number describes the same kind
of thing you are building.**

---

## 10. Two switches that look the same and are not

Both stop the AI feature. They are completely separate, and each answers a different problem.

```mermaid
flowchart TD
    subgraph H ["The kill-switch — yours alone"]
        direction TB
        H1["You open the AWS console"] --> H2["Set enabled = false<br/>on the CONFIG row"]
        H2 --> H3["No new model call<br/>within 30 seconds"]
        H3 --> H4["Stays off until<br/>you turn it back on"]
    end

    subgraph B ["The circuit breaker — the app's"]
        direction TB
        B1["5 failed calls in a row"] --> B2["Stop calling the model<br/>for 10 minutes"]
        B2 --> B3["Let one call through<br/>to test"]
        B3 -->|works| B4["Back to normal"]
        B3 -->|fails| B2
    end

    style H fill:#fdf3e8
    style B fill:#e8f0f8
```

**The breaker never writes the kill-switch row.** It has its own row. That is what lets both things
be true at once:

- The kill-switch is **yours**, and it stays off until **you** turn it on. A machine never touches
  it.
- A run of failures at three in the morning stops itself, and starts again on its own when the
  problem goes away.

Without the separation, the app would have to write your switch, and the decision record that says
"only a person flips this" would have had to be reversed. **The separation kept the record true and
still got the protection.** That is usually the better shape when a rule and a feature seem to
conflict: find the version where both survive.

**One placement detail that matters to the person using the app.** The breaker is checked *before*
the daily attempt is counted. So an open breaker does not spend one of their ten tries on a call
that was never going to happen.

**One more guard on the same path, for a different problem.** The photo upload is allowed up to four
seconds on a weak signal — and a weak signal is exactly when a person taps twice. So the browser
makes one id per photo, and the API claims it with a conditional write before anything else happens.
A second tap finds the id already claimed and gets the first result back. Without it, one tap could
be two paid calls and two of the person's ten attempts, for one result on screen.

---

# Part B — the pipeline

## 11. How the build signs in to AWS with no password

This is the part of the pipeline worth understanding properly. Everything else in Part B is detail.

### The way it is normally done, and why it is dangerous

You create a user in AWS, get an **access key** and a **secret key**, and paste both into GitHub
secrets. Your build then signs in with them.

Those two strings are a **permanent password**. They work from anywhere, forever, until somebody
notices and changes them. If one ever appears in a log line, in a screenshot, or inside a
third-party tool your build ran, the account is gone. This is the most common way an AWS account
gets taken over.

**There is no access key anywhere in this project.**

### What happens instead

```mermaid
sequenceDiagram
    participant W as Your workflow<br/>on GitHub
    participant G as GitHub's<br/>token service
    participant A as AWS
    participant R as Role<br/>zamphora-github-deploy

    W->>G: I need a token
    Note over G: GitHub writes this,<br/>not your code.<br/>It cannot be faked.
    G-->>W: signed token saying:<br/>repo = poszetkristof/zamphora<br/>branch = main
    W->>A: let me use the role.<br/>Here is my token.
    A->>A: is GitHub's signature real?
    A->>R: does your trust rule<br/>accept this repo and branch?
    R-->>A: yes
    A-->>W: credentials that stop<br/>working in 1 hour
```

**Read step 2 again, because it is the whole idea.** The token is written and signed by **GitHub**,
not by your workflow. Your workflow cannot write its own token, and cannot change what the token
says. It only asks for one and passes it along.

**So there is nothing to steal.** Somebody can copy your entire public repository, read every file,
and still reach nothing — because they cannot make GitHub sign a statement saying they are your
repository on your branch.

### The one line that makes it safe

The role's trust rule names the **branch**, not only the repository:

```
repo:poszetkristof/zamphora:ref:refs/heads/main     <- correct
repo:poszetkristof/zamphora:*                       <- wrong, and it looks fine
```

The second one accepts **any branch** in the repository. Anyone whose pull request you approve
creates a branch. That single character is the difference between safe and not.

### Three roles, not one

```mermaid
flowchart LR
    M["Push to main"] --> RD["zamphora-github-deploy"]
    P["A pull request"] --> RP["zamphora-github-preview"]
    S["The monthly audit<br/>environment: audit"] --> RA["zamphora-github-audit"]
    RD --> PROD["Deploy prod"]
    RP --> PRE["Deploy preview<br/>and nothing else"]
    RA --> RO["Read only"]

    style PROD fill:#fde8e8
    style PRE fill:#e8f4ea
    style RO fill:#e8f4ea
```

If the preview role were also the deploy role, then any pull request could change production. Two
roles cost nothing and remove that entirely.

**The third role exists because of a subtle trap.** The monthly retention audit runs on a schedule.
A scheduled workflow runs on the **default branch** — so its token says `ref:refs/heads/main`, which
matches the **deploy** role. An unattended job, running every month with nobody watching, would have
held full deploy rights on production.

The fix is to make the token say something else. The workflow declares `environment: audit`, and
GitHub then puts `environment:audit` in the token instead of the branch. The deploy role no longer
matches it, and the audit role matches nothing else.

**The general lesson: when you write "this job uses a read-only role", check that such a role
exists.** A sentence in a document is not a trust policy.

---

## 12. A public repository, and the two walls

The repository is **public**, on purpose, so anyone can read it. That means anyone can also **fork
it and open a pull request**. There is no setting to stop that, and branch protection does not do
it — branch protection stops a **merge**, never an **open**.

A pull request contains somebody else's code, and pull requests run your build. So the question is
what that code can reach.

```mermaid
flowchart TD
    S["A stranger opens a pull request<br/>from their fork"] --> W1{"Wall 1<br/>Has the owner approved<br/>this workflow run?"}
    W1 -->|no| STOP1["Nothing runs at all"]
    W1 -->|yes| RUN["Lint, tests and build run<br/>with no access to anything"]
    RUN --> W2{"Wall 2<br/>Will GitHub sign an<br/>AWS token for a fork?"}
    W2 -->|"never, and it cannot be switched on"| STOP2["The three AWS checks stay pending.<br/>The owner reads the code,<br/>then runs them"]

    style STOP1 fill:#e8f4ea
    style STOP2 fill:#e8f4ea
```

**Wall 2 is GitHub's, not ours.** GitHub refuses to hand secrets or an AWS token to a workflow
started by a fork's pull request. It is built in and there is no switch for it.

**Wall 1 is ours.** The repository is set to *"Require approval for all external contributors"*, so
nothing runs at all until the owner presses approve — every time, not only the first time.

### The one way to break it

Someone sees three checks stuck on "pending", searches the internet, and finds
**`pull_request_target`**. That trigger runs a pull request **with your secrets**. A stranger's code
plus your AWS access, in the same run.

`04-ci-cd.md` §4 says do not use it. That is why the rule is written down.

### Why every action is pinned to an exact commit

```yaml
uses: actions/checkout@v7        # a label. Its owner can move it to different code, any time.
uses: actions/checkout@8f4b7f8…  # an exact commit. It can never change.
```

`v7` is a label, not a version of code. The person who owns the action can point that label at
something else whenever they like, and your next build runs the new code without you doing
anything.

**This is the attack that OIDC does not stop**, because by then the attacker's code is already
running inside your workflow, next to the one-hour AWS credentials. Pinning to a commit removes it.

Updates still arrive: **Dependabot** raises a pull request when a new version exists. You approve
it instead of receiving it in silence.

---

## 13. What has to be green before a merge

There are **two different kinds of rule**, and confusing them is the trap.

- A **required status check** watches one job in a workflow. It can only name a job.
- A **code scanning rule** watches what CodeQL found. It is not a job, so a required status check
  can never carry it.

That is why this repository needs both kinds. One would not cover everything.

```mermaid
flowchart TD
    subgraph CI ["ci.yml"]
        Q["quality"] --> OK
        A["audit"] --> OK
        T["test"] --> OK
        I["infra-assert"] --> OK
        B["build"] --> OK
        OK["ci-ok<br/>REQUIRED"]
    end
    subgraph PR ["pr-preview.yml"]
        BB["bundle-budget"] --> POK
        E["e2e"] --> POK
        P["perf-flow"] --> POK
        POK["preview-ok<br/>REQUIRED"]
    end
    subgraph CQ ["codeql.yml"]
        C["codeql"] --> CR["code scanning rule<br/>REQUIRED"]
    end

    style OK fill:#e8f4ea
    style POK fill:#e8f4ea
    style CR fill:#e8f4ea
```

**One aggregate job per workflow, instead of naming every job in the settings.** If branch
protection lists eleven job names, then a job you add next month is a job nobody enforces, until
you remember to go and edit the settings. An aggregate covers everything it needs. Adding a job to
its `needs:` list is a code change, reviewed like any other change.

**`if: always()` on the aggregate, and this is the sharp part.** In GitHub, a **skipped** check
counts as a **pass**. Without `always()`, a failed `build` would make `ci-ok` skip, the skip would
be read as green, and the failed build would merge. So `ci-ok` runs every time and then checks each
job's result itself.

**One test that could never fail, and the fix.** The performance job replaces the model with a stub
that sleeps for the budgeted 8,000 ms — and 8,000 ms is the weakest guess in the whole design, with
no source behind it. So the job could never fail for the reason the architecture itself names as its
biggest risk. It now runs **twice**: once at 8,000 ms and once at **18,000 ms**, the point where the
server's own deadline is about to fire. Both must finish under 30 seconds.

**A test that can only pass is not a test.** Give it the value that would break the design and see
whether it still holds.

**Two things to remember, because both cost something real:**

- **A pull request from a fork can never satisfy `preview-ok`**, because GitHub will not sign an AWS
  token for a fork. So a stranger's pull request can never merge on its own. That was accepted: the
  owner merges their own branches.
- **A required check that never reports blocks every merge, forever.** So `preview-ok` goes into
  branch protection **in the same change that adds the workflow**, never before it.

---

# Part C

## 14. Lookup: what was chosen, and what lost

Come back to this table. Do not try to remember it.

| Question | Chosen | What lost, and why |
| --- | --- | --- |
| Compute | **One Lambda holding the whole Nest.js API** | One function per route: many cold starts in a 30-second budget, many small things to look at. A container: charged by the hour, so it spends credit every night nobody uses the app |
| Database | **One DynamoDB table, provisioned, fixed** | On demand: AWS recommends it, and the free amount does not cover it. It also serves a runaway loop instead of refusing it |
| Preview database | **Split the units**: prod 20/20, preview 5/5 | Two full tables at 25/25 — rejected on a price nobody had checked. No preview at all — three tests would have nothing to run against |
| Photo upload | **Through the API** | Presigned PUT straight to S3: validates nothing, so size, type and contents all go unchecked |
| Photo handling | **Decode and re-encode every photo** | Reading the header only: cannot strip EXIF, so the person's home GPS reaches storage and the model |
| Photo deletion | **An S3 lifecycle rule** | Application code on a schedule: it stops working exactly when the application is broken |
| A cache in front of the table | **None** | ElastiCache or DAX: saves 24 ms out of 8,000, is charged by the hour, and drags the function into a VPC that then needs a NAT Gateway |
| The API build | **`nest build`, then esbuild bundles the output** | esbuild alone: it cannot emit decorator metadata, so the function deploys and fails on the first request |
| Gateway rate | **100 a second, burst 50** | Unset: inherits 10,000 a second, about $36 an hour if somebody floods it |
| Region | **eu-central-1**, Frankfurt | Ireland: also EU, further away. Virginia: the data would leave the EU |
| CloudFront alarms | **A small stack in us-east-1** | Keeping them in eu-central-1: they deploy with no error and never fire |
| Host name | **CloudFront's free name** | A bought domain: $0.50 a month forever, the largest line item in the product |
| Sign-in | **Cognito, tokens kept in the API** | Tokens in the browser: a browser cannot keep a secret, so any script bug becomes token theft |
| Cognito tier | **Essentials** | Lite: it has only the older sign-in pages and no branding, and both tiers are free at this size |
| Backup | **None in run 1** | Point-in-time recovery is charged per gigabyte. Replaced by a calendar entry: export by hand before the plan ends |
| Repository | **Public** | Private: CodeQL is not free and Actions minutes are capped |
| Deploy | **A person presses the button** | Deploy on merge: normal on a paid plan, and here a bad merge can close the account |
| Sign-up | **Closed. The owner makes accounts** | Open sign-up: the daily limit is per account, so ten accounts is ten times the spend on one $5 balance |
| Breaker | **Self-healing, its own row** | Flipping the real kill-switch: it reverses ADR-0009 for no extra safety |
| Local development | **DynamoDB Local and MinIO** | Real AWS: every local test would spend the free amount and mix test data with real data |
| Required checks | **One aggregate check, `ci-ok`** | Eleven separate entries: a new job you forget to add becomes a check nobody enforces |
| Actions | **Pinned to exact commits** | Moving labels: easier to read, and the code can change under you |
| Node version | **24 everywhere** | Node 22: patched for a year less, and the decision would come back in 2027 |

**Still open, on purpose:**

- **One box in GitHub's settings.** `aws-actions/configure-aws-credentials` is Amazon's action, not
  GitHub's, and the current allow-list would refuse it. It must be allowed before the first deploy.
- **`.github/workflows/ci.yml` is still written for npm.** Every command has to become pnpm before
  the first `package.json` lands. `04-ci-cd.md` §6.1 has the six changes.

**Where the detail lives.** Every number here comes from `docs/800-infra/`. The five files there are
the plan; this note is the reason behind it.
