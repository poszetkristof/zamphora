# ADR-0006 — Choose the model by measuring it, and run on Haiku 4.5 until the measurement exists

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

`00-context-brief.md` §4 prices one assessment on three models, from published Anthropic prices,
using a 1000×1000 px photo at 1296 visual tokens, about 700 input tokens of prompt and about 400
output tokens:

| Model | One assessment | 180 assessments | 1,000 assessments |
| --- | --- | --- | --- |
| Claude Haiku 4.5 | **$0.0040** | $0.72 | $4.00 |
| Claude Sonnet 5 | **$0.0080** | $1.44 | $8.00 |
| Claude Opus 5 | **$0.020** | $3.60 | $20.00 |

`02-decisions.md` D-10 and `00-prd.md` §10 both say plainly that this table is **not** a model
choice. `human-gates.md` row 2 goes further and says that if 400 Architecture treats Haiku 4.5 as
already chosen, that is a `missed` gate and the fault is in the brief. So the choice has to be made
here, with reasons, and not inherited.

What constrains it:

- **The credit balance is about $5 and is topped up by hand** (`factory/feature.md`, 2026-08-25).
  That is roughly 250 assessments on Opus 5, 625 on Sonnet 5 or 1,250 on Haiku 4.5.
- **Hypothesis R1:** spend under $5 to 2026-12-31. **Hypothesis R2:** a burst month of 500
  assessments stays under $10. R2 holds on Haiku 4.5 and Sonnet 5 and **fails on Opus 5**, because
  $10.00 is not under $10.
- **NFR-20:** when the band is `likely`, a person must agree with the verdict at least 8 times in
  10. **Nobody has measured that for any model.** A cheap model that is wrong three times in ten
  costs a plant, which is more than it saves.
- Structured outputs are supported on `claude-haiku-4-5-20251001`, `claude-sonnet-5` and
  `claude-opus-5`, among others
  ([Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs),
  checked 2026-08-25). So ADR-0005 works on all three and the choice is not forced by it.

## Decision

**The model is chosen by measurement, not by price, and the measurement runs before the feature is
used for real.**

**1. Run the golden set on all three, once.** 600 QA's set is 40 photos, each with a verdict a
person wrote down first. Forty photos on all three models is 40 × ($0.0040 + $0.0080 + $0.020) =
**$1.28**, out of a balance of about $5. That is affordable, and it turns the choice from a guess
into a number.

**2. Take the cheapest model that meets NFR-20 and NFR-21** — 8 in 10 agreement on `likely`, 8 in 10
on `cannot-tell`. If two meet it, take the cheaper. If none meets it, that is a finding to hand to
the owner, not a reason to pick the most expensive one and hope.

**3. Until that measurement exists, run on `claude-haiku-4-5-20251001`.** It is the only one where
the whole balance buys over a thousand attempts, so a mistake during the first weeks costs the least.

**4. The model id is configuration, not code.** It sits beside the kill-switch, in the same
DynamoDB `CONFIG` partition, and is read on the same 30-second cache. Changing it needs no deploy.

**5. The model id is always fully dated.** `claude-haiku-4-5-20251001`, never a moving alias. A
silent model upgrade would change the answers without changing a line in the repository, and NFR-20
would drift with nobody able to say when.

> **Checked 2026-08-27 against current Claude API guidance, and there is a conflict to settle before
> the first call.** That guidance says to use the bare id — `claude-haiku-4-5` — and not to append a
> date, because current model ids are already complete. This project's reason for the dated form is
> still good: an alias that moves changes the answers under a measurement that NFR-20 depends on.
> **Both ids appear to be valid, one as an alias and one as a snapshot, but that has not been proved
> here.** Verify with a live `GET /v1/models` before writing the value into the `CONFIG` row, and
> keep the dated form only if it resolves. A wrong id fails every call, so this is worth two minutes
> rather than a guess.
>
> **The cost table above was re-checked on the same day and is correct.** Haiku 4.5 is $1 and $5 per
> million tokens, Sonnet 5 is $2 and $10, Opus 5 is $5 and $25 — the same 1 : 2 : 5 ratio the
> per-assessment figures use. Nothing in decision 2 or the $0.0040 ceiling needs to move.

**6. The cost of every call is computed from the `usage` block the API returns**, never from the
estimate in the table above. The two prompt and answer estimates are named in seam ledger finding 4
as the weakest numbers in the brief.

**7. The trigger to re-run the comparison.** Whenever a new model appears in the price list below
the current one, or whenever the rolling agreement measurement drops under 8 in 10 across 20
assessments. Not on a schedule, because every run costs $1.28.

## Consequences

**What this buys.** The one number nobody has (is the model right often enough?) gets measured
before it matters, for about a quarter of the balance. The choice stops being an opinion about model
size. And moving between models afterwards costs a configuration change, not a release.

**What it costs.** $1.28 of a $5 balance, spent before the feature has produced anything. That is
about a quarter of the money, and it is the best quarter this project can spend, because the
alternative is choosing on price alone and finding out from a dead plant.

**A second cost.** Steps 1 and 2 cannot happen until 600 QA's golden set exists. Until then the
feature runs on Haiku 4.5 with **no evidence that it meets NFR-20**. That gap is real, and it is why
step 3 says "until", not "because Haiku is good enough".

**A third cost.** Holding the model id in the data store means a wrong value there breaks every
call. The value is validated against a closed list on read, and an unknown id falls back to the
compiled-in default rather than being sent to the API.

## Alternatives considered

**Pick Haiku 4.5 outright, on price.** Rejected, and this is the option the run was explicitly
warned about. `human-gates.md` row 2 names it as a `missed` gate if it happens. Price is not
evidence about whether the answer is right.

**Pick Sonnet 5 outright, as the middle.** Rejected. "The middle one" is not a reason. It is twice
the price of Haiku with no measurement behind it either way.

**Pick Opus 5, because a wrong verdict costs a plant.** Rejected on two counts. It fails hypothesis
R2 by the narrowest margin there is, and it buys about 250 attempts from the whole balance — which
means the feature goes dark sooner, and a feature that is dark is wrong 10 times in 10.

**Amazon Bedrock instead of the Anthropic API.** Not an option. `factory/feature.md` decides it:
Bedrock is not used, and the model is paid from the owner's own Anthropic credit on a separate
account.

**Let an admin choose the model per call.** Rejected. It would make NFR-20 unmeasurable, because the
agreement figure would be an average over a mixture nobody recorded.

## Agent-Readable Summary

> The model id lives in the `CONFIG` partition of the DynamoDB table as a fully dated id, and the
> run-1 default is `claude-haiku-4-5-20251001`. Do not hard-code a model id in a request, and do not
> use a moving alias such as `claude-haiku-latest` — a silent upgrade would move the accuracy
> measurement with nothing in the repository changing. Do not switch to a more expensive model
> without running the 40-photo golden set on both and comparing agreement. Do not compute the cost
> of a call from an estimate; always read the `usage` block the API returns.
