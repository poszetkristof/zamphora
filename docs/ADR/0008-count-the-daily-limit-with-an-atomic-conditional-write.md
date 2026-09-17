# ADR-0008 — Count the daily limit with one atomic conditional write in the API

- **Status:** Accepted. One sentence added by ADR-0016 (2026-09-17): an attempt is refunded when no
  model call was made. **Corrected in place 2026-09-17:** the counter counts assessments started,
  not model calls. See "What the counter counts".
- **Date:** 2026-08-25

## Context

`factory/feature.md`: *"A user may run 10 assessments a day, decided 2026-08-24. The check runs
before the model call, so a failed call still counts. Every call costs
money, which is the whole point of the limit… **Where the limit is enforced is 400 Architecture's
decision. That it is enforced is not.**"

Why it exists at all, from `00-context-brief.md` §4: an endpoint with no limit can be called by a
script faster than any person, and the balance is only a few hundred calls. The feature would be
dead in a minute. The loss is not a bill — the API stops when the balance hits zero — the loss is the
feature going dark until a person notices and pays.

The stories:

- **US-08 AC-1.** The 11th attempt is refused **before** any model call.
- **US-08 AC-3.** On that refusal, no Anthropic call was made and no money was spent.
- **US-08 AC-5.** The workflow's own retries must not be counted a second time. The increment runs
  once, in the API, before the workflow starts, so a retried call can never reach it (ADR-0014).
- **US-05 AC-5.** A `cannot-tell` result still counts, because the money was already spent.
- **US-08 AC-2.** The message says the limit is reached **and when it resets**.

## Decision

**One atomic conditional increment on one DynamoDB item, in the API, before the model call.**

```
UpdateItem
  Key                  PK = USER#<sub>, SK = QUOTA#<yyyy-mm-dd>
  UpdateExpression     ADD attempts :one
  ConditionExpression  attribute_not_exists(attempts) OR attempts < :limit
```

If the condition fails, the request stops with `daily-limit-reached` and nothing is spent. If it
succeeds, the attempt is already counted before the call is made.

**Every model call goes through this increment.** Nothing calls the provider around it.

**The day is a UTC calendar day**, and the date is part of the key. The message shows the moment of
the next reset in the reader's own time.

**The limit value lives beside the kill-switch**, in the `CONFIG` partition, so 10 can be changed
without a deploy. The compiled-in default is 10 if the row cannot be read.

## Consequences

**What this buys, and the first one is the reason for the whole shape.** Ten requests arriving at
the same instant produce **exactly ten** successes, because one item is changed by one operation. A
read-then-write would let all ten read 9 and all ten proceed, which is precisely the script the
limit exists to stop.

The other two properties are acceptance criteria that come out for free:

- A failed call still counts, because the counter moves before the call is made.
- Yesterday's counter is never read and never needs clearing, because the date is in the key. The
  item carries a time-to-live so the table does not grow, and **nothing depends on that firing on
  time** — DynamoDB deletes *"typically within a few days"*
  ([DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html),
  checked 2026-08-25).

**What the counter counts, corrected 2026-09-17.** It counts **assessments started**, not model
calls. The increment runs once in the `api` function, before `StartExecution`, and the workflow's
retry never reaches it. So 10 a day is 10 assessments, and each one may cost up to three calls
(ADR-0014). **The daily ceiling in money is 10 × $0.012, about $0.12 a day**, not 10 × $0.0040.
Until 2026-09-17 there was no retry, so "10 calls" and "10 assessments" meant the same thing. They
do not any more.

**One case still differs, and it is the right one.** A call that fails still counts, because the
increment happens before the call. A person whose call fails has spent one of their ten. That is what
`factory/feature.md` asks for: *"every attempt costs money, which is the whole point."* The money was
spent whether or not an answer came back.

**A second cost.** One extra write on every assessment. About 20 ms, budgeted in `03-flow.md`.

**A third cost.** A UTC day means the reset happens at 01:00 or 02:00 Hungarian local time. That is
a small oddity and it is the price of one account having exactly one reset.

**This limit is not a budget guard, and `factory/feature.md` says so.** Ten a day for a month is 300
assessments, which is $1.20 on Haiku 4.5 in the normal case and up to $3.60 if every one of them
took three calls. It stops a script. It does not keep spend inside the balance. What does that is
ADR-0006 and the balance itself running out.

## Alternatives considered

**Read the count, then write it.** Rejected. It is the same design with a race in it, and the race
is the exact attack the limit is for.

**Rate limiting at API Gateway.** Rejected. Throttling there is per route and per key, not per
signed-in account, and it cannot express "10 per calendar day". It also cannot tell an anonymous
caller from a signed-in one, and US-07 AC-5 already requires no model call without a session.

**A usage plan with API keys.** Rejected. It would mean a second credential per user, held by the
browser, which contradicts ADR-0003's rule that the browser holds nothing but an opaque session id.

**Counting in the browser.** Rejected outright. A script does not run the browser's code.

**AWS WAF rate rules.** Rejected. WAF counts requests from an address over five minutes. The limit
here is per account over a day, and the two do not line up. It also costs money on an account with a
closing credit balance.

**Decrementing the counter when a call fails.** Rejected by the owner's own sentence: a failed call
still counts, because the money was already spent. **One narrow exception was added by ADR-0016 on
2026-09-17:** since the count now happens before a background run, a run can be refused after the
count and before any call — the kill-switch was flipped, the breaker opened, or the workflow could
not start. On those paths, and only those, one atomic `ADD attempts -1` gives the attempt back. No
money was spent, so the owner's sentence still holds.

**Counting after the call instead of before.** Rejected. US-08 AC-3 requires that no money was spent
on the refusal, which is only true if the check comes first.

## Agent-Readable Summary

> The daily limit is one `UpdateItem` with `ADD attempts :one` and a condition of
> `attempts < :limit`, on the item `PK = USER#<sub>, SK = QUOTA#<yyyy-mm-dd>`, run in the API before
> every model call, before the workflow starts. Do not read the counter and then write it back. Do
> not put the limit in API Gateway, in a usage plan, in WAF or in the browser. Do not decrement it
> when a call fails; decrement it only on a path where no call was made (ADR-0016). Do not compute
> the day from a timezone sent by the browser — it is always the UTC calendar day.
