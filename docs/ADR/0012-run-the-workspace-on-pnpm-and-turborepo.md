# ADR-0012 — Run the workspace on pnpm and Turborepo

- **Status:** Accepted 2026-08-26
- **Date:** 2026-08-26
- **Supersedes:** the package manager sentence in
  [ADR-0001](0001-keep-one-product-repository.md). Everything else in ADR-0001 still stands: one
  repository, the six split-readiness rules, and the triggers to split further.

## Context

ADR-0001 chose **one repository with plain npm workspaces**, and rejected Turborepo and Nx as a
third new tool on a project already learning two. The one-repository half of that was right and is
untouched. The package manager half was not, for a reason inside ADR-0001 itself.

**ADR-0001 writes six split-readiness rules. Rule 3 is:**

> "Each app owns its `package.json` with its real dependencies listed. **Never rely on hoisting.**"

**npm workspaces cannot enforce that rule.** npm puts every dependency in one flat pile at the
repository root, and Node finds an import by walking up the folders. So `apps/web` can import a
package it never declared, as long as `apps/api` declared it. It works, the tests pass, CI is green —
until somebody removes the dependency from `apps/api` and the web app breaks for a reason nothing in
its own `package.json` explains. That is called a phantom dependency.

**pnpm blocks it.** Each package gets a folder holding only what that package declared. An undeclared
import fails on the first run, with a clear message. The rule stops being something to remember and
becomes something the tool checks.

The repository has **no application code yet**, so this change costs one command today and rises in
cost from here.

## Decision

**pnpm 11 as the package manager. Turborepo as the task runner. `@zamphora/*` as the package scope.**

### They are two different jobs

| Slot | Tool | Job |
| --- | --- | --- |
| Package manager | **pnpm** | Downloads packages, links the workspace together, writes the lock file |
| Task runner | **Turborepo** | Runs build, test and lint in dependency order, and skips what did not change |

pnpm replaces npm. Turborepo replaces nothing — the slot was empty. Every published repository
checked on 2026-08-26 fills both slots: cal.com uses Yarn with Turborepo, Novu uses pnpm with Nx, and
Turborepo's own `with-nestjs` example uses pnpm with Turborepo.

### The five rules that come with it

1. **`workspace:*` for every internal dependency.** Never a version range, never a relative path.
2. **`catalog:` for every dependency two or more packages share.** The version is named once in
   `pnpm-workspace.yaml`, and every package writes `"zod": "catalog:"`. This is what stops a version
   drifting apart between packages, and it is why there is no one huge `package.json`.
3. **`exports` in every package's `package.json`.** Node throws `ERR_PACKAGE_PATH_NOT_EXPORTED` on any
   subpath not listed, so one package cannot reach into another's internals.
4. **`allowBuilds` lists every package permitted to run an install script.** pnpm 11 blocks them by
   default, because an install script is the easiest way for a stolen npm account to read
   `~/.aws/credentials` on a developer machine.
5. **Package names are `@zamphora/*`.** Not `@repo/*`. ADR-0001 keeps open the option of publishing
   `contracts` to npm, and a scope appears in every import line, so it is expensive to change later.

### Two settings that trip people up

- **`.npmrc` is for the registry and login only now.** Every other pnpm setting moved into
  `pnpm-workspace.yaml`. A setting left in `.npmrc` is ignored in silence.
- **`onlyBuiltDependencies` was removed in pnpm 11.** It is `allowBuilds`. Advice written before
  April 2026 names a setting that no longer exists.

## Consequences

**What this buys.** Split-readiness rule 3 becomes enforced instead of remembered. One place to
change a shared version. A border between packages that Node itself checks. And Turborepo skips work
whose inputs did not change, which is the only thing `pnpm --filter` never does.

**What it costs, and the first one is sharp.** **Do not use `bundling.nodeModules` in AWS CDK's
`NodejsFunction`.** It is broken with pnpm 11 today: CDK writes an empty `pnpm-workspace.yaml` into
its build folder, which erases the `allowBuilds` list pnpm 11 requires, and the `beforeInstall` hook
runs too early to put it back
([aws-cdk issue 37898](https://github.com/aws/aws-cdk/issues/37898), open since 2026-05-16, checked
2026-08-26). The answer is to bundle everything with esbuild, which is what a Lambda wants anyway —
`03-flow.md` budgets 800 ms for a cold start, and a bundled function starts faster than one that
unpacks a large `node_modules`.

**Second cost: pnpm 11 needs Node 22 or newer.** The Lambda runtime and the CI image must both be on
Node 22.

**Third cost: TypeScript must be pinned to 6.** TypeScript 7.0 was released on 2026-07-08 as a
rewrite of the compiler in Go, and it is 8 to 12 times faster. It does not yet ship the stable
programmatic API that other tools use to ask the compiler about your code — that arrives in 7.1. So
`typescript-eslint@8.68.0` declares `typescript: ">=4.8.4 <6.1.0"` and its TypeScript 7 support issue
is closed as not planned (both read from the npm registry on 2026-08-26). Installing 7 would silently
disable every type-aware lint rule, which is most of the border enforcement above. **Pin
`typescript: 6.0.3` in the catalog. Revisit when typescript-eslint's peer range accepts 7.**

**Fourth cost: Turborepo has nothing to cache yet**, at four packages and a build measured in
seconds. It is adopted now anyway because the owner already knows it from previous work, adding it is
one `turbo.json` and a changed script line, and doing it before there is code avoids a migration
later. **If it turns out to earn nothing for six months, that is an acceptable outcome and not a
reason to remove it.**

**One caution for later.** Turborepo's own documentation discourages TypeScript project references,
while Nx recommends them. So "use Turborepo" and "add project references" are two directions, not two
steps.

## Alternatives considered

**Keep plain npm workspaces.** Rejected. It cannot enforce ADR-0001's own rule 3, it has no catalog,
and it has no filtering. The only argument for it was familiarity, and pnpm is a command name change,
not a new mental model.

**pnpm with no task runner, adding Turborepo later on a measured trigger.** Rejected, narrowly, and
it was the closest call. It is the correct answer for someone who does not know Turborepo, because
caching earns nothing at this size. It loses here because the owner has used Turborepo on a previous
project, so the learning cost that made ADR-0001 reject it does not apply.

**Nx.** Rejected. It is a build platform rather than a task runner — plugins, generators, its own
workspace model — and that is a real thing to learn on a project already learning Nest.js and AWS.
Nx also sells a product whose job is to hide repository borders from coding agents, which is a tool
bought to undo a border this project is not creating. The owner has no experience with it, and that
settles it.

**Yarn.** Rejected without much argument. Its strict mode is Plug'n'Play, which changes how module
resolution works and breaks tools that expect a real `node_modules`. pnpm gets the same strictness
with an ordinary folder layout.

**`@repo/*` as the scope.** Rejected. It is Turborepo's convention and copies from their examples
without renaming, but it is deliberately never publishable, and ADR-0001 keeps publishing
`contracts` open.

## Agent-Readable Summary

> This repository is a **pnpm 11 workspace** with **Turborepo** as the task runner, and every
> internal package is named `@zamphora/*`. Do not run `npm install` or `yarn`, and do not commit a
> `package-lock.json` or a `yarn.lock`. Do not put a version range on an internal dependency — it is
> always `workspace:*`. Do not name a shared dependency's version inside a package's
> `package.json` — put it in the `catalog:` in `pnpm-workspace.yaml` and write `"catalog:"`. Do not
> publish a package without an `exports` field. Do not put a pnpm setting in `.npmrc`; it belongs in
> `pnpm-workspace.yaml`. Do not install TypeScript 7 — the catalog pins `6.0.3`, because
> typescript-eslint cannot run on 7 yet. Do not use `bundling.nodeModules` in a CDK `NodejsFunction`;
> bundle with esbuild instead. Do not add Nx.
