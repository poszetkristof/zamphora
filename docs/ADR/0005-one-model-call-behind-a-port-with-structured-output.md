# ADR-0005 — Make one model call, behind one port, with structured output

- **Status:** Accepted. **The "no retry" rule is superseded in part by ADR-0014 (2026-09-17):** the
  background workflow retries the model call at most twice, on three named errors. ADR-0018 says how
  the workflow counts those calls. Everything else in this record stands.
- **Date:** 2026-08-25

## Context

The ladder for any AI shape is plain code → one model call → a fixed chain of calls → an agent. The
rule is to take the lowest rung that works and to say why the rung above is not needed.
`00-options.md` §8 works through it. In short: plain code cannot turn a photograph into a verdict; a
chain would cost twice with nothing new to work from; and an agent needs tools, of which this
feature has none — the second-opinion service is rejected outright by the owner, species
identification is out of scope on purpose, and a follow-up conversation is out of scope.

`CLAUDE.md` already names the port: *"Every model call goes through `LlmProvider`. No SDK import
outside its adapter."* `factory/feature.md` requires the swap to another provider to stay possible.

`factory/feature.md` also settled, on 2026-08-25, that **an answer the app cannot read is a failure
and never a verdict**, and it required three things of the call after checking Anthropic's own
guidance: use structured output so a broken answer is rare, check `stop_reason` before reading the
content, and never match on the raw text of the answer.

## Decision

**One model call per attempt, made through `LlmProvider` in `packages/llm`, with the answer shape
enforced by structured output.**

### The port

```
assess(input: AssessmentRequest): Promise<AssessmentOutcome>
```

`AssessmentOutcome` is **either** a parsed answer **or** one of the named failures in
`05-patterns.md` §8. It is never a thrown vendor error. US-09 AC-1 requires every failure message to
end with one of two sentences, so the failure has to arrive as a value the code can switch on, not
as an exception whose shape depends on which SDK is installed.

### The three rules the adapter follows, in this order

**1. Make a broken answer nearly impossible.** The request carries `output_config.format` with the
answer schema, `additionalProperties: false`, and every field in `required`. Structured outputs
*"constrain the model's text response to a JSON object that matches a schema you provide"*
([Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs),
checked 2026-08-25). Handling a broken answer is the net, not the plan.

**2. Read `stop_reason` before reading the content.** The documented values include `end_turn`,
`max_tokens`, `refusal`, `stop_sequence`, `tool_use`, `pause_turn` and
`model_context_window_exceeded`
([Anthropic, handling stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons),
checked 2026-08-25). Three matter here and they are three different things:

| `stop_reason` | What it means | Retry? | Named failure |
| --- | --- | --- | --- |
| `end_turn` | A real answer. Parse it | — | — |
| `refusal` | A safety classifier declined. It arrives as a normal success | **never** | `provider-refused` |
| `max_tokens` | The answer was cut off. Retrying without more room fails identically | **never** | `answer-truncated` |

**The user sees one screen for all three failures. The log records which one happened**, because
that difference is the whole signal for 800 Infra.

**3. Never match on the raw text.** Parse it. A model version can escape characters differently, so
string matching breaks silently on an upgrade.

### The answer schema

Six fields, all present, all allowed to be null. The full table is in `05-patterns.md` §4.

**The range 1 to 30 on `followUpDays` is not in the schema, because it cannot be.** Anthropic's
structured outputs do not support numerical or string-length constraints (same page, checked
2026-08-25). The check is ours, in Zod, after parsing. US-03 AC-6 already says what happens when it
fails.

**The cross-field rules are not in the schema either.** Nullable fields plus a Zod refinement is
smaller, is testable with no model call, and does not depend on which parts of JSON Schema the
vendor supports this month.

### Retries: the adapter never retries, the workflow retries at most twice

**The adapter itself never retries.** The Anthropic client is built with `maxRetries: 0`, because
the SDK retries twice on its own by default, and a hidden retry is a hidden cost.

**The retry lives in one declared place: the Step Functions workflow (ADR-0014, ADR-0018).** The
`assess` handler throws exactly three of the adapter's failure values as errors — `provider-timeout`,
`provider-throttled` and `provider-unavailable` — and the workflow calls the model again at most
twice after those three, after 2 seconds and then 4. Every other outcome is returned as a value and
is never retried: a refusal, a truncated answer, a bad request, an empty balance.

**Why the retry needs the background.** If the phone waited for the answer, a retry would break two
numbers at once: two calls cost about $0.0070 against the $0.0040 per-call ceiling, and a first call
would have to fail early enough to leave room for a second. That is why the owner allowed no retry
on 2026-08-26, while the call still sat inside the request. With the assessment in the background
neither problem exists. The cost ceiling is stated per photo, $0.012 for three calls (NFR-10), and
the cap is two lines: "`callsMade` under 3" in the workflow's `RetryOrStop` (ADR-0018) and
`maxRetries: 0` here.

## Consequences

**What this buys.** The provider is one file. Swapping it is a new adapter behind the same port, not
a change anywhere else. A broken answer becomes rare rather than routine, and the rare case has a
name, a screen and a count (NFR-23). The three not-a-verdict cases are told apart in the log, so a
rise in refusals looks different from a rise in truncations.

**What it costs.** Structured output adds latency on the first request with a new schema: *"The
first time you use a specific schema, there is additional latency while the grammar compiles"*, and
compiled grammars *"are cached for 24 hours from last use"* (same page, checked 2026-08-25). For one
user who assesses a plant every few days, **that cost is paid on almost every visit**, so it sits in
the budget column of `03-flow.md` at a guessed 1,500 ms and not in a footnote.

**A second cost.** The port's shape means the adapter, not the caller, decides what a failure is
called. If a new provider has a failure mode none of the current names fit, the list in
`05-patterns.md` §8 grows, and every new name needs a screen in `02-SPEC.md` §6 before it can ship.

**A third cost.** A malformed answer needs its own place on screen, and it must not look like a
verdict. It is `answer-unreadable` on the failure path, shown as a `FailureNote` in state
`retry-may-work` (`02-SPEC.md` §3.14 and §3.16 state 10). It never reaches SC-5.

## Alternatives considered

**A tool with `strict: true` instead of `output_config.format`.** Both are named in
`factory/feature.md` as acceptable. `output_config.format` is chosen because there is no tool to
call — the model is not doing anything, it is answering — and a tool definition would be a fiction
wrapped around a single response.

**Ask for JSON in the prompt and parse it.** Rejected. That is what structured output replaces, and
it turns every model upgrade into a coin toss.

**A chain: one call to describe the photo, a second to pick a verdict.** Rejected. It doubles the
cost of every assessment against a balance of a few hundred calls, and the second call would work
from a description of a photo instead of the photo.

**An agent with tools.** Rejected. There are no tools. An agent with no tools is one call with extra
machinery around it.

**A fixed table from verdict to follow-up interval**, replacing the fourth field with plain code.
This was on the table and **the owner rejected it on 2026-08-24**: cheaper and fully testable, but
it gives the same date for the same verdict every time. Recorded here, not re-opened.

**Five tries with doubling waits.** Rejected by the owner on 2026-08-25. The usual advice assumes a
retry is nearly free. Here every attempt is a paid call. While the phone waited, the waits alone
overran the budget. With the assessment in the background (ADR-0014), the owner capped a run at
three calls in total instead, because each one still costs money.

## Agent-Readable Summary

> One Anthropic call per attempt, made only through `LlmProvider` in `packages/llm`. Do not import
> the Anthropic SDK anywhere outside `packages/llm/src/adapters/`. Do not add a second model call,
> a chain, an agent loop or a second opinion service. Always send `output_config.format` with
> `additionalProperties: false` and every field in `required`, and always read `stop_reason` before
> reading the content. Keep `maxRetries: 0` on the client. **Do not write a retry anywhere in
> code** — the only retry in the product is the workflow's, at most two more calls, on the three
> errors the `assess` handler throws (ADR-0014, ADR-0018). Do not call `LlmProvider` from the `api`
> function. Do not match on the raw text of an answer — parse it.
