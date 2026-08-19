---
name: where-things-are
description: Pointers to the material this repo came from and the notes that explain it — paths on the user's machine.
metadata:
  type: reference
---

**The notes that explain how this repo works.** Read these before trying to explain the process to
the user, and keep them in step when the factory changes:

- `ai-native-learn/ai-native-delivery.md` — **inside this repo**, one note. Part one is the idea.
  Part two walks one whole run, from an empty folder to finished specs, and explains each term at
  the moment the run needs it. Then a glossary. Add to the right section, never start a second
  file. `node scripts/learn-note.mjs` prints its sections.
- That note is also the user's **approved model for how learning material should read**: teach as
  a walkthrough, name the actor in every example, say each thing once, and tell the reader which
  parts are lookup rather than learning.

**Where the method came from.**

- `C:\Learn\AI\ai-run-mission-2026\learning\` — the source course, sixteen study guides. The two
  that matter most are `1111-assembly-line.md` (the line, seams, human gates) and
  `400-architecture.md` (options, C4, ADRs, NFR budgets).
- `C:\Learn\AI\ai-run-mission-2026\katas\` — the user's own worked examples, one folder per role.
  Good for seeing what a finished document looks like.

**The previous project**, which most of the skills and CI were harvested from:

- `C:\Learn\vue\vue-parcel-project\` — `parcel-hub`, Vue 3 + Express 5 + Zod. Its `README.md` is a
  study guide worth copying the shape of, and `AWS-1-SERVERLESS.md` holds the free-tier numbers
  this project reuses.

These are paths on one machine. If the repo was cloned somewhere else, they will not resolve, and
that is fine — everything needed to work is inside this repository.
