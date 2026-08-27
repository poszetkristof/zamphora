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
| [0001](0001-keep-one-product-repository.md) | Keep one product repository | Accepted. Package manager half superseded by 0012 |
| [0002](0002-run-the-api-on-lambda-and-store-data-in-dynamodb.md) | Run the API as a function, and put the data in DynamoDB | Accepted |
| [0003](0003-sign-in-with-openid-connect-and-keep-tokens-on-the-server.md) | Sign in with OpenID Connect through Cognito, and keep every token on the server | Accepted |
| [0004](0004-refuse-every-route-by-default-and-key-data-by-owner.md) | Refuse every route by default, and put the owner in the partition key | Accepted |
| [0005](0005-one-model-call-behind-a-port-with-structured-output.md) | Make one model call, behind one port, with structured output | Accepted |
| [0006](0006-choose-the-model-by-measuring-it.md) | Choose the model by measuring it, and run on Haiku 4.5 until the measurement exists | Accepted |
| [0007](0007-keep-photos-in-one-private-bucket-with-a-lifecycle-rule.md) | Keep photos in one private bucket, and let a lifecycle rule delete them | Accepted |
| [0008](0008-count-the-daily-limit-with-an-atomic-conditional-write.md) | Count the daily limit with one atomic conditional write in the API | Accepted |
| [0009](0009-hold-the-kill-switch-in-the-table-and-cache-it-for-30-seconds.md) | Hold the kill-switch in the table, and cache it for 30 seconds | Accepted |
| [0010](0010-serve-the-web-and-the-api-from-one-origin.md) | Serve the web app and the API from one origin | Accepted |
| [0011](0011-build-the-components-on-base-ui.md) | Build the components on Base UI, delivered by shadcn/ui | Accepted 2026-08-26 |
| [0012](0012-run-the-workspace-on-pnpm-and-turborepo.md) | Run the workspace on pnpm and Turborepo | Accepted 2026-08-26. Supersedes part of 0001 |
| [0013](0013-run-every-test-on-vitest.md) | Run every test on Vitest, in all three packages | Accepted 2026-08-26 |

**0001 to 0011** were written by the 400-architecture role on 2026-08-25, from the chosen direction
in `docs/400-architecture/00-options.md`. **0012** was written on 2026-08-26 after the owner chose
pnpm and Turborepo.

**Two records changed on 2026-08-26 and both are worth knowing about:**

- **0002 was corrected in place**, not superseded. It named on-demand DynamoDB capacity, which sits
  outside the free allowance. Nothing had been built on it, so there was no history to protect.
- **0001 was superseded in part** by 0012, because something *was* built on it — every other record
  and both diagrams assume one repository. Only its package-manager sentence is replaced.

**That is the rule to reuse.** Supersede when the decision changed and something was built on the old
one. Correct in place when the record is simply wrong and nothing was built on it.

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
