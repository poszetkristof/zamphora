# ADR-0013 — Run every test on Vitest, in all three packages

- **Status:** Accepted 2026-08-26
- **Date:** 2026-08-26
- **Decided by:** the owner, gate 33. Accepting a dependency is never the model's call.

## Context

A **test runner** is the program that finds your test files, runs them, and tells you what passed.
Nothing in any specification named one. `06-nfrs.md` names Playwright for whole-journey tests,
`size-limit` for bundle size and CDK assertions for infrastructure — and most requirements point at
a job simply called `test`, which nothing ran.

The choice matters more than usual here because the repository holds three different kinds of code:
`apps/web` renders React in a browser, `apps/api` is Nest.js on a server, and `packages/contracts`
is plain TypeScript. A runner has to serve all three, or the project keeps two of them.

**The historic reason not to use Vitest with Nest.js was real, and it is gone.** Nest.js leans on
decorators — the `@Injectable()` and `@Controller()` lines above a class — and on the type
information TypeScript writes out beside them. That is how Nest knows what to hand a constructor.
Vitest could not produce that information without an extra compiler plugin, so Nest projects on
Vitest carried `unplugin-swc` and `@swc/core` as a workaround.

**Vite 8, released 2026-03-12, fixed it.** From the release announcement: *"Vite 8 now has built-in
automatic support for TypeScript's `emitDecoratorMetadata` option, removing the need for external
plugins."*

## Decision

**Vitest is the test runner for every package.** One runner, three small configuration files.

| Package | Environment | Extra configuration |
| --- | --- | --- |
| `apps/web` | `jsdom` | the React plugin |
| `apps/api` | `node` | the four-line decorator block below |
| `packages/contracts` | `node` | none |

The block `apps/api` needs, which is the whole of the old problem:

```ts
export default defineConfig({
  oxc: { decorators: { legacy: true, emitDecoratorMetadata: true } },
  test: { environment: 'node' },
})
```

**Versions, read from the npm registry on 2026-08-26:** `vitest` **4.1.11**, `vite` **8.2.2**.
Vitest 4.1.11 declares `node: ^20 || ^22 || >=24`, so it runs on the Node 22 that ADR-0012 pins.

**Each package owns its own config, rather than one shared "projects" file.** Turborepo's own
documentation gives both shapes and says of the shared one: *"any change in any package will result
in a cache miss."* Per-package configs are what lets Turborepo skip work, which is the reason
ADR-0012 adopted it.

**No `unplugin-swc`, no `@swc/core`, no `ts-jest`, no Babel.** If any of those appears in a
`package.json`, something has gone wrong — read the trigger section below before adding it.

## Consequences

**What this buys.** One runner, one way to write a test, one command. For one part-time developer
learning Nest.js, a single mental model is worth more than a marginally better fit per package. It
also matches `.claude/skills/testing-patterns/SKILL.md`, which already documents Vitest conventions
in this repository — choosing anything else would have meant rewriting a skill that already exists.

**It is where Nest.js is going, which is the strongest reason.** The framework's own repository
(`nestjs/nest`) runs Vitest 4.1.11 and has **no Jest at all**. `nestjs/event-emitter` runs Vitest
4.1.11 with Vite 8.2.2 and no swc plugin — that is where the four-line block above was copied from.
Nest 12's release plan says all repositories and sample projects move to Vitest.

**What it costs, and this is a real cost.** **The documented path still points at Jest.** `nest new`
scaffolds Jest today. `docs.nestjs.com/fundamentals/testing` says *"Jest is provided as the default
testing framework"* and does not mention Vitest anywhere. Every Nest.js tutorial published in 2026
shows `jest.config`. So when a test breaks late at night, the search results will not match this
setup, and Vitest-with-Nest is currently learned from a framework repository's config file rather
than from a documentation page. `00-context-brief.md` §5.3 asks for the documented path over the
clever one, and **this decision goes the other way on purpose**: the Nest documentation page is
behind the Nest source code, and the maintainers deleted Jest from their own repository.

**A second cost, small and named.** Vitest does not type-check while it runs. Types are checked by
`npm run type-check`, which is a separate job. A test can pass with a type error in it.

**A third cost.** Next.js documents one limitation: Vitest cannot unit-test `async` Server
Components. This project's web app is a static export with no server components of that kind, so it
does not bite today. If it ever does, the answer is Playwright, which is already in `06-nfrs.md`.

## Alternatives considered

**Jest for `apps/api`, Vitest for `apps/web`.** Rejected, and it was the closest call. This is what
**cal.com** does today — the same Next.js plus Nest.js plus Turborepo shape as this project, running
Vitest 4.1.8 at the root and Jest 29.7.0 with `ts-jest` inside `apps/api/v2`. It is the honest state
of the field: front ends have moved, Nest.js code lags. It lost because two runners means two
config formats, two mocking APIs and two sets of search results for one developer.

**Jest everywhere.** Rejected. It is the documented path for Nest.js and Next.js documents it too,
so this was a defensible answer. It loses on direction: adopting the thing the framework is
migrating away from means paying for the migration later, on a repository that has no tests yet and
therefore nothing to migrate today. **Doing it now is free. Doing it in a year is not.**

**Node's own built-in runner, `node:test`.** Rejected on a fact, not a preference. Node's
documentation states that decorators are a TC39 proposal, are not transformed, and produce a parser
error; the older `experimentalDecorators` form is unsupported because it needs a code transform
rather than type removal. Nest.js tests cannot run under it without adding a compiler back, which
removes the only reason to use it. It also has no browser or JSX story for `apps/web`.

## Agent-Readable Summary

> Every test in every package runs on **Vitest 4** with **Vite 8**, each package holding its own
> `vitest.config.ts`. `apps/api`'s config must contain
> `oxc: { decorators: { legacy: true, emitDecoratorMetadata: true } }` or Nest.js dependency
> injection fails at run time. Do not install Jest, `ts-jest`, `@swc/jest`, Babel, `unplugin-swc` or
> `@swc/core` — Vite 8 handles decorators without them. Do not use a single shared Vitest "projects"
> file; per-package configs are what let Turborepo cache. Do not rely on the test run to check
> types — that is `npm run type-check`. Playwright stays the tool for whole-journey tests (NFR
> table); this ADR is about unit and integration tests only.
