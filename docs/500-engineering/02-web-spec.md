# Web spec — `apps/web`

**Written by** 500 Engineering, run 1 (`001-photo-assessment`). **Date:** 2026-08-26.
**Read next by** 600 QA, and anybody building a screen.

`docs/300-design/001-photo-assessment/02-SPEC.md` says what is on each screen and every state it can
be in. **That file is the contract for how a screen looks and behaves.** This file says how it is
built: the routes, where the data comes from, which checks run in the browser, and where each rule
is enforced in code. Where the two disagree, the design spec wins on appearance and behaviour, and
this file wins on structure.

---

## 1. What `apps/web` is, and is not

**It is a static export.** Next.js `output: 'export'` produces a folder of plain files. They sit in a
private S3 bucket and are served through the same CloudFront distribution as the API (ADR-0010,
owner, 2026-08-26).

**It holds no credentials and reads no data store.** Every value comes from `/api/*`, fetched in the
browser, on the same origin, with the session cookie sent automatically (ADR-0010).

Five things do not exist here and must not be added:

- No Next.js server, so no route handler, no Server Action, no middleware.
- No server component that reads a cookie. There is no cookie on the server side.
- No `@aws-sdk/*` and no `@anthropic-ai/sdk`.
- No `localStorage` and no `sessionStorage` (NFR-33). An ESLint `no-restricted-globals` entry bans
  both, and an end-to-end test asserts they are empty after signing in.
- No CORS configuration. If a change ever needs `Access-Control-Allow-Origin`, something has gone
  wrong (ADR-0010).

## 2. Routes

Both languages are prerendered as separate routes. `generateStaticParams` returns exactly
`[{ locale: 'hu' }, { locale: 'en' }]`, so the build produces four routes in two languages: eight
files.

| Route | Screen | Story |
| --- | --- | --- |
| `/` | Nothing. It redirects | — |
| `/[locale]` | **SC-1 Assess**, with **SC-2 Working** as a state of the same route | US-01, US-07, US-08, US-09, US-11 |
| `/[locale]/pots/new` | **SC-8 Add a pot** — see §9 | US-15 |
| `/[locale]/result?id=<assessmentId>` | **SC-3, SC-4 or SC-5**, chosen by the band. **SC-6** is a sheet over SC-4 | US-02 to US-06, US-11 |
| `/[locale]/photo?id=<assessmentId>` | **SC-7 Photo detail** | US-10 |

**The assessment id is in the query string and not in the path, and that follows from the static
export.** A dynamic path segment in `output: 'export'` has to be listed at build time, and no
assessment exists then. A query string needs no build-time list and reaches the same screen.

**The id is opaque and must be URL-encoded.** It is the DynamoDB sort key without its prefix
(`01-contracts.md` §2.1), so it contains a `#`. An unencoded `#` in a URL starts a fragment and cuts
the value in half. Use `encodeURIComponent` when building the link and read it back with
`URLSearchParams`, which decodes for you. **The browser never takes the id apart and never builds
one.**

**SC-2 is a state, not a route.** The wait happens while one request is in flight, and the assessment
has no id until that request answers. Giving it a route would mean a route with nothing to address.
This does not change anything in `02-SPEC.md`: every state in its SC-2 table is still built.

**The redirect from `/`.** A static export cannot read `Accept-Language` on the server. Two answers
are open, both named in ADR-0010: a small CloudFront function, or one line of client-side code on a
tiny `/` page. **The CloudFront function is the one to build**, because it answers before any
JavaScript loads and it costs nothing on the client. It reads `Accept-Language`, sends `hu` when
Hungarian is preferred and `en` in every other case. Building it is 800 Infra's, wiring it is this
spec's.

**Sign-in is not a route in this app.** `AppFrame` in state `signed-out` sends the person to
`/api/auth/sign-in?locale=<locale>` with a full page navigation. The sign-in pages are Cognito's own
(ADR-0003, gate 32). Do not build a sign-in screen in this repository.

## 3. How a screen gets its data

Every screen paints its shell first and then fetches. This is not a preference; the app has no
session on the server, so it cannot render a signed-in screen any other way (ADR-0010).

1. The shell paints. The design calls this state `loading`: "a skeleton of the same shape, **no
   fade-in**" (`02-SPEC.md` SC-3 state 9, negative criterion 28).
2. `GET /api/me` answers. A 401 puts `AppFrame` in `signed-out` and no plant data is requested
   (US-07 AC-1).
3. The screen's own request runs. Its answer is **parsed with the schema from
   `@zamphora/contracts`**, never cast. A parse failure is `FailureNote` in `retry-may-work`, the
   same as any other failure.

**No response is trusted without a parse.** The API validated the same shape on the way out, so a
parse failure in the browser means the two sides have drifted, and that is worth seeing loudly rather
than rendering half a screen.

## 4. The assess flow

### 4.1 The order of the checks in the browser

Two checks run before anything is sent, because they are free and a model call is not
(`factory/feature.md`). The camera flow in `02-SPEC.md` §5 states 8 and 9 fixes the order and it is
the same for a photo from the camera and one from the phone:

```
1. format        the file type is one of ACCEPTED_PHOTO_TYPES   → else `wrong-format`
2. shorter side  at least MIN_SHORT_SIDE_PX (200)               → else `photo-too-small`
3. resize        longer side down to MAX_LONG_SIDE_PX (1000)
4. send
```

**The resize uses `createImageBitmap` and a `<canvas>`. No image library is added.** The bitmap gives
the width and height for check 2, the canvas draws the scaled copy, and `canvas.toBlob` produces the
bytes. The output is always `image/jpeg`, which matches the `.jpg` key in ADR-0007. A photo whose
longer side is already 1000 px or less is still re-encoded, so one code path covers both.

**The browser's checks are for the person, not for safety.** The API runs all three again on the
bytes it receives, because a check that only runs in the browser is not a check (ADR-0007). The
browser only ever sends JPEG; the API still accepts all four types, because a script is not the
browser.

### 4.2 The state machine

One state value drives SC-1 and SC-2. Every name below is a state in `02-SPEC.md`, and no state is
invented here.

```
signed-out → empty → ready → photo-chosen → sending → (SC-2) resizing → uploading → asking
                                                            ↓
                    answered ──────────────────────→ /[locale]/result?id=…
                    timed-out · provider-error · not-retryable · offline → failure view
```

**The `requestId` is made at `photo-chosen`, not at `sending`.** **Added 2026-08-31.** One UUID per
photo the person picks. It goes in the form body of `POST /api/assessments` and the API uses it to
make sure one tap is one charge (`03-api-spec.md` §4a). **A resend of the same photo must carry the
same id** — that is the whole point — so it is stored with the chosen photo in the state, and a new
one is only made when a new photo is picked. If the API answers `409 request-in-flight`, the screen
stays in `asking` and keeps waiting; it does not send again.

Refusals that never reach `sending`: `wrong-format`, `photo-too-small`, `daily-limit-reached`,
`feature-off`, `no-credit`, `offline`, and `empty` with no pot picked.

**Corrected 2026-08-31.** Two of these were written with short names — `too-small` and
`limit-reached` — that do not exist. The real codes are `photo-too-small` and `daily-limit-reached`
(`01-contracts.md` §8). A code is a value from a closed list, so a near-miss is a bug, not a
shorthand.

**Four rules the state machine carries, and each is a negative criterion in `02-SPEC.md` §7.**

- **Send cannot be tapped twice for one assessment** (criterion 7). The button moves to `busy` on the
  first tap, and `busy` is announced, not only drawn (`02-SPEC.md` §8).
- **No automatic retry of any kind** (criterion 11). A failure shows a message and the person decides
  whether to tap again. There is no wait-and-try-again code in this app (NFR-05).
- **Nothing is queued when the device is offline** (criterion 12). The chosen photo stays on screen
  and nothing is sent.
- **The chosen photo survives a failure** (US-09 AC-2, SC-1 state 15). It is held in memory as a
  `Blob` for the life of the page. It is **not** written to any storage, because NFR-33 forbids
  browser storage and a photo of the inside of a home is the last thing to put there.

### 4.3 The client deadline

```ts
export const CLIENT_DEADLINE_MS = 30_000;
```

One timer, started on the tap that sends and covering the resize, the upload and the answer
(US-01 AC-8, NFR-01). When it fires, the screen shows `FailureNote` in `retry-may-work` with the code
`client-deadline`, and the in-flight request is abandoned.

It is a different thing from the server's own 20-second deadline. The server gives up first so that
it, and not the gateway, writes the answer (ADR-0002). The client timer is the backstop for a request
that never comes back at all.

**There is no cancel button** (`02-SPEC.md` SC-2).

## 5. Components

Nineteen components are named in `02-SPEC.md` §3. Exactly one of them needs a library.

| Built on | Components |
| --- | --- |
| **Base UI**, copied in with the shadcn CLI | `ConfirmSheet` — focus trap, focus return, escape key, scrim click, scroll lock |
| `<button>` | `PrimaryButton`, `QuietButton`, `DangerButton` |
| A group of `<input type="radio">` | `PotPicker` |
| `role="group"` with `aria-labelledby` | `VerdictGroup` |
| `aria-live="polite"` | `StepList`, `WorkingIndicator` |
| `role="alert"` | `FailureNote` |
| Text and layout only | `AppFrame`, `ScreenHeading`, `PhotoAdder`, `PhotoWell`, `PhotoPreview`, `BandMark`, `NextActionCard`, `UnsureBand`, `RetakeAdviceList`, `ReasonLine`, `NoticeLines`, `RetentionNote`, `LimitNote` |

This is the count ADR-0011 weighed the dependency against, and it is repeated here so the first
person to reach for the library on a second component notices they are doing it.

**`ConfirmSheet` gets its edit pass in the same task that copies it** (ADR-0011): 44 x 44 tap
targets, a focus ring that meets 3:1, every transition behind `prefers-reduced-motion`, and
`--radius-card` in place of `rounded-md`.

**One component is used in `02-SPEC.md` and not defined there: `InlineRefusal`.** It appears in SC-1
states 6 and 7 and in camera state 10. Until 300 Design defines it, it is built as **`FailureNote`
placed directly under `PhotoWell`** instead of at the foot of the screen. That keeps every rule that
matters true — a failure is described in words, and it ends with one of the two sentences — and adds
no new shape. See §10.

### 5.1 Two components that carry the honesty rules

**`VerdictGroup` is the one most easily built wrong.** It is one labelled group holding the
`BandMark`, the band label and the verdict sentence, announced together. A screen reader that reads
"Túl sok víz" without "Bizonytalan" has turned an unsure answer into a confident one
(`02-SPEC.md` §3.9). No verdict sentence may be rendered outside it (negative criterion 3).

**`ResultLayout` wraps SC-3, SC-4 and SC-5 and always renders `NoticeLines`.** That is the
enforcement point for NFR-37: the AI notice and the "not professional advice" line cannot be
forgotten on one screen, because no result screen can be built without the wrapper. Neither line is
inside a collapsed section, a tooltip or a link (US-06, negative criterion 19).

## 6. Tokens and styling

Tokens reach the code as CSS custom properties through Tailwind's `@theme`. **The token name in
`docs/300-design/03-tokens.md` and the name in the code are the same string**, so a search for
`--color-warn` finds every use.

- **No hex value in any component** (negative criterion 29).
- **One theme, not two.** There is no light variant and none may be half-built. A colour with no
  light value is a bug waiting for somebody to add a light mode (`factory/feature.md`).
- **Two radii only**, `--radius-card` and `--radius-pill` (criterion 23). **One shadow only**,
  `--shadow-sheet`, on the confirm sheet (criterion 24).
- **No size rule on `--color-warn`.** It passes AA at any text size on both surfaces, so
  `DangerButton` uses it at `--text-body` and the `unsure` label may be set at any size
  (`03-tokens.md`, `02-SPEC.md` §3.12).
- Under `prefers-reduced-motion: reduce`, every duration token becomes `0ms` and the sheet appears in
  place. No exception (criterion 37, `03-tokens.md` §6).

## 7. Language

- Message files live in `apps/web/src/messages/`, one per locale: `hu.json` and `en.json`.
- **A key present in one file and missing in the other fails the build** (US-11 AC-4). The test
  compares the two key sets and prints the difference.
- **Every one of the ten verdict codes has a sentence in both files** (US-11 AC-5). The test asserts
  a key exists for each code in `VERDICT_CODES`. The ten codes and what each one means are in
  `00-prd.md` §5.2; the sentences are written from those meanings.
- **Every block of text carries `lang="hu"` or `lang="en"`, not only `<html>`** (criterion 35,
  `02-SPEC.md` §8). A screen reader reads Hungarian with English rules otherwise.
- **A pot name is never translated and never has a key** (US-11 AC-3).
- **`WrittenInLine`** renders under the next action **only** when `assessment.writtenInLocale` is not
  the locale being read. When they match, nothing is rendered — no empty space, no placeholder
  (`02-SPEC.md` §3.11, gate 28, `05-patterns.md` §10).
- **No sentence is built by joining fragments** (`02-SPEC.md` §9).
- Every label and button stays readable at 30 characters. Test with the Hungarian string
  (`03-tokens.md` §2.1).

## 8. Failures on screen

Every failure is drawn with `FailureNote`, in this order: what happened · exactly one of "trying
again may work" or "trying again will not work now" · an action, if one exists (US-09 AC-1).

The mapping is mechanical, and that is the point:

```
Problem.retryHint === 'may-work'       → FailureNote state `retry-may-work`,   try-again button
Problem.retryHint === 'will-not-work'  → FailureNote state `retry-will-not-work`, no button
```

Four codes get their own state instead, because the sentence they need is different:

| Code | `FailureNote` state |
| --- | --- |
| `daily-limit-reached` | `blocked-by-limit` — says the limit is reached and when it resets |
| `feature-off` | `feature-off` |
| `no-credit` | `no-credit` |
| `offline` | `offline` |

**The three provider failures all draw one screen.** `provider-timeout`, `provider-throttled` and
`provider-unavailable` are three names in the log and one `retry-may-work` note on screen, because
the difference does not change what the person can do (`05-patterns.md` §8).

**A `will-not-work` failure never draws a try-again button**, so a paid call cannot be started by
somebody who did not read the sentence (`02-SPEC.md` §3.16, criterion 10).

**The reset time.** `daily-limit-reached` carries `quotaResetsAt` in `Problem.details`, as a UTC
instant. The screen renders it in the reader's own local time (US-08 AC-2, ADR-0008).

**`LimitNote` renders only when `assessmentsLeftToday` is 2 or less.** Above that it is not rendered
at all, because US-08 AC-4 forbids a message about the limit when the person is under it
(`02-SPEC.md` §3.19).

## 9. SC-8 — Add a pot

US-15 is in scope (`factory/feature.md`, added 2026-08-25, gate 21). **`02-SPEC.md` §4, SC-8 now draws
it** (written 2026-08-31). This section is the engineering half — the route, the fields and the
validation. Where this file and `02-SPEC.md` disagree about a state, the layout or the copy,
**`02-SPEC.md` wins**, as it does for every other screen.

- **Route:** `/[locale]/pots/new`.
- **Two fields, and nothing else on the screen** (AC-2): a name, and where the plant is.
- Both are `<input type="text">` at `--target-comfortable`, `--radius-card`, validated against
  `CreatePotRequest` before sending.
- An empty name is refused with a message saying what to do (AC-4). The message is `FailureNote`
  under the field.
- **Save** is the one `PrimaryButton`. On success the person lands back on `/[locale]` with the new
  pot already selected, so they can take a photo without going through a menu (AC-7).
- Two pots may have the same name (AC-6). Nothing checks for a duplicate.
- A name of 30 Hungarian characters must not break the layout anywhere it is shown (AC-5).
- **At most three screens between signing in and sending the first photo** (AC-8). The path is:
  Cognito's page → SC-8 → SC-1. That is three, and adding a fourth screen anywhere in that path
  breaks the criterion.

## 10. Accessibility, and where each rule lives

Every line in `02-SPEC.md` §8 is testable, and none of it comes from a library — Base UI's own page
says visually indicating focus is the developer's job (ADR-0011). This table says which piece of code
owns each one.

| Rule | Where it is enforced |
| --- | --- |
| A visible focus ring on every interactive element, 2 px, 3:1 | One global CSS rule using `--focus-ring-*`. **`outline: none` with no replacement is banned by an ESLint rule on the class strings and by a review of every copied component** |
| Tap targets 44 x 44, 24 px apart | `--target-min` and `--target-gap` on every button and row. The edit pass on each copied component |
| Pinch zoom works | The viewport meta tag carries no `user-scalable=no` and no `maximum-scale`. One test asserts it |
| Text survives 200% zoom | Playwright at 200%, on the 44 px verdict with a long Hungarian word — the first thing to break |
| `lang` on each block of text | The message renderer sets it. A test asserts no result screen has a text block without one |
| The photo has real alternative text | `PhotoPreview` takes the pot name and builds it. **"image" is never the alternative text** (criterion 36) |
| Verdict and band announced together | `VerdictGroup` |
| A failure is described in words | `FailureNote`, always |
| Motion respects `prefers-reduced-motion` | The token layer sets every duration to `0ms` |
| Order on screen matches order in the markup | The wide layout moves the photo with CSS only, never by reordering the markup (`02-SPEC.md` §11) |
| A `busy` button is announced | `PrimaryButton` sets `aria-busy` and changes its label |

## 11. Size

NFR-50: the JavaScript that draws SC-1 is **170 KB gzipped or less**, checked by `size-limit` in the
`bundle-budget` job.

**That number is a guess and everybody involved has said so.** `factory/feature.md` asks for one real
screen to be built and measured, ADR-0011 repeats it, and `06-nfrs.md` §8 lists it as the number it
is least sure of. **Build SC-1, measure it, write the real number into `06-nfrs.md` and into the
`size-limit` config, and record what it actually was.** Doing that is part of the first web task, not
a later tidy-up.

## 12. Story to screen

| Story | Route and screen | Note |
| --- | --- | --- |
| US-01 Send one photo of one named pot | `/[locale]` — SC-1, SC-2, the camera flow | |
| US-02 Verdict, band, action, follow-up | `/[locale]/result` — SC-3, SC-4, SC-5 | |
| US-03 Turn the action into a task | `/[locale]/result` — SC-3, SC-4, SC-6 | |
| US-04 An `unsure` result, honestly | `/[locale]/result` — SC-4 | |
| US-05 `cannot-tell` with a reason | `/[locale]/result` — SC-5 | |
| US-06 Know it came from an AI model | `ResultLayout` → `NoticeLines`, on all three result screens | |
| US-07 Sign in once, see only my own | `AppFrame` `signed-out`, SC-1 state 1 | The sign-in pages are Cognito's |
| US-08 Stopped at my own limit | SC-1 state 10, SC-5 state 4, `LimitNote` | |
| US-09 A message that says if trying again helps | `FailureNote`, every screen | §8 |
| US-10 How long photos are kept, and delete | `/[locale]/photo` — SC-7, `RetentionNote` | AC-7, deleting every photo at once, moved out of run 1 with its route on 2026-08-31 |
| US-11 Hungarian or English | Every route, in both languages | §7 |
| US-12 An admin reads the figures | **No screen.** Moved out of run 1 by the owner, gate 30 | |
| US-13 The feature can be turned off | **No screen.** The switch is flipped in the AWS website. Its effect on a person is SC-1 state 11 | |
| US-14 A normal account is refused | **No screen, on purpose.** A refused admin action never renders a screen and never says whether the action exists | |
| US-15 Add a pot | `/[locale]/pots/new` — SC-8 | §9. Design spec written 2026-08-31, `02-SPEC.md` §4, SC-8 |

## 13. What this file does not decide

The exact words of any sentence · which of the two answers builds the `/` redirect, which is 800
Infra's to place · the unit test runner.
