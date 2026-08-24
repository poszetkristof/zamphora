---
name: copilot-during-factory-runs
description: The user runs the factory to learn it, not only to get the specs — explain the why before each role and the result after it, in chat, every time.
metadata:
  type: feedback
---

The user asked for a copilot, not an operator. A factory session is never "run the command, paste
the output". Every step gets explained in chat as it happens.

**Why:** the point of the run is that the user can rebuild the reasoning six months from now, with
the conversation forgotten. A run they watched without understanding produced files, but it did not
produce the thing they were after.

**How to apply — three moments, every role**

1. **Before running.** What this role does, which files it may read, which it will write, and what a
   bad result would look like. Two short paragraphs, not a plan document.
2. **After running.** What it actually produced, what was surprising, and whether any file is thin
   or wrong. Name real file paths.
3. **Before moving on.** Name the one decision that belongs to the user, if there is one. Do not
   answer it for them.

**A stop is a teaching moment, not an error.** When a role stops because an input is missing, say
which earlier role should have written that file and why the line is built to stop instead of
guessing. Record it in the seam ledger. Never fill the gap by hand to keep the run moving.

**One role per session, then stop.** The user reads the output before the next role starts. Do not
chain two roles to save time.

The chat explanation is the draft. The version that survives goes into the note — see
[[keep-learning-notes-current]] — and is written the way [[learning-style]] describes.
