---
name: write-plain-b1-english
description: The user reads English at B1 level and called this very important — short plain sentences in every reply, comment and document.
metadata:
  type: feedback
---

Write everything in short, plain sentences. Chat replies, code comments, document text, commit
messages. One idea per sentence. Common words. Explain a technical term the first time it appears.
No idioms, no metaphors, no long clauses.

Code comments are **1–2 lines**. Longer explanations go in `docs/`.

**Banned words**, in files and in chat alike. Re-read every draft once, hunting for them:

> nuance · granular · resolvable · leverage · robust · salient · corollary · load-bearing ·
> falsifiable · plateau · stall · lineage · seed (as a verb) · artefact

Use the plain word instead: "file" not "artefact", "stop" not "stall", "use" not "leverage", "a
number that can be proved wrong" not "falsifiable".

**Why:** long or figurative English makes the work harder to check. The user cannot review what
they must first decode.

**How to apply:** the same rule is in `CLAUDE.md` under "Language — chat included", so it loads
every session. Keep both in step if either changes. See [[learning-style]].

## Documents too — readable at a glance

On 2026-10-29 the owner read the three 600-qa files (1,272 lines) and said they cost too much
effort. **The B1 rule applies to every file in `docs/` and `factory/`, not only to chat.** A
document the owner cannot read in one look is a document the owner cannot check.

- The first screen says what the file decides, what is still open, and what to do next.
- Keep every essential fact. Cut repetition, side remarks and second explanations. Say each fact
  once and point to the file that owns it.
- No edit history in a document. Git records it. See [[explain-concepts-not-only-decisions]].
- **Never compress into fragments.** On 2026-09-17 a pass turned readable prose into dense notes
  the owner could not follow, and every file was restored from git. Short means fewer facts per
  sentence, not fewer words per fact.
