---
name: keep-learning-notes-current
description: When something worth learning is finished, write it into the learning notes in the same session — and which of the four notes it goes into.
metadata:
  type: feedback
---

The user is building this project to learn from it. So a piece of work is not finished when the
code or the document is finished. It is finished when the learning notes explain it.

**Do this in the same session, not later.** A note written a week after the work is written from
memory, and it is wrong.

## When this rule fires

- a role run finishes, and the run showed something about how the process works
- a service, a tool or a pattern is used for the first time — Lambda, DynamoDB, Cognito, CDK, a new
  library
- an ADR is accepted, so a real choice was made with a real reason
- a seam finding or a missed gate shows how the line really behaves
- **the user asks a question.** A question is proof the notes did not answer it. Answer fully in
  chat, then add the short version to the right note while it is fresh.

## Where it goes — four notes, one subject each

| What was learned | Goes to |
| --- | --- |
| An idea on its own: a backend, security, data or AI concept | `docs/learn/backend-concepts.md`, in the five-part shape |
| How the AI-native process works: the line, seams, gates, the documents | `docs/learn/ai-native-delivery.md` |
| How the repository is arranged: workspaces, packages, layers, the build | `docs/learn/monorepo-architecture.md` |
| How the running system works on AWS, and the pipeline | `docs/learn/aws-and-the-pipeline.md` |
| A fact about an AWS service, for the exam | the AWS study notes, see [[where-things-are]] |

A concept goes into `backend-concepts.md` first. The project note only says what zamphora does and
points to the entry number. See [[explain-concepts-not-only-decisions]].

**A fifth note needs a fifth subject** that is none of these four. Ask the owner before creating
one. Do not scatter notes.

## What a good entry looks like

Follow [[learning-style]] exactly. Short version:

- one or two plain sentences of context first — what it is and what problem it solves
- then bullets, each a full sentence carrying its own consequence
- **the alternative that was not picked**, and why it lost. Without it the note records a fact but
  not a decision, and a fact cannot be re-argued later.
- no gate numbers, finding numbers or edit history. The ledgers in `factory/runs/` hold those.
- no pasted code beyond a few lines. Point at the file.

## The rule that keeps the notes readable

**New details replace, they do not stack.** When something is added, tighten or cut something else
in the same section. A file that only ever grows stops being read, and then the whole rule was
pointless.

`/ai-factory:learn` lists the sections of the notes first. If a note is not where this file says,
ask where it moved to. Do not guess, and do not create a copy.
