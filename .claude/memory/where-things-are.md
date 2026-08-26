---
name: where-things-are
description: The one note that explains how this repo works, and where the rest of the pointers live.
metadata:
  type: reference
---

**The notes that explain how this repo works.** Read these before trying to explain the process to
the user, and keep them in step when the factory changes:

- `docs/learn/ai-native-delivery.md` — **the process**: how the factory line works. Part one is the
  idea. Part two walks one whole run, from an empty folder to finished specs, and explains each term
  at the moment the run needs it. Then a glossary. Add to the right section, never start a second
  file about the process. `/ai-factory:learn` prints its sections first.
- `docs/learn/monorepo-architecture.md` — **the repository shape**: workspaces, why pnpm, the
  catalog, Turborepo against Nx and when to add one, the layout, clean architecture inside
  `apps/api`, where shared code goes, and every trigger on one screen. Written 2026-08-26 with
  checked versions, so re-check the version numbers before trusting them.
- **Two notes, two subjects.** The first is about the method, the second about the code's shape. A
  third file needs a third subject that is neither.
- That note is also the user's **approved model for how learning material should read**: teach as
  a walkthrough, name the actor in every example, say each thing once, and tell the reader which
  parts are lookup rather than learning.

**Everything outside this repo is in `PRIVATE-NOTES.md`**, at the repo root and in `.gitignore`.
That is where the source course, the previous project and the user's AWS study position are written
down, with the paths on this machine.

Read it at the start of a session. It is not committed, so a clone will not have it, and that is
fine — everything needed to work on this project is inside this repository.

**Why the split.** Every file here is public. Paths on one machine help nobody who clones this, the
course material is not the user's to publish, and a note about what the user has not learned yet is
not a fact about the software. See [[user-profile]].
