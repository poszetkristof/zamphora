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

**Repositories — two, decided 2026-08-21**

1. `ai-factory` — the line, shipped as a Claude Code plugin. Its own repo, its own CI.
2. `zamphora` — the whole product: `apps/web`, `apps/api`, `packages/contracts`, `infra/`, `docs/`.

The split is by what can be reused, not by front end and back end. Web and API stay together
because **every coding agent indexes one repository**, and a border there hides who uses the code
the agent is changing. Separate CI and separate deploys do not need separate repos: path-filtered
workflows and one CDK stack per service give both.

The user asked three times for separate front-end and back-end repos. The answer is settled. The
evidence sits in `factory/feature.md`, where role 400 reads it — do not copy it back here.

**Still open for 400 Architecture:** how the product repo is arranged, whether it uses Turborepo, Nx
or plain npm workspaces, and the trigger for splitting further. It writes
`docs/ADR/0001-repository-layout.md`.

See [[factory-as-plugin]].

**Scope of this repository**

- It is a spec pack plus the factory that produces it. **No application code was written on
  purpose.** Code starts after `TASKS.md` exists.
- The one feature the line runs on is in `factory/feature.md`: photograph a plant that looks
  unwell, get an assessment and a next action.

**The name — decided 2026-08-19**

- **`zamphora`** — **Zam**ioculcas + Rhaphido**phora**, two of the user's houseplants. Both aroids,
  the same family as the monstera.
- `plantry`, `Monstera`, `Petiole`, `Meristem`, `Phloem` and the whole `Plant*` / `Leaf*` / `Bloom*`
  family are already taken. Do not re-propose them.
- Nothing was found using `zamphora`. **No trademark check was done** — USPTO and EUIPO classes 9
  and 42 are worth ten minutes before any public launch.

**Still open, and the user's to decide**

- Photo retention period.
- Whether notifications use Web Push (the current assumption) or something else.

See [[project-zamphora]].
