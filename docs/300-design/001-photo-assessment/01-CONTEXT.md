# Design context — photo assessment

**Written by** 300 Design, run 1 (`001-photo-assessment`). **Date:** 2026-08-25.
**Read next by** 400 Architecture, 500 Engineering, 600 QA.

This is one half of the design handoff. This file says **what is being designed, for whom, and what
may never happen**. The other half, `02-SPEC.md`, says what every screen contains and every state it
can be in. A picture is not part of the handoff. If a rule matters, it is written here in words.

The visual identity was decided by the owner before this role ran, and it is in `factory/feature.md`
under "The visual identity". This file repeats the rules that a screen has to obey, so an engineer
does not have to open a second file to build one screen.

---

## 1. The feature, in one sentence

A signed-in person photographs one plant they have already named, and gets back one verdict, one
confidence band, one thing to do, and a follow-up in days — which they can turn into a dated care
task with one tap.

## 2. Who it is for

**One person, the owner of the product** (`docs/100-consulting/00-context-brief.md`, section 2). He
keeps at least eight pots in an apartment. He reads Hungarian and English.

**The moment is fixed and every screen is designed for it:** standing in front of a pot, in the
evening, indoors, in poor light, one hand on the phone, still. Not sitting. Not at a desk.

A second reader exists and never opens the app: a person who did not build this repository, reading
it to understand and change it. That is why the rules below are written as rules and not as a
picture.

## 3. Hard constraints — MUST NOT

Every line is a rule an engineer can break by accident. They come from `factory/feature.md` ("The
visual identity") and from `00-prd.md`. A screen that breaks one of these is wrong even if it looks
fine.

### 3.1 Honesty about the model

- **MUST NOT show a percentage or a score anywhere.** Not on the result, not in a tooltip, not in a
  log the user can see. Confidence is one of three words, never a number (US-02 AC-5).
- **MUST NOT show a verdict when the band is `cannot-tell`.** No verdict text, no next action
  (US-05 AC-1).
- **MUST NOT show a verdict without its band in the same labelled group.** A screen reader that
  reads "Túl sok víz" without "Bizonytalan" has turned an unsure answer into a confident one.
- **MUST NOT create a care task from an `unsure` result without an explicit yes** (US-03 AC-4).
- **MUST NOT offer any way to create a task when the band is `cannot-tell`** (US-03 AC-5).
- **MUST NOT use the word "diagnosis"** in either language (US-04 AC-5).
- **MUST NOT state as a fact that a plant is safe to eat or safe around an animal** (US-06 AC-5).
- **MUST NOT hide the line saying the assessment was made by an AI model.** It is on the result
  screen itself, not only in a settings or help page (US-06 AC-2).

### 3.2 Money and calls

- **MUST NOT allow a second tap on send while an assessment is running** (US-01 AC-7). A second tap
  is a second paid call.
- **MUST NOT start a model call before the two free checks pass** — the file is JPEG, PNG, GIF or
  WebP, and a pot is picked (US-01 AC-2, AC-3).
- **MUST NOT send a photo whose longer side is over 1000 px** (US-01 AC-4).
- **MUST NOT offer a "try again" button for a failure that retrying cannot fix** — a rejected photo,
  the daily limit, the feature switched off, or an empty credit balance (US-09 AC-1,
  `factory/feature.md`).
- **MUST NOT let the accent colour cover more than 10% of any screen.** If yellow is everywhere it
  stops meaning "act on this".

### 3.3 The look

- **MUST NOT use white or near-white as a page background, and MUST NOT use `#FFFFFF` anywhere.**
  The page is green.
- **MUST NOT use purple, indigo or any gradient.**
- **MUST NOT use one radius on everything.** Cards are 2px. Buttons are fully round. A single 16px
  everywhere is the clearest sign of a machine-made screen.
- **MUST NOT put a drop shadow on everything.** A shadow means one thing floats above another. In
  this feature exactly one element has a shadow: the confirm sheet.
- **MUST NOT build a centred hero with one button, and MUST NOT build a row of three icon cards.**
- **MUST NOT use an emoji as an icon.**
- **MUST NOT fade in every element.** Motion happens only where something actually changed.
- **MUST NOT write a hex value in `02-SPEC.md` or in a component.** Token names only. Every token is
  in `docs/300-design/03-tokens.md`.
- **MUST NOT use Inter or Roboto** for either typeface.

### 3.4 Access

- **MUST NOT remove the focus ring.** `outline: none` with nothing put back is never allowed.
- **MUST NOT block pinch zoom.** No `user-scalable=no`, no `maximum-scale`.
- **MUST NOT make any tappable thing smaller than 44 x 44 px**, and two of them are never closer
  than 24 px.
- **MUST NOT depend on hover for anything.** There is no hover on a phone.
- **MUST NOT use colour as the only signal.** Each confidence band also has a shape.
- **MUST NOT describe a failure with only a colour or an icon.** A failure is described in words.
- **MUST NOT set the language only on `<html>`.** Each block of text declares `lang="hu"` or
  `lang="en"`, or a screen reader reads Hungarian with English rules.
- **MUST NOT use "image" as the alternative text of a plant photo.**
- **MUST NOT animate anything when `prefers-reduced-motion` is set.**

## 4. Explicitly out of scope for this design

**"Out" means not this run.** It does not mean never. Every line names who owns bringing it back.

| Out | Why, and who owns it |
| --- | --- |
| ~~**The screen that creates a pot**~~ | **No longer out of scope.** Gate 21 put US-15 in scope on 2026-08-25 and this row was not updated. `02-SPEC.md` §4 draws it as **SC-8** (written 2026-08-31) |
| **The sign-in screen** | The protocol and the flow are 400 Architecture's decision. This design covers only the signed-out state of its own screens (US-07 AC-1) |
| **Any admin screen** | `00-prd.md` section 6.1: the permission check and the kill-switch ship now, the screens do not. US-12 and US-13 have no screen in run 1 |
| **A list of past assessments, and a plant's history over time** | Backbone feature 4, a later run. US-10 AC-4 needs a way back to one assessment; that way in is a seam, not a screen designed here |
| **A reminder or a notification when the task is due** | Backbone feature 6, a later run. This run writes the task and stops |
| **A dark theme and a light theme** | The page is already a deep green with light text, so this design has one theme. A second theme is a later decision. See section 6, contradiction 1 |
| **A settings screen, and the control that switches language** | US-11 requires both languages in the flow. No story says where the language is switched. Recorded as a seam |
| **Showing what in the photo the model looked at** | Idea W-3 in the market scan. Out, and the owner decides (`00-prd.md` section 6.2) |
| **A second opinion from another service** | **Rejected outright by the owner, not deferred.** No design leaves a place for one (`factory/feature.md`) |
| **Any way to ask the model a follow-up question** | Out of scope in `factory/feature.md`. It changes the cost model |
| **Exporting data** | Only deletion is in run 1 (US-10). Export is idea W-5, and it is Out |
| **Taking a photo now and assessing it later, offline** | Idea W-6. Out. Offline means the photo is kept on the screen, and nothing is sent |
| **A cancel button during the wait** | The call is paid the moment it is sent. Cancelling would hide a result already paid for. See `00-journey-map.md` section 5 |

## 5. Decisions this design made, and could be told to unmake

Each one is a design call inside a rule the PRD set. None of them adds a feature. They are listed so
the owner can strike any of them in one line.

| # | Decision | Why | What it rests on |
| --- | --- | --- | --- |
| D-1 | ~~The `unsure` label is only ever set at heading size or larger~~ **Withdrawn 2026-08-25. The label may be set at any size.** | The reason has gone. `--color-warn` was `#FF9478` at 3.3:1 on `--color-raised`; the owner changed the colour to `#FFC2B0`, which measures **4.60:1** and passes for normal text. A rule that outlives its reason turns a spec into folklore, so it is withdrawn rather than kept just in case | `factory/feature.md` palette table, gate 23 |
| D-2 | **The three results are three screens, not one screen with three chips** | `cannot-tell` has no verdict and no action, so its layout is a different shape, not a colour change | US-05 AC-1 |
| D-3 | ~~A malformed answer shows the `cannot-tell` screen~~ **Overruled by the owner 2026-08-25: a malformed answer is a failure, not a verdict, and shows the failure screen.** | This role read the disagreement correctly and solved it on the wrong screen. All four `cannot-tell` reasons mean *I looked at your photo and could not tell*; a broken answer means nothing was looked at, so `cannot-tell` tells the user to retake a photo that was fine. The owner also required **structured output** so the case is rare, and `stop_reason` to be read first — a refusal and a truncation are neither a verdict nor retryable | US-02 AI Eval Card, US-05 AC-2. Human gate 22 |
| D-4 | **The number of assessments left today is shown only when it is 2 or fewer** | US-08 AC-4 forbids a limit message below the limit. A quiet count at the end is not a message about the limit, and it stops the block in US-08 AC-1 arriving with no warning | US-08 AC-2, AC-4. Strike this row and the design still passes every AC |
| D-5 | **The two typefaces are Fraunces for the verdict and IBM Plex Sans for everything else** | `factory/feature.md` asks this role to name them and says the owner may replace either | Human gate 20 |
| D-6 | **Every component in `02-SPEC.md` is new and is specified from nothing** | No user interface component library is named in any input. Choosing one would be accepting a dependency, which is never this role's call | Human gate 25 |

## 6. What the inputs contradicted, or left thin

Written down so a later reader does not think it was missed.

1. **`factory/feature.md` says the base is a warm neutral, and its own palette says the page is
   green.** The sentence "the base is chosen for outdoor legibility and because a plant photo sits
   well on a warm neutral" is left over from the warm paper direction that the owner rejected. The
   same file says the page is `#14513A` and never white. The palette table is the newer, explicit
   decision, so **this design follows the green page**. The same paragraph says dark mode is a later
   variant. A deep green page with light text is already a dark design, so run 1 ships one theme.
2. ~~The `unsure` label colour fails normal-text contrast on the surface it sits on.~~
   **Resolved 2026-08-25, and this role found it.** `--color-warn` was `#FF9478` at 3.3:1 on
   `--color-raised`. The owner fixed it in the colour rather than in a size rule: `#FFC2B0`, which
   measures 4.60:1. The lesson went into `factory/feature.md` — **a contrast number belongs to a
   pair of colours *and* a text size**, and the original fence wrote down only two of the three.
3. ~~US-02's fallback and US-05 AC-2 disagree about a malformed answer.~~ **Resolved 2026-08-25 by
   the owner, against this role's reading.** Neither file wins: a malformed answer is a failure and
   never a `cannot-tell`, so no fifth reason is added and the `cannot-tell` screen is not used.
4. ~~No story defines creating a pot~~ **Answered 2026-08-25: the owner put it in scope (gate 21)
   and US-15 was written.** This role was right to refuse to design it. **The design gap is still
   open** — SC-1 to SC-7 do not cover adding a pot, so US-15 has acceptance criteria and no screen.
   That needs a correction pass on this role, not a screen invented by hand.
5. **No story defines how an old assessment is opened**, and US-10 AC-4 describes reading one after
   its photo was deleted.
6. **No story says where the language is switched**, and US-11 requires both languages everywhere.
7. **No user interface component library is named in any input.** 400 Architecture and 500
   Engineering have not run. So the component list here is written as new components with full state
   lists, which is what this role's contract asks for when nothing exists yet.
8. **`00-prd.md` gives run numbers to backbone features that `factory/feature.md` never assigned.**
   The run bookkeeping already records this as a missed gate. This design reads "run 2" and "run 4"
   as "not this run", and nothing more.

## 7. What this document does not decide

Brand voice and the words of any sentence in the product · any accessibility call that needs a
disabled person's experience rather than a checklist · whether AI belongs in this feature · which
model is used · how sign-in works · how the data is stored · the build order · the release date.
