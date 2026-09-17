# The stack

**Written by** 500 Engineering, run 1 (`001-photo-assessment`). **Date:** 2026-08-26.

This is the warm layer. It is loaded when you write code and it stays short on purpose. It holds
facts about **this repository only**. A rule that would be true in any repository does not belong
here — it belongs in a skill or in `00-conventions.md`.

---

## 1. Language and tools

**Every version below is exact, and lives in the `catalog:` in `pnpm-workspace.yaml`.** A package
writes `"zod": "catalog:"` and never a number (ADR-0012 rule 2). Versions read from the npm registry
on **2026-08-27**.

| Slot | Choice | Version | Where it was decided |
| --- | --- | --- | --- |
| Runtime | **Node**, in CI and in Lambda | **24** | ADR-0012, gate 60 |
| Language | **TypeScript** | **`6.0.3`** | ADR-0012 |
| Package manager | **pnpm**. Package scope `@zamphora/*` | **11** | ADR-0012 |
| Task runner | **Turborepo** | latest | ADR-0012 |
| Web framework | **Next.js**, built with `output: 'export'` | **`16.3.3`** | ADR-0010 |
| UI library | **React** | **`19.2.8`** | with Next.js |
| API framework | **Nest.js**, Express adapter. One codebase, three Lambda functions since 2026-09-17 | **`11.2.3`** | ADR-0002, ADR-0014 |
| Lambda bridge for the API | **`@codegenie/serverless-express`**. Turns the gateway event into an Express request — Nest.js alone cannot do this | latest | `03-api-spec.md` §1 |
| The background run | **AWS Step Functions**, Standard type, defined in CDK. Runs the `assess` function and writes the rows | — | ADR-0014 |
| The result stream | **Native Lambda response streaming** behind a Function URL, in the `watch` function. No bridge library | — | ADR-0015 |
| Shared types | **Zod**, in `packages/contracts` | **`4.4.3`** | `factory/feature.md` |
| Components | **shadcn/ui**, which uses **Base UI** underneath. Styled with Tailwind | **`@base-ui/react` `1.7.0`** | ADR-0011 |
| Infrastructure | **AWS CDK**, one stack per deployable unit | latest | ADR-0001 rule 5 |
| Bundler for Lambda | **esbuild**, after `nest build` for `apps/api` | latest | ADR-0012 |
| Unit and integration tests | **Vitest** with **Vite** | **`4.1.11`** / **`8.2.2`** | ADR-0013 |
| Browser tests | **Playwright** | latest | `06-nfrs.md` §1 |
| Bundle budget | **size-limit** | latest | `06-nfrs.md` NFR-50 |

**Stay on TypeScript 6.** `typescript-eslint@8.68.0` declares `typescript: ">=4.8.4 <6.1.0"`, so
even 6.1 would break it, and TypeScript 7 ships no programmatic API until 7.1. Installing 7 turns
off every type-aware lint rule in silence (ADR-0012).

**Stay on Zod 4.** Zod 3's `required_error`, `invalid_type_error` and `errorMap` are **accepted and
ignored** by Zod 4 — no error, no warning, the custom message replaced by default English. Write
custom messages with the single `error` parameter. `01-contracts.md` §9a has the proof and the rest.

## 2. The folders

```
apps/web            Next.js. Screens, both languages. No credentials, no data store
apps/api            Nest.js. Three Lambda entry points from one codebase: the API (session,
                    ownership, daily limit, kill-switch, starts the run), assess (the one
                    model call), watch (streams the result)
packages/contracts  Zod schemas for everything that crosses the wire
packages/llm        The LlmProvider port and the one Anthropic adapter
infra/              CDK. One stack per deployable unit
docs/ ADR/ factory/ TASKS.md
specs/<feature>/    spec.md, plan.md, nfr.yml — written at the start of an epic
```

## 3. The shape of the running system

One CloudFront domain. `/api/*` reaches `apps/api`; the one stream path reaches the `watch`
function; everything else reaches the static files of `apps/web` in a private bucket (ADR-0010).

- **The API is one Lambda function** for every route except the model call. **The assessment runs
  in the background** (ADR-0014, 2026-09-17): the API writes the row as `queued`, starts a Step
  Functions workflow and answers `202`. The workflow runs the `assess` function, which holds the
  model key and nothing else, retries the call at most twice, and writes the result. The `watch`
  function pushes the result to the phone over server-sent events (ADR-0015).
- Data is **one DynamoDB table per environment**, in **provisioned** capacity: `prod` at 20/20 and
  `preview` at 5/5. The **total** across every table in the Region must never pass 25/25 (ADR-0002,
  gate 43). The key design is `docs/400-architecture/05-patterns.md` §1.
- **Photos are one object each in one private S3 bucket**, deleted at 180 days by a lifecycle rule
  (ADR-0007).
- **Sign-in is OpenID Connect through Cognito**, with `apps/api` as the backend for the frontend.
  No token ever reaches the browser; the browser holds one opaque `__Host-session` cookie
  (ADR-0003).
- **One model call per assessment in the normal case, at most three**, through `LlmProvider`
  (ADR-0005, ADR-0014). The only retry is the workflow's; the adapter has `maxRetries: 0`. Default
  model id `claude-haiku-4-5-20251001`, held in the table, not in code (ADR-0006).

## 4. The gotchas, all of them real

| Gotcha | What to do |
| --- | --- |
| API Gateway cuts a request off at **30 seconds** and cannot be raised. Its 504 has a body nobody here wrote | The model call is not behind the gateway any more (ADR-0014). The `api` function still fails at **20,000 ms** and answers for itself, and it answers in about a second in practice |
| The Anthropic SDK retries on its own by default | Set `maxRetries: 0` on the client. The only retry is the workflow's `Retry` with `MaxAttempts: 2` (ADR-0014, NFR-05). Two hidden retries would turn three calls into nine |
| CDK's `LambdaInvoke` task adds a hidden retry of six attempts on Lambda service errors | Set `retryOnServiceExceptions: false` and write one explicit `Retry` list. One of those errors can arrive after the call was made |
| A timeout on the whole state machine skips every `Catch`, so the row stays `running` for ever | No machine-level timeout. `TimeoutSeconds` and a `Catch` on every task |
| Step Functions Express has no free amount and runs a step at least once | Standard only. Express could call the model twice for one photo with no rule saying so |
| API Gateway's HTTP API cannot stream, and the REST API that can corrupts uploads | The stream is a Lambda Function URL. The upload stays on the HTTP API |
| CloudFront's signed access to a Function URL needs a browser-computed body hash on every `POST` | Only the one `GET` stream route goes to the Function URL |
| A cached `GET /api/assessments/:id` would show `queued` for ever | `Cache-Control: no-store`, and caching is off on `/api/*` |
| The Base UI package was renamed | Install **`@base-ui/react`**. `@base-ui-components/react` is deprecated and its latest is the old `1.0.0-rc.0` this project used to pin (ADR-0011) |
| The Anthropic SDK's `timeout` is in **milliseconds** in TypeScript | Some other SDKs take seconds. `18_000` is right here; `18` would be an 18 ms timeout that fails every call |
| `max_tokens` on the model call is **1024**, and lowering it saves nothing | You are billed for tokens generated, not for the ceiling. A tight ceiling only causes `answer-truncated`, which is a dead end for the person (`03-api-spec.md` §4) |
| An assessment id and a care task id **contain a `#`** — they are the sort key without its prefix | URL-encode both, always. An unencoded `#` cuts the value in half (`01-contracts.md` §2.1) |
| `bundling.nodeModules` in CDK's `NodejsFunction` is broken with pnpm 11 | Bundle with esbuild instead (ADR-0012) |
| **esbuild cannot emit `emitDecoratorMetadata`, and Nest.js needs it to inject constructors** | Build `apps/api` in two steps: `nest build` (that is `tsc`) first, then esbuild bundles `dist/main.js`. Never point `NodejsFunction` at `apps/api`'s `.ts` source. It deploys fine and throws `Nest can't resolve dependencies` on the first request (ADR-0012) |
| A pnpm setting left in `.npmrc` is ignored in silence | Every pnpm setting goes in `pnpm-workspace.yaml`. `.npmrc` is for the registry and login only |
| `onlyBuiltDependencies` was removed in pnpm 11 | It is `allowBuilds` now |
| A static export cannot read `Accept-Language` on the server | Both languages are prerendered. The redirect from `/` is a CloudFront function or a line of client code (ADR-0010) |
| `next/image` with the default loader does not work in a static export | Plant photos come from the product's own bucket through a signed URL, so they never used it |
| DynamoDB TTL deletes late, "typically within a few days" | Never let a rule depend on TTL firing. Check the expiry in code (NFR-35) |
| S3 lifecycle expiry is also late by up to a day | The audit checks at 182 days, not 180 (NFR-41) |
| Money in the day rollup is **millionths of a dollar, as a whole number** | `ADD` on a decimal loses precision. One assessment is about 3,500 (`05-patterns.md` §1) |
| Structured output pays a one-off grammar compile, cached 24 hours | At one user it is paid on nearly every visit. Budgeted at 1,500 ms (ADR-0005) |
| The 25 capacity units are shared by every table in the Region, and are billed per unit-**hour** | The allowance is about 18,250 unit-hours a month. `prod` 20/20 plus `preview` 5/5 fits inside it. Adding a table means taking units from an existing one (ADR-0002) |
| shadcn's copied components miss 44 px targets, use a 50%-opacity focus ring and `rounded-md` | Do the edit pass in the same task that copies the file (ADR-0011) |

## 5. What is not settled yet

- **Settled 2026-08-26: the test runner is Vitest** (gate 33, ADR-0013). Every `test` job in
  `06-nfrs.md` now has a runner. `apps/api` needs four lines in its config or Nest.js dependency
  injection fails at run time:
  ```ts
  oxc: { decorators: { legacy: true, emitDecoratorMetadata: true } }
  ```
- **The ten verdict codes are in `docs/500-engineering/01-contracts.md` §3**, copied from
  `docs/200-product/001-photo-assessment/00-prd.md` §5.2. **What each one means stays in the PRD
  only.** Do not copy a meaning into code, and do not add an eleventh code — the list is reviewed
  after the first 20 real assessments (gate G-6).
