# ADR-0001 — Keep one product repository

- **Status:** Accepted. **The package manager half is superseded by
  [ADR-0012](0012-run-the-workspace-on-pnpm-and-turborepo.md)**, 2026-08-26
- **Date:** 2026-08-25
- **Corrected 2026-08-31:** the Agent-Readable Summary named ADR-0012 and then still said *"Do not
  add Turborepo or Nx"* in the next sentence. Turborepo is the task runner and is in use, so that
  clause told an agent to remove it. The clause now says Turborepo stays and only Nx is refused.
  Nothing had been built on the old text, so this record is corrected rather than superseded.

## Context

Two repositories are already decided (`factory/feature.md`, 2026-08-21): `ai-factory` holds the line
and ships as a plugin, `zamphora` holds the product. **How `zamphora` is arranged inside is open**,
and so is whether it uses Turborepo, Nx or plain npm workspaces.

The research that came with the question, in `factory/feature.md`:

- Cal.com runs a Next.js app and a **Nest.js** API in one repository with shared packages. It is the
  closest public match to this stack.
- Shopify consolidated into one repository in 2024 and gave an AI-native reason: *"code is going to
  be increasingly written with AI, and our infrastructure needs to be the substrate for that."*
- A shared package can be published to npm from inside a monorepo. tRPC does it with Changesets and
  the `workspace:*` protocol. A second repository is not needed to make `packages/contracts` usable
  by an outside project.
- **Every coding agent indexes one repository.** A repository border stops the agent seeing who uses
  the code it is changing, needs several pull requests for one change, and resets its context.
- The measured cost of the split: **4 to 6 pull requests** per change that crosses the wire.
  Cloudflare published four per change before automating it down to one.
- Block, Proton, Airbnb and Uber all published moves toward fewer repositories. **No first-party
  engineering post was found going the other way and calling it a win.**
- Mercari found remote caching gave little benefit on a repository with no internal package
  dependencies.
- AWS CDK guidance warns that several CDK apps on one pipeline means a change to one deploys all of
  them. The answer is path-filtered workflows and one stack per service.

The project has one part-time developer. Most changes in this feature cross the wire: a field on the
assessment answer touches `packages/contracts`, `apps/api` and `apps/web` in one commit.

## Decision

**One repository, `zamphora`.**

> **Superseded in part, 2026-08-26.** This record originally said "with plain npm workspaces. No
> Turborepo and no Nx." That half is replaced by
> [ADR-0012](0012-run-the-workspace-on-pnpm-and-turborepo.md): **pnpm 11 and Turborepo**, package
> scope `@zamphora/*`. The reason is inside this record — rule 3 below says never rely on hoisting,
> and npm workspaces cannot enforce that. **Nx is still rejected.** Everything else here stands: one
> repository, the six rules, and both triggers.

```
apps/web            Next.js. Screens, both languages, no credentials, no data store
apps/api            Nest.js. Sessions, ownership, the daily limit, the kill-switch, the model call
packages/contracts  Zod schemas for everything that crosses the wire
packages/llm        The LlmProvider port and the one Anthropic adapter
infra/              CDK. One stack per deployable unit
docs/ ADR/ factory/ TASKS.md
```

**The six split-readiness rules from `factory/feature.md` are adopted as written**, and 500
Engineering carries them into `docs/500-engineering/00-conventions.md`:

1. No relative import crosses an app border.
2. `packages/contracts` is imported by package name only, never by relative path.
3. Each app owns its `package.json` with its real dependencies listed. Never rely on hoisting.
4. Each app builds from its own folder. `cd apps/api && pnpm build` works on its own.
5. Each service gets its own CDK stack, so deploy borders exist from day one.
6. CI is path-filtered per app from the first workflow file.

**The trigger to split further**, as a checkable condition and not a feeling. Split when **one** of
these becomes true, and not before:

- A second person owns one side of the product.
- A service is written in a language other than TypeScript, so the Zod contracts give it nothing.
- CI on a pull request passes **15 minutes** (NFR-51 sets the watch line at 10).

**The trigger to add Turborepo:** more than six workspace packages, or CI past 10 minutes with
caching identified as the fix. Not before.

## Consequences

**What this buys.** One pull request per change instead of four to six. One index for a coding
agent, which is the tool actually doing much of the work here. No second npm registry step to make
`packages/contracts` usable. No build tool to learn on top of Nest.js and AWS, both of which are
already listed as new ground in `00-context-brief.md` §5.3.

**What it costs.** Everything shares one CI budget on a free personal account, so rule 6 is not
optional — without path filters, a change to a document runs the whole pipeline. A careless relative
import across an app border is easy to write and cheap to fix now and expensive to fix later, which
is why rule 1 belongs in the linter and not in a review comment. And `apps/api` and `apps/web` can
drift into sharing a helper that should have been a package.

**What it does not cost.** Splitting deployment units. Uber runs thousands of services out of a few
repositories. Rule 5 gives each unit its own CDK stack from day one, so the deploy border exists
whether or not the repository border ever does.

## Alternatives considered

**Three repositories: web, api, contracts.** Rejected. It is the shape with the published measured
cost — 4 to 6 pull requests per wire change — and no first-party post was found calling it a win.
For one part-time developer, that cost is the whole schedule.

**One repository with Turborepo.** Rejected for now, not forever. It worked for the owner on a
previous project, but that project was several front-end packages, which is the case Turborepo is
best at. Here there are two apps and two packages. Mercari's finding is the closest evidence and it
points the same way. The trigger above brings it back.

**One repository with Nx.** Rejected. It brings a plugin system and a workspace model that would be
the third new tool on a project already learning two. Nx also sells Polygraph, whose job is to hide
repository borders from agents — buying a tool to undo a border this ADR is not creating.

## Agent-Readable Summary

> The product lives in one repository, `zamphora`. **The package manager and task runner are in
> ADR-0012: pnpm and Turborepo.** Turborepo is in use today — do not remove it, and do not add Nx.
> Do not
> write a relative import that crosses an app border, and do not import `packages/contracts` by
> relative path — always by package name. Do not create a second repository for a shared package or
> for a new service; add a workspace package and a CDK stack instead.
