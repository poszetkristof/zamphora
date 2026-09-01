# Contracts — `packages/contracts`

**Written by** 500 Engineering, run 1 (`001-photo-assessment`). **Date:** 2026-08-26.
**Read next by** 900 Security, 600 QA, and anybody writing `apps/web` or `apps/api`.

This file describes every value that crosses the wire in this feature. Each one is a Zod schema in
`@zamphora/contracts`. This file is rewritten for every feature; `00-conventions.md` is not.

**Two upstream files are the authority behind much of this one.**
`docs/200-product/001-photo-assessment/00-prd.md` §5.2 owns the ten verdict codes.
`docs/400-architecture/05-patterns.md` §1, §4 and §8 own the key shapes, the answer schema and the
failure names. Where this file and one of those two disagree, they win and this file is wrong.

---

## 1. The one rule

**No type that crosses the wire is declared anywhere except `packages/contracts`.**

The reason is not tidiness. `apps/api` validates the request with a schema, and `apps/web` parses the
answer with a schema. If those are two different pieces of code, they drift, and the drift shows up
as a screen that renders nothing on a value the server thought was fine. **One schema object,
imported by both, means the two sides fail on exactly the same input.**

The same schema also checks the model's answer (ADR-0005, `05-patterns.md` §11). So a change to the
answer shape is one edit in one file, and the web, the API and the provider request all move
together.

**The rule has a second half, and it is the one people forget: a type that does *not* cross the wire
does not belong here either.** A schema in this package with only one user is not a contract; it is a
type in the wrong folder. §10 is the list, and it is also the check.

Three habits follow, and each is testable:

- A schema is exported with its type: `export type Pot = z.infer<typeof Pot>`. Nobody writes the
  type by hand.
- A closed list is a `const` array with `as const`, and the schema is built from it, so the list is
  the single place the values exist.
- **The API never sends prose.** A failure is a `code`; the sentence is looked up in a message file
  in the reader's language. That is what makes US-11 AC-4 checkable — a missing sentence is a
  missing key, and a test can count keys.

## 2. Primitives and ids

```ts
export const LOCALES = ['hu', 'en'] as const;
export const Locale = z.enum(LOCALES);

export const PotId = z.string().uuid().brand<'PotId'>();

export const IsoInstant  = z.iso.datetime();               // 2026-08-26T18:04:11.000Z
export const CalendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
```

### 2.1 Two ids are composite, and that is not a style choice

`05-patterns.md` §1 fixes the sort keys:

```
Assessment   PK = USER#<sub>   SK = ASSESS#<potId>#<iso timestamp>
Care task    PK = USER#<sub>   SK = TASK#<due date>#<taskId>
```

**A `GetItem` needs the whole sort key, and there is no secondary index in run 1** (ADR-0002,
`05-patterns.md` §1). So a plain UUID cannot address either row: the key needs the pot id and the
timestamp for one, and the due date for the other. The id that travels on the wire is therefore the
sort key **without its prefix**, and one value builds the key with no lookup:

```ts
// `<potId>#<createdAt>` — the ASSESS sort key without its prefix
export const AssessmentId = z.string().min(1).brand<'AssessmentId'>();
export const assessmentId = (potId: PotId, createdAt: string) =>
  `${potId}#${createdAt}` as z.infer<typeof AssessmentId>;

// `<dueDate>#<uuid>` — the TASK sort key without its prefix
export const CareTaskId = z.string().min(1).brand<'CareTaskId'>();
export const careTaskId = (dueDate: string, taskUuid: string) =>
  `${dueDate}#${taskUuid}` as z.infer<typeof CareTaskId>;
```

Both are opaque to the browser. It receives one, puts it in a query string or a path, and sends it
back. **It never takes them apart**, and it never builds one itself — the two builders above run in
`apps/api` only.

**Both must be URL-encoded**, because `#` in a URL starts a fragment and would silently cut the value
in half. This is the single easiest thing to get wrong in this file.

**One consequence for the photo key, and the owner settled it on 2026-08-26 (gate 38).** The
stop-and-ask raised here was right: writing a composite `AssessmentId` into ADR-0007's object key
repeated the pot id and put a `#` inside an S3 key. **ADR-0007 was amended.** The key is now
`photos/<userId>/<potId>/<createdAt>.jpg` — the timestamp half only. The pot id is already the
folder above it, so nothing is lost, and the folder sorts by time on its own.

**The id on the wire is still composite.** Only the S3 key changed. `AssessmentId` remains
`<potId>#<createdAt>` and must still be URL-encoded wherever it appears in a path or a query
string.

**The ids are branded on purpose.** A plain `string` can be passed to the wrong parameter by
accident; a branded id cannot.

### 2.2 Two types that live in `apps/api` instead, and why

**`UserId` is not here.** It never crosses the wire — the browser never learns its own user id, and
never needs to, because the API takes the owner from the session and from nowhere else (ADR-0004,
`05-patterns.md` §3). So it is declared in `apps/api`, branded the same way:

```ts
// apps/api — not in packages/contracts, because it never crosses the wire
export const UserId = z.string().uuid().brand<'UserId'>();
```

The only place a `UserId` is created is where the session is read. The repository's key builder takes
one, so a query with no owner does not compile. That is the type-level half of NFR-30.

**`AccountType` is not here either, in run 1.** The three decorators need the closed list
`['USER', 'ADMIN']`, so the list exists — but it exists in `apps/api`, beside the guard that uses it,
because no run-1 response carries an account type and no screen draws one. `ADMIN` is in the list and
no route carries it (gate 30, 2026-08-26); the guard's whole job is to refuse the admin route that
does not exist yet (US-14 AC-3, `05-patterns.md` §12).

**The trigger to move it into this package:** the day an admin screen needs to know its own account
type. That is a later run, and moving it then is one file change with no behaviour attached.

## 3. The words the model may use

These four lists are the vocabulary of the whole feature. Every one of them is closed. A value
outside a list is not a rare answer — it is an unreadable one.

```ts
export const CONFIDENCE_BANDS = ['likely', 'unsure', 'cannot-tell'] as const;
export const ConfidenceBand = z.enum(CONFIDENCE_BANDS);

export const CANNOT_TELL_REASONS = [
  'too-dark',
  'not-a-plant',
  'more-than-one-plant',
  'too-small-or-blurred',
] as const;
export const CannotTellReason = z.enum(CANNOT_TELL_REASONS);

export const RETAKE_ADVICE = [
  'in-daylight',
  'underside-of-leaf',
  'soil-and-pot-bottom',
  'whole-plant',
] as const;
export const RetakeAdvice = z.enum(RETAKE_ADVICE);

// The ten codes, copied from 00-prd.md §5.2, in the order that file writes them.
export const VERDICT_CODES = [
  'water-too-much',
  'water-too-little',
  'light-too-much',
  'light-too-little',
  'pest',
  'disease',
  'root-problem',
  'nutrient-problem',
  'nothing-wrong',
  'other',
] as const;
export const VerdictCode = z.enum(VERDICT_CODES);
```

**What each code means is in `00-prd.md` §5.2 and is not copied here**, so the two cannot drift. The
meanings are what the ten user-facing sentences are written from, in both languages (US-11 AC-5).

**Two of the ten carry a rule, and both come from `00-prd.md` §5.2.**

- **`nothing-wrong` exists so the model is never forced to find a fault.** Without it, it invents one.
  When the verdict is `nothing-wrong`, no care task is offered at all (US-02 AC-7).
- **`other` exists so the model is never forced into a wrong code, and its next action must still be
  a thing to do.** So `nextAction` is a non-empty string on `other`, exactly as on the other eight.

**The list is reviewed after the first 20 real assessments** (gate G-6, closed 2026-08-25 with a
review date). It cannot fail in silence: a missing code shows up as a rising share of `other`, which
is countable. Do not add an eleventh code without that review.

**There is no confidence number anywhere in this file, and that is a rule, not an omission.** The
band is a word. `00-prd.md` §5.1 and `02-SPEC.md` negative criterion 1 both forbid a percentage or a
score reaching the user, and the cheapest way to keep that true is to have no field that could carry
one.

## 4. What the model returns — `ModelAnswer`

This schema does two jobs. It is turned into the JSON Schema sent to Anthropic as
`output_config.format`, and it parses the answer that comes back (ADR-0005). **The field list and the
nullability below are `05-patterns.md` §4 copied exactly.**

**Six fields. Every one is present in `required`. Four of them may be `null`.**

```ts
export const ModelAnswer = z.strictObject({
  band:             ConfidenceBand,                    // never null
  verdict:          VerdictCode.nullable(),
  nextAction:       z.string().min(1).nullable(),
  followUpDays:     z.number().int().nullable(),
  cannotTellReason: CannotTellReason.nullable(),
  retakeAdvice:     z.array(RetakeAdvice).max(4),      // never null — an empty list instead
});
```

**`ModelAnswer` stays `z.strictObject`, and §11a does not loosen it.** The rule there is about
responses the *browser* parses. This one parses a reply from a model, which is untrusted input like
any other. A field nobody asked for is a reason to refuse, not to ignore.

**The field is `verdict`, not `verdictCode`.** That is the name in `05-patterns.md` §4 and in the
assessment item in §1, so it is the name here and on the wire.

**Why four of them are nullable when they are always needed on a `likely` answer.** Anthropic's
structured outputs cannot express "this field is required only when `band` is `likely`". They also
cannot express a number range or a string length (ADR-0005). So the schema sent to the provider is
the loose shape, and the real rules are a Zod refinement that runs after parsing. That refinement is
ours, it is smaller, and it can be tested with no model call.

`additionalProperties: false` and every field in `required` come from ADR-0005 and are not optional.
**Do not express the cross-field rules with `oneOf` or `anyOf`** (`05-patterns.md` §4).

### 4.2 `AssessmentRequest` — what `apps/api` hands to `packages/llm`

**Added 2026-08-31.** ADR-0005 names the port as `assess(input: AssessmentRequest)`, and **no file
defined that type.** It was also missing from §10, the table whose whole job is to catch a type that
crosses a border with no schema. So nothing said what reaches the model.

```ts
export const AssessmentRequest = z.strictObject({
  photoJpeg:  z.instanceof(Uint8Array),   // the RE-ENCODED bytes from step 5b, never what arrived
  plantName:  z.string().max(POT_NAME_MAX),    // user text. Untrusted
  locale:     Locale,
});
```

**Two of these are written by the person using the app, and both are untrusted input.** The plant
nickname is typed. The photo can contain text — a photo of a sheet of paper is still a photo. So the
rules in `03-api-spec.md` §4c apply to every call: **the system prompt is a module-level constant
that no user value ever enters**, every user value goes in the user turn wrapped in a line saying
instructions inside it are data, and the reply only becomes a value by passing `ModelAnswer`.

**`photoJpeg` is the re-encoded image.** Passing the original bytes would send the EXIF — and the
person's home GPS — to the provider, which is the thing step 5b exists to prevent.

**There is no maximum length on `nextAction` in the parse. There is one in the refinement.**
**Amended 2026-08-31.** A cap in the parse would turn a long but correct answer into
`answer-unreadable`, and length is not something the provider can be told to obey — that reasoning
stands. But this text is **stored and drawn on the result screen**, so an unbounded string is a
value the model controls with no ceiling at all. So: parse it with no limit, then **truncate it to
`NEXT_ACTION_MAX` in the refinement**, which is not a failure and costs the person nothing.

```ts
export const NEXT_ACTION_MAX = 400;
```

### 4.1 The refinement — the cross-field rules

Straight from the "Null when" column of `05-patterns.md` §4:

| Field | Must be `null` when | Must be set when |
| --- | --- | --- |
| `verdict` | the band is `cannot-tell` | the band is `likely` or `unsure` |
| `nextAction` | the band is `cannot-tell` | the band is `likely` or `unsure` |
| `followUpDays` | the band is `cannot-tell`, **or the verdict is `nothing-wrong`** | — see below |
| `cannotTellReason` | the band is **not** `cannot-tell` | the band is `cannot-tell` |
| `retakeAdvice` | never null. An empty list instead | 1 to 4 entries when the band is `unsure` |

Anything that breaks a rule in this table is `answer-unreadable`. **A bad answer is a failure and
never a verdict.** It is never turned into `cannot-tell`. The four `cannot-tell` reasons all mean
"I looked at your photo and could not tell", and a broken answer means nothing was looked at
(`factory/feature.md`, 2026-08-25; ADR-0005).

**Three cases look like failures and are not.**

1. **`followUpDays` is `null` because the verdict is `nothing-wrong`.** That is the correct answer,
   not a broken one. No task is offered, which is US-02 AC-7 and negative criterion 16.
2. **No retake advice on an `unsure` answer.** The assessment is still good. The screen shows the one
   fixed line "take another photo in daylight" and the missing field is recorded for QA
   (US-04 AI Eval Card, `02-SPEC.md` §3.13 state `fallback`).
3. **`followUpDays` outside 1 to 30.** The assessment is still good. It is stored as `null`, the
   verdict and the next action are still shown, and **no care task is offered** (US-03 AC-6,
   `02-SPEC.md` SC-3 state 3).

The range check therefore runs **after** the refinement, as a normalisation step, never as a parse
failure. `05-patterns.md` §4 says the same: it is the acceptance criterion written for exactly this.

```ts
export const FOLLOW_UP_DAYS_MIN = 1;
export const FOLLOW_UP_DAYS_MAX = 30;   // provisional — US-02 AC-6 marks the range as the owner's
```

## 5. The photo

One set of numbers, used by the browser before the upload and by the API again after it. **A check
that only runs in the browser is not a check** (ADR-0007).

```ts
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const MIN_SHORT_SIDE_PX = 200;
export const MAX_LONG_SIDE_PX  = 1000;
export const MAX_PHOTO_BYTES   = 2_097_152;   // 2 MB
```

The four formats come from Anthropic's vision limits (US-01 AC-2). 200 px is Anthropic's warning
about small images (US-01 AC-5). 1000 px keeps one photo at 1296 visual tokens instead of about three
times that (US-01 AC-4). 2 MB is the API's hard ceiling on the request body (ADR-0007).

## 6. Pots

```ts
export const POT_NAME_MIN = 1;
export const POT_NAME_MAX = 60;

export const Pot = z.object({
  id:        PotId,
  name:      z.string().min(POT_NAME_MIN).max(POT_NAME_MAX),
  room:      z.string().min(1).max(60),
  createdAt: IsoInstant,
});

export const CreatePotRequest = z.strictObject({
  name: z.string().min(POT_NAME_MIN).max(POT_NAME_MAX),
  room: z.string().min(1).max(60),
});

export const PotListResponse = z.object({ pots: z.array(Pot) });
```

The item holds the name the person typed and the room (`05-patterns.md` §1).

Two things about `name`. It is **shown exactly as the person typed it and is never translated**
(US-11 AC-3) — it is the one string in the whole flow with no message key. And two pots may share a
name; the room is what tells them apart (US-15 AC-6), so there is no uniqueness rule.

`room` is required and is capped at 60 characters. **Neither of those two facts is in an input**, and
`00-prd.md` does not fill the hole either. US-15 AC-2 asks for two fields and AC-4 gives a length
rule for the name only. See §11.

## 7. Assessments and care tasks

```ts
export const PhotoStatus = z.enum(['present', 'removed'] as const);

export const Assessment = z.object({
  id:               AssessmentId,
  potId:            PotId,
  potName:          z.string(),            // joined from the pot row, for the photo's alt text
  band:             ConfidenceBand,
  verdict:          VerdictCode.nullable(),
  nextAction:       z.string().nullable(),
  followUpDays:     z.number().int().nullable(),
  cannotTellReason: CannotTellReason.nullable(),
  retakeAdvice:     z.array(RetakeAdvice),
  writtenInLocale:  Locale,
  photoStatus:      PhotoStatus,
  careTaskId:       CareTaskId.nullable(),
  createdAt:        IsoInstant,
});

export const AssessmentResponse = z.object({
  assessment:            Assessment,
  assessmentsLeftToday:  z.number().int().min(0),
  quotaResetsAt:         IsoInstant,
});

export const CareTask = z.object({
  id:           CareTaskId,
  potId:        PotId,
  assessmentId: AssessmentId,
  dueDate:      CalendarDay,
  action:       z.string(),
  createdAt:    IsoInstant,
});

export const CreateCareTaskRequest = z.strictObject({
  assessmentId:    AssessmentId,
  confirmedUnsure: z.boolean().default(false),
});

export const PhotoUrlResponse = z.object({
  url:       z.string().url(),
  expiresAt: IsoInstant,
});

export const MeResponse = z.object({
  assessmentsLeftToday: z.number().int().min(0),
  quotaResetsAt:        IsoInstant,
});
```

**Two stored fields are deliberately not on the wire.** The assessment item also holds the **model
id** and the **cost** (`05-patterns.md` §1). The browser has no use for either, and a cost is not a
user-facing number. They stay on the item, where NFR-10, NFR-13 and NFR-20 read them.

**`potName` is joined, not stored.** The API already read the pot row to check ownership, so it fills
this field from there. `05-patterns.md` §1 does not list a pot name on the assessment item, and
copying one would be a second place for the same string to live.

**`writtenInLocale` is the field that makes US-11 AC-6 possible.** The next action is the one value
the model writes as free text, so it exists in one language only (`05-patterns.md` §10). When it does
not match the language being read, the screen adds one line naming the language it was written in,
and nothing is translated and no second model call is made (owner, gate 28, 2026-08-26).

**`photoStatus` exists so no screen has to guess.** A photo can be gone because the person deleted it
or because 180 days passed. The assessment text stays either way and the screen says the photo was
removed (US-10 AC-4, `02-SPEC.md` SC-3 state 7, SC-7 states 4 and 5).

**`confirmedUnsure` is the whole of NFR-31.** When the stored band is `unsure`, the task route
refuses unless this is `true`. It defaults to `false`, so a caller who forgets it gets a refusal
rather than a task (US-03 AC-4).

**`assessmentsLeftToday` is for display only.** `LimitNote` renders when it is 2 or less
(`02-SPEC.md` §3.19). It is never used to decide whether a call may run — that decision is one
conditional write in the API and nothing else (ADR-0008).

**`MeResponse` carries no account type**, for the reason in §2.2: nothing on any run-1 screen draws
one. A 401 from this route is how the web knows it is signed out (US-07 AC-1).

## 8. Failures — the `Problem` envelope, which is RFC 9457

Every answer that is not a success is this shape, and nothing else. It is
**[RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)**, served as
`application/problem+json`.

```ts
export const RETRY_HINTS = ['may-work', 'will-not-work'] as const;
export const RetryHint = z.enum(RETRY_HINTS);

// z.object, NOT z.strictObject — RFC 9457 §3.2 says a reader must ignore
// members it does not know, and a strict schema does the opposite. See §11a.
export const Problem = z.object({
  // The five RFC 9457 members. `instance` is omitted — see below.
  type:      z.url(),        // https://zamphora.app/problems/<code>
  title:     z.string(),     // short, stable, English, for a developer
  status:    z.int().min(400).max(599),
  detail:    z.string(),     // fixed English, one per code, from a closed map. See below

  // Extension members.
  code:      FailureCode,
  retryHint: RetryHint,
  details:   z.record(z.string(), z.unknown()).optional(),
});
```

**Why a standard rather than our own three fields.** `application/problem+json` is understood by
HTTP tooling, by logging services and by anyone who has met an API before. It costs three fields we
would otherwise not send, and it means nobody has to learn a shape that only exists here. **This was
the owner's decision on 2026-08-27**, after `Problem` was found claiming the media type without
matching it.

**`code` stays, and it is still the field the code switches on.** `type` is a URI and URIs invite
string-matching on a URL, which breaks the day the domain changes. The rule: **branch on `code`,
never on `type`.**

**`instance` is deliberately not sent.** RFC 9457 makes it optional. It would identify one specific
occurrence — a request id — and NFR-30 keeps request ids out of response bodies, because the browser
has no use for one and it is one more thing that can leak.

**`title` and `detail` are not the same thing, and mixing them is the usual mistake.**

| Field | Who reads it | Language | Changes between two failures of the same kind? |
| --- | --- | --- | --- |
| `title` | a developer, a log | always English | no — it is stable per `code` |
| `detail` | the person using the app | the reader's language | yes — it may name this photo or this limit |

`detail` is a promise: **it is safe to put on a screen.** No stack, no SQL, no file path, no
provider message copied through. That rule already exists in `.claude/skills/security/SKILL.md`.

`retryHint` is not decoration. US-09 AC-1 says **no failure message may end without exactly one of
two sentences**, and this field is which one. `02-SPEC.md` §3.16 turns it into a button: a try-again
button exists only when the hint is `may-work`, so a person who did not read the sentence cannot
start a paid call.

**`status` must equal the real HTTP status.** Two places state the same number, so a test asserts
they match — the table in §8.1 is the source.

### 8.1 Every failure code

The twelve names from `05-patterns.md` §8 are used as written, and every `retryHint` below matches
its sentence in that table. The rest are API-level refusals that happen before the model call and are
outside the `LlmProvider` port.

| Code | HTTP | `retryHint` | Where it happens | Screen |
| --- | --- | --- | --- | --- |
| `not-signed-in` | 401 | will-not-work | Any route with `@Roles(...)`, no valid session | Go to sign-in. SC-1 state 1 |
| `not-found` | 404 | will-not-work | The row is not under the caller's owner key, or does not exist | `FailureNote` |
| `invalid-request` | 400 | will-not-work | The body or the query failed its Zod parse | `FailureNote` |
| `no-pot-picked` | 400 | will-not-work | No `potId` on an assessment request | SC-1, "pick or create a pot" |
| `wrong-format` | 400 | will-not-work | The file is not one of the four types | SC-1 state 6 |
| `photo-too-small` | 400 | will-not-work | The shorter side is under 200 px | SC-1 state 7 |
| `photo-too-large` | 400 | will-not-work | Over 2 MB, or the longer side is over 1000 px | SC-1, `InlineRefusal` |
| `daily-limit-reached` | 429 | will-not-work | The conditional increment failed | SC-1 state 10, SC-5 state 4 |
| `feature-off` | 503 | will-not-work | The kill-switch is off | SC-1 state 11 |
| `no-credit` | 503 | will-not-work | The provider says the credit balance is empty | SC-1 state 12 |
| `provider-timeout` | 502 | **may-work** | The provider did not answer in time | SC-2 state 6 |
| `provider-throttled` | 502 | **may-work** | The provider answered 429 | SC-2 state 6 |
| `provider-unavailable` | 502 | **may-work** | The provider answered 503 or another 5xx | SC-2 state 6 |
| `provider-bad-request` | 502 | will-not-work | The provider refused the request itself | SC-2 state 7 |
| `provider-refused` | 502 | will-not-work | `stop_reason` was `refusal` | SC-2 state 7 |
| `answer-truncated` | 502 | will-not-work | `stop_reason` was `max_tokens` | SC-2 state 7 |
| `answer-unreadable` | 502 | **may-work** | The answer failed the §4.1 refinement | SC-2, the failure view |
| `deadline-passed` | 503 | **may-work** | The request reached `REQUEST_DEADLINE_MS` | SC-2 state 5 |
| `task-not-possible` | 409 | will-not-work | `followUpDays` is null, the band is `cannot-tell`, or the verdict is `nothing-wrong` | No task button is drawn, so this is a guard, not a screen |
| `confirmation-required` | 409 | will-not-work | The band is `unsure` and `confirmedUnsure` was not `true` | The web opens SC-6 instead of showing this |
| `photo-already-removed` | 409 | will-not-work | The photo was already deleted or already expired | SC-7 state 5 |
| `unknown` | 500 | may-work | An exception reached the top of a request | `FailureNote` |

**`photo-rejected` is three codes here, and that is on purpose.** `05-patterns.md` §8 gives one name
for a rejected photo. One name cannot carry two required sentences: US-01 AC-2 says the refusal
**names the four formats**, and US-01 AC-5 says it **says the photo is too small**. So the one name
becomes `wrong-format`, `photo-too-small` and `photo-too-large`. All three carry
`will-not-work`, exactly as `photo-rejected` does. See §11.

**Timeout, throttling and unavailability are three names, not one**, because `05-patterns.md` §8
names three and the log has to tell them apart. All three show the same screen.

**Three more are told apart in the log and look identical on screen.**
`provider-refused`, `answer-truncated` and `answer-unreadable` all give the person the same screen,
because the difference does not change what they can do. The log keeps them apart, because that
difference is the whole signal for 800 Infra, and because NFR-23 counts two of them separately
(`factory/feature.md`, ADR-0005).

**The API never answers 403.** A row belonging to another account answers exactly as a row that does
not exist, and an admin-only action called by a `USER` does the same. A 403 would say the thing
exists (ADR-0004, US-07 AC-2, US-14 AC-1).

### 8.2 Failures the API never sends

These four happen in the browser, before or instead of a request. They use the same `FailureCode`
list and the same `FailureNote` component, so no failure is described only by a colour or an icon.

| Code | When | `retryHint` |
| --- | --- | --- |
| `offline` | The device has no network | may-work |
| `client-deadline` | 30 seconds passed with nothing on screen | may-work |
| `file-unreadable` | The chosen file cannot be opened at all | will-not-work |
| `upload-failed` | The request never reached the API | may-work |

`client-deadline` is US-01 AC-8 and it is the client's own timer. It is different from
`deadline-passed`, which is the server giving up at 20 seconds so the gateway never gets the chance
to answer a 504 with a body nobody here wrote (ADR-0002).

## 9. Where the provider's errors are turned into these codes

The mapping lives in `packages/llm/src/adapters/`, and nowhere else. `LlmProvider.assess()` returns
either a parsed `ModelAnswer` or one of `provider-timeout`, `provider-throttled`,
`provider-unavailable`, `provider-bad-request`, `provider-refused`, `answer-truncated`,
`answer-unreadable`, `no-credit`. **It never throws a vendor error** (ADR-0005,
`05-patterns.md` §4).

**Read `stop_reason` before reading the content, always.** `end_turn` is the only value that carries
an answer. `refusal` and `max_tokens` arrive as normal successes and are not verdicts.

**Never match on the raw text of an answer.** Parse it. A model version can escape characters
differently, so string matching breaks in silence on an upgrade (ADR-0005).

**None of these is ever retried automatically**, whatever `05-patterns.md` §8's "Auto retry?" column
says. That column predates the owner's decision of 2026-08-26 and ADR-0005 now ends with "Do not
retry anything at all in run 1". See §11.

**One thing to confirm in the first task:** the exact error shape the provider returns when the
credit balance is empty. It is not written in any input to this role. Until it is confirmed, an
unrecognised provider error maps to `provider-unavailable`, which is the safe direction — the person
is told trying again may work, and one call is not made twice.

## 9a. This is Zod 4, and three habits from Zod 3 fail silently here

**The catalog pins `zod` to `4.4.3`.** Most Zod 3 code still runs, which is the problem: the three
things below do not error, they are ignored.

**Write custom messages with the single `error` parameter.**

```ts
z.string({ error: 'Give the pot a name.' })          // the message appears
z.string().min(1, { error: 'Give the pot a name.' }) // on a check, the same
```

Zod 3 offered `required_error`, `invalid_type_error` and `errorMap`. **In Zod 4 all three are
accepted, ignored, and replaced by the default English text.** Verified by running Zod 4.4.3 on
2026-08-27:

```
z.string({ required_error: 'MY-REQUIRED' })      -> "Invalid input: expected string, received undefined"
z.string({ invalid_type_error: 'MY-INVALID' })   -> "Invalid input: expected string, received number"
z.string({ error: 'MY-NEW' })                    -> "MY-NEW"
```

**This is the worst kind of failure for this project.** There is no error and no warning. The types
still check, any test asserting only `success === false` still passes, and the app ships default
English into a Hungarian screen — which is US-11 AC-1 broken by a silent default.

**Use the current spellings for the built-in formats.** The old ones still work and are deprecated:

| Write this | Not this |
| --- | --- |
| `z.email()` | `z.string().email()` |
| `z.iso.datetime()` | `z.string().datetime()` |
| `z.enum(SomeNativeEnum)` | `z.nativeEnum(SomeNativeEnum)` |

**`.default()` applies to the output type in Zod 4**, not the input. A schema that relied on the
Zod 3 behaviour changes shape without complaining.

## 10. Every schema, and the two sides that use it

The check on this file is that no schema has only one user. This table is that check, written out.

| Schema | `apps/web` uses it to | `apps/api` uses it to |
| --- | --- | --- |
| `Locale` | Pick the route and the message file | Validate the request field, store `writtenInLocale` |
| `PotId`, `AssessmentId`, `CareTaskId` | Carry an opaque id in a route or a body | Build the DynamoDB sort key |
| `IsoInstant`, `CalendarDay` | Render a date in the reader's local time | Write the stored value |
| `ConfidenceBand` | Choose SC-3, SC-4 or SC-5 | Parse the answer, decide whether a task may be written |
| `VerdictCode` | Look up the verdict sentence in both languages | Parse the answer, store the record |
| `CannotTellReason` | Draw `ReasonLine` | Parse the answer |
| `RetakeAdvice` | Draw `RetakeAdviceList` | Parse the answer |
| `ACCEPTED_PHOTO_TYPES`, `MIN_SHORT_SIDE_PX`, `MAX_LONG_SIDE_PX`, `MAX_PHOTO_BYTES` | Check and resize before uploading | Check again after receiving |
| `FOLLOW_UP_DAYS_MIN/MAX` | Decide whether the task button is drawn | Decide whether the task route refuses |
| `Pot`, `PotListResponse` | Draw `PotPicker` | Read the pots of one owner |
| `CreatePotRequest`, `POT_NAME_MIN/MAX` | Validate the form before sending | Validate the body again |
| `Assessment`, `PhotoStatus`, `AssessmentResponse` | Draw SC-3, SC-4, SC-5 and SC-7 | Build the answer to the assessment routes |
| `CreateCareTaskRequest` | Send the yes from SC-6 | Enforce NFR-31 |
| `CareTask` | Draw the created-task row | Write the item |
| `PhotoUrlResponse` | Put the URL in `PhotoPreview` | Sign it, at most 5 minutes (NFR-43) |
| `MeResponse` | Decide `signed-in` or `signed-out`, draw `LimitNote` | Read the session and the day's counter |
| `Problem`, `FailureCode`, `RetryHint` | Choose the `FailureNote` state and the sentence | Answer every failure |
| `AssessmentRequest` | — **`apps/api` and `packages/llm` only.** It never crosses the wire to the browser, and it is listed here because it crosses a **package** border, which is the same rule | Build the one model call (§4.2) |

**`ModelAnswer` has three users, and `05-patterns.md` §11 is the reason it is in this package.**
`packages/llm` builds the provider request from it, `apps/api` parses the answer with it, and the
same four fields reach the browser inside `Assessment`. That file says plainly: **do not put the
answer schema only in `packages/llm`** — it is a wire type, and `packages/llm` imports it.

`UserId` and `AccountType` are **not** in this package, for the reason in §2.2.

## 11. What is missing, and must not be guessed

| What | Why it is not settled | What to do |
| --- | --- | --- |
| Whether `room` is required on a pot, and its length | US-15 AC-2 says "two things" and gives a length rule for the name only. `00-prd.md` does not fill it | Ask the owner. This file assumes required, 1 to 60 characters |
| ~~The 1 to 30 range on `followUpDays`~~ | **Closed 2026-08-26, gate 39.** The owner set it to 1 to 30 — the value this file already used | Nothing to do. US-02 AC-6 no longer says provisional |
| ~~Whether ADR-0007's photo key should use only the timestamp~~ | **Closed 2026-08-26, gate 38.** The key is `photos/<userId>/<potId>/<createdAt>.jpg` and ADR-0007 was amended to match | Nothing to do |
| ~~The Zod major version~~ | **Closed.** The catalog pins `zod` to `4.4.3`, and all of §9a is Zod-4-only advice | Nothing to do |
| The provider's error shape for an empty credit balance | Not in any input | Confirm against the provider's documentation in the first task |

## 11a. Changing a schema after something has shipped

**Added 2026-08-31. This file had no compatibility story at all, and the shape of this product needs
one.**

`apps/web` is a **static export**, cached in browsers and at CloudFront. `apps/api` is a Lambda.
They are two artifacts and they deploy separately (ADR-0001 rule 5, ADR-0010). So there is always a
window where a browser is running an **old** bundle against a **new** API. The browser parses every
answer with the schema in this package and treats a parse failure as a loud error
(`02-web-spec.md` §3).

**Every response schema used to be `z.strictObject`, which rejects a field it does not know.** So the
first time the API added a field, every browser holding an old bundle would have shown a failure on
a perfectly good response. `Problem` was the clearest case: it said in a comment that readers *"must
ignore what they do not know"* and then forbade exactly that.

**The rule, and it splits by direction:**

| Parsed by | Schema kind | Why |
| --- | --- | --- |
| **The API**, on a request body | `z.strictObject` | An unexpected field is untrusted input. Rejecting it is a real border, and it stays tight |
| **The browser**, on a response body | `z.object` | Unknown keys are stripped, not refused. An older bundle keeps working against a newer API |

**Three sentences that go with it:**

1. **Adding a field to a response is safe.** Removing one, renaming one, or changing what one means
   is a breaking change and needs both sides shipped together.
2. **The API deploys before the web.** A new API with an old bundle works. A new bundle expecting a
   field the old API does not send does not.
3. **`Problem` is `z.object` because RFC 9457 requires it.** A reader must ignore members it does not
   understand.

## 11b. `Problem.detail` is fixed English, from a closed map

**Added 2026-08-31, because §1 and §8 could not both be true.**

§1 of this file says: *"The API never sends prose. A failure is a `code`; the sentence is looked up
in a message file in the reader's language."* §8 then defined `detail` as a required string *"in the
reader's language"*. The message files live in `apps/web/src/messages/`, not in the API, and only
`POST /api/assessments` is even told a locale — `GET /api/pots` has no way to know one.

**Something has to fill a required field, and the string always within reach is the exception
message.** That is the leak the security skill forbids by name: a stack trace, an AWS error, an
internal class name, handed to whoever made the request.

**So:**

- **`detail` is a fixed English sentence, one per `FailureCode`, from a closed map in the API.** It
  is for a developer reading a log or a response, in the same voice as `title`.
- **It is never built from an exception, a driver error, or any value that came from outside.** A
  test asserts the map's keys are exactly the failure codes, so a new code cannot ship without a
  sentence and no sentence can be generated.
- **The reader's own language stays in the browser**, keyed on `code`, where it already works and
  where the message files already are.

**Two places where `05-patterns.md` and an ADR disagree. Nothing here was changed for either.**

- **§8's "Auto retry?" column allows one automatic retry** on four names. ADR-0005 was corrected on
  2026-08-26 and now ends with "Do not retry anything at all in run 1", and NFR-05 sets retries to 0.
  **The ADR wins.** The sentence column of that same table is correct and is used as written.
- **§8 has one name, `photo-rejected`, for three refusals that must produce different sentences**
  (US-01 AC-2 and AC-5). Three codes are used here, all with the same `retryHint`. `02-SPEC.md` §6
  already draws them as three separate rows, so the screen side already expects three.
