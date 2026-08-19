# Architecture Decision Records

Short records of the decisions that were not obvious, written at the time they were made.

An ADR captures the context, the decision, what it costs, and **what to do about it**. Two sections
carry the weight:

- **Consequences** — a decision with no downsides listed is a decision that was not thought about.
- **Agent-Readable Summary** — a plain instruction with an explicit _do not_ clause. Without it, a
  coding agent can read the whole record, agree with it, and still write code that reverses it,
  because "what to actually do" was never spelled out.

| #   | Decision | Status |
| --- | -------- | ------ |
| —   | _(none yet — written by the 400-architecture role)_ | — |

## Writing a new one

Number it sequentially, use these headings, keep it to one page.

```markdown
# ADR-00NN — Title in the imperative

- **Status:** Proposed | Accepted | Superseded by ADR-00MM
- **Date:** YYYY-MM-DD

## Context

What is true that makes this a decision. Include the evidence.

## Decision

What was chosen. Show the shape of it.

## Consequences

What this buys, and what it costs. Both.

## Alternatives considered

What else was on the table and why it lost.

## Agent-Readable Summary

One or two sentences an agent can act on, containing an explicit "do not".

> All model calls go through `LlmProvider`. Do not import the Anthropic SDK anywhere outside
> `packages/llm/src/adapters/`.
```

Two rules:

1. **Records are never edited to reflect a change of mind.** Write a new one and mark the old one
   **Superseded**, so the history of the reasoning stays readable.
2. **The Agent-Readable Summary is not optional.** A record without one is not finished.
