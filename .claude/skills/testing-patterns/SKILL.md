---
name: testing-patterns
description: Vitest conventions for this repo — colocation, React Testing Library queries, vi.hoisted mocking, Nest testing module, supertest, and how AI calls are stubbed. Load when writing, editing or debugging any *.test.ts or *.test.tsx file.
---

# Testing patterns

Full reference: `docs/600-qa/00-test-plan.md`.

## Layout

Tests sit next to the code: `PlantCard.tsx` + `PlantCard.test.tsx`. Anything crossing HTTP or the
data store is `*.integration.test.ts`. Shared helpers in `src/test/`. `globals` is off — import
`describe`, `it`, `expect`, `vi` from `"vitest"`.

## Rules that apply everywhere

- Test behaviour, not implementation. **Never assert on internal state.** Assert on what the user
  would see.
- No `if` in a test. That is two tests — use `it.each`.
- Name tests as sentences: `it("shows the retry button when the assessment fails")`.
- Never mock the thing under test. Mock at the boundary you own: `@/lib/api/plants`, never `fetch`.
- Assert on `status` and `code`, never on message strings — messages are copy, and translated.

## React components

Query by role, then label, then text. **Never by a Tailwind class.** Use `userEvent`, not
`fireEvent`.

```tsx
await userEvent.click(screen.getByRole("button", { name: "Mark as watered" })) // yes
container.querySelector(".flex.gap-2") // never
```

`await` the cause, not a timer. Prefer `findBy*` over `waitFor` plus `getBy*`. For a loading state,
hold a promise and resolve it by hand instead of racing a timer.

Stub a Base UI primitive only when it fights jsdom (portals, pointer capture). If the test is about
focus trapping it belongs in the integration tier, or is not worth writing.

**There is no server component with request-time logic, because there is no server** (ADR-0010).
`apps/web` is a static export: the build produces files, and every screen paints its shell and then
fetches in the browser. So there is no route to run an integration test against. Test the screen with
React Testing Library against a stubbed `@/lib/api/*`, and cover the journey end to end with
Playwright, which is where a real route is exercised. If any component holds real logic, pull it into
a plain function and unit-test that.

## Mocking and factories

`vi.mock` is hoisted, so anything it references comes from `vi.hoisted`.

```ts
const { getPlantMock } = vi.hoisted(() => ({ getPlantMock: vi.fn() }))
vi.mock("@/lib/api/plants", () => ({ getPlant: getPlantMock }))
```

A factory returns contract-valid data with overrides, so a schema change breaks every test at once:
`aPlant({ name: "Monstera" })`. A test states only the fields it cares about.

## Nest

**Read this first if dependency injection fails in a test.** `apps/api/vitest.config.ts` must carry
these four lines, or Nest cannot see the types behind `@Injectable()` and every constructor injection
breaks (ADR-0013):

```ts
oxc: { decorators: { legacy: true, emitDecoratorMetadata: true } }
```

The error looks like a wiring mistake — "Nest can't resolve dependencies of…" — so it costs an hour
before anyone suspects the config. Vite 8 handles decorators natively; no `unplugin-swc` and no
`@swc/core` belong in this repo.

**Service tests:** build the testing module, keep the service real, override only the repository
with `.overrideProvider(PlantsRepository).useValue(stub)`. Never the other way round.

**Integration tests:** a fresh local data store per file — real constraints, no repository mocks.
Use supertest against the compiled app, with the auth guard overridden to inject a role. The role
guard runs for real; it is the thing being tested.

```ts
expect(response.status).toBe(403)
expect(response.type).toBe("application/problem+json")
expect(response.body.code).toBe("not-signed-in")   // branch on code, never on type
expect(response.body.status).toBe(response.status) // the two must agree
```

The envelope is RFC 9457: `type`, `title`, `status`, `detail`, plus `code` and `retryHint` as
extension members. Full shape in `docs/500-engineering/01-contracts.md` §8.

Every module needs: happy path, 400, 403, 404. **Every failing case also asserts `retryHint`**,
because it decides whether a try-again button is drawn (US-09 AC-1) — a wrong hint is a wrong screen,
not a wrong string.

## AI calls

**No test ever calls a real model.** The `LlmProvider` port is stubbed, and the test checks what the
code does with the answer — especially the ugly cases:

- **A response that does not match the schema** → `answer-unreadable`. The endpoint fails; it never
  guesses and never treats a broken answer as a verdict.
- **The band is `unsure`** → the advice is shown, and **no care task is written without an explicit
  yes** (`confirmedUnsure`, NFR-31). **There is no confidence number and no threshold anywhere** —
  the band is a word the model returns, and a percentage must never reach a screen. A test that
  needs a threshold is asking you to build a forbidden feature.
- **A timeout** → `provider-timeout`, `retryHint: 'may-work'`, and a screen with a try-again button
  the **person** taps. **Nothing retries by itself.**

**Assert the provider was called exactly once — in every failure case.** Timeout, 429, 503, refusal,
truncation, bad request, empty balance, rejected photo. That count *is* the test for NFR-04, and it
is the most important assertion in this repo: one model call per assessment, whatever goes wrong
(NFR-05 requires zero retries, and the client is built with `maxRetries: 0`).

**The cost properties are testable, and they are the ones that can end the project:**

- The 11th assessment in a day is refused **with no provider call**, and **ten parallel requests give
  exactly ten successes** — a read-then-write lets all ten read 9 and all ten proceed (NFR-12).
- The order in `03-api-spec.md` §4 is the specification: the limit is counted **before** the model
  call, so a failed call still counts, and **before** the photo is written, so a refused request
  leaves no object. Both are easy to get backwards.
- Flip the kill-switch row, wait past `CONFIG_CACHE_MS`, assert the provider is not called (NFR-34).
- The cost is computed from the `usage` block the API returns, never from an estimate, and stored as
  a whole number of millionths of a dollar (NFR-10).

Model *quality* is not tested here. It is measured against the golden set by 600 QA, in its own job.

## Writing the cases

Write a handful, expand them, then **force at least five negatives** — a generated suite is mostly
towards cases that pass. Vary test data across three or more fields. No real personal data: no real
photos, addresses or emails.

**A deleted test needs a reason.** CI blocks a pull request that deletes any file matching
`*.test.ts`, `*.test.tsx` or `*.integration.test.ts`, unless the commit message carries
`DELETE_TESTS: <reason>`. **The rule matches file names, not a `tests/` folder** — tests are
colocated here, so no test file ever lives in one and a folder rule would match nothing. Gutting a
test in place passes the gate — do not do it.

## Always covered

Route guards (allow, deny, error) · role checks on both sides · error masking on 5xx ·
problem+json shape with no stack leak · every care-task state change · session cleared on sign-out ·
Zod boundary values · every AI failure mode above.
