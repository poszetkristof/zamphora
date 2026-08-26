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

**Server Components** are covered by an integration test on the route. If a Server Component has
real logic, pull it into a plain function and unit-test that.

## Mocking and factories

`vi.mock` is hoisted, so anything it references comes from `vi.hoisted`.

```ts
const { getPlantMock } = vi.hoisted(() => ({ getPlantMock: vi.fn() }))
vi.mock("@/lib/api/plants", () => ({ getPlant: getPlantMock }))
```

A factory returns contract-valid data with overrides, so a schema change breaks every test at once:
`aPlant({ name: "Monstera" })`. A test states only the fields it cares about.

## Nest

**Service tests:** build the testing module, keep the service real, override only the repository
with `.overrideProvider(PlantsRepository).useValue(stub)`. Never the other way round.

**Integration tests:** a fresh local data store per file — real constraints, no repository mocks.
Use supertest against the compiled app, with the auth guard overridden to inject a role. The role
guard runs for real; it is the thing being tested.

```ts
expect(response.status).toBe(403)
expect(response.type).toBe("application/problem+json")
```

Every module needs: happy path, 400 with `errors[]`, 403, 404.

## AI calls

**No test ever calls a real model.** The `LlmProvider` port is stubbed, and the test checks what the
code does with the answer — especially the ugly cases:

- a response that does not match the schema → the endpoint errors, it does not guess
- a confident but wrong response → the confidence threshold routes it to "not sure"
- a timeout → the fallback runs and the user sees something useful

Model *quality* is not tested here. It is measured against the golden set in
`docs/600-qa/02-ai-evals.md`, in its own CI job.

## Writing the cases

Write a handful, expand them, then **force at least five negatives** — a generated suite is mostly
towards cases that pass. Vary test data across three or more fields. No real personal data: no real
photos, addresses or emails.

**A deleted test needs a reason.** CI blocks a pull request that removes a file under `tests/`
unless the commit message carries `DELETE_TESTS: <reason>`. Gutting a test in place passes that
gate — do not do it.

## Always covered

Route guards (allow, deny, error) · role checks on both sides · error masking on 5xx ·
problem+json shape with no stack leak · every care-task state change · session cleared on sign-out ·
Zod boundary values · every AI failure mode above.
