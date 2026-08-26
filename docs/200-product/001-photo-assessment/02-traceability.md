# Traceability — story to metric to epic

**Written by** 200 Product, run 1 (`photo-assessment`). **Date:** 2026-08-24.
**Read next by** 300 Design, 400 Architecture, 500 Engineering, 600 QA.

This file answers three questions and nothing else. Which metric does each story move? Where did
each number come from? Is anything left hanging, on either side?

A story with no metric cannot be judged after it ships. A metric with no story is a number nobody is
working on. Both are findings, so both are checked at the bottom of this file.

**The epic column is a grouping, not an order.** What gets built first is the owner's decision, and
this role does not make it. `00-prd.md` section 8 says the same.

---

## 1. Every metric, with its threshold, its window and its source

| ID | The metric | Threshold | Window | Source |
| --- | --- | --- | --- | --- |
| M-01 | Suggested next actions the user accepts and completes. "Accepts" means the care task still exists after 7 days and was marked done | at least 8 of every 10 | the first 8 weeks after the feature works end to end, and at least 20 assessments | `00-context-brief.md` 3, hypothesis V1. **Provisional — open question O-1, gate G-4** |
| M-02 | Assessments the user starts | at least 6 | the same 8 weeks | `00-context-brief.md` 3, hypothesis V2 |
| M-03 | A person agrees with the verdict when the band was `likely` | at least 8 in 10 | the first 20 real assessments | `factory/feature.md`, "What confidence means". **Provisional by its own words — replaced by the measurement** |
| M-04 | A person agrees the photo was unusable when the band was `cannot-tell` | at least 8 in 10 | the first 20 real assessments | `factory/feature.md`, same section. **Provisional, same rule** |
| M-05 | Anthropic spend for this feature | under $5 | 2026-07-01 to 2026-12-31 | `00-context-brief.md` 4, hypothesis R1 |
| M-06 | Requests that read a pot, photo or assessment owned by another account and succeed | 0 | every release, and counted continuously in the log | `factory/feature.md`, "Every user signs in"; UC-4 |
| M-07 | Photos in storage older than 180 days | 0 | checked every month | `factory/feature.md`, the retention decision of 2026-08-24 |
| M-08 | Failed assessments whose message does not say whether trying again helps | 0 | every release | UC-6, Usability condition |
| M-09 | Texts that exist in one language and are missing in the other | 0 | every release | `factory/feature.md`, Hungarian and English in run 1 |
| M-10 | Model calls started after the admin switch was turned off, later than the propagation window | 0 | every release, and in the log | UC-7 |
| M-11 | Assessment results shown without the AI notice | 0 | every release | `00-context-brief.md` 5.4, EU AI Act Article 50(1) |
| M-12 | Time from tapping send to a result or a message | at or under **30 seconds** | 9 of 10 assessments, first 8 weeks | UC-1, Usability condition. Number set by the owner 2026-08-25, gate G-5 |
| M-13 | Times a returning user is asked to sign in again inside the session window | 0 | first 8 weeks | UC-4, Usability condition. Window is **30 days**, set by the owner 2026-08-25, gate G-7 |
| M-14 | Model calls made for a user who was already at the daily limit | 0 | continuous | `00-context-brief.md` 4, "the cost that is not small". Limit is **10 a day**, set by the owner 2026-08-24, gate G-2 |
| M-15 | Difference between the model call count an admin reads and the provider's own count, for a finished day | 0 | every release | UC-7 |
| M-16 | Photos sent to the model with a longer side over 1000 px | 0 | continuous | UC-1, Feasibility condition; token arithmetic in `00-context-brief.md` 4 |
| M-17 | Care tasks created from an `unsure` result without an explicit yes | 0 | every release | `factory/feature.md`: never write a care task without asking first |
| M-18 | Admin-only actions that succeed for a USER account | 0 | every release | `factory/feature.md`, two account types from day one |
| M-19 | Share of results in the `cannot-tell` band | at or under 3 in 10 | across 20 assessments | `factory/feature.md` says a model hiding behind `cannot-tell` is failing. **The 3 in 10 is a proposal by this role. The owner sets it** |
| M-20 | Care tasks the user deletes within 7 days | at or under 2 in 10 | the same 8 weeks as M-01 | The other side of M-01, `00-context-brief.md` 3. Provisional with it |
| M-21 | Automatic retries after a failed model call | **0** | continuous | UC-6, Viability condition. **Reversed by the owner 2026-08-26.** Was "at or under 1 — two attempts in total" (gate G-9, 2026-08-25). Two attempts cost about $0.0070 against a $0.0040 ceiling, and squeezed the time budget. Nothing is retried in run 1 |
| M-22 | Model calls per assessment | exactly 1 | continuous | `factory/feature.md`, In scope: "One model call" |
| M-23 | Screens between signing in on a clean account and sending the first photo | at most **3** | every release | US-15, added 2026-08-25 from gate 21. It guards the thing the story exists for: that a new account can reach an assessment at all, and that the add-a-pot screen does not grow |

**Five of the six numbers that were missing on 2026-08-24 now exist.** The owner set them on the 24th
and the 25th: the daily limit in M-14 (10 a day), the time budget in M-12 (30 seconds), the session
window in M-13 (30 days), the retry limit in M-21 (now zero), and the retention of the assessment
text behind US-10 (no clock — it lives as long as the pot). **One is still missing:** how far back
the admin figures in US-12 reach, AC-4. 180 days is proposed there, to match the photo retention.
**Do not guess that one in code.**

**M-01 and M-03 both read "8 in 10" and they are not the same test.** M-01 counts the user acting.
M-03 counts the model being right. `00-context-brief.md` warns that the two numbers match by
accident. A test that reports one of them as the other is wrong even when it passes.

## 2. Every story, its one outcome metric, its guardrail and its epic

| Story | Account | Backbone | Use case | Outcome metric | Guardrail | Epic |
| --- | --- | --- | --- | --- | --- | --- |
| US-01 Send one photo of one named pot | USER | 5 | UC-1 | M-02 | M-22, M-12, M-16 | E-1 Capture and assess |
| US-02 Verdict, band, next action, follow-up days | USER | 5 | UC-1 | M-03 | M-05, M-22 | E-1 Capture and assess |
| US-03 Turn the next action into a dated task | USER | 5, hands to 6 | UC-2 | M-01 | M-20 | E-3 Care task |
| US-04 See an `unsure` result honestly | USER | 5 | UC-3 | M-17 | M-19 | E-2 Honest result |
| US-05 See `cannot-tell` with a reason | USER | 5 | UC-3 | M-04 | M-19 | E-2 Honest result |
| US-06 Know the answer came from an AI model | USER | 5 | UC-1, 5.4 of the brief | M-11 | — | E-2 Honest result |
| US-07 Sign in once, see only my own things | USER | 5 | UC-4 | M-06 | M-13 | E-4 Account and permission |
| US-08 Be stopped at my own limit | USER | 5 | UC-6 | M-14 | M-05 | E-6 Limits and failures |
| US-09 A message that says if retrying helps | USER | 5 | UC-6 | M-08 | M-21 | E-6 Limits and failures |
| US-10 See the retention, delete my photos | USER | 5 | UC-5 | M-07 | M-06 | E-5 Photo storage and deletion |
| US-11 The whole flow in both languages | USER | 5 | cross-cutting | M-09 | — | E-8 Two languages |
| US-12 An admin reads usage and cost | ADMIN | 5 | UC-7 | M-15 | M-05 | E-7 Admin control |
| US-13 An admin turns the AI off, no deploy | ADMIN | 5 | UC-7 | M-10 | M-05 | E-7 Admin control |
| US-14 A normal account is refused admin actions | ADMIN and USER | 5 | UC-4, UC-7 | M-18 | M-06 | E-4 Account and permission |
| US-15 Add a pot | USER | 5, as the step that makes it reachable | **none — gate 21** | M-23 | M-06 | E-4 Account and permission |

Two stories carry no guardrail on purpose. US-06 shows a true sentence, and US-11 translates text.
Neither has a number that could be pushed too far in the other direction.

## 3. The checks

### 3.1 No story without a metric

Fifteen stories, fifteen outcome metrics, each story mapped to exactly one. **No orphan story.**

**US-15 was added on 2026-08-25, after this role ran.** It is the only story that comes from no use
case: 300 Design found that nothing said how a plant gets into the app, and the owner put it in
scope as gate 21. It is written into this file by hand rather than by 200 Product, and that is
declared in `factory/runs/001-photo-assessment/seam-ledger.md`.

### 3.2 No metric without a story

| Metric | Used by |
| --- | --- |
| M-01 | US-03 outcome |
| M-02 | US-01 outcome |
| M-03 | US-02 outcome |
| M-04 | US-05 outcome |
| M-05 | US-02, US-08, US-12, US-13 guardrail |
| M-06 | US-07 outcome, US-10 and US-14 guardrail |
| M-07 | US-10 outcome |
| M-08 | US-09 outcome |
| M-09 | US-11 outcome |
| M-10 | US-13 outcome |
| M-11 | US-06 outcome |
| M-12 | US-01 guardrail |
| M-13 | US-07 guardrail |
| M-14 | US-08 outcome |
| M-15 | US-12 outcome |
| M-16 | US-01 guardrail |
| M-17 | US-04 outcome |
| M-18 | US-14 outcome |
| M-19 | US-04, US-05 guardrail |
| M-20 | US-03 guardrail |
| M-21 | US-09 guardrail |
| M-22 | US-01, US-02 guardrail |
| M-23 | US-15 outcome |

**No orphan metric.**

### 3.3 Every use case reached a story

| Use case | Rank in `01-use-cases.md` | Stories |
| --- | --- | --- |
| UC-1 Photo in, assessment out | 1 | US-01, US-02, US-06 |
| UC-2 Next action becomes a task | 2 | US-03 |
| UC-3 See when the model is not sure | 3 | US-04, US-05 |
| UC-4 Sign in, see only my own | 4 | US-07, US-14 |
| UC-5 Retention and delete | 5 | US-10 |
| UC-6 A clear message on failure | 6 | US-08, US-09 |
| UC-7 Admin reads figures, admin turns it off | 7 | US-12, US-13 |

**No use case was dropped.** The rank order of the use cases is kept: UC-1 is first because it is
backbone feature 5, and nothing found by research was allowed above it.

### 3.4 Every backbone feature is accounted for

| Backbone | Where it is |
| --- | --- |
| 1 Watering intervals | `00-prd.md` section 3. Run 2. Not built here, and above every idea in the Out list |
| 2 Soil intervals | Same. Run 2 |
| 3 Placement advice | Same. Run 4. Idea W-7 is a way of building it, not a replacement for it |
| 4 Documenting a plant over time | Same. Run 5 |
| 5 Photo assessment | **All fourteen stories** |
| 6 Notifications | `00-prd.md` section 3. Run 3. US-03 writes the task that it will deliver |

### 3.5 Every researched idea stayed out

All seven ideas from `03-market.md` section 2 are in `00-prd.md` section 6.2, each with the owner
named as the person who owns the product. **None of them produced a story.** W-1 is the only one
that touches run 1, and only because `factory/feature.md` had already decided Hungarian and English
ship — that decision came from the owner, not from the market scan.

### 3.6 The ten gates, and what the owner answered

All ten were open when this file was written on 2026-08-24. All ten are closed. The answers live in
`factory/feature.md`, "Human decisions already made", which is the file every later role reads.

| Gate | The question | The answer | When |
| --- | --- | --- | --- |
| G-1 | The fourth response field | Yes — the follow-up in whole days | 2026-08-24 |
| G-2 | The per-user daily limit | 10 a day, checked before the model call. With no retry, 10 calls means 10 assessments | 2026-08-24 |
| G-3 | How long the assessment text is kept | No clock. It lives as long as the pot. An account idle 12 months is deleted, warned at 11 | 2026-08-24 |
| G-4 | Confirm or replace the 8 in 10 in M-01 | Kept, marked provisional until 20 real assessments replace it | 2026-08-24 |
| G-5 | The time budget in M-12 | 30 seconds, tap to something on screen | 2026-08-25 |
| G-6 | A plant person checks the ten verdict codes | Ship the ten, review after the first 20 real assessments. A rising share of `other` is the signal | 2026-08-25 |
| G-7 | The session window in M-13 | 30 days | 2026-08-25 |
| G-8 | How fast the kill-switch must take effect, in M-10 | 60 seconds | 2026-08-25 |
| G-9 | The retry limit in M-21 | **Reversed 2026-08-26: no retry, one call per assessment.** Was: one retry, two attempts in total | 2026-08-25, reversed 2026-08-26 |
| G-10 | Whether the EU AI Act applies here | Left unanswered on purpose. US-06 shows the notice either way. **Re-opens the day the app is offered to another person** | 2026-08-25 |

Two more decisions arrived with them and no gate had asked for either. There is **no total cap on
spend** — the credit balance running out is the stop. And the second-opinion API in `03-market.md`
W-4 is **rejected outright, not deferred**; no role may propose one again.

Open question O-1 from `00-context-brief.md` is gate G-4 and is answered. O-10 is G-3 and is
answered. **O-9 is still open:** the 30-assessments-a-month estimate was worked out from four plants
and the owner now keeps at least eight pots, so real use may be higher than every cost figure on this
run assumes. O-2 and O-6 do not block any story here.
