---
name: explain-concepts-not-only-decisions
description: The user wants the idea underneath named and explained, not only what this project decided — and they gave the exact format to use.
metadata:
  type: feedback
---

On 2026-09-17 the user found out that **observability** is a standard backend topic. They had used
it for weeks — CloudWatch, X-Ray, six custom metrics — and no document had ever said it was a topic
with a name and three parts. A colleague was asked it in a senior backend assessment.

Then they explained it themselves, and told me to copy how they did it:

> "observability ... is almost like some nfr kinda and in the scope of it we measure 3 things:
> metrics, tracing and logs. the logs (e.g. cloudwatch logs) answered what happened for example in
> this request ... the metrics answer how many request went here, how many of them was successful
> ... and the traces for example using aws x-ray describe the path of a request which goes through
> the services."

**The format, which is now the standard for every concept:**

1. **Name the term**, and say what kind of thing it is — a buzzword, a pattern, close to an NFR.
2. **Break it into its parts**, if it has any.
3. **For each part: the question it answers, in plain words, plus the real tool that answers it.**
4. Then, and only then, what this project does.
5. Then how else it is done, and the trap people fall into.

**Why:** a decision explained without its concept teaches the project and not the subject. The user
is building this to become fluent in backend and AWS, so a document that says *what zamphora chose*
and never says *what the idea is called* leaves the transferable half out.

**How to apply.**

- The dictionary is `docs/learn/backend-concepts.md`, 74 entries in seven parts. **New concepts go
  there, in that shape.** The three project notes point into it.
- **Never explain a concept only inside a project note.** A concept buried in "how zamphora watches
  itself" cannot be revised on its own, and revising on its own is the point.
- **Name the alternatives every time.** The user asked for "ways how else could have this been done,
  other examples". In an assessment the question is usually *"why not X?"*, so the rejected option is
  half the answer.
- **Say what kind of diagram it is and how to read it.** They asked for that too. Five kinds appear
  in these notes, and the primer is at the top of `backend-concepts.md`.

## A learning note carries no edit log

Corrected by the user on 2026-09-17, in the same session. I had written *"Updated 2026-08-28: the
task runner is now Turborepo. Sections 2, 7 and 16 changed"* and *"pointers added to
backend-concepts.md"* at the top of a note, and they called it what it is.

**Git records when a file changed. A learning note records what is true.** So no "Updated
<date>", no "sections 2, 7 and 16 changed", no "added on <date>" inside a sentence, and no
"Written <date>" under a heading.

**The only dates that stay are dates that are facts about the world and go stale:** a version read
from a registry, an AWS quota checked on a day, a real deadline such as when the free plan ends.
Those keep a claim honest. **Where a change is itself the lesson, tell it as a sequence** — "this was
decided three times, and the third time is the interesting one" — and leave the dates out.

**`docs/` and `factory/` are the opposite.** There a dated correction note is required, because those
files are a record of decisions and a reader has to know when one was taken.

See [[learning-style]] and [[where-things-are]].
