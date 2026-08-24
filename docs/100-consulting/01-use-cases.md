# Use cases — photo assessment of a sick plant

**Written by** 100 Consulting, run 1 (`photo-assessment`). **Date:** 2026-08-24.
**Corrected:** 2026-08-24, second pass, after both input files changed.
**Read next by** 200 Product.

Every use case below sits inside what `factory/feature.md` allows for run 1. Nothing here widens the
feature. Where a use case needed a fact that is not in the two input files, the fact is marked open
and passed on, not invented.

## How each one is judged

Four gates. Two of them are usually skipped, and they are the two that kill projects late, so they
get the same space as the other two.

| Gate | The question it asks |
| --- | --- |
| **Value** | Does the user want the result enough to reach for it? |
| **Usability** | Can the user get the result while standing in front of a plant, holding a phone in one hand? |
| **Feasibility** | Can one part-time developer, new to Nest.js and new to AWS, actually build it? |
| **Viability** | Is it worth running afterwards — the money, the attention, and the risk of it being wrong? |

Each gate gets one of three results:

- **pass** — no condition attached.
- **pass, with a condition** — it works only if the named thing is true. The condition is written out.
- **open** — a fact is missing, and it belongs to a person or a later role.

## How they are ranked

`factory/feature.md` gives the rule: the backbone features named by the owner rank above anything
found by research or thought up by a role. Backbone item 5 is photo assessment, and it is this run's
feature. So **UC-1 is first, and no gate result can move it**.

The rest are ranked by how much of UC-1 stops working without them. A use case that only makes UC-1
nicer ranks below one that makes UC-1 honest or safe.

---

## The ranked list

| Rank | ID | Use case | Why here |
| --- | --- | --- | --- |
| 1 | UC-1 | Photograph a plant that looks unwell and get back an assessment with a next action | Backbone feature 5. The run exists for this |
| 2 | UC-2 | Turn the next action into a scheduled care task | Without it the advice is read once and lost. `factory/feature.md` puts it in scope |
| 3 | UC-3 | See honestly when the model is not sure | Without it, UC-1 can quietly do harm. In scope by name |
| 4 | UC-4 | Sign in, and see only my own plants and photos | Without it the photos are not protected and the cost has no limit. In scope by name |
| 5 | UC-5 | Know how long my photo is kept, and delete it | The legal floor for storing a photo of someone's home |
| 6 | UC-6 | Get a clear message when the assessment cannot be done | Failure modes are in scope. Without it the user waits at a spinner |
| 7 | UC-7 | An admin can read the usage and cost figures and turn the AI feature off | The kill-switch. Screens are a later feature; the permission check ships now |

---

## UC-1 — Photograph a plant that looks unwell and get an assessment with a next action

**Rank 1.** Backbone feature 5.

A user opens the app, picks one of his plants, takes a photo of it or chooses one from the phone,
and sends it. He gets back three things: what the model thinks is wrong, how sure it is, and one
thing to do next.

The plant is already named. `factory/feature.md` puts species identification out of scope, so the
assessment starts from "this is a Zamioculcas" rather than guessing it. The plant is a **pot**, not
a species: `initial-plan.md` says the owner keeps several climbing plants of different kinds, so
"my climbing plant by the window" and "my climbing plant on the shelf" are two different rows.

| Gate | Result | Why |
| --- | --- | --- |
| Value | **pass** | This is the problem the owner wrote down himself in `initial-plan.md` section 3: "When a plant starts to look unwell, I cannot tell what is wrong or what to do about it." It is the one problem of the four where the app must supply knowledge rather than timing. The other three are backbone features 1, 2 and 3, and `factory/feature.md` says a calendar app is not the answer to them either |
| Usability | **pass, with a condition** | It has to work one-handed, standing, in a living room in the evening. The condition: the flow from opening the app to the answer is short enough to finish while standing. 300 Design owns how short |
| Feasibility | **pass, with a condition** | A vision model call is a normal HTTP request, and Anthropic publishes the image limits: 10 MB, max 8000x8000 px, JPEG/PNG/GIF/WebP ([Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision), checked 2026-08-24). The condition: the phone photo must be made smaller before it is sent. A 4K phone photo is over the size limit and costs three times as many tokens as a 1000x1000 one |
| Viability | **pass** | About **$0.004** per assessment on Claude Haiku 4.5, calculated in `00-context-brief.md` section 4. Thirty a month for six months is $0.72. The cost of running it is not what could stop it |

**The version without AI.** A list of common houseplant problems with photos, and the user picks the
one that looks like his plant. This is a real product and several plant books work this way.

**Why AI beats it here.** The non-AI version asks the user to do the hard part. He has to know that
brown crispy edges are different from brown soft spots, which is exactly the knowledge he said he
does not have. A picture list also cannot see that the leaf is one of three that turned, or that the
pot is standing in water. The model can be asked about the specific photo. That said, the non-AI
version has one real advantage: it is never confidently wrong. That advantage is what UC-3 buys back.

**Open:** what the list of possible verdicts is. 200 Product decides.

---

## UC-2 — Turn the next action into a scheduled care task

**Rank 2.** In scope by name in `factory/feature.md`.

The assessment ends with something to do, for example "move it away from the window and check again
in four days". The user accepts it, and it becomes a task in the care schedule with a date.

`factory/feature.md` is clear that the schedule engine itself and the notification delivery are
**later features**. Run 1 writes the task. Something else reads it.

| Gate | Result | Why |
| --- | --- | --- |
| Value | **pass** | Advice that is read once is forgotten. This is also the step that hypothesis V1 in the brief measures: an accepted task that gets done is the only countable sign that the assessment was useful |
| Usability | **pass, with a condition** | The condition: accepting must be one tap with the date already filled in. If the user has to type a date while standing in front of the plant, it will not happen. A second condition comes from `factory/feature.md`: when the band is `unsure`, the task is never written without asking first |
| Feasibility | **pass** | Writing one row with a date is the simplest thing in this feature |
| Viability | **pass, with a condition** | Costs nothing to run. The condition: the model must return the follow-up date in a shape the code can read, not inside a sentence. That is a contract question for 500 Engineering |

**The version without AI.** The user reads the advice and sets a reminder in his phone's own
calendar app.

**Why the app beats it.** `factory/feature.md` answers this directly: "A calendar app is not the
answer to any of them. The owner wants **this app** to tell them when to act." A calendar reminder
is a line of text with a date on it. The task this use case writes is attached to *that pot*, so the
plant's history lives in one place, and backbone feature 6 delivers it. The value is in the link and
in the delivery, not in the AI.

---

## UC-3 — See honestly when the model is not sure

**Rank 3.** In scope by name: "Showing the result honestly, including when the model is unsure."

`factory/feature.md` now fixes what "sure" means. The model returns one of three literal values, and
**no percentage is ever shown to the user**:

- `likely` — show the verdict and the next action, and offer to write the care task.
- `unsure` — show the verdict, say plainly that it may be wrong, say what a better photo would be,
  and never write a care task without asking first.
- `cannot-tell` — show no verdict at all, and say why: too dark, not a plant, more than one plant in
  frame.

`cannot-tell` is the important one. Without it the model has no way to refuse, so it invents an
answer instead. A refusal is a correct result, not an error.

| Gate | Result | Why |
| --- | --- | --- |
| Value | **pass** | A wrong instruction costs a plant. If the user follows "water it more" when the real problem was root rot, the plant dies faster. The honest "I am not sure, here is what would help me tell" is worth more than a guess |
| Usability | **pass, with a condition** | The condition: "not sure" must come with something to do — take another photo in daylight, take one of the underside of the leaf, take one of the soil. A dead end helps nobody. `factory/feature.md` builds this into the `unsure` band: say what a better photo would be |
| Feasibility | **pass, with a condition** | Was open on the first pass, because nobody had defined confidence. `factory/feature.md` now defines it as a three-value band and says how it is tested: QA builds a golden set of real photos with a human verdict written down, and measures **agreement**. The condition: the two bars are provisional — a person agrees with a `likely` verdict at least 8 times in 10, and agrees a `cannot-tell` photo was unusable at least 8 times in 10 — and both are replaced by measurements after the first 20 real assessments. 600 QA owns the golden set |
| Viability | **pass** | No extra money. It costs attention: the honest path has to be designed and tested, and it is the path that is easy to leave out. Anthropic's own warning applies directly — the model "might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images" ([Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision), checked 2026-08-24), and an evening photo of a houseplant is a low-quality image |

**The version without AI.** Not applicable. There is no model to be unsure about.

**Why AI does not beat it.** This use case exists *because* of the AI, not instead of something. It
is the cost of using a model, paid up front.

---

## UC-4 — Sign in, and see only my own plants and photos

**Rank 4.** Decided already in `factory/feature.md`: "Every user signs in... there is no anonymous
use of this feature." Two account types, `USER` and `ADMIN`, from day one.

| Gate | Result | Why |
| --- | --- | --- |
| Value | **pass** | Not a feature the user asks for. It is the thing that makes the other use cases safe to offer. A photo of the inside of a home that anyone can fetch is a serious problem |
| Usability | **pass, with a condition** | Signing in is friction at the exact moment the user wants to point a camera at a leaf. The condition: the session lasts long enough that a returning user does not sign in again each time |
| Feasibility | **open** | `factory/feature.md` lists the protocol, the flow and where tokens live as things 400 Architecture must research and decide. Not decided here |
| Viability | **pass** | This is what stops the money problem in `00-context-brief.md` section 4. Without sign-in there is no per-user limit, and 100,000 calls on the most expensive model is $2,000 of the owner's own Anthropic credit. Nothing in AWS can see that spend or stop it, so the limit has to exist in the application |

**The version without AI.** Sign-in has nothing to do with AI. Listed here because the four gates
apply to it and because it ships with this feature.

---

## UC-5 — Know how long my photo is kept, and delete it

**Rank 5.** `factory/feature.md`, in scope: "Storing that photo, with a retention rule."

The user can see how long his photos are kept, and can remove one, or all of them, himself. The rule
is now written: **180 days, then automatic deletion.**

| Gate | Result | Why |
| --- | --- | --- |
| Value | **pass** | Two reasons at once. The user's: it is a photo of his home. The owner's: `initial-plan.md` says "I do not want to pay to keep things I do not need", and stored photos cost money every month |
| Usability | **pass** | Deleting is a normal screen. Nothing hard |
| Feasibility | **pass, with a condition** | The condition: the photo must be deleted everywhere, including from any cached or resized copy. One useful fact — Anthropic states that image uploads are "ephemeral and not stored beyond the duration of the API request" and are not used to train models ([Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision), checked 2026-08-24). So this is about the project's own storage only |
| Viability | **pass, with a condition** | Was open and a hard stop on the first pass. The owner answered it on 2026-08-24 in `factory/feature.md`: a photo is kept **180 days** and then deleted automatically, and **a storage lifecycle rule does the deleting, not application code**, so the rule holds even when the app is broken. The condition: the **text** result is kept "longer" and no period is named for it. That part is open question O-10 in `00-context-brief.md`, and 400 Architecture needs it before it designs the data |

**The version without AI.** Not applicable.

---

## UC-6 — Get a clear message when the assessment cannot be done

**Rank 6.** `factory/feature.md`, in scope: "The costs, the failure modes and the abuse cases of all
of the above."

Two of these are checked **before** the model call, because they are free and the model is not
(`factory/feature.md`):

- The file is not an image the app accepts.
- The user has not named the plant yet.

The rest happen at or after the call, and each needs a different message:

- The upload failed, or the network dropped. The photo can be sent again.
- The model provider is down or slow. Try again later; nothing was charged.
- The photo is too large for the model, or in a format it does not accept.
- The user has hit his own limit for the day.
- An admin has turned the AI feature off (see UC-7).

| Gate | Result | Why |
| --- | --- | --- |
| Value | **pass** | Low value when everything works, high value the first time it does not. A spinner that never ends teaches the user not to trust the app |
| Usability | **pass, with a condition** | The condition: each message says whether trying again will help. "Try again" and "this will not work until tomorrow" are different sentences |
| Feasibility | **pass** | Ordinary error handling. Nothing new |
| Viability | **pass, with a condition** | The condition, and it is the important one: a failure must not retry by itself without a limit. On this project a runaway retry loop burns the owner's Anthropic credit, and no AWS alarm can see it, so the limit has to be counted in the application. 800 Infra owns the retry rule |

**The version without AI.** Not applicable.

---

## UC-7 — An admin can read usage and cost figures and turn the AI feature off

**Rank 7.** `factory/feature.md`: "An admin can read usage and cost figures, and can turn the AI
feature off. The permission check ships with this feature. The admin **screens** are a later
feature."

So the thing that ships in run 1 is the permission check and the switch, not a dashboard.

| Gate | Result | Why |
| --- | --- | --- |
| Value | **pass** | This is the kill-switch. `CLAUDE.md` lists owning the kill-switch as a decision that is never the model's, which means the switch has to exist for a person to own |
| Usability | **open** | There is no screen in run 1, so there is nothing to judge yet. How the switch is operated without a screen is 400 Architecture's answer |
| Feasibility | **pass, with a condition** | The condition: the switch must work without a deploy. If turning the feature off needs a code change and a release, it is not a kill-switch |
| Viability | **pass** | The cheapest insurance in the project. The whole cost risk in `00-context-brief.md` section 4 ends with someone being able to turn it off. It is also the only thing that can stop the spend, because the money is Anthropic credit and no AWS control touches it |

**The version without AI.** Not applicable.

---

## What was deliberately left out

These were considered and are **not** use cases for run 1, because `factory/feature.md` puts them out
of scope. They are recorded so a later reader can see they were thought about, not forgotten.

| Left out | Where it belongs |
| --- | --- |
| Identify which plant this is from the photo | Out of scope on purpose. The user names the plant |
| Ask a follow-up question about the assessment | Named in `factory/feature.md` as a later option. It changes the cost model |
| Send a notification when the task is due | Run 3. This run only writes the task |
| Compare two photos of the same plant over time | Backbone feature 4, a later run |
| Share a plant with another person | Not in the product yet. The owner decides |
| Admin screens | A later feature |

## Open questions this document adds

None that are new. Two gates that were `open` on the first pass are now judged, because
`factory/feature.md` answered them: UC-3's Feasibility (confidence is a band) and UC-5's Viability
(180 days, deleted by a lifecycle rule). Two gates stay `open` and belong to 400 Architecture: UC-4's
Feasibility (how sign-in works) and UC-7's Usability (how the kill-switch is operated with no
screen). UC-5 carries one condition that is still unanswered — how long the assessment **text** is
kept, recorded as O-10 in `00-context-brief.md`.
