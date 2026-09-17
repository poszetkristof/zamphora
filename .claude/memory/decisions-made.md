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
- Chosen over staying with Vue + Express. Express gives no structure, so every project invents its
  own; Nest brings dependency injection, modules and guards, which is the ground the user wants to
  learn. It was also the biggest gap from their previous project, which is the point of building
  this one.
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

**Answered on 2026-08-25 and 2026-08-26, so do not re-ask it.** How the product repo is arranged is
`docs/ADR/0001-keep-one-product-repository.md`, with the six split-readiness rules and the trigger
for splitting further. The workspace tool is **pnpm 11 plus Turborepo** in
`docs/ADR/0012-run-the-workspace-on-pnpm-and-turborepo.md`, which replaces ADR-0001's
package-manager sentence. **Nx is rejected and stays rejected.**

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

**The running shape — Option E, decided 2026-09-17 (gate 72, ADR-0014 to ADR-0016)**

- The assessment runs in the background. The API answers `202` in about a second, a Step Functions
  Standard workflow makes the model call in its own `assess` function, and a `watch` function pushes
  the result to the phone over server-sent events. The 30-second promise is kept by the waiting
  screen; the result arrives inside 60 seconds.
- A retry of the model call is allowed again, at most 2 more tries, only inside the workflow, only
  on a timeout, a 429 or a 503. An attempt is refunded only when no call was made.
- The grown shape for runs 2 to 6 is approved too: two EventBridge Scheduler rules, Web Push, SES,
  one secondary index. Not Option F, not DynamoDB Streams, not direct upload, not containers.
  `docs/400-architecture/08-async-options-short.md` §8 draws it. Do not re-open E against F.

**The security positions, decided 2026-09-17 (gates 65, 66, 68, 73)**

- **The photo goes to Anthropic outside the EU and that is accepted for run 1.** One account, and it
  is the owner's. The trigger to re-open is the day a second person's photo enters the product — the
  same trigger as the EU AI Act position and the availability target.
- **Nothing is deleted automatically in run 1.** The 11-month warning and the 12-month deletion of
  an idle account both move to run 3. A DynamoDB time-to-live cannot do it: it deletes one item and
  would orphan the rest of the account.
- **Accepted photo formats are JPEG, PNG and WebP.** `image/gif` is out.
- **`sharp` is external in the CDK bundle and copied in by an `afterBundling` hook**, together with
  `node_modules/@img`. esbuild cannot bundle a native module and `bundling.nodeModules` stays banned.

**Still open, and the user's to decide**

- Three security gates: 64 (how much web reach a research role gets), 69 (a named contact for every
  residual risk), 71 (multi-factor sign-in on the AWS account). 69 and 71 are hard stops before the
  first deploy.
- Whether notifications use Web Push (the current assumption) or something else.

*(The photo retention period is decided: 180 days, 2026-08-24.)*

See [[project-zamphora]].
