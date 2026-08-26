# Engineering conventions

**Written by** 500 Engineering, run 1 (`001-photo-assessment`). **Date:** 2026-08-26.
**Read next by** 800 Infra, 900 Security, 600 QA, and anybody writing TypeScript in this repository.

This file is written once, in run 1. Later runs read it and add to it. It holds the rules that apply
to **every** file in the repository. The rules that apply to one feature are in `01-contracts.md`,
`02-web-spec.md` and `03-api-spec.md`.

A rule here exists for one of two reasons: an ADR decided it, or a number in
`docs/400-architecture/06-nfrs.md` needs a place in the code where it can be enforced. Every rule
names its reason. **A rule with no reason next to it has drifted and should be challenged.**

---

## 1. The workspace

One repository, `zamphora` (ADR-0001). Four workspace packages and one infrastructure folder:

| Package name | Folder | What it is |
| --- | --- | --- |
| `@zamphora/web` | `apps/web` | Next.js, built with `output: 'export'` |
| `@zamphora/api` | `apps/api` | Nest.js in one Lambda function |
| `@zamphora/contracts` | `packages/contracts` | Zod schemas for everything crossing the wire |
| `@zamphora/llm` | `packages/llm` | The `LlmProvider` port and the one Anthropic adapter |
| — | `infra/` | CDK. One stack per deployable unit |

**Rules that come with pnpm** (ADR-0012, and each is a "do not" in its Agent-Readable Summary):

- An internal dependency is always `workspace:*`. Never a version range. Never a relative path.
- A dependency used by two or more packages has its version named once, in the `catalog:` of
  `pnpm-workspace.yaml`. The package writes `"catalog:"`.
- Every package has an `exports` field, so no package can reach into another's internals.
- `allowBuilds` lists every package allowed to run an install script. Nothing else may.
- Never run `npm install` or `yarn`. Never commit `package-lock.json` or `yarn.lock`.

## 2. Import permissions

This table is the border between the parts. It is short because the borders are few, and it is
written as permissions rather than as advice, because "keep the layers clean" cannot be checked.

| From | May import | Must never import |
| --- | --- | --- |
| `apps/web` | `@zamphora/contracts`, React, Next.js, Base UI, Tailwind | `@zamphora/api`, `@zamphora/llm`, `@aws-sdk/*`, `@anthropic-ai/sdk`, any `node:` module |
| `apps/api` | `@zamphora/contracts`, `@zamphora/llm`, Nest.js, `@aws-sdk/*` | `@zamphora/web`, `@anthropic-ai/sdk`, anything from `next` |
| `packages/llm` | `@zamphora/contracts`, and `@anthropic-ai/sdk` **only inside `src/adapters/`** | `@zamphora/api`, `@zamphora/web`, `@aws-sdk/*` |
| `packages/contracts` | `zod`, and nothing else | every other package, and every AWS or vendor SDK |
| `infra/` | `aws-cdk-lib`, `constructs` | the source of any app or package. It reads built output only |

### What enforces each line

| Rule | The mechanism | The name of the check |
| --- | --- | --- |
| No relative import crosses an app border (ADR-0001 rule 1) | ESLint core rule `no-restricted-imports`, `patterns: ['**/apps/**', '**/packages/**', '../../*']` | `lint` |
| `packages/contracts` only by package name (ADR-0001 rule 2) | The same rule, with a pattern that matches any path ending in `packages/contracts` | `lint` |
| A package cannot use what it did not declare (ADR-0001 rule 3) | **pnpm itself.** Each package sees only its own declared dependencies, so an undeclared import fails on the first run | `build` |
| The Anthropic SDK stays in one folder (ADR-0005) | A second `no-restricted-imports` block, applied to `files: ['packages/llm/src/**']` with `packages/llm/src/adapters/**` excluded | `lint` |
| `apps/web` holds no credentials (ADR-0010) | A test that reads `apps/web/package.json` and asserts it declares no `@aws-sdk/*` and no `@anthropic-ai/sdk` | `test` |
| Each app builds alone (ADR-0001 rule 4) | `cd apps/api && pnpm build` runs in CI as its own step | `build` |
| One CDK stack per unit (ADR-0001 rule 5) | 800 Infra owns it. A CDK assertion test counts the stacks | `infra-assert` |
| Every workflow is filtered by path (ADR-0001 rule 6) | A test that reads each workflow file and asserts it names a `paths` filter (NFR-52) | `test` |

**ESLint core rules only.** No new lint plugin is added in run 1. `no-restricted-imports` is part of
ESLint, and `typescript-eslint` is already required by ADR-0012, so nothing new is accepted here.

## 3. TypeScript

These five come from `CLAUDE.md` and hold everywhere outside a test file.

- **No `enum`.** Use a `const` array with `as const`, and build the Zod schema from it. `z.enum(...)`
  is a Zod function and is not a TypeScript `enum`, so it is allowed and it is the pattern to use.
- **No `interface`.** Use `type`.
- **No `any`.** `unknown` plus a Zod parse is the way in from outside.
- **No bare string literal** for a route name, an account type, a verdict code, a band, a failure
  code, a task kind or a status. Every one of those is a named `const` list. It lives in
  `packages/contracts` if the value crosses the wire, and beside the code that uses it if it does not
  — `01-contracts.md` §2.2 has the two cases where it does not.
- **Comments are two lines at most**, in plain English, and explain *why*. No commented-out code and
  no `TODO`. A longer explanation goes in `docs/` or in an ADR.

**Every value that crosses the wire is a Zod schema in `packages/contracts`, with no exception.**
Writing `type AssessmentResponse = { … }` inside `apps/web` or `apps/api` is always wrong. The
reason is in `01-contracts.md` §1: the two sides must fail on the same input, and they only do that
when the same schema object checks both. `05-patterns.md` §11 says the same.

**Time.** An instant is an ISO 8601 string in UTC, for example `2026-08-26T18:04:11.000Z`. A
calendar day is `YYYY-MM-DD`. A duration is a number of milliseconds in a constant whose name ends
in `_MS`. Never a `Date` on the wire.

## 4. Errors are values, not exceptions

US-09 AC-1 says every failure message ends with exactly one of two sentences. A message can only do
that if the code knows which failure happened, so a failure has to arrive as a value that can be
switched on.

- `LlmProvider.assess()` returns either a parsed answer or a **named failure**. It never throws a
  vendor error (ADR-0005, `05-patterns.md` §4 and §8).
- Every API answer that is not a success is the same envelope, `Problem`, defined in
  `01-contracts.md` §8. It carries a `code` from a closed list and a `retryHint` of `may-work` or
  `will-not-work`.
- A thrown exception that reaches the top of a request is a bug, not a failure path. It is logged
  and answered as `code: 'unknown'`, `retryHint: 'may-work'`.

**Adding a failure code is not a small change.** A new code needs a row in `01-contracts.md` §8, a
row in `05-patterns.md` §8, a screen state in
`docs/300-design/001-photo-assessment/02-SPEC.md` §6, and a message in both languages, before it can
ship (ADR-0005, second cost).

## 5. Configuration that can change without a deploy

Three values live in the `CONFIG` partition of the DynamoDB table and are read on one 30-second
memory cache: the kill-switch, the daily limit, and the model id (ADR-0006, ADR-0008, ADR-0009).

- **Every value read from `CONFIG` is checked against a closed list or a range.** A value that fails
  the check is ignored and the compiled-in default is used instead. It is never sent to the API.
- **A failed read keeps the last known value.** If there has never been a known value, the model
  call does not run (ADR-0009).
- **Never cache the session and never cache the daily count** (ADR-0002).

## 6. Styling

- **No hex value in a component.** Token names only. Every token is in
  `docs/300-design/03-tokens.md` (ADR-0011, `02-SPEC.md` negative criterion 29).
- Tokens reach the code as CSS custom properties through Tailwind's `@theme`. The token name in the
  design spec and the name in the code are the same string.
- **Every component copied in with the shadcn CLI gets its edit pass in the same task.** Raise tap
  targets to 44 x 44, replace the 50%-opacity focus ring with one that meets 3:1, guard every
  transition behind `prefers-reduced-motion`, and replace `rounded-md` with `--radius-card` or
  `--radius-pill` (ADR-0011).
- The negative list in `02-SPEC.md` §7 is part of these conventions. It is not repeated here.

## 7. Language

Two languages ship in run 1: Hungarian (`hu`) and English (`en`) (US-11).

- **Every user-visible string is a key in a message file.** There is exactly one exception in the
  whole product: a pot name, which is shown as the person typed it and is never translated
  (US-11 AC-3).
- **Everything else that crosses the wire is a code, never prose** (`05-patterns.md` §10). The one
  value the model writes as text is `nextAction`, and the assessment records which language it was
  written in.
- **A key that exists in one language and not in the other fails the build** (US-11 AC-4). The check
  is a test that compares the two key sets.
- **No sentence is built by joining fragments.** A Hungarian sentence does not put its parts in the
  English order (`02-SPEC.md` §9).
- Design and test with the Hungarian string. Every label and button stays readable at 30 characters
  (`03-tokens.md` §2.1).

## 8. Tests

- **A test ships in the same change as the code it covers.** CI blocks a pull request that deletes a
  test file unless the commit message says `DELETE_TESTS: <reason>` (`CLAUDE.md`).
- The jobs and when they run are set in `06-nfrs.md` §1 and are not re-decided here. The important
  one: **`ai-eval` never runs on a push**, because it spends real money.
- **A test may never call the Anthropic API.** Every test that needs a model answer uses a stub
  behind `LlmProvider`.

## 9. The per-feature flow

Every feature is built in four steps with one review checkpoint each:

```
spec  →  plan  →  tasks  →  implementation
```

The first two are files, written before any code, in `specs/<feature>/`:

| File | What it holds |
| --- | --- |
| `spec.md` | What this feature does, pointing at the stories and the screens. No solution |
| `plan.md` | How it will be built, in order, with the tasks it will become |
| `nfr.yml` | The numbers this feature must meet, **machine-readable**, so CI reads the target instead of a person remembering it |

`nfr.yml` is machine-readable on purpose. A number that only lives in prose is a number a job cannot
check. The shape:

```yaml
feature: 001-photo-assessment
budgets:
  - id: NFR-02
    what: the server's own share of the 30 second budget
    max_ms: 20000
    job: test
  - id: NFR-12
    what: model calls per account per day
    max_count: 10
    window: utc-day
    job: test
  - id: NFR-50
    what: javascript to draw SC-1, gzipped
    max_bytes: 174080
    job: bundle-budget
    note: a guess. Replace with the measurement of the real screen
```

## 10. Every NFR, and where it is enforced

One row for every requirement in `06-nfrs.md`. The middle column is the place in the code where the
number lives. A number with no such place is not a requirement, so this table is also the check that
the architecture and the code agree.

| # | The enforcement point in the code | The check |
| --- | --- | --- |
| NFR-01 ≤ 30,000 ms tap to screen | `apps/web` constant `CLIENT_DEADLINE_MS = 30_000`, one timer covering resize, upload and answer | `perf-flow` |
| NFR-02 ≤ 20,000 ms server share | `apps/api` constant `REQUEST_DEADLINE_MS = 20_000`, applied by one Nest interceptor that answers `deadline-passed` | `test` |
| NFR-03 ≤ 18,000 ms model call | `packages/llm` constant `MODEL_TIMEOUT_MS = 18_000`, passed as an `AbortSignal` to the adapter | `test` |
| NFR-04 exactly 1 model call | `AssessmentService` calls `LlmProvider.assess()` on exactly one line. A stub counts calls in every failure case | `test` |
| NFR-05 zero retries | The adapter builds its client with `maxRetries: 0`. No wait-and-try-again code exists anywhere | `test` |
| NFR-06 ≤ 800 ms cold start | The function is bundled by esbuild and runs on Node 22. Not testable in CI; read `InitDuration` | runtime |
| NFR-10 ≤ $0.0040 per assessment | `packages/llm` computes the cost from the `usage` block the API returns, never from an estimate, and returns it with the answer | `test` |
| NFR-11 ≤ $0.20 per eval run | The eval script prints the total and refuses a set larger than 50 photos. 600 QA owns the script | `ai-eval` |
| NFR-12 ≤ 10 calls per account per day | `QuotaRepository.increment()` — one `UpdateItem` with a condition, before the model call (ADR-0008) | `test` |
| NFR-13 count matches the provider | Every assessment writes `modelCalls` into the day rollup item, so a local script can compare | local script |
| NFR-14 < $5.00 total spend | The same day rollup carries `costMicroUsd`. A watch number, read from the table | runtime |
| NFR-20 `likely` agreement ≥ 8 in 10 | Every stored assessment carries the band, the verdict and the model id, so agreement can be counted per model | `ai-eval` |
| NFR-21 `cannot-tell` agreement ≥ 8 in 10 | The same stored record. A `cannot-tell` answer is stored as a finished assessment (US-05 AC-3) | `ai-eval` |
| NFR-22 `cannot-tell` share ≤ 3 in 10 | Counted from the same records | `ai-eval` |
| NFR-23 unreadable answers ≤ 1 in 100 | The parser returns `answer-unreadable` and `answer-truncated` as **two different codes**, and both are stored | `test`, runtime |
| NFR-30 zero cross-account reads | `keyFor(userId, …)` in the repository layer cannot be called without a branded `UserId`, and `UserId` is only ever produced where the session is read (ADR-0004) | `test`, `type-check` |
| NFR-31 zero unconfirmed tasks from `unsure` | `POST /api/care-tasks` refuses unless `confirmedUnsure` is `true` when the stored band is `unsure` | `test` |
| NFR-32 zero undecorated routes | The global guard, plus a test that walks the router and asserts every route carries one of the three decorators | `test` |
| NFR-33 nothing in browser storage | `apps/web` never writes `localStorage` or `sessionStorage`. An ESLint `no-restricted-globals` entry bans both, and an end-to-end test asserts they are empty | `lint`, `e2e` |
| NFR-34 ≤ 60,000 ms kill-switch effect | `apps/api` constant `CONFIG_CACHE_MS = 30_000` (ADR-0009) | `test` |
| NFR-35 zero sessions older than 30 days | The session expiry is checked in code on every request. DynamoDB TTL is never trusted to have deleted it | `test` |
| NFR-36 zero model calls with no session | The guard runs before the controller, so the provider is unreachable without a session | `test` |
| NFR-37 zero result screens with no AI notice | One `ResultLayout` component renders `NoticeLines`, and SC-3, SC-4 and SC-5 all use it | `e2e` |
| NFR-40 lifecycle rule at exactly 180 days | The CDK stack for the bucket. 800 Infra owns it | `infra-assert` |
| NFR-41 zero objects older than 182 days | A scheduled job that lists the bucket | `retention-audit` |
| NFR-42 zero copies of a photo | One write path, `PhotoRepository.put()`. A test asserts no other code path writes an image, and that no photo URL is served through a cache | `test` |
| NFR-43 ≤ 300,000 ms signed URL life | `apps/api` constant `PHOTO_URL_TTL_MS = 300_000` | `test` |
| NFR-50 ≤ 170 KB for SC-1 | A `size-limit` entry for the SC-1 route. **The number is a guess. Measure the real screen and replace it** | `bundle-budget` |
| NFR-51 ≤ 10 minutes of CI | The workflow's own duration | read from Actions |
| NFR-52 every workflow filtered by path | The test in §2 above | `test` |

## 11. Decisions that are not made in this file

Each of these was left open on purpose, and each needs a person.

- **The unit test runner.** No input names one. Choosing it is accepting a new dependency.
- **The exact wording of every sentence.** Brand voice is the owner's. `02-SPEC.md` §10 gives the
  rules the words must obey; the words themselves are not here.
- **What each of the ten verdict codes means.** The codes are in `01-contracts.md` §3, copied from
  `docs/200-product/001-photo-assessment/00-prd.md` §5.2. **The meanings stay in that file only**, so
  the two cannot drift, and the ten sentences in each language are written from there.
- **Any new dependency at all.** A library, a lint plugin, an image tool or anything the model may
  call goes to the owner first.
