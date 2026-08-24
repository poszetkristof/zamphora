# Memory index

Project memory lives **in this repo**, not in a machine-global folder, so it travels with a clone.
`CLAUDE.md` imports this file, so it loads every session.

One memory is one file in `.claude/memory/`, with frontmatter (`name`, `description`,
`metadata.type`) and one index line here. Types: `user` · `feedback` · `project` · `reference`.

Before saving, check whether a file already covers it. Update that one rather than adding a
duplicate. Do not record what the repo already says — code structure, git history, or anything
already in `CLAUDE.md`.

- [Who the user is](user-profile.md) — senior frontend moving to senior backend; this repo is a portfolio piece and an AWS study vehicle.
- [Write plain B1 English](write-plain-b1-english.md) — short sentences, common words, and a banned-word list that applies to chat too.
- [Learning style](learning-style.md) — 80/20, context sentence then bullets, real values, the 6-month test.
- [Keep the learning notes current](keep-learning-notes-current.md) — when work is worth learning from, write the note in the same session, and where it goes.
- [What the app is](project-zamphora.md) — plant care, and why cost counts as correctness on the AWS free plan.
- [Decisions already made](decisions-made.md) — stack, roles, scope, two repositories. Do not re-ask these.
- [The factory is a plugin](factory-as-plugin.md) — how this repo turns it on, the trap that breaks a bundled script, and the one thing a plugin cannot do.
- [Where things are](where-things-are.md) — the learning notes, the source course, the previous project.
