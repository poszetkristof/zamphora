# ADR-0019 — Treat a kill-switch row that cannot be used as off

- **Status:** Accepted 2026-10-29, by the owner (gate 86)
- **Date:** 2026-10-29
- **Supersedes in part:** [ADR-0009](0009-hold-the-kill-switch-in-the-table-and-cache-it-for-30-seconds.md),
  its fourth cost, **for the `CONFIG / AI_ENABLED` row only**. ADR-0009 says a `CONFIG` value that
  fails its check falls back to the compiled-in default. For this row the default is `true`, so a
  bad row kept the feature on. Now a bad row turns the feature off. Everything else in ADR-0009
  still stands: where the row lives, the 30-second cache, the rule for a read that fails, and the
  edit in the AWS website. `DAILY_LIMIT` (ADR-0008) and `MODEL_ID` (ADR-0006, ADR-0017) still fall
  back to their defaults.

**What this record decides:** what the app does when it reads the kill-switch row and the row
cannot be used. **What is still open:** nothing. **What to do next:** 500 Engineering writes the
rule where `03-api-spec.md` reads the `CONFIG` rows. 600 QA adds the test for NFR-39 in
`docs/400-architecture/06-nfrs.md`. 800 Infra writes down the hand step that adds the `AI_ENABLED`
row to a new table (see "What it costs").

## Context

ADR-0009 deals with two different cases.

- **The read fails.** DynamoDB returns an error or does not answer. ADR-0009 keeps the last known
  value, and it refuses the call when there is no known value. This record does not change that.
- **The read succeeds, but the row cannot be used.** ADR-0009's fourth cost says every value read
  from `CONFIG` is checked against a closed list or a range. A value that fails the check falls back
  to the compiled-in default. For `AI_ENABLED` that default is `true`.

The second case is the one this record is about. Nothing in the application writes the row. A
person edits it by hand in the AWS website (ADR-0009, gate 30). A hand edit can go wrong. A person
who wants to stop the spending can type the string `"false"` where the boolean `false` belongs. Or
the person can delete the row instead of changing it. Under the old fallback, both mistakes keep
the feature on. The person believes it is off, and nothing tells them it is not. The switch exists
for when something is already going wrong (gate G-8), so that is the worst moment for it to fail.

The owner answered gate 86 in `factory/feature.md`, section "Human decisions already made": the
kill-switch fails closed. "Fails closed" means that when the app is not sure, it stops the thing the
switch controls.

## Decision

**When the read succeeds and the `AI_ENABLED` row cannot be used, the feature is off.** "Cannot be
used" means one of these:

- the row is missing;
- the `enabled` field is not a boolean. For example the string `"false"`, the string `"true"`, the
  number `0`, or no `enabled` field at all.

**Only the boolean `true` turns the feature on.** The boolean `false` turns it off, as before.

What happens when the row cannot be used:

1. **No model call runs.** The `api` function refuses a new assessment with `feature-off` before it
   counts an attempt, exactly as when the switch is off. The `assess` function refuses before the
   call, and the attempt is refunded, because no call was made (ADR-0016, ADR-0018).
2. **The function that read the row writes the `config-value-refused` log line.** So the cause shows
   in the logs, not only the effect.
3. **The "off" result is cached like any other read, for at most 30 seconds.** So when somebody
   fixes the row, the feature comes back within 30 seconds, the same as a normal flip.
4. **A refused row replaces the last known value.** "Keep the last known value" is only for a read
   that fails. If a bad row did not replace a cached `true`, a mistake made while switching off
   would keep the feature on.

**The two other `CONFIG` values keep their fallback.** A refused `DAILY_LIMIT` uses 10. A refused
`MODEL_ID` uses `claude-haiku-4-5-20251001`. Those defaults are safe, because they keep spending at
its normal level. The default `true` for the switch was not safe, because it kept spending after a
person tried to stop it.

## Consequences

**What this buys.** A mistake made while switching the feature off stops the spending. It does not
hide. The rule fits in one line: only the boolean `true` turns the feature on. And it matches the
rule ADR-0009 already has for a failed read: a function that cannot use its own configuration does
not spend money.

**What it costs.**

- **A mistake made while switching the feature on also leaves it off.** For example, `"true"` typed
  as a string. The feature stays off until somebody notices and fixes the row. The person sees the
  normal "turned off" message (US-09 AC-4), and the `config-value-refused` line in the log names the
  cause.
- **A new table starts with the feature off, until somebody writes the row.** That includes the
  `dev` table, and `prod` rebuilt from CDK after the account closes. Under ADR-0009 a missing row
  meant on. Now it means off. The owner writes the three `CONFIG` rows of each table once, by hand,
  and no pipeline writes a `CONFIG` row (gate 87). So a new or rebuilt table stays off until that
  hand step is done.

## Alternatives considered

**Use the compiled-in default, `true`.** This is the rule ADR-0009 had. Rejected by the owner. The
feature keeps working through a bad row, but an attempt to switch it off can fail and nobody
notices.

**Read the string `"false"` as off and `"true"` as on.** Rejected. It guesses what a person meant,
and every other spelling, such as `"False"` or `"no"`, would need another guess. Only a boolean
leaves nothing to guess.

## Agent-Readable Summary

> The AI feature is on only when the `CONFIG / AI_ENABLED` row exists and its `enabled` field is the
> boolean `true`. A missing row, a missing field, or a value of any other type means off: `api`
> refuses with `feature-off` before it counts an attempt, `assess` refuses before the model call,
> and the function writes the `config-value-refused` log line. Do not fall back to a compiled-in
> `true` for this row. Do not read a string such as `"false"` or `"true"` as a boolean. Do not keep
> the last known value when the read succeeded — that rule is only for a read that fails. Do not
> change the fallback of `DAILY_LIMIT` or `MODEL_ID`.
