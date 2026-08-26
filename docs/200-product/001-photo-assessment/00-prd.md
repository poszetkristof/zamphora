# PRD — photograph a sick plant, get an assessment and a next action

**Written by** 200 Product, run 1 (`photo-assessment`). **Date:** 2026-08-24.
**Read next by** 300 Design, 400 Architecture, 500 Engineering, 600 QA.

This document says what this run builds, what it does not build, and how anyone can tell later
whether it worked. It is built only from `factory/feature.md` and the three files
`docs/100-consulting/` produced. Where a fact was missing, the gap is written down and handed to a
person. Nothing is invented to fill a hole.

The stories live in `01-user-stories.md`. Every number in this file has an ID in
`02-traceability.md`, with the threshold, the window and where it came from.

---

## 1. The problem, in one paragraph

One person keeps at least eight pots of houseplants in an apartment. When a plant starts to look
unwell, he cannot tell what is wrong or what to do about it (`00-context-brief.md`, section 1). The
moment that matters is short: he is standing in front of the plant, holding a phone in one hand, and
the light is often poor. This run builds the one thing that closes the gap between "this leaf looks
wrong" and "here is what I do today". The output that has value is the **next action**, not the
name of the illness.

## 2. The one feature

**Photograph a plant that looks unwell, and get back an assessment with a next action.**

The plant is already named by the user, so the model is not asked which plant it is. One model call
per assessment. The result is one verdict, one confidence band, one next action, and the number of
days until the follow-up. The user can turn that next action into a dated care task for that pot.

## 3. The backbone, and where this run sits

These six features were named by the owner. They are approved and they are the highest priority.
Nothing found by research and nothing thought up by a role sits above any of them.

| # | Backbone feature | Run | Served by stories in this run |
| --- | --- | --- | --- |
| 1 | Watering intervals per plant | Run 2 (planned) | Not this run |
| 2 | Soil replacement intervals per plant | Run 2 (planned) | Not this run |
| 3 | Placement advice — where a plant goes for the right sun | Run 4 (planned) | Not this run |
| 4 | Documenting how a plant is doing over time | Run 5 (planned) | Not this run |
| 5 | **Photo assessment by AI** | **Run 1 — this run** | **US-01 to US-14, all of them** |
| 6 | Notifications when it is time to act | Run 3 (planned) | US-03 writes the task that feature 6 will later deliver. Delivery is not built here |

Two of the owner's requirements are not features. They apply to every feature above: **two
languages (Hungarian and English)** and **phone first**. In this run they are carried by US-11 and
by the moment written into every story.

**Every story in this run serves backbone feature 5.** No story in this run serves an idea that came
from the market scan. Section 6 keeps those ideas in the Out list.

## 4. In scope

| ID | In scope | Story | From |
| --- | --- | --- | --- |
| S-1 | Take a photo with the camera, or choose one from the phone, for one named pot | US-01 | `factory/feature.md`, In scope |
| S-2 | Two free checks before the model call: the file is a format the app accepts, and the plant is named | US-01 | `factory/feature.md`, "What confidence means" |
| S-3 | Store the photo, with the 180-day rule and delete on demand | US-10 | `factory/feature.md`, In scope |
| S-4 | One model call that returns a verdict, a confidence band, a next action and a follow-up in days | US-02 | `factory/feature.md`, In scope |
| S-5 | Show the result honestly, including `unsure` and `cannot-tell` | US-04, US-05 | `factory/feature.md`, In scope |
| S-6 | Say on screen that the assessment came from an AI model | US-06 | `00-context-brief.md` 5.4, EU AI Act Article 50(1) |
| S-7 | Turn the next action into a dated care task for that pot | US-03 | `factory/feature.md`, In scope |
| S-8 | Sign in, and see only your own pots, photos and assessments | US-07, US-14 | `factory/feature.md`, Human decisions |
| S-9 | A per-user limit on assessments, checked before any model call | US-08 | `00-context-brief.md` 4, the cost that is not small |
| S-10 | A clear message for every failure, saying whether trying again helps | US-09 | `factory/feature.md`, In scope |
| S-11 | An admin can read the usage and cost figures | US-12 | `factory/feature.md`, Human decisions |
| S-12 | An admin can turn the AI feature off without a deploy | US-13 | `factory/feature.md`, Human decisions |
| S-13 | Every screen in this flow works in Hungarian and in English | US-11 | `factory/feature.md`, Human decisions |

## 5. What the model returns

`factory/feature.md` fixed the confidence band. `01-use-cases.md` (UC-1) left the list of possible
verdicts to this role. Here it is.

### 5.1 The confidence band — three values, no percentage

| Band | What the app does |
| --- | --- |
| `likely` | Show the verdict and the next action. Offer the care task, one tap, date already filled in |
| `unsure` | Show the verdict, say it may be wrong, say what a better photo would be. Ask before writing any task |
| `cannot-tell` | Show no verdict. Show a reason from a fixed list. No task can be made |

**No percentage and no score ever reaches the user.** A number the model writes about itself is not
a measurement, so it would make the answer look measured when it is not.

### 5.2 The verdict list — ten values, closed

A closed list means the answer can be typed in a contract and counted in a test. Free text cannot be
counted. Each verdict also carries one short sentence for the user, and the sentence is not free of
the list: the code decides which screen is shown.

| Code | Meaning |
| --- | --- |
| `water-too-much` | Too much water, or the pot stands in water |
| `water-too-little` | Too little water |
| `light-too-much` | Too much direct sun |
| `light-too-little` | Too little light |
| `pest` | An animal problem, for example spider mites |
| `disease` | A spot or a rot on leaves or stem, from a fungus or bacteria |
| `root-problem` | A problem at the roots, for example root rot |
| `nutrient-problem` | Something missing from the soil |
| `nothing-wrong` | Normal. For example an old leaf dying at the bottom |
| `other` | A real problem that is not one of the nine above |

`nothing-wrong` is there on purpose. Without it, the model must always find a fault, and it will
invent one. `other` is there so the model does not have to force a wrong code, and its next action
must still be a thing to do.

**This list needs a human check.** It was built from the symptom words that appear in the three
input files: yellow leaves, brown edges, brown spots, spider mites, root rot, standing water, light,
nutrient problems, and harmless look-alikes. No plant reference book was given to this role. See
gate G-6 in section 8.

### 5.3 The fourth field

`factory/feature.md` names three fields: verdict, confidence, next action. A care task needs a
date, and `01-use-cases.md` (UC-2, Viability) says the model must return the follow-up date in a
shape the code can read, not inside a sentence. So the response carries a **fourth field: the
follow-up in whole days**. This is a product decision made here, and it is written down because it
adds a field to what `factory/feature.md` listed. See gate G-1 in section 8.

## 6. Out of scope

**"Out" means not this run.** Each line names who owns the decision to bring it back.

### 6.1 Out because `factory/feature.md` says so

| Out | Owner of the decision |
| --- | --- |
| The watering-schedule engine | The owner. It is backbone 1 and 2, planned for run 2 |
| Push notification delivery | The owner. It is backbone 6, planned for run 3 |
| Sharing a plant between two people | The owner |
| Admin **screens** | The owner. The permission check and the switch ship now, the screens do not |
| Identifying which plant it is from the photo | The owner. Left out on purpose. The user names the pot |
| A follow-up chat about the assessment | The owner. It changes the cost model |

### 6.2 Out because it came from the market scan, not from the owner

Every idea in `03-market.md` section 2 is listed here. **The owner of every line is the owner of the
product, a person. This role does not pull any of them into scope.**

| # | The idea | Owner | Note |
| --- | --- | --- | --- |
| W-1 | Hungarian written for Hungarian, not translated — plant and symptom words people really use | The owner | The *shipping* of Hungarian is in run 1 (US-11). Only the depth of the wording is Out |
| W-2 | Pay per use instead of a subscription | The owner | There is no payment in this product at all yet |
| W-3 | Show what in the photo the model looked at | The owner | Tempting, because it would make `unsure` easier to believe. Still Out. No story requires the model to explain itself |
| W-4 | A second opinion from a specialist API, and say when the two disagree | The owner | **Rejected outright by the owner on 2026-08-25, not deferred.** No role may propose a second-opinion service again, and no design should leave a place for one. It adds a second outside service and a second bill |
| W-5 | Delete and export everything in one tap | The owner | Run 1 carries the smaller half already: 180-day deletion and delete on demand (US-10). Export is Out |
| W-6 | Take the photo now, assess when there is a network | The owner | |
| W-7 | A light and placement check from the same photo | The owner | It is a way of building backbone 3, not a new feature. It waits for run 4 |

### 6.3 Out because it belongs to a later role, not to product

How sign-in works, where tokens live, how the two account types are enforced, which model is used,
the repository layout, the retry limit, and how the switch in US-13 is operated with no screen. All
of these are named in `factory/feature.md` or `01-use-cases.md` as 400 Architecture's or 800
Infra's work.

## 7. How anyone tells whether this worked

Full table with thresholds, windows and sources is `02-traceability.md`. Short version:

| | The number that must go up | The number that must not move |
| --- | --- | --- |
| Value | The user accepts and completes the next action in at least 8 of 10 assessments, over 8 weeks and at least 20 assessments (M-01, **provisional**) | Care tasks deleted within 7 days stay at or under 2 in 10 (M-20) |
| Reach | At least 6 assessments in those 8 weeks (M-02) | — |
| Truth | A person agrees with a `likely` verdict at least 8 times in 10, over the first 20 real assessments (M-03) | Results in the `cannot-tell` band stay at or under 3 in 10 (M-19, **provisional**). A model that hides behind `cannot-tell` is failing quietly |
| Money | — | Anthropic spend for this feature stays under $5 to 2026-12-31 (M-05). Exactly one model call per assessment (M-22) |
| Safety | — | Reads of another account's data stay at 0 (M-06). Photos older than 180 days in storage stay at 0 (M-07) |

**Two numbers both say "8 in 10" and they measure different things.** M-01 is about the user acting.
M-03 is about the model being right. `00-context-brief.md` warns that they match by accident. 600 QA
must never merge them.

## 8. Stop and ask — decisions and numbers this role will not make

Each row is a gate. **All ten were open when this document was written on 2026-08-24. All ten are now
closed.** The owner answered them on 2026-08-24 and 2026-08-25, and every answer is in
`factory/feature.md` under "Human decisions already made", which is the file every later role reads.
The answers are repeated here so this document is not misleading on its own.

| Gate | What was missing | Status | The answer, and why |
| --- | --- | --- | --- |
| G-1 | The response now has **four** fields, not the three `factory/feature.md` listed. The fourth is the follow-up in whole days | `closed` 2026-08-24 | **Four fields.** The model picks the number of days, because how soon you check a plant again depends on how bad it looks. A fixed table from verdict to interval was rejected: cheaper and fully testable, but it gives the same date every time |
| G-2 | The **per-user daily limit** on assessments. No number existed in any input. It is the only thing standing between an unprotected endpoint and the whole credit balance, which a script empties in about a minute | `closed` 2026-08-24 | **10 a day**, checked before the model call, so a failed call still counts. With no retry (2026-08-26), 10 calls means 10 assessments. Expected real use is about 30 a month. 5 was rejected as too tight for an evening spent checking several pots, 20 as barely a limit |
| G-3 | How long the **assessment text** is kept. `factory/feature.md` said "longer" than 180 days and named no period. This was open question O-10 | `closed` 2026-08-24 | **No clock. It lives as long as the pot does.** A fixed period would delete the early part of a plant's history, which is the part worth having. Backstop: an account with no sign-in for 12 months is deleted, warned by email at 11 |
| G-4 | The **8 in 10 acceptance** target (M-01) is a proposal from `00-context-brief.md`, not a measurement. This was open question O-1 | `closed` 2026-08-24 | **Kept, marked provisional**, until the first 20 real assessments give a measurement to replace it with. A number that is labelled wrong is still better than no number |
| G-5 | The **time budget** from first tap to result. `01-use-cases.md` said the flow must be short enough to finish while standing, and gave no number | `closed` 2026-08-25 | **30 seconds**, tap to something on screen. 15 was rejected because a weak signal can spend that on the upload alone, throwing away answers already paid for. 60 was rejected because a minute in front of a plant reads as broken |
| G-6 | The **verdict list** in section 5.2 was built from words found in the input files, not from a plant reference | `closed` 2026-08-25, **with a review date** | **Ship the ten, review after the first 20 real assessments.** The list cannot fail silently: `other` and `nothing-wrong` mean the model is never forced to invent a fault, so a missing code shows up as a rising share of `other`, which is countable. 600 QA owns the review |
| G-7 | The **session length** for a returning user | `closed` 2026-08-25 | **30 days.** 7 was rejected because the app is opened every few weeks, so the user would meet the sign-in screen almost every visit. 90 was rejected because a lost phone would stay signed in to photos of a home for three months |
| G-8 | How fast the kill-switch must take effect | `closed` 2026-08-25 | **60 seconds.** The value may be cached for up to a minute. Checking on every request was rejected as more complicated: with no cached value, someone must decide what happens when that read itself fails. 5 minutes was rejected because the switch exists for when something is already wrong |
| G-9 | The **retry limit** after a failed model call. `01-use-cases.md` gave it to 800 Infra | `closed` 2026-08-25, **reversed 2026-08-26** | **Now: no retry. One model call per assessment**, by the owner on 2026-08-26, after the pre-mortem showed two attempts cost about $0.0070 against a $0.0040 ceiling and squeezed the time budget. The original answer, whose reasoning still holds for run 3: **One retry, two attempts in total**, both inside G-5's 30 seconds. Only a timeout, a 429 or a 503 is retried. Five tries with exponential backoff was rejected: every attempt is a paid model call, and the backoff alone overruns 30 seconds. Five becomes right once the assessment runs in the background — backbone 6, run 3 |
| G-10 | Whether the EU AI Act applies to a personal project of this size. `00-context-brief.md` calls it a legal question and does not answer it | `closed` 2026-08-25 | **Show the notice, take no legal advice, for run 1.** Whether the Act applies is left unanswered on purpose, because it changes nothing while the app has one user and is offered to nobody. **This re-opens the day the app is offered to another person** |

Two more decisions arrived with these and no gate had asked for either. There is **no total cap on
spend** — the credit balance running out is the stop. And the second-opinion service in
`03-market.md` W-4 is **rejected outright, not deferred**: no role may propose one again.

**One number in this run is still unsourced**, and it is not in the table above because no gate
caught it: how far back the admin usage figures reach, US-12 AC-4. 180 days is proposed there, to
match the photo retention. It blocks nothing.

**Never decided here, by rule:** what is in scope, what gets built first, whether anything is ready
to ship, and how bad a defect is. The epic grouping in `02-traceability.md` is a grouping, not an
order.

## 9. What the inputs contradicted, or left dangling

Written down so a later reader does not think it was missed.

1. **Hypothesis R2 read as if it disagreed with its own check. Repaired 2026-08-24.** R2 said "under
   $10 on any of the three models **except** Opus 5" and then called Opus 5 "exactly at the edge".
   Both halves were true — $10.00 is not under $10 — but the wording invited the wrong reading, and
   400 Architecture picks the model from that table. `00-context-brief.md` section 4 now says it
   plainly. No price and no number changed.
2. **The 30-assessments-a-month assumption rests on four plants.** The same section says the plant
   list has grown to at least eight pots, so the assumption is weaker than when it was written. It
   is already open question O-9, and it feeds gate G-2 above.
3. **`03-market.md` W-3 refers to "D-02".** No file with that ID was given to this role. The
   reference cannot be followed.
4. **There is no agreement bar for the `unsure` band.** `factory/feature.md` sets a bar for `likely`
   and a bar for `cannot-tell`, and none for the band in the middle. US-04 is therefore measured on
   its behaviour, not on its correctness: no task without an explicit yes. 600 QA should notice the
   hole.
5. ~~**A career reason in `00-context-brief.md` section 4.**~~ **Checked 2026-08-25: it is not
   there.** Every file under `docs/` was searched and the only mention of a career reason was this
   line. The role most likely read "learn AWS properly" that way. Removed as a false report, and
   recorded as finding 12 in the seam ledger: a contradiction a role reports is a claim to check,
   not a fact.

## 10. What this document does not decide

Which model is used · how sign-in works · where the check for the two account types runs · how the
data is shaped · what the screens look like · the build order · the release date · whether any cost
is acceptable · whether any idea in section 6.2 is ever picked up.
