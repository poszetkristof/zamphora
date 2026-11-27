---
name: learning-style
description: How the user wants any learning or study material written — 80/20, context sentence then bullets, real values, and the 6-month test.
metadata:
  type: feedback
---

The user learns by the **80/20 rule**: 80% of the understanding in 20% of the time. They ask
follow-up questions when something is fuzzy. That is the signal the explanation was too abstract,
**not** that they need more facts.

**The shape of a good section**

- open with 1–2 plain sentences of context: what the thing is and what problem it solves
- then compact bullets
- each bullet is a full sentence that carries its own consequence, not a fragment
- real names and real values, never a placeholder like "your resource"
- frame it as a real project, not a console demo

**The one test that decides everything — the 6-month test.** The user re-reads notes six months
later having forgotten everything. A bare list of correct facts with no lead-in fails this test.
So does a section that is too short to reconstruct the idea from.

**What "simplify" means here.** Fewer words per fact, plus a way to remember it. It never means
deleting the context sentence. Simple is not the same as abstract: start from the concrete problem,
then the mechanism, then the fact. One example walked step by step beats two examples.

**When the user says "not clear":** rewrite with a different approach. Never answer confusion by
adding more facts.

**When the user asks "is my understanding right?":** answer yes or no **first**, then correct only
the wrong item, then put their own wording into the document.

**Hard rules for written notes**

- No metaphors, no rhetorical questions, no clever voice. State the fact plainly.
- A note never talks **to** the reader. No "as you asked", no "correct!". In six months the question
  is gone and that sentence is noise.
- **Write "you", never "u".** The user writes "u" in their own drafts. That is their voice, not a
  style to copy. Anything written **for** the user uses normal words: "you", "because", "cannot".
  No chat shorthand of any kind.
- **Bold** for key terms.
- After a note is approved, new details **replace** — they never stack. Growing an approved file is
  a failure.

## Why the notes were hard to read, and what fixed it

On 2026-11-27 the owner came back after two months and could not follow the four learning notes,
58,000 words together. Earlier passes had changed the words and kept every fact, so they did not
help. Research says the same: a rewrite that only changes the style helps a second-language reader
very little, while choosing what to leave out, splitting into short parts and learning the key terms
first all help clearly. The rewrite that the owner accepted did this:

- **Remove what the learner does not need:** gate numbers, finding numbers, section references,
  the history of a design ("it used to…"), and details that matter only while building.
- **The problem first, then one real example walked step by step**, then the decisions with the
  option that lost, then the trap.
- **Compare with frontend**, where the owner is an expert: `EventSource` for server-sent events,
  props for dependency injection. Skip what a frontend expert already knows.
- **A "start with these" list** at the top of a long reference file, so the reader knows what to
  read first.
- **Keep every diagram**, each with a short "how to read it".

**Drafts for the owner never go to a temp or scratchpad path.** Show the text in the chat or put it
in a file in the repo. The owner says which one each time.

**The golden example** from the AWS study notes, and the full rules that go with it, are on this
machine. `PRIVATE-NOTES.md` has the paths. Read both before writing any long study document.

See [[write-plain-b1-english]] and [[where-things-are]].
