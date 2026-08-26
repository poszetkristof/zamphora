# Design spec — photo assessment

**Written by** 300 Design, run 1 (`001-photo-assessment`). **Date:** 2026-08-25.
**Read next by** 400 Architecture, 500 Engineering, 600 QA.

This is the buildable half of the handoff. `01-CONTEXT.md` says what may never happen. This file
says what is on every screen, every state that screen can be in, and which token paints it.

**Read `01-CONTEXT.md` first.** The MUST NOT list there is part of this spec and is not repeated
here.

**No hex value appears in this file.** Every colour, size, space and time is a token name from
`docs/300-design/03-tokens.md`. If a value you need has no name there, add the token first.

---

## 1. How to read this file

- **Every component is new.** No user interface component library is named in any input, so nothing
  can be reused from one. Each component below is written from nothing, with its own state list.
  Choosing a library is 400 Architecture's and 500 Engineering's call, and it is human gate 25. If a
  library is chosen later, these names and states are the requirement it has to meet.
- **A state is not a variant of a screen. It is a thing that must be built.** A screen that lists
  only its success state is a demonstration, not something that can ship.
- **The phone is the base.** Every layout below is the phone layout at 360 px wide. Section 11 says
  what changes at wider widths, and nothing new appears there.
- **`AC` numbers point at `01-user-stories.md`.** For example US-05 AC-2 is acceptance criterion 2
  of story US-05.

## 2. The screens

| ID | Screen | Reached from | Stories |
| --- | --- | --- | --- |
| SC-1 | Assess — pick a pot, add a photo, send | The pot, or the app's main screen | US-01, US-07, US-08, US-09, US-11 |
| SC-2 | Working — the wait | SC-1, on send | US-01, US-09 |
| SC-3 | Result — `likely` | SC-2 | US-02, US-03, US-06, US-11 |
| SC-4 | Result — `unsure` | SC-2 | US-04, US-03, US-06, US-11 |
| SC-5 | Result — `cannot-tell` | SC-2 | US-05, US-06, US-11 |
| SC-6 | Confirm sheet — write the task anyway | SC-4 | US-03 |
| SC-7 | Photo detail — how long it is kept, and delete | SC-3, SC-4, SC-5 | US-10 |

SC-1 to SC-5 are the five screens of the main flow. SC-6 is a sheet over SC-4, not a page. SC-7 is a
page reached from any result.

## 3. Components

All new. Each one lists the tokens it uses and every state it can be in.

### 3.1 AppFrame

The page shell. One column, `--page-padding-inline` down each side, `--color-ground` behind
everything. Content is top-aligned. The primary action sits at the bottom, inside
`--thumb-zone-bottom`, because the person is holding the phone in one hand.

**States:** `signed-in` · `signed-out` (renders nothing of the page and sends the person to sign-in,
US-07 AC-1) · `offline` (a one-line strip under the heading, drawn in `--color-muted` at
`--text-caption`, with text, never colour alone).

### 3.2 ScreenHeading

`--font-display` at `--text-heading`, `--color-verdict`. One line. It wraps and is never cut short
with an ellipsis, because a Hungarian heading is long.

### 3.3 PotPicker

Choose which pot the photo is of. A vertical list of rows, each one `--target-comfortable` tall,
`--target-gap` apart, `--radius-card`, hairline divider in `--color-line`.

Each row shows the pot name **exactly as the person typed it** and is never translated (US-11 AC-3).

**States:** `empty` (no pot exists) · `one-or-more` · `selected` · `loading` · `error` ·
`disabled` (while an assessment is running).

- **`empty`** shows one sentence saying a pot must be named first, and a `QuietButton` that leaves
  this flow for the screen that creates a pot. **That screen is not designed in this run** — see
  `01-CONTEXT.md` section 4 and human gate 21. The send button stays disabled (US-01 AC-3).
- **`selected`** is marked by a filled dot in `--color-accent` before the name **and** by the row
  being the only one with a hairline border. Colour is never the only signal.

### 3.4 PhotoAdder

Exactly two ways in, and no third (US-01 AC-1).

- `CameraButton` — takes one photo.
- `LibraryButton` — chooses one photo already on the phone.

Both are `--target-comfortable` tall, `--radius-pill`, side by side with `--target-gap` between
them, drawn as outlines in `--color-verdict` on `--color-ground`. Neither is the accent colour,
because the accent belongs to send.

**States:** `idle` · `camera-permission-denied` · `no-camera` · `busy` (the operating system
picker is open) · `disabled`. The camera flow has its own full state list in section 5.

### 3.5 PhotoWell and PhotoPreview

`PhotoWell` is the dip the photo sits in: `--color-well` behind, `--radius-card`, full content
width. `PhotoPreview` is the image inside it, never cropped to a square, never stretched.

The alternative text says what the person photographed — the pot name and the fact that it is a
plant photo. **Never "image"** (`01-CONTEXT.md` section 3.4).

**States:** `empty` (a short line saying no photo is chosen yet, `--color-muted`) · `chosen` ·
`resizing` · `too-small` · `wrong-format` · `removed` (the photo was deleted, US-10 AC-4).

### 3.6 PrimaryButton

The one yellow thing on the screen. `--color-accent` fill, `--color-on-accent` text,
`--radius-pill`, `--target-comfortable` tall, full content width, `--text-body` at
`--weight-medium`. Focus uses `--focus-ring-on-accent`.

**States:** `enabled` · `disabled` · `busy` (US-01 AC-7: it cannot be tapped a second time, and it
says what is happening) · `hidden`.

A `disabled` button always has a sentence next to it saying why it is disabled. A dimmed button with
no explanation is a failure described by colour alone.

### 3.7 QuietButton and DangerButton

`QuietButton` — text only, `--color-verdict`, underlined, `--target-min` tap box. Used for "take
another photo", "not now", and the link out to the create-a-pot screen.

`DangerButton` — text only, `--color-warn`, at `--text-body`. **Used once**, to delete a photo on
SC-7. `--color-warn` is 6.00:1 on `--color-ground` and 4.60:1 on `--color-raised`, so it passes for normal
text on both surfaces.

### 3.8 WorkingIndicator and StepList

`WorkingIndicator` is a single moving mark, not a full-screen spinner. Under
`prefers-reduced-motion: reduce` it does not move; the step text carries the meaning instead.

`StepList` is three lines that say what is happening now, in words: making the photo smaller,
sending it, asking the model. The current line is `--color-verdict`, the finished lines are
`--color-muted`, the future lines are `--color-muted`. Each finished line gets a small tick shape,
so progress is not only colour.

**States:** `resizing` · `uploading` · `asking` · `finished` · `failed`. **Five, not six.**

**`retrying` was removed on 2026-08-26**, when the owner dropped the retry. It said the app was
trying once more and that the second try also counted against the daily limit. There is no second
try now, so a state that announced one would be a lie on screen. **Do not build it.**

### 3.9 VerdictGroup

**The most important component in the feature, and the one most easily built wrong.**

It is one labelled group holding three things in this order: the `BandMark`, the band label, and the
verdict sentence. It is announced as one group. A screen reader that reads the verdict without the
band has turned an unsure answer into a confident one.

- Band label: `--text-body`, `--weight-medium`.
- Verdict sentence: `--font-display` at `--text-verdict`, `--color-verdict`. It wraps over as many
  lines as it needs.

**States:** `likely` · `unsure` · `cannot-tell` (no verdict sentence exists in this state, so the
group holds the band label only, and the label is the heading).

### 3.10 BandMark

The shape that carries the band without colour.

| Band | Shape | Colour |
| --- | --- | --- |
| `likely` | A filled dot before the label | `--color-verdict` |
| `unsure` | A warning triangle, plus a `--border-rule` line above the whole band | `--color-warn` |
| `cannot-tell` | No mark at all | — |

The shape is drawn, never an emoji. It carries no accessible name of its own, because the band label
next to it is the text.

### 3.11 NextActionCard

The part with the value in it. `--color-ground` behind, hairline border in `--color-line`,
`--radius-card`, `--space-s` inside.

Holds the next action text at `--text-body` in `--color-body`, and under it the `FollowUpLine`: the
follow-up in whole days turned into a date, at `--text-caption` in `--color-muted`.

**States:** `shown` · `no-task-possible` (the follow-up days field is missing or out of range, so
the card shows the action and the date line is replaced by one sentence saying no task can be made,
US-03 AC-6) · `hidden` (band is `cannot-tell`).

### 3.12 UnsureBand

Only on SC-4. `--color-raised` behind, `--radius-card`, a `--border-rule` line in `--color-warn`
above it, and the warning triangle inside.

The label inside it may be set at any size. `--color-warn` on `--color-raised` measures **4.60:1**,
which passes for normal text, so no size rule is needed. All other text inside the band uses
`--color-body` or `--color-muted`, which also pass on this surface.

**This replaces decision D-1 in `01-CONTEXT.md`.** D-1 set the label at `--text-heading` or larger,
because the warn colour was then `#FF9478` at 3.3:1 on this surface. The owner changed the colour
instead of the size on 2026-08-25, so the size constraint is no longer load-carrying and the label is
free again. Keeping a rule whose reason has gone is how a spec turns into folklore.

### 3.13 RetakeAdviceList

Only on SC-4. One to four lines from a fixed list (US-04 AC-2): in daylight · the underside of the
leaf · the soil and the bottom of the pot · the whole plant.

**State `fallback`:** if no advice came back, show the single line "take another photo in daylight"
and record the missing field for QA (US-04 AI Eval Card).

### 3.14 ReasonLine

Only on SC-5. One line from a fixed list of four (US-05 AC-2): too dark · not a plant · more than
one plant in the frame · the photo is too small or too blurred to read.

**State `unreadable-answer` — WITHDRAWN 2026-08-25.** The owner ruled that a malformed answer is a
failure and never a verdict, so it does not reach this screen at all: it goes to the failure path
with the other errors. **The failure path needs this state added, and that is an open gap on this
role.** The withdrawn text is kept below so the change is visible rather than silent.

~~The line is replaced by one sentence saying the answer could not be read, and the screen behaves in
every other way like `cannot-tell`. This is decision D-3 in `01-CONTEXT.md` and human gate 22. **It
does not add a fifth reason code.** It is a screen message.

### 3.15 NoticeLines

Two lines at `--text-caption` in `--color-muted`, at the bottom of every result screen:

1. The assessment was made by an AI model (US-06 AC-1, AC-2).
2. This is not professional advice (US-06 AC-3).

Both are on the result screen itself, never only in a settings or help page. Both are in the
language being read (US-06 AC-4). Neither is inside a collapsed section.

### 3.16 FailureNote

Every failure in the product is drawn with this component, so no failure can be described by a
colour or an icon alone.

It holds, in this order: what happened, in one sentence · **exactly one** of "trying again may work"
or "trying again will not work now" (US-09 AC-1) · an action, if one exists.

The action is a `PrimaryButton` **only** when trying again may work. When it will not work now,
there is no try-again button at all, so a paid call cannot be started by a person who did not read
the sentence.

**States:** `retry-may-work` · `retry-will-not-work` · `blocked-by-limit` · `feature-off` ·
`no-credit` · `offline`.

### 3.17 ConfirmSheet

A sheet that slides up from the bottom over SC-4. `--color-ground`, `--radius-card` on the top two
corners, `--shadow-sheet` — the only shadow in the feature. A dim scrim behind it at
`--z-sheet-scrim`.

It asks one yes or no question and says the assessment may be wrong (US-03 AC-4). "Yes" is the
`PrimaryButton`, "not now" is a `QuietButton`. Focus moves into the sheet when it opens and returns
to the button that opened it when it closes. The escape key and a tap on the scrim both close it
without writing anything.

**States:** `open` · `writing` · `written` · `failed` · `closed`.

### 3.18 RetentionNote

Two short lines at `--text-caption` in `--color-muted` (US-10 AC-1, AC-2):

1. Photos are kept **180 days** and are then deleted.
2. The assessment text is kept **as long as the pot exists**. There is no period to print here.
   Deleting the pot deletes its assessments. Deleting the account deletes everything. An account
   with no sign-in for 12 months is deleted, with a warning by email at 11 months.

### 3.19 LimitNote

One line at `--text-caption` in `--color-muted` saying how many assessments are left today.

**It appears only when 2 or fewer are left.** Below that it is not rendered at all, because US-08
AC-4 forbids a message about the limit when the person is under it. This is decision D-4 in
`01-CONTEXT.md`, and removing it breaks no acceptance criterion.

## 4. The screens, state by state

### SC-1 — Assess

**Purpose.** Pick one pot, add one photo, send it. Nothing else.

**Layout, top to bottom, at 360 px:** `ScreenHeading` · `PotPicker` · `PhotoAdder` · `PhotoWell`
with `PhotoPreview` · `LimitNote` if it applies · `PrimaryButton` (send) fixed at the bottom.

| # | State | What starts it | What is on screen |
| --- | --- | --- | --- |
| 1 | `signed-out` | No signed-in user | Nothing of this screen renders. The person goes to sign-in and no pot, photo or assessment is returned (US-07 AC-1). The sign-in screen itself is not designed in this run |
| 2 | `empty` | Signed in, no pot named | Heading, one sentence, and a `QuietButton` out to the create-a-pot screen. Send is `disabled` with a reason (US-01 AC-3) |
| 3 | `ready` | A pot is picked, no photo yet | Both photo buttons live. Send is `disabled` with the reason "add a photo first" |
| 4 | `photo-chosen` | A photo passed the on-device checks | The photo in the well, the pot name, send `enabled` |
| 5 | `resizing` | A photo was chosen | `PhotoWell` shows `resizing`. Send is `busy`. A copy is made whose longer side is at most 1000 px (US-01 AC-4) |
| 6 | `wrong-format` | The file is not JPEG, PNG, GIF or WebP | `InlineRefusal` under the photo well, naming those four formats. **No model call is made** (US-01 AC-2). The photo is not kept |
| 7 | `too-small` | The shorter side is under 200 px | `InlineRefusal` saying the photo is too small. **No model call is made** (US-01 AC-5) |
| 8 | `camera-permission-denied` | The operating system refused the camera | See section 5 |
| 9 | `no-camera` | The device has no camera | See section 5 |
| 10 | `limit-reached` | 10 assessments already made today | `FailureNote` in state `blocked-by-limit`: the limit is reached, and when it resets. No try-again button. **No model call is made and no money is spent** (US-08 AC-1, AC-2, AC-3) |
| 11 | `feature-off` | An admin turned the AI feature off | `FailureNote` in state `feature-off`: the feature is off, and trying again will not work now (US-09 AC-4, US-13 AC-3) |
| 12 | `no-credit` | The model credit balance is empty | `FailureNote` in state `no-credit`: the assessment is not available now and trying again will not work. **This is a normal failure state, not a crash, and it is never retried** (`factory/feature.md`). Everything else in the app keeps working |
| 13 | `offline` | No network | The offline strip in `AppFrame`. The chosen photo stays on screen. Send is `disabled` with the reason. Nothing is sent and nothing is queued (US-09 AC-2; taking a photo now to assess later is idea W-6 and is Out) |
| 14 | `sending` | Send was tapped | Moves to SC-2. Send is `busy` and cannot be tapped again (US-01 AC-7) |
| 15 | `returned-after-failure` | The person came back from a failed attempt | The same pot and the same photo are still there, and can be sent again without taking a new photo (US-09 AC-2) |
| 16 | `error` | Anything else went wrong before sending | `FailureNote`, with one of the two sentences from US-09 AC-1 |

### SC-2 — Working

**Purpose.** Hold the person honestly for up to 30 seconds (US-01 AC-8). This is the second worst
step in `00-journey-map.md`.

**Layout:** the photo in the well at the top, small · `WorkingIndicator` · `StepList` · one line
saying the wait cannot be stopped because the call is already paid for.

| # | State | What starts it | What is on screen |
| --- | --- | --- | --- |
| 1 | `resizing` | Send was tapped | Step 1 of the `StepList` is current |
| 2 | `uploading` | The smaller copy exists | Step 2 is current |
| 3 | `asking` | The photo reached the API | Step 3 is current |
| 5 | `timed-out` | 30 seconds passed with nothing on screen | `FailureNote` in state `retry-may-work` (US-01 AC-8, US-09 AC-3). No care task is created |
| 6 | `provider-error` | The model provider answered with an error | `FailureNote` in state `retry-may-work` (US-09 AC-3) |
| 7 | `not-retryable` | A bad request, a rejected photo, or an empty credit balance | `FailureNote` in state `retry-will-not-work`. The name still matters: it tells the **person** that tapping again is pointless, which is different from a timeout, where tapping again may work |

**State numbering note, 2026-08-26.** State 4 was `retrying` and it is gone with the retry. The
remaining states keep their old numbers so that every reference elsewhere still resolves. **The two
`retry-...` names in the `FailureNote` are about what the person should do, not about anything the
app does automatically.**
| 8 | `offline` | The network dropped mid-flight | `FailureNote` in state `offline`. Back on SC-1 the photo is still there (US-09 AC-2) |
| 9 | `answered` | A well-formed answer arrived | Moves to SC-3, SC-4 or SC-5 by band |
| 10 | `answer-unreadable` | A missing field, a verdict code outside the ten, or a band outside the three | Moves to SC-5 in state `unreadable-answer`. No verdict, no task, another photo offered. The failed answer is stored for QA (US-02 AI Eval Card) |

**There is no cancel button.** See `00-journey-map.md` section 5.

### SC-3 — Result, band `likely`

**Purpose.** Say what is wrong and what to do, and make the task in one tap.

**Layout:** `PhotoWell` (small, tappable, goes to SC-7) · `VerdictGroup` in `likely` ·
`NextActionCard` · `PrimaryButton` "add the care task" · `QuietButton` "take another photo" ·
`NoticeLines`.

| # | State | What starts it | What is on screen |
| --- | --- | --- | --- |
| 1 | `shown` | Band is `likely` | Verdict sentence, next action, and a button that adds the task (US-02 AC-4). No percentage anywhere (US-02 AC-5) |
| 2 | `nothing-wrong` | The verdict code is `nothing-wrong` | The verdict and the next action, which may be "do nothing". **No task button at all** (US-02 AC-7) |
| 3 | `no-follow-up-days` | The follow-up days field is missing, or is not a whole number from 1 to 30 | The verdict and the next action are still shown. **No task is offered** (US-03 AC-6). `NextActionCard` is in state `no-task-possible` |
| 4 | `writing-task` | The task button was tapped | The button is `busy` |
| 5 | `task-written` | The task exists | An inline row, not a message that disappears, saying the task was made and on which date. That date is the assessment day plus the follow-up days (US-03 AC-2). The task carries the pot, the assessment, the date and the action text (US-03 AC-3) |
| 6 | `task-failed` | Writing the task failed | `FailureNote` in state `retry-may-work`. The assessment stays on screen |
| 7 | `photo-removed` | The photo was deleted, by the person or by the 180-day rule | The assessment text is still there and the well says the photo was removed (US-10 AC-4) |
| 8 | `offline` | No network | The result already on screen stays. The task button is `disabled` with a reason |
| 9 | `loading` | The screen was opened directly by its address | A skeleton of the same shape, no fade-in |
| 10 | `error` | The assessment could not be read back | `FailureNote` |

### SC-4 — Result, band `unsure`

**Purpose.** Say the answer may be wrong, and say what a better photo would be, without ending in a
dead end.

**Layout:** `PhotoWell` · `UnsureBand` holding `VerdictGroup` in `unsure` · `NextActionCard` ·
`RetakeAdviceList` · `QuietButton` "take another photo, same pot" · `QuietButton` "add the care task
anyway" · `NoticeLines`.

**The task action is a `QuietButton` here and a `PrimaryButton` on SC-3.** On an unsure result the
thing most worth doing is taking a better photo, so the yellow belongs to nothing on this screen.

| # | State | What starts it | What is on screen |
| --- | --- | --- | --- |
| 1 | `shown` | Band is `unsure` | The verdict, one sentence saying it may be wrong, and at least one way to take a better photo (US-04 AC-1) |
| 2 | `advice-fallback` | No retake advice came back | The single line "take another photo in daylight", and the missing field is recorded for QA (US-04 AI Eval Card) |
| 3 | `no-task-yet` | The person does nothing | **No care task exists** (US-04 AC-3) |
| 4 | `confirm-open` | "Add the task anyway" was tapped | SC-6 opens (US-03 AC-4) |
| 5 | `task-written` | The person answered yes | The same inline row as SC-3 state 5 |
| 6 | `retake` | "Take another photo" was tapped | The photo buttons open **on this screen**, and the second photo is sent without walking the flow again (US-04 AC-6) |
| 7 | `no-follow-up-days` | As SC-3 state 3 | No task is offered. The verdict and action stay |
| 8 | `photo-removed` · `offline` · `loading` · `error` | As SC-3 | As SC-3 |

**Language rules that only bite here:** the screen never uses the word "diagnosis", and never says
the plant is safe to eat or safe for a pet (US-04 AC-5).

### SC-5 — Result, band `cannot-tell`

**Purpose.** Give no verdict, give a reason, and give one tap back to a better photo. This is the
worst step in the journey, and this screen is what carries it.

**Layout:** `PhotoWell` **at full size, showing the bad photo** · `VerdictGroup` in `cannot-tell`,
where the band label is the only heading · `ReasonLine` · `PrimaryButton` "send another photo, same
pot" · `LimitNote` · `NoticeLines`.

**The bad photo is shown, not described.** If the reason is "too dark", the person sees a dark
photo. That turns a refusal into a next move faster than any sentence.

| # | State | What starts it | What is on screen |
| --- | --- | --- | --- |
| 1 | `shown` | Band is `cannot-tell` | **No verdict text and no next action anywhere** (US-05 AC-1). One reason from the fixed list of four (US-05 AC-2). **No way to create a task is offered at all** (US-03 AC-5). No accent colour except the send-another-photo button |
| 2 | `unreadable-answer` | The answer was malformed | The reason line is replaced by one sentence saying the answer could not be read. Everything else behaves as state 1. Decision D-3 |
| 3 | `counted` | Always | The screen says the attempt counted against today's limit, because the money was already spent (US-05 AC-5). The record is stored as a **finished assessment, not an error** (US-05 AC-3) |
| 4 | `limit-now-reached` | This attempt used the tenth of the day | The send-another-photo button is `disabled`, with `FailureNote` in state `blocked-by-limit` under it |
| 5 | `retake` | The button was tapped | The photo buttons open for the same pot, in one tap (US-05 AC-4) |
| 6 | `offline` · `loading` · `error` | As SC-3 | As SC-3 |

### SC-6 — Confirm sheet

**Purpose.** Make an `unsure` result into a task only after an explicit yes.

| # | State | What starts it | What is on screen |
| --- | --- | --- | --- |
| 1 | `open` | "Add the task anyway" on SC-4 | One yes or no question that says the assessment may be wrong. "Yes" is the `PrimaryButton`, "not now" is a `QuietButton` (US-03 AC-4) |
| 2 | `writing` | Yes was tapped | The button is `busy` |
| 3 | `written` | The task exists | The sheet closes. SC-4 shows the created-task row |
| 4 | `failed` | Writing failed | `FailureNote` inside the sheet, in state `retry-may-work` |
| 5 | `closed` | "Not now", the escape key, or a tap on the scrim | **Nothing is written** (US-04 AC-3). Focus returns to the button that opened the sheet |

### SC-7 — Photo detail

**Purpose.** Say how long the photo is kept and let the person delete it.

**Layout:** `PhotoWell` at full size · `RetentionNote` · `DangerButton` "delete this photo" ·
`QuietButton` back.

| # | State | What starts it | What is on screen |
| --- | --- | --- | --- |
| 1 | `shown` | Opened from a result | The photo, and both retention lines (US-10 AC-1, AC-2) |
| 2 | `confirming` | Delete was tapped | A `ConfirmSheet` asking once. Deleting a photo cannot be undone |
| 3 | `deleting` | Confirmed | The button is `busy` |
| 4 | `deleted` | The delete finished | The well shows `removed`. The photo and every resized or cached copy of it are gone (US-10 AC-3). The assessment text stays (US-10 AC-4) |
| 5 | `already-gone` | The photo passed 180 days | The well shows `removed` and one line saying the photo reached the end of the 180 days. This happens even when the application is broken, because a storage rule does the deleting (US-10 AC-5, AC-6) |
| 6 | `delete-failed` | The delete failed | `FailureNote` in state `retry-may-work` |
| 7 | `offline` · `loading` · `error` | As SC-3 | As SC-3 |

**Deleting every photo at once (US-10 AC-7)** is a control on an account or settings screen, which
is not designed in this run. The behaviour it must have is the behaviour of state 4, applied to
every photo.

## 5. The camera flow — its own state list

The camera is the part most likely to be shipped with only its success state. Every state below is a
thing that must be built.

| # | State | What starts it | What happens |
| --- | --- | --- | --- |
| 1 | `not-asked` | First visit | Both buttons are shown. Permission is asked only when `CameraButton` is tapped, never on page load |
| 2 | `asking` | `CameraButton` tapped | The operating system prompt is open. `PhotoAdder` is `busy` |
| 3 | `granted` | The person allowed it | The camera opens. One photo is taken |
| 4 | `permission-denied` | The person refused | One sentence saying the app cannot open the camera, and what to change to allow it. **`LibraryButton` stays fully usable**, so the flow is never blocked by a camera refusal |
| 5 | `permission-blocked` | The browser will not ask again | The same as state 4, plus a line saying the answer has to be changed in the phone's settings, because the app cannot ask again |
| 6 | `no-camera` | The device has no camera | `CameraButton` is not rendered at all. `LibraryButton` is the whole `PhotoAdder`. A dead camera button is worse than no camera button |
| 7 | `cancelled` | The camera or the picker was closed with no photo | Back to SC-1 in the state it was in. Nothing is lost |
| 8 | `photo-taken` | A photo came back | The on-device checks run: format, then shorter side, then resize (US-01 AC-2, AC-5, AC-4) |
| 9 | `library-chosen` | A file came back from the phone | The same checks, in the same order |
| 10 | `file-unreadable` | The file cannot be opened | `InlineRefusal` saying the photo could not be read, and to choose another |

**The choose-an-existing-photo path is never a fallback for the camera.** It is one of the two equal
ways in (US-01 AC-1), and it is the only one that works in states 4, 5 and 6.

## 6. Every failure message in this feature

One table, because US-09 AC-1 says **no failure message may end without one of two sentences**. A
message not in this table has not been designed.

| Failure | The sentence it ends with | Try-again button | Story |
| --- | --- | --- | --- |
| Wrong file format | Trying again will not work now | No. Choose another photo | US-01 AC-2 |
| Photo too small | Trying again will not work now | No. Choose another photo | US-01 AC-5 |
| No pot picked | Trying again will not work now | No. Pick or create a pot | US-01 AC-3 |
| Upload failed | Trying again may work | Yes. The photo is still there | US-09 AC-2 |
| Network dropped | Trying again may work | Yes. The photo is still there | US-09 AC-2 |
| Timed out at 30 seconds | Trying again may work | Yes | US-01 AC-8, US-09 AC-3 |
| Provider error, a 429 or a 503 | Trying again may work | Yes, after the one automatic retry | US-09 AC-3, AC-5 |
| Bad request to the provider | Trying again will not work now | No | US-09 AC-5 |
| Answer could not be read | Trying again may work | Yes, as "send another photo" on SC-5 | US-02 AI Eval Card |
| Daily limit of 10 reached | Trying again will not work now | No. It says when it resets | US-08 AC-1, AC-2 |
| Admin turned the feature off | Trying again will not work now | No | US-09 AC-4, US-13 AC-3 |
| Model credit balance empty | Trying again will not work now | No | `factory/feature.md` |
| Writing the care task failed | Trying again may work | Yes | US-03 |
| Deleting the photo failed | Trying again may work | Yes | US-10 AC-3 |

Every failure is stored with its reason, so the count in M-08 can be taken (US-09 AC-6).

## 7. Negative acceptance criteria

What these screens must **not** do. This section exists so the forbidden behaviours are not left to
an engineer's judgement. Each line can be tested and failed.

**About the model answer**

1. No screen shows a percentage, a score or any number that describes how sure the model is.
2. No screen shows a verdict when the band is `cannot-tell`.
3. No screen shows a verdict sentence outside a `VerdictGroup` that also holds the band.
4. No screen shows a next action when the band is `cannot-tell`.
5. No screen shows a verdict text for a code outside the ten in `00-prd.md` section 5.2.
6. No screen shows a band outside `likely`, `unsure`, `cannot-tell`.

**About money**

7. Send cannot be tapped twice for one assessment.
8. No model call starts before the format check and the pot check have passed.
9. No photo is sent whose longer side is over 1000 px.
10. No failure that retrying cannot fix shows a try-again button. That is: a rejected photo, the
    daily limit, the feature switched off, an empty credit balance, and a bad request.
11. No screen starts an automatic retry of any kind. **One model call per assessment, 2026-08-26.**
    A failure shows a message and the person decides whether to tap again.
12. No screen queues a photo to send later when the device is offline.

**About the task**

13. No care task is created from an `unsure` result without an explicit yes.
14. No way to create a task appears on a `cannot-tell` screen.
15. No task is offered when the follow-up days field is missing or outside 1 to 30.
16. No task is created when the verdict code is `nothing-wrong`.

**About the words**

17. No screen uses the word "diagnosis" in either language.
18. No screen states that a plant is safe to eat or safe around an animal.
19. No result screen hides the AI notice behind a link, a tooltip or a collapsed section.
20. No failure is described only by a colour or an icon.

**About the look**

21. No `#FFFFFF` anywhere, and no white or near-white page background.
22. No purple, no indigo, no gradient.
23. No radius other than `--radius-card` and `--radius-pill`.
24. No shadow other than `--shadow-sheet`, and it is used only on the confirm sheet.
25. No centred hero with one button, and no row of three icon cards.
26. No emoji used as an icon.
27. The accent colour never covers more than 10% of a screen. There is at most one `PrimaryButton`
    visible at a time.
28. No fade-in on page load or on a list.
29. No hex value in a component. Token names only.

**About access**

30. No `outline: none` without a replacement that meets `--focus-ring-width` and 3:1.
31. No `user-scalable=no` and no `maximum-scale`.
32. No tappable box under 44 x 44 px, and no two tappable boxes closer than 24 px.
33. Nothing is reachable only by hover.
34. No band is told apart by colour alone.
35. No text block relies on `<html lang>` alone.
36. No plant photo has "image" as its alternative text.
37. No animation runs when `prefers-reduced-motion: reduce` is set.

## 8. Accessibility, as a checklist

Each line is testable. None is a matter of taste. The calls that need a disabled person's experience
rather than a checklist stay with a person, per this role's contract.

| Rule | The number or the condition |
| --- | --- |
| Visible focus ring on every interactive element | `--focus-ring-width` at 2 px, 3:1 against what sits next to it, drawn outside the element with `--focus-ring-offset` |
| Touch targets | `--target-min` 44 px, `--target-gap` 24 px between two of them |
| Pinch zoom works | No `user-scalable=no`, no `maximum-scale` |
| Text survives 200% zoom | Nothing clipped, nothing overlapping. The first thing to break is a 44 px verdict with a long Hungarian word, so test that one |
| Each block of text declares its language | `lang="hu"` or `lang="en"` on the block, not only on `<html>` |
| The photo has real alternative text | It names the pot and says it is a plant photo. Never "image" |
| The verdict and its band are announced together | One labelled group, `VerdictGroup`. Not a decorative chip beside a heading |
| A failure is described in words | Always through `FailureNote` |
| Motion respects `prefers-reduced-motion` | Every duration becomes 0 ms. No exception |
| Order on screen matches order in the markup | So a screen reader and a keyboard meet the verdict before the action |
| The `busy` state of a button is announced | Not only drawn. A person who cannot see the button has to know the send is running |

## 9. Language

Both languages ship in run 1: Hungarian and English (US-11).

- Every text in this flow exists in both: verdict sentences, band labels, retake advice, reason
  lines, every failure message in section 6, the AI notice and the retention lines (US-11 AC-1,
  AC-2, AC-4).
- **A pot name is shown exactly as the person typed it, and is never translated** (US-11 AC-3). It
  is the one string in the flow with no key.
- Every one of the ten verdict codes has a written sentence in both languages (US-11 AC-5).
- **Design with the Hungarian string.** Every label and button stays readable at 30 characters
  without the layout breaking. A layout that only works in English is not finished.
- No sentence is built by joining fragments. A Hungarian sentence does not put its parts in the
  English order.

## 10. Copy rules

The exact words are brand voice, and brand voice is not this role's to set. These are the rules the
words must obey.

- A failure sentence says what happened, then whether trying again helps. Never the other way round.
- The band label is a word, never a number, never a bar, never a colour on its own.
- The next action is a thing to do, not a name for a problem. "Wipe both sides of the leaves with
  soapy water" is an action. "Spider mites" is a word.
- The retention lines state a fact and give no reassurance. 180 days is 180 days.
- Never write to the reader about the app itself.

## 11. Wider screens

The phone at 360 px is the base. Nothing new appears at a wider width.

**At `--bp-wide` (600 px)**

- The content column stops at `--page-max-width` and centres. Long lines are the first thing that
  breaks on a wide screen.
- On SC-3, SC-4 and SC-5 the photo moves to the left of the verdict, so both are visible at once.
  The order in the markup does not change: verdict first, then the photo.
- The `PrimaryButton` stops being full width and becomes as wide as its text plus `--space-l` each
  side.

**At `--bp-desk` (1024 px)**

- The pot list can stand as a column to the left of the flow. The selected row is drawn on
  `--color-raised`. That is the only place `--color-raised` is used outside the `unsure` band.
- `SC-6` stays a sheet from the bottom. It does not become a centred dialog, because that would be a
  second layout to test for no gain.

**Nothing depends on hover at any width**, because the same build runs on a phone.

## 12. Story to screen

Every story in `01-user-stories.md`, and where it is drawn.

| Story | Screens | Note |
| --- | --- | --- |
| US-01 Send one photo of one named pot | SC-1, section 5 | |
| US-02 Verdict, band, action, follow-up | SC-3, SC-4, SC-5 | The malformed-answer fallback is SC-5 state 2 |
| US-03 Turn the action into a task | SC-3, SC-4, SC-6 | |
| US-04 An `unsure` result, honestly | SC-4, SC-6 | |
| US-05 `cannot-tell` with a reason | SC-5 | |
| US-06 Know it came from an AI model | SC-3, SC-4, SC-5 | `NoticeLines` |
| US-07 Sign in once, see only my own | SC-1 state 1, `AppFrame` `signed-out` | The sign-in screen is not designed here |
| US-08 Stopped at my own limit | SC-1 state 10, SC-5 state 4, `LimitNote` | |
| US-09 A message that says if trying again helps | Section 6, `FailureNote` | Every screen |
| US-10 How long photos are kept, and delete | SC-7, `RetentionNote` | Deleting all photos at once has no screen in this run |
| US-11 Hungarian or English | Section 9 | Every screen |
| US-12 An admin reads the figures | **No screen in run 1** | `00-prd.md` section 6.1 |
| US-13 An admin turns the feature off | **No screen in run 1.** Its effect on a user is SC-1 state 11 | |
| US-14 A normal account is refused | **No screen.** A refused admin action never renders a screen, and the answer does not say whether the action exists | |

## 13. What this document does not decide

Which components come from a library and which are written by hand · how the client resizes the
photo · where the daily limit is counted · how sign-in works · the exact words of any sentence ·
whether the feature ships.
