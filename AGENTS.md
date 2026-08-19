# AGENTS.md

The rules for this repository live in one place: **[`CLAUDE.md`](./CLAUDE.md)**. Read it first,
whatever tool you are.

It is short on purpose. It points at:

- `docs/context/stack.md` — the stack, the constraints, the known gotchas.
- `docs/` — one folder per role, the specs a change is built against.
- `docs/ADR/` — decisions. Each ends in an instruction with an explicit "do not".
- `TASKS.md` — the backlog, worked one task at a time.
- `factory/` — the delivery line that produced `docs/`.

Two rules matter before you touch anything:

1. **Files, not chats.** A decision that is not in a file did not happen.
2. **Some decisions are never yours.** `CLAUDE.md` lists them. Recording the question is the right
   outcome, not guessing well.
