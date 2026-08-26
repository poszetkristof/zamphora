# CLAUDE.md

@.claude/memory/MEMORY.md

The **hot layer**: loaded every session, so it stays short. Detail lives in `docs/`.

## Start here

**Run `/ai-factory:start` at the beginning of every session.** It reads the real state off disk and
names the one next action. Do not guess the state from this file.

The line lives in the **`ai-factory` plugin**, not in this repo. That is why every command carries
the `ai-factory:` prefix. `.claude/settings.json` turns it on.

Three things are already loaded — never re-ask what they answer:

- **Rules** — this file.
- **Facts** — `.claude/memory/`. Who the user is, what the app is, what is already decided.
- **State** — the files on disk, which `/ai-factory:start` reads for you.

If the user wants to understand the process rather than run it, it is one note:
`docs/learn/ai-native-delivery.md`.

## What this is

`zamphora` — a plant-care companion. It remembers what each houseplant needs and when, and it can
assess a photo of a sick plant and turn the advice into a scheduled task. Phone first, several
languages.

**Files, not chats, are the unit of delivery.** If a decision mattered and is not in a file, it did
not happen.

```
docs/            The specs, one folder per role. docs/context/stack.md first
docs/ADR/        Decisions. Each ends in an instruction you must follow
factory/         feature.md (this run's one feature) and the cost limits. The line itself is
                 the ai-factory plugin, in its own repo
docs/learn/       Two notes. ai-native-delivery.md is the method; monorepo-architecture.md is the
                 repository shape. Keep both current
apps/            web (Next.js) and api (Nest.js)
packages/        contracts (Zod) and anything else shared
infra/           CDK
TASKS.md         The implementation backlog
specs/<feature>/ Per-feature spec, plan and nfr.yml, written at the start of an epic
```

## Language — chat included

The user is not a native English speaker and reads at B1 level. Write every sentence for that
reader: chat, comments, commit messages, documents.

- Short sentences. One idea each. Common words. Explain a term the first time it appears.
- No idioms, no metaphors, no rhetorical questions.
- **Write "you", never "u".** No chat shorthand in anything written for them.
- **Simple phrasing never means less information.** Do not drop a fact to shorten a sentence — use
  two sentences.
- Be concise. Say the key thing and stop. No preamble, no long code block where a path and a line
  number would do.

**Banned words**, in chat and in files. Re-read every draft once and hunt for them:

> nuance · granular · resolvable · leverage · robust · salient · corollary · load-bearing ·
> falsifiable · plateau · stall · lineage · seed (as a verb) · artefact

**The 6-month test.** The user re-reads these files in six months having forgotten the conversation.
A list of correct facts with no opening sentence of context fails it. So does a section too short to
rebuild the idea from. And a document never talks **to** the user — no "as you asked", no "correct!".

## Two ways to work

**Building?** Load `ai-factory:spec-driven-tasks`, open `TASKS.md`, work the next unblocked task.
`/ai-factory:next-task` is the short way in. Stop at every checkpoint.

**Writing specs?** That is a factory run. `/ai-factory:factory-run` shows the state,
`/ai-factory:run-role` runs one role. One role per invocation, then stop.

**Either way, finish by writing the note.** Work is done when the learning notes explain it, not
when the file is saved. Run `/ai-factory:learn`. See
`.claude/memory/keep-learning-notes-current.md`.

## Before writing code — read the spec section that covers it

Do not infer the design from surrounding code; it may not exist yet.

| Working on | Read |
| --- | --- |
| Anything at all | `docs/context/stack.md` |
| Any `.ts` / `.tsx` | `docs/500-engineering/00-conventions.md` |
| The web app | `docs/500-engineering/02-web-spec.md` |
| **A screen** | `docs/300-design/<slug>/02-SPEC.md` is the contract. Then open `docs/design-preview.html` to see what it should look like — the mockup is a **reference**, so where the two disagree the spec wins |
| The API | `docs/500-engineering/03-api-spec.md` |
| Anything crossing the wire | `docs/500-engineering/01-contracts.md` |
| Tests | `docs/600-qa/00-test-plan.md` |
| Anything under `infra/` | `docs/800-infra/` |
| Auth, uploads, user input, AI calls | `docs/900-security/02-mitigations.md` |
| "Why is it like this?" | `docs/ADR/` |

## Hard rules

- **Do only what was asked.** No opportunistic refactoring, no drive-by tidying. Spot a real problem
  outside scope? One sentence, then keep going.
- **No wire type outside `packages/contracts`.** Writing `type PlantResponse = {…}` in an app? Stop.
- **No bare string literals** for route names, roles, task kinds, statuses or analytics labels.
- **No `enum`, no `interface`, no `any`** outside test files.
- **Every model call goes through `LlmProvider`.** No SDK import outside its adapter.
- **Tests ship with the change.** CI blocks a pull request that deletes a test file unless the
  commit message says `DELETE_TESTS: <reason>`.
- **An ADR outranks your judgement.** Each ends in an instruction with an explicit "do not". If a
  change would contradict one, stop and name it — do not write the code and mention it after.
- **Update the doc in the same change that makes it necessary.** A stale `docs/` is worse than a
  thin one, because it is trusted.
- **Never change the line from this repo.** The roles, the handoff map and the slot contracts live
  in the `ai-factory` plugin repo. Edit them there, run `derive-agents.mjs` there, bump the version,
  push. Editing a generated agent anywhere is always wrong.
- **Comments: two lines maximum.** Plain English, explain _why_, never _what_. No commented-out
  code, no `TODO`. Longer explanations go in `docs/` or an ADR.
- **Never `git commit` or `git push`** unless told to. "Write a commit message" means output text.

## Decisions that are never yours

Stop and ask. Recording the question is the right outcome, not guessing well.

What gets built and when it ships · accepting any risk, security or architectural or cost · spending
money · deploying anything · owning the kill-switch · what counts as personal data and how long it
is kept · accepting a new dependency or a new tool the model may call · reversing an accepted ADR ·
the final merge and the release go/no-go.

## Cost is a correctness property

This runs on the AWS free account plan. It cannot send a surprise bill — it **closes the account**
instead and takes the resources with it. A runaway retry loop is an availability incident, not an
accounting one. Everything is in CDK, in git, so a lost account is one deploy from coming back. See
`docs/800-infra/02-cost-guardrails.md`.

## Commands

```bash
pnpm dev / build / test / lint / format / type-check
```

The factory scripts moved into the plugin. Reach them through the commands, not by path:

```
/ai-factory:start        which roles have run, what stage the project is in, the one next action
/ai-factory:factory-run  start, resume or close a run
/ai-factory:run-role     run one role, with only its declared inputs
/ai-factory:next-task    the next unblocked task from TASKS.md
/ai-factory:spec-check   where the code and the specs no longer agree
/ai-factory:learn        write the note
```

Before saying a change is done, run each of these and **check its exit code** — never call a run
green from the tail of the combined output:

```bash
pnpm format:check && pnpm lint && pnpm type-check && pnpm test
```
