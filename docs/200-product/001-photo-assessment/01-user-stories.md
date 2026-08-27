# User stories — photo assessment of a sick plant

**Written by** 200 Product, run 1 (`photo-assessment`). **Date:** 2026-08-24.
**Read next by** 300 Design, 400 Architecture, 500 Engineering, 600 QA.

Fourteen stories. Every one of them serves backbone feature 5, the one feature of this run.

## How to read a story

Each story is written as **"When _moment_, I want _action_, so I can _outcome_."** The moment is
part of the requirement, not decoration. "Standing in front of a plant, one hand, evening light"
tells 300 Design how big the buttons are and tells 400 Architecture how long the user will wait.

Each acceptance criterion (AC) is written Given / When / Then, and each one can be answered pass or
fail without an opinion. No AC says "fast", "accurate" or "easy".

Three stories call the model. Each of those carries an **AI Eval Card** with three fields: how often
it must be right, what it does when it is not sure, and what happens when the answer cannot be used.
A story that calls a model is not the same kind of story as one that writes a row in a table.

**A number written as `<UNSET — G-n>` is a number nobody has sourced.** The gate is in
`00-prd.md` section 8. The AC around it is finished; only the number is missing. Do not guess it in
code.

**Six of the seven were filled in on 2026-08-24 and 2026-08-25**, when the owner answered the gates.
`02-traceability.md` section 3.6 lists every answer. **One `<UNSET>` is left, and it is inside a
story that moved out of run 1** (US-12, gate 30), so it blocks nothing: how far back the
admin figures go, in US-12 AC-4.

**Account type** is on every story. `USER` sees only their own pots, photos and assessments. `ADMIN`
can read usage and cost figures and can turn the AI feature off. Both types exist from day one.

---

## US-01 — Send one photo of one named pot

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-1

> **When** I am standing in front of a pot in the evening and a leaf looks wrong, **I want** to take
> one photo of it with one hand and send it, **so I can** ask about this exact plant without typing
> anything.

**AC**

1. **Given** I am signed in and at least one pot is named, **when** I open the assessment screen,
   **then** I can pick one pot and add a photo in exactly two ways: take one with the camera, or
   choose one from the phone.
2. **Given** I picked a file that is not JPEG, PNG, GIF or WebP, **when** I try to send it, **then**
   the app refuses before any model call and names those four formats. (Source: Anthropic vision
   limits, `00-context-brief.md` 5.3.)
3. **Given** no pot is picked, **when** I try to send, **then** the app refuses before any model
   call and asks me to pick or create a pot.
4. **Given** any photo, **when** the app sends it, **then** it sends a copy whose longer side is at
   most 1000 px. (A 1000x1000 px photo is 1296 visual tokens, `00-context-brief.md` 4. A full phone
   photo can pass the 10 MB and 8000x8000 px limits and costs about three times as much.)
5. **Given** the photo's shorter side is under 200 px, **when** I try to send it, **then** the app
   refuses before any model call and says the photo is too small. (Anthropic warns about images
   under 200 px, `00-context-brief.md` 5.3.)
6. **Given** the two checks in AC-2 and AC-3 both pass, **when** the assessment runs, **then**
   exactly **one** model call is made for it.
7. **Given** I have tapped send, **when** the result has not come back, **then** the screen shows
   that work is running and the send button cannot be tapped a second time.
8. **Given** a working network, **when** I tap send, **then** a result or a message appears within
   **30 seconds** (G-5, set by the owner 2026-08-25).

**Success metric:** M-02 · **Guardrails:** M-22, M-12

---

## US-02 — Get back a verdict, a band, a next action and a follow-up date

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-1 · **Calls the model**

> **When** I have just sent the photo and I am still standing in front of the plant, **I want** one
> verdict, one confidence band and one thing to do, **so I can** know what to do today.

**AC**

1. **Given** the model call succeeded, **when** the answer is read, **then** it carries exactly four
   fields: a verdict code, a confidence band, a next action as text, and the follow-up in whole
   days. (The fourth field is a decision of this document. See gate G-1.)
2. **Given** the answer, **when** the verdict code is checked, **then** it is one of the ten codes
   in `00-prd.md` section 5.2 and nothing else.
3. **Given** the answer, **when** the band is checked, **then** it is exactly one of `likely`,
   `unsure`, `cannot-tell`.
4. **Given** the band is `likely`, **when** the result is shown, **then** the screen shows the
   verdict sentence, the next action, and a button that adds the care task.
5. **Given** any result on any screen, **when** it is shown, **then** no percentage and no score
   appears anywhere.
6. **Given** the follow-up days field, **when** it is checked, **then** it is a whole number between
   **1 and 30**. Outside that range, the advice is still shown and no task is offered (AC-6 of
   US-03). **Set by the owner 2026-08-26, gate 39** — it was provisional until then. Thirty days is
   about as far ahead as plant advice stays useful: a leaf problem checked in five weeks has already
   resolved or spread. 14 days was rejected as forcing the model to understate slow advice, and 90
   as creating tasks nobody remembers agreeing to, in a run that cannot send a reminder.
7. **Given** the verdict code is `nothing-wrong`, **when** the result is shown, **then** the next
   action may be "do nothing", and no care task is offered.

**AI Eval Card**

| Field | Value |
| --- | --- |
| How often it must be right | When the band is `likely`, a person agrees with the verdict at least **8 times in 10**, measured over the first 20 real assessments (`factory/feature.md`). The bar is provisional and is replaced by the measurement |
| What it does when it is not sure | It must return the band `unsure` or `cannot-tell` rather than a `likely` guess. US-04 and US-05 say what each one looks like on screen |
| The fallback | If the answer is missing a field, has a verdict code outside the ten, or has a band outside the three, the app treats the whole result as `cannot-tell`, shows no verdict, writes no task, and offers another photo. The failed answer is stored so 600 QA can count how often this happens |

**Success metric:** M-03 · **Guardrails:** M-05, M-22

---

## US-03 — Turn the next action into a dated care task

**Account type:** USER · **Serves:** backbone 5, and hands the task to backbone 6 · **From:** UC-2

> **When** I have read a result I believe, **I want** to turn the next action into a dated task with
> one tap, **so I can** stop holding it in my head until Thursday.

**AC**

1. **Given** the band is `likely`, **when** I tap the button that adds the task, **then** a care
   task is created with no typing from me.
2. **Given** a task was created, **when** its date is checked, **then** the date is the day of the
   assessment plus the follow-up days from US-02 AC-1.
3. **Given** a task was created, **when** it is read, **then** it carries the pot, the assessment it
   came from, the date, and the next action text.
4. **Given** the band is `unsure`, **when** I ask for the task, **then** the app first asks a
   yes/no question that says the assessment may be wrong, and creates the task only after "yes".
   (`factory/feature.md`: never write a care task without asking first.)
5. **Given** the band is `cannot-tell`, **when** the result is shown, **then** no way to create a
   task is offered at all.
6. **Given** the follow-up days field is missing or fails US-02 AC-6, **when** the result is shown,
   **then** no task is offered and the verdict and next action are still shown.
7. **Given** a task exists, **when** I delete it, **then** it is gone and the assessment text stays.

**Note on the border.** This run **writes** the task. The schedule engine and the notification that
delivers it are later runs (backbone 1, 2 and 6). Nothing here reads the task back or reminds
anybody.

**Success metric:** M-01 · **Guardrail:** M-20

---

## US-04 — See an `unsure` result honestly

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-3 · **Calls the model**

> **When** the photo I took in poor evening light is the only one I have, **I want** the app to say
> plainly that the answer may be wrong and what a better photo would be, **so I can** decide whether
> to act now or to take another photo.

**AC**

1. **Given** the band is `unsure`, **when** the result is shown, **then** the screen shows the
   verdict, one sentence saying the assessment may be wrong, and at least one way to take a better
   photo.
2. **Given** the band is `unsure`, **when** the retake advice is checked, **then** it is one of a
   fixed list: in daylight · the underside of the leaf · the soil and the bottom of the pot · the
   whole plant. A fixed list can be tested; free text cannot.
3. **Given** the band is `unsure`, **when** I do nothing, **then** no care task exists.
4. **Given** the band is `unsure`, **when** I ask for the task, **then** US-03 AC-4 applies.
5. **Given** the band is `unsure`, **when** the screen is read, **then** it does not use the word
   "diagnosis" and does not say the plant is safe to eat or safe for a pet.
   (`00-context-brief.md` 5.4.)
6. **Given** the band is `unsure`, **when** I take a second photo, **then** I can send it from this
   screen without starting the flow again.

**AI Eval Card**

| Field | Value |
| --- | --- |
| How often it must be right | **No bar exists.** `factory/feature.md` sets a bar for `likely` and one for `cannot-tell`, and none for the band in the middle. This story is therefore measured on behaviour, not on correctness: an `unsure` result never creates a task without an explicit yes. Recorded in `00-prd.md` section 9, point 4 |
| What it does when it is not sure | This *is* the not-sure path. It must name what would help, never end at a dead end |
| The fallback | If no retake advice from the fixed list came back, the app shows "take another photo in daylight" and records the missing field for QA |

**Success metric:** M-17 · **Guardrail:** M-19

---

## US-05 — See `cannot-tell` with a reason and no verdict

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-3 · **Calls the model**

> **When** my photo is too dark, or two plants are in the frame, **I want** no verdict at all and a
> reason instead, **so I can** take a usable photo rather than trust a guess.

**AC**

1. **Given** the band is `cannot-tell`, **when** the result is shown, **then** no verdict text and
   no next action appears on the screen.
2. **Given** the band is `cannot-tell`, **when** the reason is checked, **then** it is one of a
   fixed list: too dark · not a plant · more than one plant in the frame · the photo is too small or
   too blurred to read. (The first three come from `factory/feature.md`. The fourth comes from
   Anthropic's warning about small and low-quality images, `00-context-brief.md` 5.3.)
3. **Given** the band is `cannot-tell`, **when** the record is stored, **then** it is stored as a
   finished assessment, not as an error. A refusal is a correct result.
4. **Given** the band is `cannot-tell`, **when** the screen is shown, **then** it offers to send
   another photo for the same pot in one tap.
5. **Given** the band is `cannot-tell`, **when** the daily count is checked, **then** the call still
   counts against my daily limit, because the money was already spent.

**AI Eval Card**

| Field | Value |
| --- | --- |
| How often it must be right | When the band is `cannot-tell`, a person agrees the photo was unusable at least **8 times in 10**, over the first 20 real assessments (`factory/feature.md`). The bar is provisional and is replaced by the measurement |
| What it does when it is not sure | `cannot-tell` is itself the refusal. It must be reachable, or the model invents an answer instead of refusing |
| The fallback | If more than 3 in 10 results come back `cannot-tell` across 20 assessments, the model is hiding behind the refusal. That is a failure, and it is guardrail M-19 |

**Success metric:** M-04 · **Guardrail:** M-19

---

## US-06 — Know the answer came from an AI model

**Account type:** USER · **Serves:** backbone 5 · **From:** `00-context-brief.md` 5.4

> **When** I read an assessment for the first time, **I want** to be told it was made by an AI
> model, **so I can** weigh it as a machine answer and not as a person's answer.

**AC**

1. **Given** any assessment result, **when** it is shown, **then** the screen carries one line
   saying the assessment was made by an AI model.
2. **Given** my first ever assessment, **when** the result appears, **then** that line is on the
   result screen itself, not only in a settings page or a help page. (EU AI Act Article 50(1) says
   "at the latest at the time of the first interaction". The duty became applicable 2 August 2026.)
3. **Given** any assessment result, **when** it is shown, **then** the screen carries one line
   saying this is not professional advice.
4. **Given** either language, **when** the result is shown, **then** both lines are in the language
   being read.
5. **Given** any result text, **when** it is read, **then** it never states as a fact that a plant
   is safe to eat or safe around an animal.

**Whether the EU AI Act applies to a personal project of this size is a legal question, and it is
not answered here.** `00-context-brief.md` says the same. The line is shown either way, because it
costs nothing. See gate G-10.

**Success metric:** M-11 · **Guardrail:** none. Showing a true sentence has no cost to hold down

---

## US-07 — Sign in once, and see only my own things

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-4

> **When** I open the app days after I last used it, **I want** to still be signed in and to see
> only my own pots and photos, **so I can** take the photo straight away and know nobody else can
> see the inside of my home.

**AC**

1. **Given** I am not signed in, **when** I open any screen that shows a pot, a photo or an
   assessment, **then** I am sent to sign-in and no plant data is returned.
2. **Given** I am signed in as user A, **when** a request asks for a pot, a photo or an assessment
   owned by user B, **then** it is refused and the answer does not say whether that thing exists.
3. **Given** I signed in and I come back within **30 days** (G-7, set 2026-08-25), **when** I open
   the app, **then** I am not asked to sign in again.
4. **Given** I am signed in, **when** any list of pots, photos or assessments is returned, **then**
   every row in it belongs to me.
5. **Given** no signed-in user, **when** the assessment endpoint is called, **then** no model call
   is made. (No sign-in means no per-user limit, and the whole credit balance is a few hundred calls
   on the most expensive model, `00-context-brief.md` 4.)

**How sign-in works — the protocol, the flow and where tokens live — is 400 Architecture's
decision**, named as open in `factory/feature.md`. This story says what must be true, not how.

**Success metric:** M-06 · **Guardrail:** M-13

---

## US-08 — Be stopped at my own limit, before any money is spent

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-6, and the cost risk in
`00-context-brief.md` 4

> **When** I have already asked many times today, **I want** to be stopped with a clear message
> before any money is spent, **so I can** come back tomorrow instead of paying for a loop I did not
> notice.

**AC**

1. **Given** I have already made **10** assessments today (G-2, set 2026-08-24), **when** I send another photo,
   **then** the app refuses **before** any model call.
2. **Given** that refusal, **when** the message is read, **then** it says the limit is reached and
   says when it resets.
3. **Given** that refusal, **when** the provider account is checked, **then** no Anthropic call was
   made and no money was spent.
4. **Given** I am below the limit, **when** I send a photo, **then** no message about the limit is
   shown.
5. **Given** any failure of the model call, **when** the count is taken, **then** the failed call
   still counts against the daily limit, because the count happens before the call is made.
   *(Reworded 2026-08-26. It said "any automatic retry from US-09 counts against the same limit".
   There is no retry now, so the rule that remains is the one about a failed call.)*

**This story cannot be tested until the number exists.** Gate G-2 is a hard stop. The limit is the
only thing between the assessment endpoint and the owner's Anthropic credit, and no AWS alarm can
see that spend, because the model bill is not an AWS bill.

**Success metric:** M-14 · **Guardrail:** M-05

---

## US-09 — Get a message that says whether trying again will help

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-6

> **When** the assessment does not come back, **I want** a message that says whether trying again
> will help, **so I can** stop waiting at a spinner that never ends.

**AC**

1. **Given** any failure of any kind, **when** the message is shown, **then** it says exactly one of
   two things: "trying again may work" or "trying again will not work now". No failure message ends
   without one of the two.
2. **Given** the upload failed or the network dropped, **when** I return to the screen, **then** my
   chosen photo is still there and I can send it again without taking a new one.
3. **Given** the model provider answered with an error or did not answer inside the timeout,
   **when** the message is shown, **then** it says trying again may work, and no care task is
   created.
4. **Given** an admin turned the feature off (US-13), **when** I send a photo, **then** the message
   says the feature is off and that trying again will not work now.
5. **Given** any failure, **when** the calls are counted, **then** the app made **exactly one**
   model call for that assessment. **Nothing is retried** — not a timeout, not a 429, not a 503.
   *(Reversed by the owner on 2026-08-26. G-9 originally allowed one retry, two attempts in total.
   Two attempts cost about $0.0070 against a $0.0040 ceiling, and each attempt had to fail early
   enough to leave room for the other. A retry returns in run 3, when the work happens in the
   background.)*
6. **Given** any failure, **when** the record is stored, **then** it is stored with the reason, so
   the count in M-08 can be taken.

**Success metric:** M-08 · **Guardrail:** M-21

---

## US-10 — See how long my photos are kept, and delete them

**Account type:** USER · **Serves:** backbone 5 · **From:** UC-5

> **When** I think about photos of the inside of my rooms sitting on a server, **I want** to see how
> long they are kept and to delete them myself, **so I can** stay in control of pictures of my home.

**AC**

1. **Given** I open a pot or a photo, **when** the screen is shown, **then** it states that photos
   are kept **180 days** and are then deleted.
2. **Given** I open a pot or an assessment, **when** the screen is shown, **then** it states how
   long the assessment **text** is kept: **as long as the pot exists** (G-3, set 2026-08-24). There
   is no period to print. Deleting the pot deletes its assessments; deleting the account deletes
   everything. An account with no sign-in for 12 months is deleted, with a warning by email at 11.
3. **Given** I delete one photo, **when** the delete has finished, **then** the photo and every
   resized or cached copy of it is gone.
4. **Given** I deleted a photo, **when** I open the assessment it belonged to, **then** the
   assessment text is still there and says the photo was removed.
5. **Given** a photo is older than 180 days, **when** storage is checked, **then** it is not there.
6. **Given** the application is stopped or broken, **when** a photo passes 180 days, **then** it is
   still deleted. (`factory/feature.md`: a storage lifecycle rule does the deleting, not application
   code.)
7. **Given** I ask to delete all of my photos, **when** the request finishes, **then** every photo
   of mine is gone by AC-3.

**Gate G-3 is a hard stop for AC-2.** A screen cannot state a period that nobody has chosen. This is
open question O-10 in `00-context-brief.md`, and 400 Architecture needs it before it designs the
data.

**Success metric:** M-07 · **Guardrail:** M-06

---

## US-11 — Use the whole flow in Hungarian or in English

**Account type:** USER · **Serves:** backbone 5, and the language property of every feature ·
**From:** `factory/feature.md`, Human decisions

> **When** I use the app in Hungarian, **I want** every word of the assessment flow in Hungarian,
> **so I can** read advice about my plant in the language I think in.

**AC**

1. **Given** my language is Hungarian, **when** I walk the whole flow from opening the camera to the
   created task, **then** every text is Hungarian: the verdict sentences, the band explanations, the
   retake advice, the failure messages, the AI notice and the retention lines.
2. **Given** my language is English, **when** I walk the same flow, **then** the same is true in
   English.
3. **Given** a pot has a name I typed, for example `legénypálma`, **when** I switch language,
   **then** the name is shown exactly as I typed it and is not translated.
4. **Given** the release check, **when** it counts texts, **then** there is no text that exists in
   one language and is missing in the other.
5. **Given** a verdict code from the ten, **when** it is shown, **then** there is a written sentence
   for it in both languages.
6. **Given** an assessment I made earlier whose next-action text was written in the other language,
   **when** I open it, **then** the text is shown exactly as it was written, with a short line saying
   which language it is in. Nothing is translated and the model is not asked again.

**Why AC-6 exists, and why it does not contradict AC-1.** AC-1 is about walking the flow now: every
text in that flow is in one language, because every value except one is a code that renders in the
reader's language. The next-action text is the exception — the model writes it once, as free text,
in the language of the moment. Re-reading it later in the other language would need a translation or
a second paid model call. **The owner decided on 2026-08-26 (gate 28) to show it as written and name
its language**, which costs nothing and never leaves the reader wondering why one line looks
different.

**Only the two languages ship in run 1. Writing the plant and symptom words *for* Hungarian, instead
of translating them, is idea W-1 and is Out.** See `00-prd.md` section 6.2.

**Success metric:** M-09 · **Guardrail:** none

---

## US-12 — An admin reads the usage and the cost figures

> **MOVED OUT OF RUN 1 by the owner on 2026-08-26 (gate 30).** No admin route is built. The three
> numbers are still written down on every assessment, so the data exists — the developer reads them
> straight from the DynamoDB table with AWS credentials, and runs the comparison in AC-2 as a script
> on their own machine. **This story ships when admin screens ship.** The account type and the
> permission check still ship now: see US-14.

**Account type:** ADMIN · **Serves:** backbone 5 · **From:** UC-7

> **When** I want to know whether the AI feature is costing more than planned, **I want** the number
> of assessments and the money spent for a date range, **so I can** decide whether to turn it off.

**AC**

1. **Given** I am an ADMIN, **when** I ask for the figures for a date range, **then** I get three
   numbers: assessments started, model calls made, and model spend in US dollars.
2. **Given** a day that has finished, **when** the model call count is compared with the provider's
   own record for that day, **then** the difference is 0.
3. **Given** the figures, **when** they are returned, **then** they contain no photo and no
   assessment text of any user. An admin reads numbers, not content.
4. **Given** any date range inside the last `<UNSET — the owner sets it; 180 days is proposed, to
   match the photo retention>`, **when** I ask, **then** the figures are available.
5. **Given** I am a USER, **when** I ask for these figures, **then** US-14 applies.

**The count has to be taken inside the application.** The model bill is Anthropic credit on a
separate account, and no AWS budget alarm can see it (`factory/feature.md`).

**There is no admin screen and no admin route in run 1.** The question "how does an admin reach
these figures" was open as gate 30 and is now closed: the developer reads the table directly. That
is not a product feature, so this story waits.

**Success metric:** M-15, which is not measured in run 1 · **Guardrail:** M-05

---

## US-13 — The AI feature can be turned off without a deploy

> **CHANGED by the owner on 2026-08-26 (gate 30).** The switch itself ships in run 1, because cost
> is a correctness property on an account that closes when the credit is gone. **The admin route
> does not ship.** The developer changes the value by hand in the AWS website. Everything the switch
> promises is still true; only the way it is reached changed. The old AC-5 is gone — see below.

**Account type:** ADMIN · **Serves:** backbone 5 · **From:** UC-7

> **When** the figures show the spend running away, **I want** to turn the AI assessment off without
> a deploy, **so I can** stop the spending in minutes instead of in a release.

**AC**

1. **Given** the switch is changed to off, **when** it is changed, **then** within **60 seconds**
   (G-8, set by the owner 2026-08-25) no new model call is made by anyone.
2. **Given** the switch, **when** it is used, **then** no code change and no deploy is needed. A
   switch that needs a release is not a kill-switch.
3. **Given** the feature is off, **when** a USER sends a photo, **then** US-09 AC-4 applies.
4. **Given** an assessment call is already in flight, **when** the switch goes off, **then** that
   one call is allowed to finish, because the money for it is already spent.
5. **Given** the feature is off, **when** it is turned on again, **then** it is the same action in
   reverse and normal use continues.

**There used to be a sixth criterion asking the log to record which account flipped the switch.**
It was removed on 2026-08-26. With no admin route, the app never runs when the switch is flipped, so
the app cannot write anything down. AWS keeps its own record of who signed in to its website and
what they changed, and with one developer the answer to "who" is never in doubt. The criterion is
restored when the admin route ships.

**Success metric:** M-10 · **Guardrail:** M-05

---

## US-14 — A normal account is refused every admin-only action

**Account type:** ADMIN (and USER, as the account that is refused) · **Serves:** backbone 5 ·
**From:** UC-4 and UC-7

> **When** I think about who can turn the AI feature off, **I want** a normal account to be refused
> every admin-only action by default, **so I can** be sure that a check somebody forgets to write
> fails closed and not open.

**AC**

1. **Given** I am a USER, **when** I call any admin-only action, **then** it is refused, nothing
   changes, and the answer does not say whether the action exists.
2. **Given** I am an ADMIN, **when** I call the same action, **then** it runs.
3. **Given** a new admin-only action is added later with no permission check written on it, **when**
   a USER calls it, **then** it is refused. The default is refuse, not allow.
4. **Given** an account type is changed, **when** the next request is made, **then** the new type
   decides the answer.

**Where this check runs is 400 Architecture's decision, checked by 900 Security**, named as open in
`factory/feature.md`. This story says what must be true. The answer is ADR-0004: every route carries
`@Anonymous()`, `@Roles('USER')` or `@Roles('ADMIN')`, and a route with none of them does not run.

**This story still ships, even though no admin route does** (gate 30, 2026-08-26). AC-3 is the whole
point — the default is refuse, so the guard has to be right *before* the first admin route exists,
not after. In run 1 it is proved against the guard itself rather than against a real admin route.

**Success metric:** M-18 · **Guardrail:** M-06

---

## US-15 — Add a pot, so the app has something to assess

**Account type:** USER · **Serves:** backbone 5, as the step that makes it reachable ·
**From:** no use case — see below

> **When** I open the app for the first time and it is empty, **I want** to add one plant with a
> name I recognise, **so I can** photograph it straight away instead of being stuck on an empty
> screen.

**This story came from a gap, not from a use case.** No use case in `01-use-cases.md` and no story
above says how a plant gets into the app, so a new account could not reach a single assessment.
300 Design found it and refused to design the screen, because inventing scope is not its job. The
owner put it in scope on 2026-08-25 as gate 21. **US-01 AC-3 already refers to "pick or create a
pot", so the stories were pointing at a screen that did not exist.**

**AC**

1. **Given** I am signed in and have no pots, **when** I open the app, **then** it offers to add
   one, and the offer is the main thing on the screen rather than a link in a corner.
2. **Given** the add-a-pot screen, **when** I look at it, **then** it asks for exactly **two**
   things: a name, and where the plant is. Nothing else is required and nothing else is shown.
3. **Given** I type a name, **when** I save, **then** the pot is mine and appears in my list. No
   other account can see it.
4. **Given** a name of 1 to 60 characters, **when** I save, **then** it is accepted. An empty name
   is refused with a message that says what to do.
5. **Given** a name at 30 characters in Hungarian, **when** it is shown anywhere in the app, **then**
   the layout does not break and the text is not cut off without warning.
6. **Given** two of my pots have the same name, **when** I save the second, **then** it is accepted.
   Two plants of the same kind in different rooms is normal, and "where the plant is" is what tells
   them apart.
7. **Given** I have just added a pot, **when** the save finishes, **then** I can take a photo of it
   without going back to a menu first.
8. **Given** a clean account, **when** I count the screens between signing in and sending my first
   photo, **then** there are at most **three**.
9. **Given** the "where the plant is" field, **when** I save, **then** it is **required**, and it
   follows the same rule as the name: 1 to 60 characters, and an empty one is refused with a message
   that says what to do. It is free text, not a list to choose from.

**Why the room is required, decided by the owner 2026-08-26 (gate 35).** AC-6 already leans on it:
two pots may share a name, and "where the plant is" is the thing that tells them apart. A room that
can be left empty cannot do that job. Free text rather than a fixed list, because a fixed list
breaks for anyone whose home does not match it and every new room would be a code change.

**Deliberately not in this story:** species, a photo of the plant, notes, watering settings, editing
a pot and deleting a pot. Species and notes are backbone feature 4, and pulling them in here pulls
that whole feature into run 1. **Editing and deleting a pot are a real gap** and are named in the
table below, not hidden.

**Success metric:** M-23 · **Guardrail:** M-06

---

## Stories that were considered and not written

Recorded so a later reader can see they were thought about.

| Not written | Why |
| --- | --- |
| Ask the model a follow-up question | Out of scope in `factory/feature.md`. It changes the cost model |
| Identify which plant this is | Out of scope on purpose. The user names the pot |
| Show what in the photo the model looked at | Idea W-3 in `03-market.md`. Tempting, and still Out. The owner decides |
| Compare two photos of the same pot over time | Backbone feature 4, a later run |
| Send a notification when the task is due | Backbone feature 6, run 3. This run only writes the task |
| An admin screen | A later feature. The permission check and the switch ship now |
| Export all of my data | The export half of idea W-5. Only deletion is in run 1 |
| **Rename or delete a pot** | **A real gap, added 2026-08-25 with US-15 and left open on purpose.** US-15 lets a pot be created and never changed. A typed name cannot be corrected, and a plant that dies leaves a row that cannot be removed. The owner decides whether it enters run 1 or waits for backbone feature 4. **It is not a hard stop:** every story above works without it, and no acceptance criterion depends on it |
