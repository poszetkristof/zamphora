# ADR-0004 — Refuse every route by default, and put the owner in the partition key

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

`factory/feature.md` names this as a question 400 Architecture must answer and 900 Security must
check: *"How the two account types are enforced, and where the check runs."*

Two account types exist from day one. A `USER` sees only their own pots, photos and assessments. An
`ADMIN` can read usage and cost figures and can switch the AI feature off. **The admin screens and
the admin routes are both a later feature** (owner, 2026-08-26, gate 30); the permission check ships
now.

The stories set four conditions, and they are not all the same kind of thing:

- **US-14 AC-3.** *"Given a new admin-only action is added later with no permission check written on
  it, when a USER calls it, then it is refused. The default is refuse, not allow."*
- **US-14 AC-4.** A changed account type decides the **next** request.
- **US-07 AC-2.** A request for another account's row is refused, **and the answer does not say
  whether that thing exists.**
- **US-07 AC-4.** Every row in every returned list belongs to the caller.

The first two are about **who may call this route**. The second two are about **whose data this
is**. Solving both with one mechanism is how a system ends up with an ownership check that somebody
forgot to write on one route.

## Decision

**Two mechanisms, for two different questions.**

### 1. Who may call this route: a guard that refuses by default

A single global Nest.js guard reads a decorator on the handler. **A route with no decorator does not
run at all** — not for a user, not for an admin. Three decorators exist and there is never a fourth:

```
@Anonymous()        the sign-in start, the callback, health
@Roles('USER')      everything a plant keeper does
@Roles('ADMIN')     declared, and carried by no route in run 1
```

**`@Roles('ADMIN')` exists and nothing uses it yet, and that is deliberate.** The owner moved the
two admin routes out of run 1 on 2026-08-26 (gate 30), so the figures are read straight from the
table and the kill-switch is flipped in the AWS console (ADR-0009). The decorator and the guard
still ship, because US-14 AC-3 is about the route that does not exist yet: the default has to be
*refuse* before somebody adds the first admin route, or the check is written after the hole.

The guard reads the account type from the **profile item**, fetched in the second of the two reads that also fetch
the session (`05-patterns.md` §1, Q-9). Not from the session item, and not from a claim copied at
sign-in. That is what makes US-14 AC-4 true without any extra work.

**A build-time test enforces the default.** NFR-32: a test walks the whole router and asserts that
every route carries one of the three decorators. A route added next year with none of them fails the
build before anybody can call it. The guard makes the failure safe; the test makes it loud.

### 2. Whose data this is: not a check at all

**The owner id is the partition key of every item a person owns** (`05-patterns.md` §1). A request
from user A builds its key from A's session. There is no code path in which A's key names B's row,
so there is nothing to check and nothing to forget.

**This is why US-07 AC-2 comes out right for free.** A row that is not under the caller's partition
and a row that does not exist are the same answer: nothing came back. The API returns the same
"not found" for both, so it cannot leak the existence of another account's pot.

The rule that keeps this true: **the owner id comes from the session and from nowhere else.** Never
from a path parameter, never from a query string, never from a request body.

**A type-level check makes it hard to break.** The key builder in the repository layer cannot be
called without a user id, so a query with no owner does not compile (NFR-30).

## Consequences

**What this buys.** The commonest broken-access-control bug — one route out of forty where the
ownership check was not written — cannot happen, because the check is not a line of code that can be
missed; it is the shape of the key. And a new admin-only route added by anybody, including an agent
writing code a year from now, refuses everybody until somebody deliberately says who may call it.

**What it costs.** The refusal is loud in the wrong direction at first: a developer who forgets the
decorator sees their own new route refuse them, with no obvious reason. That is on purpose, and it
is why the error message must name the missing decorator by name.

**A second cost.** Every request pays one extra item read to get the account type. It is combined
into a read the request already makes, so the cost is a few milliseconds, not an extra round trip.

**A third cost, which is the real one.** The partition-key rule constrains every future feature.
Backbone 6 needs "every task due today across all accounts", which does not fit under one partition
and needs a secondary index (`05-patterns.md` §1). **That index is a query that crosses accounts,
and it will be the first place this protection can be undone.** When it is added, the code that
reads it must filter to one owner before returning anything, and 900 Security should be asked to
look at it again.

## Alternatives considered

**An opt-out marker: every route open unless it carries `@Roles(...)`.** This is the shape most
Nest.js tutorials use, with a `@Public()` decorator. Rejected. It fails open, which is exactly what
US-14 AC-3 forbids in words.

**The account type from the token claim, cached in the session.** Rejected. It is one fewer read,
and it breaks US-14 AC-4 in a way that would not show up in a test unless somebody wrote that exact
test: a demoted admin would keep admin rights for up to 30 days.

**An ownership check written in each service method.** Rejected. It is the mechanism that most often
has one hole in it, and the hole is invisible until someone finds it. A partition key has no holes
because there is nothing to write.

**Refusing with 403 instead of 404 for another account's row.** Rejected by US-07 AC-2: the answer
must not say whether the thing exists, and a 403 says it does.

**API Gateway authorizers or IAM-based authorization.** Rejected. The role lives in the application's
own data, the session is the app's own, and moving the decision to the gateway would split the rule
across two places. The gateway sees a cookie it cannot read.

## Agent-Readable Summary

> Every API route must carry `@Anonymous()`, `@Roles('USER')` or `@Roles('ADMIN')`, and a route
> with none of them is refused for everybody by the global guard. Do not add a `@Public()` style
> opt-out, and do not disable the router test that asserts every route is decorated. The owner id
> always comes from the session — do not take a user id from a path parameter, a query string or a
> request body, and do not read the account type from the session item instead of the profile item.
> Do not answer 403 for a row belonging to another account; answer exactly as if it did not exist.
