---
name: where-things-are
description: The four learning notes in this repo, which one is the approved model, and where the pointers outside the repo live.
metadata:
  type: reference
---

**The four notes that explain this project.** Read the right one before explaining something to the
user, and keep them in step when the project changes. One subject each:

- `docs/learn/backend-concepts.md` — **the ideas on their own**, away from this project. 74 entries
  in seven parts, with a "start with these 20" list at the top. **The format is fixed and the user
  chose it:** what it is · the parts, each with **the question it answers** and **the real tool** ·
  in zamphora · how else it is done · the trap. Entry numbers are referenced from the other notes,
  so never renumber. When the user asks what a term means, answer from this file and add to it if it
  is missing.
- `docs/learn/ai-native-delivery.md` — **the process**: how the factory line works. Part one is the
  idea. Part two walks one whole run and explains each term when the run needs it. Then a glossary.
- `docs/learn/monorepo-architecture.md` — **the repository shape**: workspaces, pnpm, the catalog,
  Turborepo against Nx, the layout, clean architecture inside `apps/api`, and every trigger on one
  screen. Its version numbers were read on 2026-08-26, so check them again before trusting them.
- `docs/learn/aws-and-the-pipeline.md` — **the running system**: the free account, the nine CDK
  stacks, one assessment step by step, the cost layers, observability, how the build signs in to AWS
  with no password, and a lookup table at the end. Twelve Mermaid diagrams.

**The approved model for how a note should read is `aws-and-the-pipeline.md`.** All four notes were
rewritten on 2026-11-27, and the owner accepted that one first: *"a pretty good one with diagrams
and all"*. Its shape: the problem first, then one real example walked step by step, then the
decisions with the option that lost, then the trap. See [[learning-style]].

**Everything outside this repo is in `PRIVATE-NOTES.md`**, at the repo root and in `.gitignore`. The
source course, the previous project, the AWS study notes and their golden example, and the user's
AWS study position are written there, with the paths on this machine. Read it at the start of a
session. It is not committed, so a clone will not have it, and that is fine.

**Why the split.** Every file here is public. Paths on one machine help nobody who clones this, the
course material is not the user's to publish, and a note about what the user has not learned yet is
not a fact about the software. See [[user-profile]].
