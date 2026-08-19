# .claude — what is here and when it loads

Six kinds of file. The only thing that really separates them is **when the model sees the file**.
Pick the wrong one and the rule either loads too late, or loads on every unrelated turn.

| Kind | Loads | Use it for |
| --- | --- | --- |
| Rule file — `CLAUDE.md`, `AGENTS.md` | every session | A convention that must always be present. Keep it short |
| Context file — `docs/` | when a task points at it | Repo facts: versions, constraints, gotchas. Does the most work |
| Skill — `skills/*/SKILL.md` | when the task matches its `description` | A procedure. **Must work in any repo** — no paths, no versions |
| Subagent — `agents/*.md` | when dispatched | Work you want done without its reading filling your context |
| Command — `commands/*.md` | when you type `/name` | A repeatable prompt, often with shell output pasted in |
| Hook — `settings.json` | on an event | A deterministic guard. **Hooks help; CI required checks enforce** |

**Pick the narrowest layer that does the job.** A CI check beats a hook, a hook beats a rule, a rule
beats hoping.

## Skills

`spec-driven-tasks` (working `TASKS.md`) · `coding-standards` (any `.ts`/`.tsx`) ·
`testing-patterns` (any test) · `security` (auth, uploads, user input, AI calls) ·
`accessibility` (JSX, forms, dialogs) · `code-review` (the seven lenses) ·
`root-cause` (a bug, before editing) · `adr-writer` (a hard-to-undo decision).

## Agents

`explore-subagent` — a wide `file:line` sweep returning locations and snippets, not whole files.
Skip it when you will open those files to edit them anyway.

`100-consulting` … `600-qa` — the eight role slots. **These are generated.** Edit
`factory/subagent-slots/*.md` or `factory/handoff-map.yaml`, then run
`node scripts/derive-agents.mjs`. Editing an adapter directly means the next run of that script
throws your change away.

## Commands

| Command | Does |
| --- | --- |
| `/start` | Where the project is, and the one next action. Run it first, every session |
| `/learn` | Write what was just learned into the right notes file. Run it before saying done |
| `/next-task` | Backlog state, then work the next unblocked task |
| `/spec-check` | Audit code against the specs — mismatches, dead links, untraced stories |
| `/factory-run` | The state of the line, and what to do next |
| `/run-role <slot>` | Run one role with only its declared inputs |

## Memory

`memory/` holds the facts that survive between sessions: who the user is, how they want things
written, what the app is, which decisions are settled. `CLAUDE.md` imports `MEMORY.md` with `@`, so
it all loads every session. It lives **in the repo**, so it travels with a clone. A session that
re-asks a question answered here has a defect.

## Hook

`hooks/cache-branch-diff.mjs` runs before `code-review` and writes the branch diff into `cache/`.
Node rather than shell so it works on Windows. It never fails a prompt — on any error it writes
empty files and exits 0, and the skill says so out loud rather than reviewing nothing.

## settings.json

A narrow allow-list, and a deny list that is the real design point: no `git commit` / `push` /
`reset --hard` (the model proposes, the human commits), no `cdk deploy` / `destroy` or `aws
create-*` / `put-*` / `delete-*` (nothing that spends money or makes a real resource), and no Read
or Grep on `.env*`. `settings.local.json` is machine-local and not committed.

## The rule that keeps this honest

A skill that hardcodes a path, a version or a domain fact is the most common failure here. Those
belong in `CLAUDE.md` or `docs/context/stack.md`. A skill should survive being copied to another
repository.
