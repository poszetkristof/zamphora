# The infrastructure plan — every AWS resource, as code

**Written by** 800 Infra, run 1 (`001-photo-assessment`). **Date:** 2026-08-27.
**Updated** 2026-08-28 with the owner's answers to gates 43 to 63.
**Updated 2026-09-17** for ADR-0014 to ADR-0016: the assessment runs in the background, so there is
an eighth stack, `ZamphoraWorkflowStack` (§4.4b), and the edge has one more behaviour (§4.6).
**Read next by** 900 Security, 600 QA.

This file lists every AWS resource the product needs, which CDK stack holds it, and which settings
must not be left at their default. It solves one problem. This AWS account closes instead of sending
a bill. So a resource that exists only because somebody clicked it in the console is a resource that
does not come back.

**Nothing here is deployed by this document.** Deploying is a person's decision, always.

**Everything deploys to `eu-central-1`** (gate 44, `00-environments.md` §7).

---

## 1. The four questions every plan here has to answer

1. **What is the deployable unit?** §2.
2. **Where is the deployment written down as code?** All of it, in `infra/`, in CDK, in git. §3.
3. **What is the pipeline?** `04-ci-cd.md`.
4. **What is the one-step rollback?** §9.

## 2. What ships

Three things ship, and only three.

| Unit | What it actually is | How it is built |
| --- | --- | --- |
| **The API** | Three JavaScript files, bundled by esbuild from one codebase, in three Lambda functions: `api`, `assess` and `watch` | `NodejsFunction` three times, each pointed at one compiled entry of `apps/api` |
| **The web** | One folder of plain files: HTML, CSS, JavaScript, images | `next build` with `output: 'export'` (ADR-0010) |
| **The infrastructure** | One CloudFormation change set per stack | `cdk deploy` |

**The API is one function for every route, plus two functions with one job each** (ADR-0002,
ADR-0014, ADR-0015). The split is by job, not by route: `assess` makes the model call and is the
only function that holds the model key; `watch` streams the result to the phone. There is still
one place to look for a route.

**The web has no server and no second Lambda** (ADR-0010). A web app that holds no credentials and
reads no data store is a static site already.

**`packages/contracts` and `packages/llm` never ship as anything of their own.** They are compiled
into the API bundle, and `contracts` is also compiled into the web bundle. They appear in
`02-containers.mmd` as containers because they are borders in the code. They are not things that get
deployed. There is no CDK construct for either, and there should not be one.

## 3. The stacks, and the container each one comes from

Everything is AWS CDK v2 in TypeScript, in `infra/`. **One stack per deployable unit** is
split-readiness rule 5 in ADR-0001, adopted as written.

Stack names carry the environment: `Zamphora-Prod-Data`, `Zamphora-Preview-Pr142-Data`.

| Stack | Container in `02-containers.mmd` | Main CDK construct |
| --- | --- | --- |
| `ZamphoraDataStack` | `table` | `dynamodb.Table` |
| `ZamphoraPhotosStack` | `photos` | `s3.Bucket` |
| `ZamphoraAuthStack` | Cognito user pool | `cognito.UserPool`, `cognito.UserPoolClient` |
| `ZamphoraApiStack` | `api` | `lambdaNodejs.NodejsFunction`, `lambda.Alias`, `apigatewayv2.HttpApi` |
| `ZamphoraWorkflowStack` | `workflow`, `assess` with `llm adapter` inside it, `watch`, `mark-failed` | `stepfunctions.StateMachine`, three `lambdaNodejs.NodejsFunction`, `lambda.FunctionUrl`, `events.Rule`, `sqs.Queue` for the dead letters |
| `ZamphoraWebStack` | `web` | `s3.Bucket`, `s3deploy.BucketDeployment` |
| `ZamphoraEdgeStack` | `edge` | `cloudfront.Distribution`, `cloudfront.Function` |
| `ZamphoraOpsStack` | none — this is the watching, not the product | `sns.Topic`, `cloudwatch.Alarm`, `cloudwatch.Dashboard` |
| `ZamphoraCloudFrontAlarmsStack` | none — the two CloudFront alarms, and **this one is in `us-east-1`** | `cloudwatch.Alarm` |

**Nine stacks. Eight are in `eu-central-1` and one is not, and there is no certificate stack.**
Gate 45 chose the free CloudFront hostname, so there is no domain and no ACM certificate. ACM is AWS
Certificate Manager, the service that issues the HTTPS certificate. The one stack outside the Region
is `ZamphoraCloudFrontAlarmsStack`, because **CloudFront publishes its metrics only to `us-east-1`**
and an alarm has to live where its metric lives. See §7.

**Every container in the diagram is above, or is named in §2 as code that ships inside another
unit.** The two external systems that are not ours — the Anthropic Messages API and email delivery —
have no construct. The `assess` function reaches Anthropic over the internet, with a key from
Parameter Store. Email is not built in run 1 (gate 29).

**Deploy order**, because the later stacks need names from the earlier ones:

```
Data ─┐
Photos┤
Auth  ├──> Workflow ──> Api ──┐
      │                       ├──> Edge
      Web ────────────────────┘
Ops (last, because its alarms name the functions, the state machine and the table)
CloudFrontAlarms (after Edge, in us-east-1, because it names the distribution)
```

`Workflow` comes before `Api` because the `api` function needs the state machine's name to start a
run. `Edge` needs the `watch` function's URL as well as the gateway's hostname.

One CDK app passes the cross-stack values as **stack properties**, not through CloudFormation
exports read by hand. That keeps `cdk deploy --all` working, and it keeps the whole app in one `git`
commit.

## 4. The settings that must not be left at their default

This is the most important section of this file. Every line below is a place where the convenient
default costs money, or breaks a written requirement.

### 4.1 `ZamphoraDataStack` — the table

```
dynamodb.Table
  partitionKey         PK (string)
  sortKey              SK (string)
  billingMode          PROVISIONED          <- not the default
  readCapacity         20 in prod, 5 in preview
  writeCapacity        20 in prod, 5 in preview
  timeToLiveAttribute  ttl
  pointInTimeRecovery  false                <- gate 46, see §8
  removalPolicy        RETAIN
  encryption           AWS owned key (the default, and it is free)
```

- **20/20 and 5/5, and the two add up to 25.** A capacity unit is a fixed amount of reading or
  writing per second that a table is allowed to do. The DynamoDB free allowance is 25 read and 25
  write units per Region, per payer account, shared by every table in that Region. Gate 43 split it
  so a preview environment can exist without spending credit. `00-environments.md` §5 has the
  reasoning and the two rejected options.
- **The rule that replaces "one table only": the total across every table in `eu-central-1` must
  never pass 25.** A third table is not forbidden by arithmetic. It is forbidden by that total.
- **Provisioned, not on demand.** ADR-0002 verified first-party — that is, against AWS's own page —
  that the free allowance covers only provisioned capacity. An on demand table spends credit on its
  first read.
- **No auto scaling.** Do not call `autoScaleReadCapacity` or `autoScaleWriteCapacity`. Auto scaling
  would raise the numbers past the free line without asking (ADR-0002).
- **Use `dynamodb.Table`, never `dynamodb.TableV2`. Checked 2026-09-01, and the answer is settled.**
  `TableV2` is the global-table construct. It can only state provisioned write capacity as an
  **auto-scaled range**, never a fixed number — which is exactly what ADR-0002 forbids. This is an
  open gap in CDK, tracked in
  [aws-cdk#27378](https://github.com/aws/aws-cdk/issues/27378) and
  [aws-cdk#27443](https://github.com/aws/aws-cdk/issues/27443). *An earlier version of this line
  left the question open and said "if fixed write capacity turns out to be possible on `TableV2`,
  either construct is fine". It is not possible, so there is no choice to make here.*
- **No secondary index** (ADR-0002). The first one arrives in run 3.
- **`RETAIN`.** `RETAIN` means CDK leaves the resource in place when the stack is deleted.
  `cdk destroy` must never be able to delete a person's plant history. The `preview` table is the
  one exception: a workflow creates and destroys it, so it is `DESTROY`.
- **One table for every item type.** Profiles, sessions, pots, assessments, tasks, the daily
  counter, the day rollups, the `CONFIG` rows and **the circuit breaker row** all live here.

**The breaker row needs a shape written into two files this role may not write.** They are in the
list in `04-ci-cd.md` §6.2, with every other change owed outside `docs/800-infra/`. One rule belongs
here: **the breaker row must never be `PK = CONFIG, SK = AI_ENABLED`**. That row is the owner's
kill-switch, and nothing in the application writes it (ADR-0009). `02-cost-guardrails.md` §5
describes the behaviour in full.

### 4.2 `ZamphoraPhotosStack` — the photo bucket

```
s3.Bucket
  blockPublicAccess    BLOCK_ALL
  publicReadAccess     false
  encryption           S3_MANAGED  (SSE-S3, AES256)
  versioned            false                <- ADR-0007 forbids it
  enforceSSL           true
  removalPolicy        RETAIN
  autoDeleteObjects    false
  lifecycleRules       [ { prefix: 'photos/', expiration: Duration.days(180) } ]
```

- **The 180-day rule is the whole promise** (US-10 AC-6, ADR-0007, NFR-40). A lifecycle rule is an
  S3 setting that deletes an object a set time after it was written. It runs inside S3, so it works
  whether or not the application is up. **No application code deletes on a schedule.**
- **NFR-40 is a CDK assertion test on this exact property.** `infra-assert` reads the synthesised
  template — the CloudFormation template CDK produces — and asserts the number is 180. It is the
  only part of the retention promise that can be checked without AWS.
- **No versioning.** A version of a deleted photo is a copy of a deleted photo, which is the
  opposite of what US-10 AC-3 asks for (ADR-0007).
- **This bucket is never an origin of the CloudFront distribution** (ADR-0007). An origin is the
  place CloudFront fetches from, and a cache is a copy. Photos are read only through a signed URL, a
  link that carries its own permission, and it lasts at most 5 minutes (NFR-43).
- **SSE-S3, not a customer-managed KMS key.** SSE-S3 is S3's own encryption, with a key AWS manages.
  A key this project owned would carry a monthly charge and a per-request charge. ADR-0007 accepted
  SSE-S3 for run 1 and wrote that **900 Security may overrule it, and should be asked to**. This
  plan carries that handoff forward unchanged.

### 4.3 `ZamphoraAuthStack` — the user pool

```
cognito.UserPool
  signInAliases        { email: true }
  selfSignUpEnabled    false                <- gate 49
  featurePlan          LITE                 <- gate 52
  passwordPolicy       Cognito's own
  removalPolicy        RETAIN
  groups               USER, ADMIN
cognito.UserPoolClient
  generateSecret       true                 <- a confidential client (ADR-0003)
  oAuth.flows          authorizationCodeGrant only
  oAuth.scopes         openid, email
  oAuth.callbackUrls   https://<the CloudFront hostname>/api/auth/callback
cognito.UserPoolDomain
  cognitoDomain        zamphora-<env>
```

- **Self sign-up is off, and the owner creates every account by hand** (gate 49, owner,
  2026-08-27). The reason is the daily limit. The limit is per account, so ten new accounts would
  mean ten times ten model calls a day against one $5 Anthropic balance. A pool open to the internet
  with a shared balance behind it is a different product from this one.
- **The owner does want open sign-up, and it is a run-2 story, not a run-1 setting.** The shape is
  recorded in gate row 49 of `factory/runs/001-photo-assessment/human-gates.md`: anyone may make an
  account, and the part that costs money stays off until the owner switches that account on. It is
  not built here. It needs a user story, a screen, and the email delivery that gate 29 moved to the
  notifications run. **Do not design it in this file.**
- **`generateSecret: true` is not the CDK default and it is required.** ADR-0003 makes the API a
  confidential client that holds the client secret. A public client would put the whole flow in the
  browser.
- **Only the authorization code flow.** Never the implicit flow — it puts a token in a URL, which
  ADR-0003 forbids in words.
- **The Cognito-provided domain is free.** ADR-0003 already accepted that the sign-in pages are
  Cognito's and are not branded.
- **Groups, not custom attributes.** `02-containers.mmd` says the pool holds "group membership for
  USER and ADMIN". The account type the guard reads still comes from the profile item on every
  request (ADR-0004) — the group is where a new account's type comes from, not where it is checked.
- **One test account in the `preview` pool**, created by hand, with its password in a GitHub secret.
  The `e2e` job has to sign in and self sign-up is off (`04-ci-cd.md` §7).

**The tier is Essentials** (gate 52, reopened and closed again 2026-08-31). **A checked fact
settled it, and the first check was wrong.**

**The correction.** This section used to say that both Lite and Essentials include managed login and
that Essentials only adds a visual editor. Both halves were wrong. AWS states it plainly: *"Where the
Lite plan has the hosted UI, the Essentials plan opens up this advanced version of sign-up and
sign-in pages"*, and *"The Essentials plan is the lowest plan level that unlocks access to managed
login"*
([Cognito Essentials plan features](https://docs.aws.amazon.com/cognito/latest/developerguide/feature-plans-features-essentials.html),
checked 2026-08-31). Lite gets the **older classic hosted UI**, and the branding editor is Essentials
and Plus only — so on Lite this project could not style the sign-in page against its own tokens,
which is what gate 32 asked for.

**Essentials costs the same as Lite here: nothing.** Both tiers give **10,000 free monthly active
users**. Past that, Lite is **$0.0055 per user** and Essentials is **$0.015**
([Cognito pricing](https://aws.amazon.com/cognito/pricing/), checked 2026-08-28). At one user the
difference is $0.00, so Lite was buying a saving that does not exist and giving up a feature the
design assumed it had.

**Set `featurePlan: ESSENTIALS` when the pool is created.** The feature plan is chosen at creation
time, so this has to be right before the first deploy.

**The tier is set when the pool is created, and changing it afterwards is hard.** That is why it was
worth two minutes of checking before the first deploy rather than a surprise after it. *Nobody
checked the exact CDK property name for the feature plan in this run. Check it when the stack is
written — the requirement is the tier, not the spelling.*

### 4.4 `ZamphoraApiStack` — the function and the gateway

```
lambdaNodejs.NodejsFunction
  runtime               NODEJS_24_X          <- gate 60. The identifier is nodejs24.x
  architecture          ARM_64
  memorySize            1024
  timeout               Duration.seconds(22) <- NFR-02 names 22,000 ms
  reservedConcurrentExecutions  10 in prod, 2 in preview
  logGroup              a log group created in this stack, retention 30 days
  entry                 apps/api/dist/main.js   <- COMPILED JS, never the .ts source
  bundling              { minify: true, sourceMap: true, format: ESM,
                          externalModules: ['@aws-sdk/*', 'sharp'],
                          commandHooks: afterBundling copies sharp into the asset,
                                        see "How `sharp` reaches the function" below }
  environment           TABLE_NAME, PHOTOS_BUCKET, COGNITO_*, APP_ORIGIN,
                        STATE_MACHINE_ARN, PARAM_PREFIX, ENV_NAME
                        <- no model key path. Since 2026-09-17 only `assess` reads it

lambda.Alias  name 'live'  ->  the current version

apigatewayv2.HttpApi
  defaultIntegration    HttpLambdaIntegration(the alias)
  createDefaultStage    true, autoDeploy true
  defaultRouteSettings  { throttlingRateLimit: 100,   <- REQUIRED. See below
                          throttlingBurstLimit: 50 }
  no CORS configuration                        <- ADR-0010
```

**The build is two steps, and the order is not optional.** `apps/api` is compiled by `nest build`
first, then `NodejsFunction` bundles the compiled `dist/main.js`. esbuild cannot emit
`emitDecoratorMetadata`, and Nest.js reads constructor dependencies from that metadata. Point CDK at
the TypeScript source and the function deploys without complaint, then throws
`Nest can't resolve dependencies` on its first request (ADR-0012, third cost).

**The throttle is a required property, not a suggestion** (owner, 2026-08-31). Left unset, the stage
inherits the AWS account default of **10,000 requests a second**. API Gateway has no Always Free
offer, so it bills from the first request: a flood at the default rate costs roughly **$36 an hour**
and the account closes when the credit is gone. Authentication happens *inside* the function
(ADR-0004, no gateway authorizer), so a stranger who is not signed in still costs a gateway request
and an invocation. **Reserved concurrency caps the function's work. It does not cap billed gateway
requests.** 100 a second is five hundred times below the default and far above anything this product
needs — ten assessments a day is 0.0001 a second — while leaving room to demonstrate the app to a
room of people. A flood at 100 a second costs about $0.36 an hour instead of $36.

**What this does not defend.** A flood that stops at the CloudFront edge is still billed for
CloudFront requests once the 10 million free ones are used. There is no automatic answer to that on
this account. The accepted answer is the manual one: the alarm in `03-observability.md` §5 fires on
CloudFront request count, and the response is to disable the distribution by hand.

**Node 24, and the date is part of the reason** (gate 60, owner, 2026-08-27). ADR-0012 said Node 22.
It is now 24, in the function **and** in CI, and the deciding fact is support length:

| Runtime identifier | Deprecates |
| --- | --- |
| **`nodejs24.x`** — a managed runtime on Amazon Linux 2023 | **2028-04-30** |
| `nodejs22.x` | 2027-04-30 |

Checked first-hand on the
[AWS Lambda runtimes page](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) on
**2026-08-27**. A full year longer, so the decision does not come back in early 2027. **ADR-0012 has
to be corrected in place** — it is in the list in `04-ci-cd.md` §6.2.

**The runtime here and `node-version` in CI must always be the same number.** Two runtimes for one
product is a kind of bug that only appears at deploy.

- **Do not use `bundling.nodeModules`.** ADR-0012 records the reason with a link. CDK writes an
  empty `pnpm-workspace.yaml` into its build folder. That erases the `allowBuilds` list pnpm 11
  needs, and the fix hook runs too early. Bundle everything with esbuild, which is what a Lambda
  wants anyway.
- **22 seconds, and the order of the numbers is the design.** The gateway cuts at 30,000 ms and
  cannot be raised. The application gives up at 20,000 ms and writes its own message. The function
  times out at 22,000 ms, which is above the application deadline and below the gateway's. A unit
  test asserts 20,000 sits below 22,000 (`03-api-spec.md` §7, NFR-02). **Since 2026-09-17 the model
  call is not inside this request** (ADR-0014), so the assessment route answers in about a second
  and these clocks are a net, not a budget.
- **Reserved concurrency 10 is a cost guardrail, not a performance setting.** Reserved concurrency
  is the largest number of copies of the function that may run at the same time. Ten is chosen
  because NFR-12 already tests "ten parallel requests give exactly ten successes", so ten is the
  largest number any written requirement asks for. The paid call has its own, smaller cap on the
  `assess` function (§4.4b). `02-cost-guardrails.md` §6 does the arithmetic.
- **1024 MB is a starting value, not a measurement.** Lambda gives CPU in proportion to memory, and
  NFR-06 wants a cold start under 2,000 ms. A cold start is the extra time the first call waits while
  Lambda starts a new copy of the function. Measure it after the first deploy
  (`03-observability.md` §4) and write the real number down.
- **How `sharp` reaches the function** (gate 73, owner, 2026-09-17). **esbuild cannot bundle a
  native module.** `sharp` loads a `.node` binary at run time, so if it is left in the bundle list
  the function deploys without complaint and throws `Cannot find module 'sharp'` on the first photo
  — the same silent-until-run-time shape as the `emitDecoratorMetadata` trap below. **The answer is
  to mark it external and copy it in after the bundle:**

  ```ts
  bundling: {
    minify: true, sourceMap: true, format: ESM,
    externalModules: ['@aws-sdk/*', 'sharp'],
    commandHooks: {
      beforeBundling: () => [], beforeInstall: () => [],
      afterBundling: (inDir, outDir) => [
        `cp -r ${inDir}/node_modules/sharp ${outDir}/node_modules/`,
        `cp -r ${inDir}/node_modules/@img  ${outDir}/node_modules/`,
      ],
    },
  }
  ```

  **`@img` is the half people forget.** Since 0.33, `sharp` keeps its binaries in separate optional
  packages — `@img/sharp-linux-arm64` and the rest — so copying `node_modules/sharp` alone gives a
  loader with nothing to load. **A Lambda layer was rejected**, not because it does not work, but
  because it is a second resource with its own version that can drift from the function's own
  `sharp` version, and this project has one developer. **`bundling.nodeModules` stays banned**
  (ADR-0012): it is what CDK issue 37898 breaks under pnpm 11, and this hook does the same job
  without it. **`infra-assert` checks the asset contains `node_modules/@img/sharp-linux-arm64`**, so
  a build on the wrong runner fails in CI instead of at the first upload.

- **`ARM_64` costs less per GB-second and there is one condition on it.** The bundle must contain no
  native module, **or the build must run on an arm64 runner**. **Amended 2026-08-31 (owner):** this
  used to say "use a pure-JavaScript image-header reader, not `sharp`". That is now wrong, because
  step 5b of `03-api-spec.md` §4 does not only read a header — it **decodes and re-encodes the
  photo**, which is what strips EXIF, proves the bytes are really an image and fixes rotation. Pure
  JavaScript decoding of a 2 MB photo costs real CPU inside the 20,000 ms request deadline. **So
  `sharp` is accepted, and the build moves to an arm64 runner** (`ubuntu-24.04-arm`, free on public
  repositories). Do not set `X86_64`; fix the runner instead. If any other native module is ever
  added, the same condition applies. This is written here because the failure is silent until
  deploy.
- **The gateway is an HTTP API, never a REST API.** ADR-0007 calls this the sharpest trap on the
  upload path. On a REST API with `binaryMediaTypes` unset, API Gateway runs the photo through UTF-8
  and corrupts it before the application ever sees it, and nothing reports an error. **Do not set
  `binaryMediaTypes`** — the setting does not exist on an HTTP API. **Do not move this route to a
  REST API.** The most likely reason somebody would try is to escape the 30-second ceiling.
- **No CORS configuration anywhere** (ADR-0010). If a change ever needs
  `Access-Control-Allow-Origin`, something has gone wrong.
- **No authorizer on the gateway.** ADR-0004 rejected gateway authorizers: the role lives in the
  app's own data and the gateway sees a cookie it cannot read.
- **No VPC.** A VPC is a private network inside AWS. The function has a default route to the
  internet only because it is outside a VPC. Putting it in one would need a NAT Gateway for the
  Anthropic call, and a NAT Gateway is charged by the hour with no free offer (ADR-0002). **Do not
  add a VPC to this function.**
- **This stack creates the log group, with retention set.** If Lambda creates its own log group
  instead, retention is "never expire", and the logs grow against the free allowance forever. See
  `02-cost-guardrails.md` §3.
- **The execution role: the table, the photo bucket, the Cognito client secret parameter, and
  `states:StartExecution` on the one state machine.** Since 2026-09-17 it does **not** read the
  model key parameter and does **not** write the breaker row. Both moved to `assess` (§4.4b). This
  is what closes RR-03 in `docs/900-security/02-mitigations.md`.

### 4.4b `ZamphoraWorkflowStack` — the background run

**Added 2026-09-17 (ADR-0014 to ADR-0016).** The assessment runs here, after the `api` function
has answered `202`. Step Functions is the AWS service that runs a list of steps with retries and
error handling written as configuration, not code. The **Standard** type has an Always Free
allowance of 4,000 state transitions a month; the Express type has none.

```
stepfunctions.StateMachine
  stateMachineType      STANDARD             <- REQUIRED. Express has no free amount
  timeout               none                 <- a machine timeout skips every Catch
  tracingEnabled        true                 <- X-Ray, 03-observability.md §8
  logs                  ERROR level only, to a log group with 30-day retention
  definition
    ClaimRun            DynamoDB UpdateItem, state queued -> running, with a condition.
                        A failed condition ends the run: a duplicate start
    Assess              LambdaInvoke(assess)
                          timeout            Duration.seconds(25)   <- per attempt
                          retryOnServiceExceptions  false           <- REQUIRED, see below
                          Retry  errors  ProviderTimeout, ProviderThrottled,
                                         ProviderUnavailable, Lambda.TooManyRequestsException
                                 maxAttempts 2, interval 2 s, backoffRate 2
                          Catch  all -> RecordFailure
    Choice              a refusal value (feature-off, provider-unavailable from a
                        closed breaker) -> Refund; otherwise -> Persist
    Refund              DynamoDB UpdateItem, ADD attempts -1 on the day counter (ADR-0016)
    Persist             DynamoDB UpdateItem, the answer onto the row, state done.
                        Retry on DynamoDB errors, maxAttempts 3
    Rollup              DynamoDB UpdateItem on the day rollup. Retry the same way
    RecordFailure       DynamoDB UpdateItem, state failed, failureCode

lambdaNodejs.NodejsFunction  assess
  runtime, architecture, bundling   as the api function
  entry                 apps/api/dist/assess.js
  memorySize            1024
  timeout               Duration.seconds(30) <- above the task's 25
  reservedConcurrentExecutions  1            <- the cap on paid calls at once
  environment           TABLE_NAME, PHOTOS_BUCKET, PARAM_PREFIX, ENV_NAME
  role                  the model key parameter (read), the two CONFIG rows (read),
                        the breaker row (read, write), the photo object (read)

lambdaNodejs.NodejsFunction  watch
  entry                 apps/api/dist/watch.js
  timeout               Duration.seconds(60) <- it closes the stream itself at 55
  reservedConcurrentExecutions  5
  role                  the session and assessment rows (read only)
lambda.FunctionUrl on watch
  authType              AWS_IAM              <- only CloudFront may call it
  invokeMode            RESPONSE_STREAM

lambdaNodejs.NodejsFunction  mark-failed
  entry                 apps/api/dist/mark-failed.js
  role                  the assessment rows (write state = failed only)
events.Rule
  eventPattern          Step Functions Execution Status Change,
                        status FAILED, TIMED_OUT, ABORTED, this state machine only
  target                mark-failed, retryAttempts 2, maxEventAge 5 minutes,
                        deadLetterQueue: the queue below
sqs.Queue               the dead-letter queue. Nothing reads it. Retention 4 days
```

- **`retryOnServiceExceptions: false` is the setting most likely to be left alone, and it must not
  be.** The CDK `LambdaInvoke` task adds a hidden retry of six attempts on Lambda service errors.
  One of those errors, `Lambda.Unknown`, can arrive **after** the model call was made, and a hidden
  retry would make the call again. The explicit list above is the whole retry policy
  (`02-cost-guardrails.md` §5, guardrail 3).
- **No timeout on the machine.** A machine-level timeout ends the run without running any `Catch`,
  so the row would stay `running` for ever and the phone would wait out its 60 seconds for nothing.
  Every task has its own timeout and its own `Catch`. The EventBridge rule is the net under that:
  if a run dies in a way no `Catch` sees, `mark-failed` writes the row.
- **`reservedConcurrentExecutions: 1` on `assess`.** One paid call at a time is the largest number
  this product needs at one user. It is also what makes the circuit breaker's half-open test exactly
  one call. Raise it only with a written reason.
- **The `assess` role is the smallest role in the product**, and that is the point. The model key
  is in exactly one function, and that function has no route (`docs/900-security/02-mitigations.md`
  RR-03).
- **The Function URL is `AWS_IAM`, never `NONE`.** With `NONE` anybody on the internet could open a
  stream. With `AWS_IAM` only the CloudFront distribution can call it, through origin access control
  (§4.6). It carries `RESPONSE_STREAM` because the API Gateway HTTP API cannot stream at all, and
  the REST API that can corrupts uploads — so the upload stays on the gateway and only the one
  `GET` stream goes here (ADR-0015).
- **The dead-letter queue is the only queue, and nothing reads it.** SQS is a queue service. An
  idle queue that a Lambda function reads still costs receive requests, so no function reads one.
  The owner looks at this queue after an alarm (`03-observability.md` §5).
- **Every function here creates its own log group with retention**, as §4.4 says for `api`.
- **`infra-assert` checks four things on the synthesised template:** the type is `STANDARD`, the
  machine has no `TimeoutSeconds`, the `Assess` retry list is exactly the four names above with
  `MaxAttempts: 2`, and `Refund` is reachable only from the refusal choice (NFR-05, NFR-38).

### 4.5 `ZamphoraWebStack` — the static files

```
s3.Bucket
  blockPublicAccess    BLOCK_ALL     <- reached only through the distribution
  encryption           S3_MANAGED
  removalPolicy        DESTROY, autoDeleteObjects true
s3deploy.BucketDeployment
  sources              the folder next build produced
  distribution         the CloudFront distribution, so the deploy invalidates the cache
  distributionPaths    ['/*']
```

- **`DESTROY` here, and `RETAIN` on the photo bucket.** These files are built from the repository
  and can be rebuilt in a minute. A photo cannot.
- **The bucket is not a website endpoint.** Only CloudFront reads it, through an origin access
  control. That is a setting that lets one distribution read the bucket and nobody else, so nothing
  is public.
- **The web has no IAM role, no database client and no S3 client** (ADR-0010). It fetches every
  value from `/api/*` in the browser.

### 4.6 `ZamphoraEdgeStack` — the one front door

```
cloudfront.Distribution
  defaultBehavior      origin: the web bucket, with origin access control
                       viewerProtocolPolicy: REDIRECT_TO_HTTPS
                       cachePolicy: CACHING_OPTIMIZED
                       functionAssociations: [ viewer-request: the rewrite function ]
                       responseHeadersPolicy: the security headers policy below
  additionalBehaviors
    '/api/assessments/*/events'              <- listed BEFORE '/api/*'. Added 2026-09-17
                       origin: FunctionUrlOrigin(the watch function, with origin
                                 access control, readTimeout: Duration.seconds(25))
                       cachePolicy: CACHING_DISABLED
                       originRequestPolicy: ALL_VIEWER_EXCEPT_HOST_HEADER
                       allowedMethods: GET and HEAD only
    '/api/*'           origin: HttpOrigin(the API Gateway hostname,
                                 readTimeout: Duration.seconds(25))  <- REQUIRED
                       cachePolicy: CACHING_DISABLED
                       originRequestPolicy: ALL_VIEWER_EXCEPT_HOST_HEADER
                       allowedMethods: ALLOW_ALL
  defaultRootObject    index.html
  priceClass           PRICE_CLASS_100
  httpVersion          HTTP2_AND_3
  domainNames          none — the distribution's own hostname is the host (gate 45)
  certificate          none — CloudFront's own
```

- **No `domainNames` and no `certificate`.** Gate 45 chose the free CloudFront hostname. Setting
  either would need a bought domain and a certificate in `us-east-1`.
- **`ALL_VIEWER_EXCEPT_HOST_HEADER` on `/api/*`, and this is a trap.** API Gateway rejects a request
  that arrives with somebody else's `Host` header. Forwarding the viewer's `Host` is the usual first
  mistake. It produces a 403 that looks like a permission problem. CloudFront must forward
  everything else, including cookies and the query string. Otherwise the session cookie never
  reaches the API.
- **`CACHING_DISABLED` on `/api/*`.** An API answer must never be cached. A cached `GET /api/me`
  would hand one person another person's answer.
- **`readTimeout: 25 seconds` on the `/api/*` origin, and this is the fourth deadline.**
  **Added 2026-08-31.** A CloudFront custom origin has its own response timeout: **30 seconds by
  default, 60 seconds at most** without a quota increase. It was never set here, so CloudFront —
  not API Gateway — was the outermost clock, and a request that reached it would produce a 504 whose
  body nothing in this product wrote. That is the exact failure `03-flow.md` §4 exists to prevent,
  and F-4 in the pre-mortem named it. 25 seconds sits between the app's 20,000 ms deadline and the
  gateway's 30,000 ms cut-off, so the app is still the first thing to answer. **The full stack is
  now four numbers and they are listed once, in `03-flow.md` §4.**
  **The ceiling itself is not certain, and that is AWS's fault, not this document's.** Checked
  2026-09-01: AWS's own pages disagree with each other on the maximum origin read timeout — some CDK
  reference pages say 60 seconds, others say 120, and a support article says the console allows 180.
  **Nothing here depends on which is right**, because 25 seconds sits far below all three. But
  before anyone plans on "escape the 30-second limit later", read the real number off the live
  account with `aws cloudfront get-distribution-config` rather than trusting a page.
- **The stream behaviour comes first, and it is `GET` only.** CloudFront matches behaviours in
  order, so the events path must sit above `/api/*` or it never matches. The origin is the `watch`
  function's URL with origin access control, which signs each request so the `AWS_IAM` URL accepts
  it. That signing needs a body hash on a `POST`, which a browser cannot supply through CloudFront.
  So only this one `GET` route goes to a Function URL; every `POST` stays on the gateway. The
  25-second `readTimeout` counts the gap between bytes, not the whole response, and `watch` sends a
  heartbeat every 5 seconds, so a stream stays open for the full wait (ADR-0015).
- **The photo bucket is not an origin here** (ADR-0007).
- **A CloudFront Function on the viewer request, doing two small jobs.** First, add `index.html` to
  a path that names a folder, because a static export writes `/hu/index.html` and a bucket reached
  through origin access control answers 403 for `/hu`. Second, send `/` to `/hu` or `/en`.
  ADR-0010 named that redirect as an open task and said it is either a CloudFront function or a line
  of browser JavaScript. This plan takes the function, because it works before any JavaScript loads.
  **Checked 2026-09-01: CloudFront Function invocations carry their own Always Free allowance of
  2,000,000 a month** — *"1 TB of data transfer out, 10,000,000 HTTP/HTTPS requests, plus 2,000,000
  CloudFront Functions invocations each month for free"*
  ([CloudFront FAQ](https://aws.amazon.com/cloudfront/faqs/)). This product uses a few hundred a
  month, so it was never a risk.
- **A response headers policy carrying a Content Security Policy.** A Content Security Policy tells
  the browser which sources it may load code and images from. ADR-0011 raised this on 2026-08-27 and
  sent it here. A static export behind CloudFront should send one, and nothing in the repository
  mentioned one. A starting policy is in §5. **900 Security owns the final wording.**
- **`PRICE_CLASS_100` covers North America, Europe and Israel.** The users are in Hungary. The free
  1 TB applies either way, so this is about which edge locations answer, not about the bill.
- **No AWS WAF.** AWS WAF is the web application firewall. It costs money on an account with a
  closing credit balance, and ADR-0008 already rejected WAF rate rules for the daily limit.

### 4.7 `ZamphoraOpsStack` — the watching

An SNS topic, the alarms and one dashboard. SNS is the AWS service that sends the alarm emails.
**There are eleven alarms against a free allowance of ten** — `03-observability.md` §5.
Everything in this stack is listed in `03-observability.md`. It is a separate stack so that a change
to an alarm cannot fail a deploy of the product.

**CDK creates the topic with no subscriber** (gate 58, owner, 2026-08-27). The owner adds the alarm
email address by hand in the SNS console, once, and confirms it there. **The address never appears
in CDK, in this repository or in GitHub.** The repository is public, and a personal address
published for no gain is a thing to avoid, even though it unlocks nothing. `03-observability.md` §5
has the two rejected options.

## 5. The starting security headers

Written here because they are a CloudFront property, so they are infrastructure. **900 Security
reviews and may change every line.**

| Header | Value | Why |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Two years. `preload` is left off, and with no domain of our own there is nothing to preload |
| `X-Content-Type-Options` | `nosniff` | Stops the browser guessing a type |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | An assessment id must not leak in a referrer |
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data: https://<the photo bucket host>; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'` | See the two notes below |
| `Permissions-Policy` | `camera=(self), geolocation=(), microphone=()` | The camera is used to take a plant photo. Nothing else is |

**Two things about that policy that a later change can easily get wrong.**

- **`img-src` must name the photo bucket's own host.** Photos come from a signed S3 URL, not through
  CloudFront (ADR-0007), so they sit on a different host from the app. With the bucket in
  `eu-central-1` that host is the S3 endpoint for that Region. Leave it out and every photo fails to
  draw, with nothing on screen to say why.
- **`script-src` is not listed above on purpose.** Whether `'self'` alone is enough depends on
  whether the built output contains an inline script. A Next.js static export can produce one.
  Measure it on the first real build. Writing a value here would give a value that is either too
  loose or breaks the app. **This is a task for the first web deploy, and 900 Security should check
  the result.**

## 6. Parameter Store

| Path | Type | Written by |
| --- | --- | --- |
| `/zamphora/<env>/cognito/client-secret` | `SecureString` | The owner, by hand, once |
| `/zamphora/<env>/anthropic/api-key` | `SecureString` | The owner, by hand, once |

Four rules:

1. **Standard tier only.** Standard parameters have no charge. Advanced parameters do.
2. **The AWS-managed key encrypts them.** Not a key this project creates and owns. That kind of key
   carries a monthly charge, and the contract for this role says AWS-managed keys.
3. **CDK names the parameter. CDK never holds the value.** A value passed into CDK ends up in the
   CloudFormation template, and CDK prints values in the deploy difference. **The repository is
   public** (gate 47), so this is not a preference. The function receives the *path* as an
   environment variable and reads the value itself at start-up.
4. **The value is cached in the function's memory for the life of the function.** That is the same
   free cache ADR-0002 points at. A key is not a session and not a daily count, so neither of
   ADR-0002's two "do not cache" rules applies.

**Parameter Store is not where the kill-switch lives, and that is not a contradiction.** ADR-0009
says *"Do not put the switch in an environment variable, in AppConfig, in Parameter Store, or
anywhere that needs a deploy to change."* That rule is about three values a person changes in
minutes: the kill-switch, the daily limit and the model id. They live in the `CONFIG` partition of
the table. The rule is not about the two secrets. Those change almost never, and they must not sit
in a table the API reads on every request.

## 7. Bootstrapping, and the Region

**`cdk bootstrap` runs once, by hand, by the owner, in `eu-central-1`.** It creates three things:
the bucket CDK stores templates in, the roles a deploy assumes, and a container image repository.
That last one stays empty, because this project has no container image assets.

**One Region for everything that serves a request. One small stack in `us-east-1`, for alarms
only.** Gate 45 chose the free CloudFront hostname, so there is no ACM certificate and no
`ZamphoraCertStack`. **Do not add a certificate stack unless a domain is bought, which would re-open
gate 45.**

**Amended 2026-08-31.** This section used to say "no cross-Region piece at all". That could not
hold, because **CloudFront publishes its metrics only to `us-east-1`**
([CloudFront metrics](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html),
checked 2026-08-31). Alarm 10 in `03-observability.md` §5 was written against `eu-central-1`, where
those metrics do not exist. It would have deployed without an error and **never fired**, and
dashboard row 5 would have drawn an empty graph.

**`ZamphoraCloudFrontAlarmsStack`, in `us-east-1`.** It holds CloudFront alarms and nothing else —
no function, no table, no bucket. It needs `crossRegionReferences: true` on the CDK app so it can
read the distribution id. It also gives the alarm on **CloudFront request count** a home, which is
the one guard against a flood that stops at the edge and never reaches the throttled gateway
(§4.4). Keep it to alarms: the moment anything that serves a request moves to a second Region, the
rule above is broken for real.

## 8. Backups — there are none, and that is a decision

**Decided by the owner on 2026-08-27, gate 46: point-in-time recovery is off in run 1.**

DynamoDB point-in-time recovery can put the table back to an earlier moment. It is charged per
gigabyte per month and has no free allowance. The owner chose not to pay it. This plan says so
plainly, rather than implying a protection that is not there.

**What that means, in three sentences.** A bad deploy that writes wrong rows cannot be undone. A
deleted row is gone. At one user with test data, that is survivable, and that is the whole reason it
was acceptable.

**The infrastructure is still safe**, and that is a different thing. It is CDK in git, so a
destroyed account comes back with one deploy. **What does not come back** is the DynamoDB table, the
photo bucket and the Cognito user list.

**The replacement is a calendar entry, not a service.** Before **2026-12-31**, when the free account
plan ends, export the table and the bucket to the owner's own machine. `02-cost-guardrails.md` §8
carries the same line.

**The trigger to turn point-in-time recovery on is real data, not a date.** The moment the table
holds a person's plant history rather than test rows, this is worth the small charge and should be
re-opened.

## 9. The rollback

**Three levels, and they are for three different problems. Each is one step.**

### Level 1 — stop the money, in under a minute

Not a rollback. It is a mitigation, and it is the fastest thing in this system.

> In the AWS console, open the table, find `PK = CONFIG, SK = AI_ENABLED`, set `enabled` to `false`.

No new model call is made within 30 seconds, against a 60-second promise (ADR-0009, NFR-34). Calls
that are already running finish, because the money is already spent (US-13 AC-4).

**This is the owner's switch and nobody else's.** Owning the kill-switch is on the list of decisions
that are never a model's. **The automatic circuit breaker in `02-cost-guardrails.md` §5 never
touches this row**, so a breaker that has opened does not turn the switch back on, and a switch the
owner turned off stays off.

### Level 2 — put the old API code back, in about a minute

```
aws lambda update-alias \
  --function-name zamphora-prod-api \
  --name live \
  --function-version <the previous version number>
```

An alias is a name that points at one published version of the function. The gateway points at the
alias `live`, not at a version, so moving the alias moves all traffic at once. Every published
version stays available, so the previous number is always there. `assess` and `watch` have the same
alias, and the state machine and the Function URL point at it, so the same command works for all
three: change `-api` to `-assess` or `-watch`.

**One thing to understand about it.** The next `cdk deploy` moves the alias forward again, because
CDK believes the alias belongs to the newest code. So this gives time. It does not end the incident.
Land a revert or a fix afterwards.

### Level 3 — put everything back, in the time one deploy takes

```
gh workflow run rollback.yml -f sha=<the git commit that was good>
```

One command. A SHA is the long identifier of one git commit. The workflow checks out that commit,
builds it, and runs `cdk deploy --all`. `04-ci-cd.md` §8 defines the workflow. This is the only
rollback that also undoes an infrastructure change.

**Two things it cannot undo**, said plainly so nobody expects it to:

- **Data.** A row written by the bad version is still there, and **there is no backup** (§8).
- **A deleted resource.** The table and the photo bucket are `RETAIN`, so a rollback cannot bring
  back a bucket that a person deleted by hand.

### Rollback has to be tested, or it is a paragraph

**After the first `prod` deploy, run level 3 once on purpose**, then deploy the newest commit again,
and write down how long it took. A rollback nobody has ever run is a plan, not a rollback. This is a
checklist item in `04-ci-cd.md` §10.

## 10. What is deliberately not in CDK

Five things, each with its reason. Anything else in the console is a mistake.

| Not in CDK | Why |
| --- | --- |
| The two `SecureString` values | A secret in CDK ends up in the template and in the deploy difference. The repository is public (§6) |
| The three `CONFIG` rows | They are data, and ADR-0009 says nothing in the application writes them. The kill-switch has to be changeable with no deploy |
| The one real user account | Self sign-up is off, so the owner creates it in the Cognito console (§4.3) |
| **The alarm email subscription** | Gate 58. CDK creates the topic with no subscriber. The owner adds the address in the SNS console and confirms the link AWS sends. The address must not reach a public repository, and CDK would print it in the deploy difference (§4.7) |
| The GitHub OpenID Connect roles | CI cannot create the role it needs in order to sign in (`04-ci-cd.md` §4) |

## 11. How to check this plan against itself

- **Every container in `02-containers.mmd` appears in §3** with a named CDK construct, or is named
  in §2 as code that ships inside another unit. Check the diagram box by box.
- **Every service named here appears in `02-cost-guardrails.md` §2** with its free allowance and
  what happens when it is passed.
- **The DynamoDB capacity of every table in `eu-central-1` adds up to 25 or less.** Two tables
  today: 20 and 5.
- **The Lambda runtime and CI's `node-version` name the same number.** Both are 24 (§4.4), for all
  four functions.
- **The four `infra-assert` checks on the state machine pass** (§4.4b), and the `api` role has no
  read on the model key parameter.
- **`infra-assert` runs on every push that touches `infra/`.** It makes no AWS call, so it needs no
  credential and costs nothing (`06-nfrs.md` §1). NFR-40 is the first assertion it carries.
  **That job does not exist in the repository yet** — `04-ci-cd.md` §6.1 names it as work owed.
- **A resource created by hand in the console fails this plan**, whether or not it works — unless it
  is one of the five in §10.

## 12. What this document does not decide

Whether anything is deployed · whether SSE-S3 is enough, which ADR-0007 hands to 900 Security · the
final Content Security Policy · when open sign-up joins the product, which gate 49 records as a
run-2 story.
