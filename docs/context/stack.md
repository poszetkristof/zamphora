# The stack

**Written by** 500 Engineering, run 1 (`001-photo-assessment`). **Date:** 2026-08-26.

This is the warm layer. It is loaded when you write code and it stays short on purpose. It holds
facts about **this repository only**. A rule that would be true in any repository does not belong
here — it belongs in a skill or in `00-conventions.md`.

---

## 1. Language and tools

| Slot | Choice | Where it was decided |
| --- | --- | --- |
| Runtime | **Node 22 or newer**, in CI and in Lambda | ADR-0012 |
| Language | **TypeScript, pinned to `6.0.3`** | ADR-0012 |
| Package manager | **pnpm 11**. Package scope `@zamphora/*` | ADR-0012 |
| Task runner | **Turborepo** | ADR-0012 |
| Web framework | **Next.js**, built with `output: 'export'` | ADR-0010 |
| API framework | **Nest.js**, Express adapter, one Lambda function | ADR-0002 |
| Shared types | **Zod**, in `packages/contracts` | `factory/feature.md` |
| Components | **shadcn/ui**, which uses **Base UI** underneath. Styled with Tailwind | ADR-0011 |
| Infrastructure | **AWS CDK**, one stack per deployable unit | ADR-0001 rule 5 |
| Bundler for Lambda | **esbuild** | ADR-0012 |
| Browser tests | **Playwright** | `06-nfrs.md` §1 |
| Bundle budget | **size-limit** | `06-nfrs.md` NFR-50 |
| Unit test runner | **not chosen.** See section 5 | — |

**Do not install TypeScript 7.** `typescript-eslint` cannot run on it yet, and installing it turns
off every type-aware lint rule in silence (ADR-0012).

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
| The Anthropic SDK retries on its own by default | Set `maxRetries: 0` on the client. There is no retry in run 1 (ADR-0005, NFR-05) |
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

- **The unit test runner has no name in any input.** Choosing one is accepting a new dependency,
  which is the owner's decision. It must run on Node 22 inside a pnpm workspace driven by Turborepo.
  Until it is chosen, every "how it is tested" line in `06-nfrs.md` that names the `test` job has a
  target but no runner.
- **The ten verdict codes are in `docs/500-engineering/01-contracts.md` §3**, copied from
  `docs/200-product/001-photo-assessment/00-prd.md` §5.2. **What each one means stays in the PRD
  only.** Do not copy a meaning into code, and do not add an eleventh code — the list is reviewed
  after the first 20 real assessments (gate G-6).
