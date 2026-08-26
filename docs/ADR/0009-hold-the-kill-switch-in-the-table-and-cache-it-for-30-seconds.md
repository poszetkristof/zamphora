# ADR-0009 — Hold the kill-switch in the table, and cache it for 30 seconds

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

`CLAUDE.md` lists owning the kill-switch as a decision that is never the model's. The owner made it,
and it is:

- **The switch takes effect within 60 seconds** (gate G-8, 2026-08-25). *"The on/off value may be
  held in memory for up to a minute, so a few calls can still slip through after it is flipped.
  Checking it on every single request was rejected as the more complicated answer: with no cached
  value there is no obvious behaviour when that read itself fails, and someone would have to decide
  whether it fails on or off. 5 minutes was rejected because the switch exists for when something is
  already going wrong."*

The stories:

- **US-13 AC-1.** Within 60 seconds, no new model call is made by anyone.
- **US-13 AC-2.** No code change and no deploy. *"A switch that needs a release is not a
  kill-switch."*
- **US-13 AC-4.** A call already in flight is allowed to finish, because the money is already spent.
- **US-13 AC-5.** The log records **which account** flipped it, and when.
- **US-13 AC-6.** Turning it back on is the same action in reverse.
- **US-09 AC-4.** A user sending a photo while it is off gets a message saying trying again will not
  work now.

There is no admin screen in run 1 (`00-prd.md` §6.1), so how an admin reaches the switch is part of
this decision.

## Decision

**The switch is one row in the DynamoDB table already in the design.**

```
PK = CONFIG
SK = AI_ENABLED
   enabled     true or false
   changedBy   the zamphora account id that last flipped it
   changedAt   ISO timestamp
```

**It is read into memory in the API function and re-read when the copy is more than 30 seconds
old.** Gate G-8 allows 60. Thirty leaves the whole promise as headroom, so a slow read or a
retried read still lands inside the number the owner gave.

**If the read fails, the last known value is kept.** The switch does not flip itself on a network
blip. If there is no last known value at all — a function that has just started and cannot reach the
table — the call **does not** proceed, because a function that cannot read its own configuration
should not be spending money.

**An admin flips it with an authenticated route on the same API**, `POST /api/admin/ai-enabled`,
carrying `@Roles('ADMIN')` from ADR-0004. The admin signs in in a browser like anybody else and then
calls the route with `curl`. No screen is needed and none is built.

**The route writes `changedBy` from the session**, which is what makes US-13 AC-5 satisfiable.

**The model id (ADR-0006) and the daily limit value (ADR-0008) live in the same partition** and are
read on the same cache, because they are the same kind of thing: values a person may need to change
in minutes.

## Consequences

**What this buys.** No new service, no new deploy pipeline, no new credential. The row is in a table
the API already reads and writes on every assessment. A flip takes effect in at most 30 seconds
against a 60-second promise. Turning it back on is the same call with `true`, which is US-13 AC-6.
And US-13 AC-4 comes for free: the check runs once, before the call, and nothing re-checks it, so a
call in flight finishes.

**What it costs.** Up to 30 seconds of calls can still go out after the flip. That is exactly what
the owner accepted, and the reason is in gate G-8: the alternative needs somebody to decide what
happens when the read itself fails, on or off, and there is no good answer to write down.

**A second cost.** The admin has no screen, so the switch is flipped with `curl` against a route
that needs a browser session cookie. That is workable and it is awkward: it means copying a cookie
out of a browser. **Recorded as gate 29** together with the reconciliation script, because "the
admin operates this by hand" is a usability decision, not an architectural one, and `01-use-cases.md`
UC-7 left it open.

**A third cost.** Because the model id and the limit sit beside the switch, a bad value written into
that partition breaks more than one thing. Every value read from `CONFIG` is validated against a
closed list or a range, and an invalid value falls back to the compiled-in default rather than being
used.

## Alternatives considered

**Read the row on every request.** Rejected by the owner in gate G-8, and the reason is worth
keeping: with no cached value, somebody has to decide what happens when that read fails, and both
answers are wrong in a different way. It is also one more read on the hottest path in the product.

**An environment variable on the function.** Rejected. Changing one is a deploy, and US-13 AC-2 says
a switch that needs a release is not a kill-switch.

**AWS AppConfig.** Rejected. It is built for exactly this, and it is a whole extra service with its
own deployment strategy, monitors and rollback, added for one boolean on a project where the brief
asks for the documented path and the developer is already learning two new things. **Trigger to
re-open:** if the number of values in `CONFIG` passes about ten, or if a value ever needs to roll
out gradually rather than at once.

**SSM Parameter Store.** Rejected, but it was the closest call. Standard parameters cost nothing and
the API is simple. It lost because it is a second service to give the function permission on, and
the value would sit apart from the daily limit and the model id, which are the same kind of thing.
The gain would have been zero.

**Editing the DynamoDB row from the AWS console.** Rejected, and the reason is a criterion rather
than taste. US-13 AC-5 requires the log to record **which account** flipped the switch. A console
edit records an AWS IAM principal, which is not a zamphora account. It cannot satisfy AC-5 at all.

**A separate admin key or shared secret for the switch.** Rejected. It would be a second way into
the system that ADR-0004's guard does not cover, which is the shape most likely to be forgotten in a
later security review.

## Agent-Readable Summary

> The AI kill-switch is the item `PK = CONFIG, SK = AI_ENABLED` in the DynamoDB table, read into
> memory and refreshed when the copy is older than 30,000 ms, and flipped through
> `POST /api/admin/ai-enabled` behind `@Roles('ADMIN')`. Do not put the switch in an environment
> variable, in AppConfig, in Parameter Store, or anywhere that needs a deploy to change. Do not read
> the row on every request, and do not raise the cache lifetime above 30,000 ms — gate G-8 promises
> 60 seconds. Do not flip it by editing the row in the AWS console; US-13 AC-5 needs the zamphora
> account id in `changedBy`. Do not let a failed read flip the value — keep the last known one, and
> refuse the call when there is no known value at all.
