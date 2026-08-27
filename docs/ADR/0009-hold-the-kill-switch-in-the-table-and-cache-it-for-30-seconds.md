# ADR-0009 — Hold the kill-switch in the table, and cache it for 30 seconds

- **Status:** Accepted
- **Date:** 2026-08-25
- **Changed 2026-08-26 by the owner (gate 30):** **no admin route ships in run 1.** The switch is
  still one row in the table, and it is now flipped by hand in the AWS website instead of through
  `POST /api/admin/ai-enabled`. The `changedBy` and `changedAt` fields are gone with it. Everything
  about *where the value lives* and *how it is cached* is unchanged. This record is corrected in
  place rather than superseded, because no code was written against the route.

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
- **US-13 AC-5.** Turning it back on is the same action in reverse.
- **There used to be a criterion asking the log to record which account flipped it.** The owner
  removed it on 2026-08-26 along with the admin route. It shaped the original decision, so it is
  named here rather than deleted quietly.
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
```

One field, because nothing in the application writes this row.

**It is read into memory in the API function and re-read when the copy is more than 30 seconds
old.** Gate G-8 allows 60. Thirty leaves the whole promise as headroom, so a slow read or a
retried read still lands inside the number the owner gave.

**If the read fails, the last known value is kept.** The switch does not flip itself on a network
blip. If there is no last known value at all — a function that has just started and cannot reach the
table — the call **does not** proceed, because a function that cannot read its own configuration
should not be spending money.

**The developer flips it by editing the row in the AWS website.** No route, no screen, no `curl`, no
copied cookie. This is the owner's decision of 2026-08-26 (gate 30), and the reasoning is that run 1
has exactly one person who could ever flip it, and that person already holds the AWS credentials that
created the table.

**Nothing records who flipped it, because nothing in the application runs when it happens.** AWS
keeps its own record of who signed in to its website and what they changed. US-13's old AC-5, which
asked for the zamphora account id, was removed on the same day for the same reason.

**When the admin route ships in a later run**, it goes back to the shape this ADR first described —
`POST /api/admin/ai-enabled` behind `@Roles('ADMIN')`, writing `changedBy` from the session — and
AC-5 comes back with it. The guard it needs already ships in run 1 (ADR-0004, US-14), so that later
run adds a route, not a permission model.

**The model id (ADR-0006) and the daily limit value (ADR-0008) live in the same partition** and are
read on the same cache, because they are the same kind of thing: values a person may need to change
in minutes.

## Consequences

**What this buys.** No new service, no new deploy pipeline, no new credential, and now no route
either. The row is in a table the API already reads on every assessment. A flip takes effect in at
most 30 seconds against a 60-second promise. Turning it back on is the same edit with `true`, which
is US-13 AC-5. And US-13 AC-4 comes for free: the check runs once, before the call, and nothing
re-checks it, so a call in flight finishes.

**What it costs.** Up to 30 seconds of calls can still go out after the flip. That is exactly what
the owner accepted, and the reason is in gate G-8: the alternative needs somebody to decide what
happens when the read itself fails, on or off, and there is no good answer to write down.

**A second cost, and it is the real one.** Flipping the switch needs AWS console access, so it can
only ever be done by the person who owns the AWS account. That is fine while the developer and the
admin are the same person and wrong the moment they are not. **The trigger to build the route is
therefore: a second person needs to flip the switch.** It is the same trigger as gate 5 and gate 31,
and all three should be answered together.

**A third cost.** Nothing in the product records that the switch was flipped, so the app's own logs
show only the effect — model calls stopping — and not the cause. AWS's record of console changes is
the place to look, and it is a different place from every other log in this system.

**A fourth cost.** Because the model id and the limit sit beside the switch, a bad value written into
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

**Editing the DynamoDB row from the AWS console.** **This was rejected on 2026-08-25 and chosen by
the owner on 2026-08-26.** The rejection was correct at the time and rested entirely on one
criterion: the criterion US-13 then numbered AC-5 asked the log to record **which account** flipped
the switch — it no longer exists, and AC-5 now means something else — and a console
edit records an AWS identity instead. The owner removed that criterion from run 1, and with it gone
the objection disappears — there is one person, and the answer to "who" is never in question. **This
is the whole reason the change was cheap:** the alternative lost on a requirement, not on a
weakness, so removing the requirement was enough.

**An admin route flipped with `curl`.** This was the 2026-08-25 decision and it is now the *later*
plan, not the current one. It works, and it costs a route, a permission check on that route, and
copying a session cookie out of a browser every time. The owner judged that too much machinery for
one boolean that one person changes.

**A separate admin key or shared secret for the switch.** Rejected. It would be a second way into
the system that ADR-0004's guard does not cover, which is the shape most likely to be forgotten in a
later security review.

## Agent-Readable Summary

> The AI kill-switch is the item `PK = CONFIG, SK = AI_ENABLED` in the DynamoDB table, holding one
> field `enabled`, read into memory and refreshed when the copy is older than 30,000 ms. **In run 1
> it is flipped by editing the row in the AWS console, and no admin route exists.** Do not build
> `POST /api/admin/ai-enabled` or any other admin route in run 1 — the owner moved admin actions to
> a later run on 2026-08-26. Do not add `changedBy` or `changedAt` to the row; nothing in the
> application writes it. Do not put the switch in an environment variable, in AppConfig, in
> Parameter Store, or anywhere that needs a deploy to change. Do not read the row on every request,
> and do not raise the cache lifetime above 30,000 ms — gate G-8 promises 60 seconds. Do not let a
> failed read flip the value — keep the last known one, and refuse the call when there is no known
> value at all.
