# zamphora

**A plant-care companion — and a working example of building software specification-first, with AI
writing the specifications into git before any code exists.**

The name comes from two houseplants: **Zam**ioculcas and Rhaphido**phora**. Both are aroids, the
same family as the monstera.

---

## There is no application code here yet. That is on purpose.

This repository is currently a **specification factory** and nothing else. The specs come first,
the backlog is generated from them, and the code is written against the backlog. Working the other
way round is what produces documentation nobody trusts.

**Current state:** the factory is wired and verified. No role has run yet, so `docs/` is empty.

```
/ai-factory:start      # → Next role to run: 100-consulting
```

The factory itself is not in this repository. It is a Claude Code plugin,
[`ai-factory`](https://github.com/poszetkristof/ai-factory), and `.claude/settings.json` turns it
on. That is why every command below carries the `ai-factory:` prefix.

---

## What the factory is

Eight AI agents, each with one job, run one after another. Each writes documents into its own
folder, and the next one reads them:

```
100          200        300      400            500           800      900         600
Consulting → Product → Design → Architecture → Engineering → Infra → Security → QA
```

Two rules make it work, and both exist to make a mistake **visible** instead of quietly patched:

- **Isolation** — a role reads only the files on its declared list. It cannot go looking for a
  missing fact, so it stops and says the fact is missing. That stop is the point.
- **Single writer** — every file has exactly one role allowed to create it.

Not number order: Infra runs before Security because Security reviews the deployment, and QA runs
last because a real test plan needs everything else already written.

### Two files control all of it

Both live in the `ai-factory` plugin repo, not here.

| File | Says |
| --- | --- |
| `factory/subagent-registry.yaml` | who exists, and what each role may **write** |
| `factory/handoff-map.yaml` | what each role may **read**, in what order, and when to stop and ask a human |

Every agent is **generated** from those two by `derive-agents.mjs` — no AI involved, 110 lines,
byte-identical every time. Edit the source, regenerate, never edit the output. The plugin's CI
enforces this.

---

## Layout

```
factory/          feature.md — this run's one feature — and the run cost limits
docs/             where the roles write, one folder per role
docs/learn/       the note that explains the whole method
docs/ADR/         decisions, each ending in an explicit "do not"
context/cold/     reasoning that only ever existed in a conversation
.claude/          rules, memory, this project's skills, settings
```

The line itself — the role contracts, the checks, the generated agents — is in the plugin repo.

`apps/`, `packages/` and `infra/` do not exist yet. **How this repository is arranged is role 400's
decision**, written up as `docs/ADR/0001-repository-layout.md` before anything is installed.

---

## Running it

These come with the plugin, and they read the real state off disk rather than trusting a document:

```
/ai-factory:start                     which roles have run, which is next, and the wiring check
/ai-factory:run-role 100-consulting   what one role may read, what is missing, then run it
/ai-factory:factory-run               start, resume or close a run
```

**A role that stops is not a failure.** It has found something an earlier role should have written
down, and the fix belongs in that earlier file — not in an answer typed into the chat.

---

## The idea, in one line

> **Files, not chats, are the unit of delivery.** If a decision mattered and it is not in a file,
> it did not happen.

The full explanation is one document: **[`docs/learn/ai-native-delivery.md`](docs/learn/ai-native-delivery.md)**.
Part one is the idea. Part two follows one complete run, from an empty folder to finished
specifications, explaining each term at the moment the run needs it.

`/ai-factory:learn` lists its sections before adding to it.

---

## Stack

Decided before the line ran, and recorded in `.claude/memory/decisions-made.md`:

| | |
| --- | --- |
| Web | Next.js (React) |
| API | Nest.js |
| Shared types | Zod schemas in `packages/contracts` — the only place a wire type is defined |
| Cloud | AWS, free account plan, everything in CDK |
| Model | Anthropic, behind an `LlmProvider` port so another provider is one adapter away |

**Cost is a correctness property here, not an accounting one.** The AWS free account plan cannot
send a surprise bill — it closes the account and takes the resources with it. So a runaway retry
loop is an availability incident. Everything is in CDK, in git, so a lost account is one deploy
from coming back.

---

## CI runs from the first commit

Before there is any code, CI already checks the thing that exists: the factory wiring, and that the
generated agents still match the contracts they came from. The build and test jobs wake up on their
own once a `package.json` appears.
