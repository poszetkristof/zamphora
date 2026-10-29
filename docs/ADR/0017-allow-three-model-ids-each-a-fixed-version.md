# ADR-0017 — Allow exactly three model ids, each one a fixed version

- **Status:** Accepted 2026-10-29, by the owner (gate 83)
- **Date:** 2026-10-29
- **Supersedes in part:** [ADR-0006](0006-choose-the-model-by-measuring-it.md). Three things there
  are replaced: the list of models to compare (decision 1), the rule that every model id carries a
  date (decision 5), and the table of retirement dates (decision 8). Everything else in ADR-0006
  still stands. The model is chosen by measuring it. The default is Haiku 4.5 until the measurement
  exists. The id is configuration, not code. The cost of a call is read from the `usage` block.

**What this record decides:** which `MODEL_ID` values the app accepts, and how an id is pinned to
one model version. **What is still open:** nothing. The first golden-set run compares the two
Haiku models only (gate 85). **What to do next:** 500 Engineering writes the list into
`03-api-spec.md` §6, which today says "a closed list" and names no value.

## Context

ADR-0006 named three models to compare: Haiku 4.5, Sonnet 5 and Opus 5. It also said every model id
must carry a date, so the provider cannot move it. Two things changed.

- **The owner named the allowed list** (gate 83, from seam ledger finding 56). `03-api-spec.md` §6
  checks `MODEL_ID` against a closed list, and no file said what was on it.
- **Anthropic's id rule changed.** The models overview says: *"Every Claude model ID is a pinned
  snapshot, including the dateless IDs used from the 4.6 generation on."* For models before 4.6, an
  id with no date is still an alias that points at a dated id. So "always dated" would now refuse
  the two newest models, which have no dated form.

The facts behind the list. This table is a lookup table, one row per allowed model.

| Model | API id | Price per million tokens, input / output | One assessment, estimated | Retires no sooner than | Structured outputs |
| --- | --- | --- | --- | --- | --- |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | $1 / $5 | $0.0040 | 2026-10-15. **That date has passed** | supported |
| Claude Haiku 5.5 | `claude-haiku-5-5` | from $0.10 / from $0.50 | $0.0004 | 2027-10-07 | supported |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 / $10 | $0.0080 | 2027-09-28 | supported |

Where each column comes from, all checked 2026-10-29 unless the row says otherwise:

- **Ids, the 5.5 prices, and image input** from the
  [models overview](https://platform.claude.com/docs/en/about-claude/models/overview). It says all
  current models accept image input. The Haiku 4.5 price is from ADR-0006, checked 2026-08-28. The
  condition on the Haiku 5.5 price, "for prompts up to 100,000 tokens", is quoted in
  `factory/feature.md` from the pricing page and was not re-checked in this pass. One assessment is
  about 2,000 input tokens, so it is far under that condition and the lower price applies.
- **Retirement dates** from [model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations).
  All three are Active. Anthropic gives at least 60 days' notice before it retires a model.
- **Structured outputs** from [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
  Its list of supported models names all three ids. So ADR-0005 works on every model on the list.
  This closes the one fact `factory/feature.md` marked as not checked.

**The "one assessment" column is an estimate**, made the way ADR-0006 made it: about 2,000 input
tokens (1,296 for the photo and about 700 of prompt) and about 400 output tokens. Two things make it
weaker for the new models, and both are unverified:

- **Thinking.** Haiku 5.5 and Sonnet 5.5 use adaptive thinking, which means the model decides how
  much to reason before it answers. The overview says Sonnet 5.5 refuses a request that turns
  thinking off. If those thinking tokens are billed as output, the Sonnet 5.5 figure is a lower
  bound. How many tokens one assessment uses on thinking has not been measured.
- **Image tokens.** The 1,296 figure was measured for the older models. The overview says a newer
  tokenizer arrived with Opus 4.7. Whether a 1000 px photo costs the same number of tokens on the
  5.5 models has not been checked.

Neither changes a decision below, because ADR-0006 decision 6 already says the cost of each call is
read from the `usage` block the API returns, never from this table.

## Decision

**1. `MODEL_ID` accepts exactly three values:** `claude-haiku-4-5-20251001`, `claude-haiku-5-5` and
`claude-sonnet-5-5`. They live in one named `const` list in code. Any other value is refused and is
never sent to the API. The compiled-in default is used instead, as ADR-0006 already says.

**2. The default stays `claude-haiku-4-5-20251001`** until the golden-set run has measured the other
two. This is the owner's rule (gate 83).

**3. "The id names one fixed version" replaces "the id carries a date".** For Haiku 4.5 the fixed
version is the dated id. Its bare alias `claude-haiku-4-5` stays refused, because the provider can
move an alias with no deploy. For Haiku 5.5 and Sonnet 5.5 the id has no date, and it is already a
fixed version. **The list is the pin:** a value that is not on it never reaches the API, so a moving
alias cannot arrive by accident.

**4. The comparison runs on these three models**, not on ADR-0006's three. ADR-0006 decision 2 is
unchanged: take the cheapest model that meets NFR-20 and NFR-21. Forty photos on all three is
40 × ($0.0040 + $0.0004 + $0.0080) = **about $0.50**, estimated. One run on Sonnet 5.5 alone is about
$0.32, which is over NFR-11's $0.20 for one `ai-eval` run. **So the first comparison runs on the two
Haiku models only**, about $0.18 (gate 85, the owner's answer). Sonnet 5.5 is measured only if
neither Haiku meets NFR-20 and NFR-21, and that run needs a new decision by the owner.

**5. The retirement watch moves to the table above.** Haiku 4.5 is the default and has passed its
earliest retirement date. Anthropic will email a notice at least 60 days before it retires a model.
**That email is the trigger to run the golden set and switch the default**, inside those 60 days.
Re-check the three dates before the first deploy, and again whenever the golden set runs.

**6. No Opus id is on the list.** Adding any id is a new decision by the owner.

## Consequences

**What this buys.** Finding 56 is closed: the closed list now has values. Two newer models can be
measured, and one of them costs a tenth of today's default per call. If Haiku 5.5 meets NFR-20, the
same $5 balance buys about ten times as many assessments.

**What it costs.**

- **The default is the model closest to retirement.** If the notice arrives and the golden set has
  not been run, the owner has to choose between two bad options: switch to a model nobody measured,
  or let the feature go dark on the retirement day.
- **Sonnet 5.5 is twice NFR-10's ceiling of $0.0040 per call**, before any thinking tokens. Making it
  the default would break NFR-10 and NFR-11. Both numbers would have to be raised in the same
  change, and raising a cost ceiling is a spending decision, so it is the owner's.
- **The list is in code, so a fourth id needs a deploy.** That is on purpose. A new model is a
  decision, not a row edit in the table.

**Why Opus is out.** `factory/feature.md` gives the owner's reason: one month of 500 assessments on
Opus breaks the $10 burst limit (hypothesis R2 in ADR-0006). That holds on Opus 5. On Opus 5.5's
price, $4 and $20 per million tokens (models overview, checked 2026-10-29), one call is about
$0.016. So 500 one-call assessments are about $8.00, and up to about $24 when every photo takes
three calls (ADR-0014). The owner's decision stands either way.

## Alternatives considered

**Only Haiku 5.5 and Sonnet 5.5.** Rejected by the owner. It changes the default before anyone has
measured the new models.

**Keep ADR-0006's three: Haiku 4.5, Sonnet 5 and Opus 5.** Rejected. It leaves out both newer models,
one of which is the cheapest by far, and Opus 5 already fails hypothesis R2.

**Accept any id the API accepts.** Rejected. A typing mistake or a moving alias would change the
answers or the spend, and NFR-20 could no longer be tied to one model.

**Keep "every id carries a date" word for word.** Rejected. It would refuse Haiku 5.5 and Sonnet 5.5,
which have no dated form. The reason behind the rule, that the model must not change under the app,
is kept by decision 3.

## Agent-Readable Summary

> `MODEL_ID` accepts exactly `claude-haiku-4-5-20251001`, `claude-haiku-5-5` and
> `claude-sonnet-5-5`, from one named `const` list, and the default is `claude-haiku-4-5-20251001`.
> Do not accept any other value. That includes the alias `claude-haiku-4-5`, any Opus id and any
> `-latest` alias: refuse it and use the default. Do not change the default without running the
> 40-photo golden set and comparing agreement. Do not add an id to the list without a new decision
> by the owner.
