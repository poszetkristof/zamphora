# ADR-0016 — Refund an attempt when no model call was made

- **Status:** Accepted 2026-09-17, by the owner (gate 72)
- **Date:** 2026-09-17
- **Adds one sentence to:** ADR-0008 (the daily limit) and ADR-0009 (the kill-switch). Everything
  else in both stands.

## Context

The daily limit is counted in the API before the model call (ADR-0008). Until now every refusal
happened before the count, so a refused request never cost an attempt.

With ADR-0014 two checks run again inside `assess`, after the count: the kill-switch and the
circuit breaker. A switch flipped while a run was queued now stops the call after the attempt was
spent. And `StartExecution` itself can fail after the count.

## Decision

**An attempt is refunded only on a path where no model call was made.**

| Path | Who refunds | How |
| --- | --- | --- |
| `assess` finds the kill-switch off | The workflow's `Refund` step | `UpdateItem ADD attempts -1` on the `QUOTA#` row, then `RecordFailure` with `feature-off` |
| `assess` finds the breaker open | The same step | Same, with `provider-unavailable` |
| `StartExecution` fails in the API | The API, before answering | Same write, then the failure `workflow-not-started` |

Every other rule of ADR-0008 stands. A call that was made and failed still costs an attempt. Nothing
decrements the counter for any other reason. The refund is one atomic `ADD`, so it cannot race.

## Consequences

- **The person never pays an attempt for a call that never happened.** That was already true
  before; this keeps it true after the count moved away from the call.
- **One more write on a rare path.** Cents, and only on refusals.
- **ADR-0009 gains one sentence:** `assess` also reads the kill-switch, on the same 30-second
  cache, so a flip stops queued runs too.

## Alternatives considered

- **Count the attempt inside `assess`, after the checks.** Rejected. The counter is the guard
  against a script, and it must run before anything is queued, or a flood queues a thousand runs.
- **No refund.** Rejected. A person would lose one of ten for a switch the owner flipped.

## Agent-Readable Summary

> Refund an attempt with one `UpdateItem ADD attempts -1` only when no model call was made: the
> kill-switch or the breaker refused inside `assess`, or `StartExecution` failed. Do not refund on
> any failure of a call that was made. Do not move the daily count out of the API.
