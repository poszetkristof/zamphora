# Memory index

Project memory lives **in this repo**, not in a machine-global folder, so it travels with a clone.
`CLAUDE.md` imports this file, so it loads every session.

One memory is one file in `.claude/memory/`, with frontmatter (`name`, `description`,
`metadata.type`) and one index line here. Types: `user` · `feedback` · `project` · `reference`.

Before saving, check whether a file already covers it. Update that one rather than adding a
duplicate. Do not record what the repo already says — code structure, git history, or anything
already in `CLAUDE.md`.

- [Who the user is](user-profile.md) — senior frontend growing into backend and AWS; and why the private reasons stay out of the repo.
- [Write plain B1 English](write-plain-b1-english.md) — short sentences, common words, and a banned-word list that applies to chat too.
- [Learning style](learning-style.md) — 80/20, context sentence then bullets, real values, the 6-month test.
- [Be the copilot during a factory run](copilot-during-factory-runs.md) — explain the why before each role and the result after it. One role per session.
- [Keep the learning notes current](keep-learning-notes-current.md) — when work is worth learning from, write the note in the same session, and where it goes.
- [What the app is](project-zamphora.md) — plant care, and why cost counts as correctness on the AWS free plan.
- [Decisions already made](decisions-made.md) — stack, roles, scope, two repositories. Do not re-ask these.
- [The factory is a plugin](factory-as-plugin.md) — how this repo turns it on, the trap that breaks a bundled script, and the one thing a plugin cannot do.
- [Where things are](where-things-are.md) — the one learning note in this repo, and where the pointers outside it live.

**Every file in this list is public.** Anything that belongs to the owner rather than to the
software goes in `../../PRIVATE-NOTES.md`, which is in `.gitignore`. Read that file at the start of
a session if it is there. Never copy a line out of it into a committed file.
