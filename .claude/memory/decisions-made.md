---
name: decisions-made
description: Human decisions already taken for this project — do not re-ask these, and do not quietly change them.
metadata:
  type: project
---

Taken by the user on 2026-08-18. A fresh session should read these as settled, not as open
questions. Changing one is a human decision and needs an ADR.

**Stack**

- Next.js (React) for the web, **Nest.js** for the API, shared Zod contracts in
  `packages/contracts`.
- Chosen over staying with Vue + Express for two reasons, and the second one is the honest one:
  Nest is what senior backend interviews ask about (dependency injection, modules, guards), and the
  user wanted the biggest learning gap from their previous project.
- Anthropic API as the default model provider, behind an `LlmProvider` port so another provider is
  one adapter away.

**The line**

- Eight roles: `100 → 200 → 300 → 400 → 500 → 800 → 900 → 600`.
- **No Data role (700) and no Delivery role (1000).** One developer does not need a delivery
  manager agent, and data design belongs inside 400 Architecture.

**Repositories — decided 2026-08-19, after research**

- **One repository for the product.** `apps/web`, `apps/api`, `packages/contracts`, `infra/`,
  `docs/` (including `docs/learn/`), `factory/` and `.claude/` all together.
- The user pushed hard for separate front-end and back-end repos, so do not treat this as a casual
  default. What settled it: Cal.com runs the same Next.js + Nest.js pairing in one repo; a shared
  package can be published to npm from inside a monorepo using Changesets, so no second repo is
  needed for `packages/contracts`; Uber runs thousands of services from a few monorepos, so future
  microservices do not require a split; and no public example was found of a known product
  splitting a Next.js front end from its own back end with a published reason.
- **Reuse of the factory is a template repository**, not a Claude Code plugin. A plugin cannot
  carry `factory/*.yaml`, the slot contracts, the permission lists or `CLAUDE.md`, and it has no
  install step — so it would ship the *generated* agents frozen while their source YAML lived in
  the project. That breaks the single-source-of-truth rule `derive-agents.mjs` exists to protect.
- **Still open for 400 Architecture:** how the one repo is arranged, and the trigger that would
  justify splitting later. It writes `docs/ADR/0001-repository-layout.md`. The research is in
  `factory/feature.md`.

**Scope of this repository**

- It is a spec pack plus the factory that produces it. **No application code was written on
  purpose.** Code starts after `TASKS.md` exists.
- The one feature the line runs on is in `factory/feature.md`: photograph a plant that looks
  unwell, get an assessment and a next action.

**The name — decided 2026-08-19**

- **`zamphora`**. Built from two of the user's own favourite houseplants: **Zam**ioculcas
  (`legénypálma`, the ZZ plant) + Rhaphido**phora** (the mini monstera). Their third favourite,
  Monstera, is in the same family — all three are Araceae, the aroids.
- The earlier placeholder `plantry` was dropped because a product of that name already exists.
  `Monstera`, `Petiole`, `Meristem`, `Phloem` and the whole `Plant*` / `Leaf*` / `Bloom*` family
  were checked and rejected for the same reason.
- Web search found nothing using `zamphora`. **A formal trademark check was not done** — USPTO and
  EUIPO classes 9 and 42 are still worth ten minutes before any public launch.

**Still open, and the user's to decide**

- Photo retention period.
- Whether notifications use Web Push (the current assumption) or something else.

See [[project-zamphora]].
