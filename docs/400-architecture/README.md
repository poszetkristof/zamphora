# Architecture — what to read, and in what order

**Written 2026-08-25 by 400 Architecture. Updated 2026-08-26 with the owner's decisions, and
2026-09-17 when the owner chose the background assessment, Option E.**

This folder says how zamphora is built and why. **Read it in the order below.** Each file assumes
the one above it.

## The reading order

| # | File | What it answers |
| --- | --- | --- |
| 1 | [`00-options.md`](00-options.md) | What shape is this system, what else was on the table, and how the choice changed on 2026-09-17 (§11) |
| 2 | [`08-async-options-short.md`](08-async-options-short.md) | The current shape, drawn, and the shape grown to run 6 |
| 3 | [`01-context.mmd`](01-context.mmd) | Who talks to the product, and what does it depend on? |
| 4 | [`02-containers.mmd`](02-containers.mmd) | What is inside, and what talks to what? |
| 5 | [`05-patterns.md`](05-patterns.md) | The thirteen shapes the code repeats |
| 6 | [`001-photo-assessment/03-flow.md`](001-photo-assessment/03-flow.md) | Where the seconds go, step by step |
| 7 | [`06-nfrs.md`](06-nfrs.md) | The numbers, and the test that checks each one |
| 8 | [`../ADR/`](../ADR/README.md) | Sixteen decisions, each ending in a "do not" |
| 9 | [`001-photo-assessment/07-adversarial.md`](001-photo-assessment/07-adversarial.md) | What a fresh session found wrong in run 1. A record, written against Option A |
| — | [`08-async-options.md`](08-async-options.md) | Every checked fact and link behind §11 of the options file. A reference; nobody needs to re-read it |

**In a hurry?** Read 1, then 2, then 5. That is the shape, its picture, and the rules.

**About to write code?** Read the ADR for what you are touching. Each one ends in an instruction with
an explicit *do not*, and `CLAUDE.md` says an ADR outranks your judgement.

**Number 8 is a record, not a to-do list.** It is what a session that saw only this folder said would
go wrong. Its section 0 says which findings are now fixed and who owns the rest.

## Where each idea is explained once

Several ideas turn up in five files. **Each one is explained in full in exactly one place**, and
everywhere else is one sentence and a pointer. This table says which place.

| Idea | Explained in full in |
| --- | --- |
| Why serverless and key-value, and what lost | `00-options.md` §5 and §6 |
| The eleven questions the data must answer | `00-options.md` §1 |
| The key design — partition keys, sort keys, no index | `05-patterns.md` §1 |
| Why the session and the profile are two reads | `05-patterns.md` §1 |
| Sign-in, the two cookies, why the session is ours | `05-patterns.md` §2, then ADR-0003 |
| The clocks, and why none is on the state machine | `03-flow.md` §4, `05-patterns.md` §7 |
| Why the retry is capped at two, and where the cap lives | `03-flow.md` §3, ADR-0014 |
| Every millisecond, and which are guesses | `03-flow.md` §2 and §6 |
| What one assessment costs, and the ceilings | `06-nfrs.md` §3 |
| Why cost is a correctness property here | `00-options.md` §3, constraint C-1 |
| Which capacity mode DynamoDB uses, and why | ADR-0002 |
| Why there is no cache service, and what is free instead | ADR-0002 |
| Where components come from | ADR-0011 |
| pnpm, Turborepo and the package scope | ADR-0012, and `../learn/monorepo-architecture.md` |

## The three numbers to know before anything else

```
30,000 ms   the promise to the person: the screen confirms the run started inside this
60,000 ms   the result is on screen inside this, or the screen gives up
$0.012      the most one photo may cost: three model calls. The account closes when the credit is gone
```

## What changed on 2026-09-17

The owner chose **Option E**: the assessment runs in the background (gate 72, ADR-0014 to ADR-0016).
`00-options.md` §11 holds the scoring and the reason. The short version:

- **The phone stops waiting.** The API answers `202` in about a second, a Step Functions workflow
  makes the model call in its own `assess` function, and the result is pushed to the phone over one
  server-sent-events stream. The 30-second promise is now kept by the waiting screen.
- **A capped retry came back.** At most two more tries, only on `provider-timeout`,
  `provider-throttled` and `provider-unavailable`, declared once in the workflow. So **one photo may
  cost up to three calls, about $0.012**.
- **An attempt is given back when no model call was made** (ADR-0016).
- **The model key left the `api` function.** Only `assess` can read it, which closed gate 70.
- **Two new deadlines:** the waiting screen gives up at 60 seconds, and there is no timeout on the
  state machine at all.

## What changed on 2026-08-26

The owner made ten decisions and a fresh-session pre-mortem found three defects. Both are recorded
where they belong — `factory/runs/001-photo-assessment/human-gates.md` for the decisions,
`seam-ledger.md` for the defects — but the short version is:

- **No retry, at that time.** One model call per assessment, which is why the deadline moved from
  24,000 to 20,000 ms. **Replaced on 2026-09-17 by the capped retry above.**
- **`apps/web` is a static export.** No Node server, no second Lambda.
- **DynamoDB runs in provisioned capacity.** On-demand is outside the free amount. The split was
  fixed at 25/25 that day, and gate 43 changed it on 2026-08-27 to `prod` 20/20 plus `preview` 5/5.
- **Components come from shadcn/ui**, which uses Base UI underneath.
- **No cache service.** ElastiCache and DAX would save 24 ms and cost money by the hour. ADR-0002.
- **No admin route at all in run 1** (gate 30). The account type and the permission check still ship.
  The kill-switch is flipped in the AWS website. US-12 moves out whole, and US-13 lost its
  who-flipped-it criterion.
- **Sign-in is email and password on Cognito's own pages** (gate 32).
- **The 180-day wording stays** (gate 27), **the next-action text names its language** (gate 28),
  **the 11-month warning email moves to the notifications run** (gate 29), and **there is no
  availability target** (gate 31).
- **Three defects fixed:** the session and profile could not be read in one call, the time budget was
  measured on the wrong run, and two requirements contradicted each other on cost.

## What this folder does not decide

Whether to build it, when it ships, what a risk is worth accepting, what counts as personal data,
whether to spend money, and whether to deploy. Those are the owner's, and `CLAUDE.md` lists them.

**Every gate this folder raised is closed.** Gates 27 to 32 were answered by the owner on
2026-08-26, and gate 72 on 2026-09-17. **Three gates are still open and they all belong to 900
Security** — see `factory/runs/001-photo-assessment/human-gates.md`.

Three of the gates this folder closed share one trigger to re-open — the day the app is offered to a
second person — and that trigger also fires gate 5 and the admin route in ADR-0009.
