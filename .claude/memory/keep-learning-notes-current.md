---
name: keep-learning-notes-current
description: When something worth learning is finished, write it into the learning notes in the same session — and which of the three places it goes.
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
- a seam finding or a missed gate shows how the line actually behaves
- **the user asks a question.** A question is proof the notes did not answer it. Answer fully in
  chat, then add the short version to the right file while it is fresh.

## Where it goes — three places, do not mix them

| What was learned | Goes to |
| --- | --- |
| How the AI-native process works — the line, seams, gates, the documents | `ai-native-learn/ai-native-delivery.md` |
| Why **this project** is built the way it is — the stack, a package, a pattern | `README.md` in this repo |
| A fact about an AWS service | the AWS study notes, see [[where-things-are]] |

If the right file does not exist yet, say so and ask before creating a new one. Do not scatter
notes.

## What a good entry looks like

Follow [[learning-style]] exactly. Short version:

- one or two plain sentences of context first — what it is and what problem it solves
- then bullets, each a full sentence carrying its own consequence
- **the alternative that was not picked**, and why it lost. That is the part an interviewer asks
  about.
- two to five sentences per entry. More than that means it wants its own note.
- no pasted code. Point at the file.

## The rule that keeps the notes readable

**New details replace, they do not stack.** When something is added, tighten or cut something else
in the same section. A file that only ever grows stops being read, and then the whole rule was
pointless.

## Where the note is

`ai-native-learn/ai-native-delivery.md`, a sibling of this repo on the user's machine. It is **one
file with a table of contents**: add to the section that fits, never start a second file. If it is
not there, ask where it moved to. Do not guess, and do not create a copy.
