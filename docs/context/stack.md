# The stack

**Written by** 500 Engineering, run 1 (`001-photo-assessment`). **Date:** 2026-08-26.

This is the warm layer. It is loaded when you write code and it stays short on purpose. It holds
facts about **this repository only**. A rule that would be true in any repository does not belong
here — it belongs in a skill or in `00-conventions.md`.

---

## 1. Language and tools

| Slot | Choice | Where it was decided |
| --- | --- | --- |
**Every version below is exact, and lives in the `catalog:` in `pnpm-workspace.yaml`.** A package
writes `"zod": "catalog:"` and never a number (ADR-0012 rule 2). Versions read from the npm registry
on **2026-08-27**.

| Slot | Choice | Version | Where it was decided |
| --- | --- | --- | --- |
| Runtime | **Node**, in CI and in Lambda | **22 or newer** | ADR-0012 |
| Language | **TypeScript** | **`6.0.3`** | ADR-0012 |
| Package manager | **pnpm**. Package scope `@zamphora/*` | **11** | ADR-0012 |
| Task runner | **Turborepo** | latest | ADR-0012 |
| Web framework | **Next.js**, built with `output: 'export'` | **`16.3.3`** | ADR-0010 |
| UI library | **React** | **`19.2.8`** | with Next.js |
| API framework | **Nest.js**, Express adapter, one Lambda function | **`11.2.3`** | ADR-0002 |
| Shared types | **Zod**, in `packages/contracts` | **`4.4.3`** | `factory/feature.md` |
| Components | **shadcn/ui**, which uses **Base UI** underneath. Styled with Tailwind | **`@base-ui/react` `1.7.0`** | ADR-0011 |
| Infrastructure | **AWS CDK**, one stack per deployable unit | latest | ADR-0001 rule 5 |
| Bundler for Lambda | **esbuild** | latest | ADR-0012 |
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
apps/api            Nest.js. Session, ownership, daily limit, kill-switch, the one model call
packages/contracts  Zod schemas for everything that crosses the wire
packages/llm        The LlmProvider port and the one Anthropic adapter
infra/              CDK. One stack per deployable unit
docs/ ADR/ factory/ TASKS.md
specs/<feature>/    spec.md, plan.md, nfr.yml — written at the start of an epic
```

## 3. The shape of the running system

One CloudFront domain. `/api/*` reaches `apps/api`; everything else reaches the static files of
`apps/web` in a private bucket (ADR-0010).

- **The API is one Lambda function**, not one per route. Data is **one DynamoDB table**, in
  **provisioned** capacity, fixed at 25 write and 25 read units (ADR-0002). The key design is
  `docs/400-architecture/05-patterns.md` §1.
- **Photos are one object each in one private S3 bucket**, deleted at 180 days by a lifecycle rule
  (ADR-0007).
- **Sign-in is OpenID Connect through Cognito**, with `apps/api` as the backend for the frontend.
  No token ever reaches the browser; the browser holds one opaque `__Host-session` cookie
  (ADR-0003).
- **One model call per assessment, never retried**, through `LlmProvider` (ADR-0005). Default model
  id `claude-haiku-4-5-20251001`, held in the table, not in code (ADR-0006).

## 4. The gotchas, all of them real

| Gotcha | What to do |
| --- | --- |
| API Gateway cuts a request off at **30 seconds** and cannot be raised. Its 504 has a body nobody here wrote | The app fails at **20,000 ms** and answers for itself (ADR-0002, NFR-02) |
| The Anthropic SDK retries on its own by default | Set `maxRetries: 0` on the client. There is no retry in run 1 (ADR-0005, NFR-05). It also protects the deadline: the SDK retries timeouts too, so the default turns an 18,000 ms timeout into 54,000 ms |
| The Base UI package was renamed | Install **`@base-ui/react`**. `@base-ui-components/react` is deprecated and its latest is the old `1.0.0-rc.0` this project used to pin (ADR-0011) |
| The Anthropic SDK's `timeout` is in **milliseconds** in TypeScript | Some other SDKs take seconds. `18_000` is right here; `18` would be an 18 ms timeout that fails every call |
| `max_tokens` on the model call is **1024**, and lowering it saves nothing | You are billed for tokens generated, not for the ceiling. A tight ceiling only causes `answer-truncated`, which is a dead end for the person (`03-api-spec.md` §4) |
| An assessment id and a care task id **contain a `#`** — they are the sort key without its prefix | URL-encode both, always. An unencoded `#` cuts the value in half (`01-contracts.md` §2.1) |
| `bundling.nodeModules` in CDK's `NodejsFunction` is broken with pnpm 11 | Bundle with esbuild instead (ADR-0012) |
| A pnpm setting left in `.npmrc` is ignored in silence | Every pnpm setting goes in `pnpm-workspace.yaml`. `.npmrc` is for the registry and login only |
| `onlyBuiltDependencies` was removed in pnpm 11 | It is `allowBuilds` now |
| A static export cannot read `Accept-Language` on the server | Both languages are prerendered. The redirect from `/` is a CloudFront function or a line of client code (ADR-0010) |
| `next/image` with the default loader does not work in a static export | Plant photos come from the product's own bucket through a signed URL, so they never used it |
| DynamoDB TTL deletes late, "typically within a few days" | Never let a rule depend on TTL firing. Check the expiry in code (NFR-35) |
| S3 lifecycle expiry is also late by up to a day | The audit checks at 182 days, not 180 (NFR-41) |
| Money in the day rollup is **millionths of a dollar, as a whole number** | `ADD` on a decimal loses precision. One assessment is about 3,500 (`05-patterns.md` §1) |
| Structured output pays a one-off grammar compile, cached 24 hours | At one user it is paid on nearly every visit. Budgeted at 1,500 ms (ADR-0005) |
| The 25 capacity units are shared by every table in the Region | Run 1 has **one** table. A second table splits the same allowance (ADR-0002) |
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
