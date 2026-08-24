# Context brief — photo assessment of a sick plant

**Written by** 100 Consulting, run 1 (`photo-assessment`). **Date:** 2026-08-24.
**Corrected:** 2026-08-24, second pass, after both input files changed.
**Read next by** 200 Product, 300 Design, 400 Architecture.

This document writes down the things everyone involved already assumes but nobody has put in a
file. It also turns the wish ("the app should look at a photo and help me") into a bet that can be
lost. A bet that cannot be lost is not a bet, and it teaches nothing when it is over.

Everything here comes from two files: `factory/feature.md` and `initial-plan.md`. Where a fact was
not in either of them, it is marked **open** and handed to a person. Nothing is invented.

---

## 1. The opportunity, in one paragraph

One person keeps houseplants in an apartment and loses some of them. `initial-plan.md` section 3
names them: Monstera, Rhaphidophora (mini monstera), Zamioculcas (`legénypálma` in Hungarian), a
cactus, several climbing plants (`futó`) of different kinds, a Pilea peperomioides (`pénznövény`)
and a Hoya. That is **at least eight pots**; the exact number is not written down. The failure he
named himself is not watering and not light. It is this: *when a plant starts to look unwell, he
cannot tell what is wrong or what to do about it* (`initial-plan.md`, section 3). The other three
problems he listed — watering intervals, soil, placement — are backbone features 1, 2 and 3, and
they are already approved. `factory/feature.md` says plainly that **a calendar app is not the
answer to any of them**; the app itself has to tell the user when to act. This fourth problem is
different in kind. It is a knowledge problem, and a camera plus a vision model can close it. That
gap is the opportunity: the moment between "this leaf looks wrong" and "here is what I do today".

## 2. Who this is for

**The primary user is the owner of the product himself.** He wrote `initial-plan.md` about his own
apartment and his own plants: Monstera, Rhaphidophora, Zamioculcas, a cactus, several climbing
plants of different kinds, a Pilea peperomioides and a Hoya. At least eight pots, one person.

This matters more than it looks. It means:

- The first version has exactly one real user, and that user is reachable. Feedback is same-day.
- Usage numbers will be small. A design that only works at 10,000 users a day is the wrong design.
- There is no paying customer, so no revenue number exists to justify anything. See section 4.

**A second reader exists and is not a user.** `initial-plan.md` section 7 sets the bar: *a person who
did not build this repo can read it, follow the reasoning, and change it without asking.* That
reader never opens the app. They read the documents and the code, and they need the reason a
decision was made to be next to the decision, together with the option that was rejected. This is a
real requirement, and it is the reason the specifications exist before the code.

The owner is that reader too, six months from now, with the conversation forgotten.

**The wider group, not yet a user of this product.** People who keep houseplants in an apartment in
Hungary and read Hungarian. Section 1 of `03-market.md` shows that the two largest care apps,
PictureThis and Planta, do not ship Hungarian at all. That is an observation, not a plan. Whether
the product ever goes beyond one user is the owner's decision, not this document's.

## 3. The value hypothesis

A value hypothesis needs three things: a number, a window in which it is measured, and a way to
measure it. Without all three it cannot be proved wrong.

> **Hypothesis V1.** In the **first 8 weeks** after the feature works end to end, the user accepts
> the suggested next action for **at least 8 out of every 10** photo assessments he asks for.
>
> **"Accepts"** has one meaning, and it is countable: the care task that the assessment created is
> still there after 7 days, and it was marked done. A task the user deletes within 7 days counts as
> rejected. A task he ignores counts as rejected.
>
> **Proved wrong if:** fewer than 8 in 10 across at least 20 assessments. Fewer than 20 assessments
> in 8 weeks is a different failure and is covered by V2.
>
> **Where the number comes from:** it is a proposed target, not a measured one. See the open
> question O-1. Eight in ten is proposed because a plant-care suggestion that is wrong one time in
> five is still worth having, and one wrong one time in three is not. That reasoning is judgement,
> not data. **The owner confirms the number or replaces it.**
>
> **Do not confuse this with the other 8 in 10.** `factory/feature.md` sets two provisional bars for
> **agreement**: how often a person agrees with a `likely` verdict, and how often a person agrees a
> `cannot-tell` photo was really unusable. Those measure whether the model was right. V1 measures
> whether the user acted. The numbers match by accident, and 600 QA must keep the two apart.

> **Hypothesis V2.** In the same 8 weeks, the user opens the camera and asks for an assessment **at
> least 6 times**. Fewer than 6 means the feature is not reached for when a plant looks unwell, and
> the accuracy of the assessment does not matter yet.
>
> **Where the number comes from:** at least eight pots, eight weeks. Six is fewer than one problem
> per pot over two months. It is deliberately low, because a low bar that is missed is a clear
> result.

**Both hypotheses need a baseline that does not exist yet.** Nobody has measured how long the owner
currently spends searching the web for "why are my monstera leaves yellow", or how often he gives up.
Without that baseline, "the app is faster" cannot be said. See open question O-2.

## 4. The ROI hypothesis

The return on this project is **not money**. `initial-plan.md` section 7 says what the return is: a
project that reads as though a senior developer built it. That return cannot be counted in forints.
What *can* be counted is the cost, and the cost is the part that can kill the project.

### What one assessment costs

These are calculated numbers, from two prices published by Anthropic. The arithmetic is shown so it
can be checked and re-done when a price changes.

Anthropic charges for an image by visual token. The rule is
`ceil(width / 28) x ceil(height / 28)` visual tokens, and a 1000x1000 px photo comes to **1296
tokens** ([Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision), checked
2026-08-24).

Assumption, stated so it can be corrected: the prompt text (instructions plus the plant name plus
the user's note) is about **700 input tokens**, and the answer is about **400 output tokens**. Those
two numbers are estimates by this role, not measurements.

| Model | Input price | Output price | Cost of one assessment | 180 assessments | 1,000 assessments |
| --- | --- | --- | --- | --- | --- |
| Claude Haiku 4.5 | $1 / million | $5 / million | **$0.0040** | $0.72 | $4.00 |
| Claude Sonnet 5 | $2 / million | $10 / million | **$0.0080** | $1.44 | $8.00 |
| Claude Opus 5 | $5 / million | $25 / million | **$0.020** | $3.60 | $20.00 |

Prices from the [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing),
checked 2026-08-24. 180 assessments is 30 a month for six months. Which model is used is **400
Architecture's decision**, not this document's. This table exists so that decision is made with the
money in view.

**This money is not AWS money.** `factory/feature.md` decides it: the Anthropic API is paid from the
owner's own Anthropic credits, on a separate account, and Amazon Bedrock is not used. So the table
above is a second bill that no AWS budget alarm can ever see.

> **Hypothesis R1.** The model calls for the owner's own use, over the six months from 2026-07-01 to
> 2026-12-31, cost **under $5** of Anthropic credit. At 30 assessments a month on Haiku 4.5 that is
> $0.72, so there is room for the estimate to be five times wrong and still hold.
>
> **Proved wrong if:** the Anthropic spend for this feature passes $5 before 2026-12-31.

> **Hypothesis R2.** A burst month — say 500 assessments while several people try the app at once —
> costs **under $10** on any of the three models except Opus 5.
>
> Check the table: 500 on Sonnet 5 is $4.00, 500 on Opus 5 is $10.00. So R2 holds for Haiku and
> Sonnet and is exactly at the edge for Opus. That is a useful thing to know before choosing.

### The cost that is not small

The numbers above are the honest case. The dishonest case is the one that matters:

**An unprotected assessment endpoint is a way to spend the owner's money.** 100,000 calls on Opus 5
is **$2,000**. 100,000 calls is not a large number for a script. This single line is the reason
`factory/feature.md` says every user must sign in, and the reason a per-user limit is not optional.

Two things follow from the two-bill split, and both belong to 800 Infra and 900 Security:

- **The AWS account closing does not stop this.** The model spend never reaches AWS, so the
  automatic close protects nothing here. What runs out is Anthropic credit, and that is still an
  outage — the feature simply stops working.
- **The guardrail has to count model calls inside the application**, because no AWS alarm can see
  them. `factory/feature.md` states this. This brief only records why it exists.

## 5. The context pack

Four parts. A part that is empty says "none known" out loud, so a later reader can tell the
difference between *nothing here* and *nobody looked*.

### 5.1 Business context

- **There is no business.** No revenue, no customer, no budget, no deadline set by anyone but the
  owner. It is a personal project, built to solve a real problem the owner has and to learn AWS
  properly while doing it (`initial-plan.md`, sections 1 and 3).
- **The owner is the only decision maker.** There is no stakeholder to align with and no committee.
  A decision that needs a person is a decision that needs *him*, and the line stops until he answers.
- **There is no money return, and none is invented here.** The return is a working app for one
  household and a repository whose decisions can be followed by someone who did not write them.
  Neither is measurable in currency, so this document does not fake a figure for it.
- **Competition does not matter yet, and matters later.** Nothing in `03-market.md` changes what run
  1 builds. It is written down because the same table would take a day to rebuild in six months.
- **Time is the scarce input, not money.** `initial-plan.md` section 2: "My time, my attention and my
  token budget are all limited, and a process I cannot keep up with is worse than a lighter one I
  can."

### 5.2 Product context

- **The moment the product exists for**: a person is standing in front of a plant, holding a phone,
  looking at a leaf that has gone wrong. Standing, one hand, possibly poor light, possibly evening.
  `initial-plan.md`: "I will use this standing in front of a plant, holding my phone."
- **The output that has value is the next action, not the diagnosis.** "Spider mites" is a word.
  "Wipe both sides of the leaves with soapy water, then check again in 4 days" is a thing to do.
  `factory/feature.md` requires the model call to return a verdict, a confidence **and a next
  action**. The next action is the part that gets scheduled.
- **The product must be allowed to be unsure, and confidence is a band.** `factory/feature.md`, in
  scope: "Showing the result honestly, including when the model is unsure." It also fixes what the
  word means: one of three literal values — `likely`, `unsure`, `cannot-tell` — and **no percentage
  is ever shown**. `cannot-tell` is a correct result, not an error. A confident wrong answer about a
  plant costs the user a plant. This is a product requirement, not a design detail.
- **The unit is the pot, not the species.** `initial-plan.md` says the owner keeps several climbing
  plants of different kinds, so the app "cannot assume one plant per species — it needs one row per
  **pot**, with my own name on it". 400 Architecture designs the data around that.
- **The plant is already named by the user.** `factory/feature.md` puts species identification out of
  scope on purpose. The assessment knows it is looking at a Zamioculcas because the user said so.
  This removes a whole class of error and a whole class of cost. It is also one of the two free
  checks that run before the model call.
- **This feature does not stand alone.** It writes a care task. Something else — a later run — reads
  that task and reminds the user. Run 1 produces the task and stops there.
- **Phone first and more than one language apply to everything.** `factory/feature.md` says these two
  are not features, they are properties of every feature. The languages are **Hungarian and
  English**, decided by the owner. `initial-plan.md` adds why it matters for this product in
  particular: the Hungarian names are the ones the owner actually uses, so a plant's name must be
  shown in the language being read.

### 5.3 Engineering context

The constraints below are real and none of them is comfortable. They are written plainly, because a
constraint that gets softened in the brief comes back as a surprise in the code.

- **One developer, part-time.** Not one team. Not one full-time developer. Anything that needs two
  people to operate does not get operated.
- **Two of the chosen pieces are new ground.** `initial-plan.md` section 5 lists Nest.js and AWS as
  things to learn, not things already known. The design must prefer the documented path over the
  clever one, because there is no earned instinct to catch a clever choice going wrong.
- **Zero budget.** No line item exists for a paid service, a paid tier or a paid tool.
- **The AWS free plan closes the account.** Verified first-party: *"The account closes on its own 6
  months after you open it or when your credits run out, whichever comes first"*, with $100 in
  credits at once and up to $100 more, "up to $200 over 6 months"
  ([AWS Free Tier](https://aws.amazon.com/free/), checked 2026-08-24). It also says: *"You won't be
  charged unless you convert to a Paid plan."* So a runaway loop does not produce a bill. It produces
  a **closed account and deleted resources**. That is why `CLAUDE.md` calls cost a correctness
  property and not an accounting one.
- **The free window ends 2026-12-31.** The account was opened **2026-07-01** (`factory/feature.md`,
  "Known constraints the line must respect"). Today is 2026-08-24, so a little over four months are
  left, not six. 800 Infra sets its cost guardrails against that date.
- **There are two bills, and only one of them is AWS.** The Anthropic API is paid from the owner's
  own Anthropic credits, on a separate account. **Amazon Bedrock is not used**
  (`factory/feature.md`). Two things follow: a runaway retry loop cannot close the AWS account,
  because the model spend never reaches AWS, and the cost guardrail must count model calls in the
  application, because no AWS budget alarm can see them. Running out of Anthropic credit is still an
  outage.
- **GitHub free tier for CI, on a personal account.** Minutes are limited. A workflow that runs
  everything on every push will run out.
- **Anthropic is the default model provider, behind a port.** `factory/feature.md` requires the swap
  to another provider to stay possible. `CLAUDE.md` names the port: `LlmProvider`.
- **The model has published limits that this feature runs into.** From the same Anthropic vision
  page, checked 2026-08-24: images up to **10 MB** base64 on the Claude API, max **8000x8000 px**,
  formats **JPEG, PNG, GIF, WebP** only, and *"Claude might hallucinate or make mistakes when
  interpreting low-quality, rotated, or very small images under 200 pixels."* A phone photo taken in
  the evening in a living room is exactly a low-quality image. This is a design input, not trivia.
- **One useful fact for the retention discussion**: Anthropic states *"Image uploads are ephemeral
  and not stored beyond the duration of the API request"* and *"Anthropic does not use uploaded
  images to train models"* (same page, checked 2026-08-24). So the retention question is about the
  project's own storage, not about the model provider's.
- **The repository shape is decided; the layout inside it is not.** Two repositories, decided
  2026-08-21. How `zamphora` is arranged, and whether it uses Turborepo, Nx or plain npm workspaces,
  is 400 Architecture's ADR. `factory/feature.md` carries the research and the six split-readiness
  rules. Nothing in this brief changes them.

### 5.4 Regulatory context

- **The photo is personal data, and it is decided, not argued.** `factory/feature.md`: "The photo is
  of the inside of someone's home. Treat it as personal data from the first file." A photo of a
  living room can show the room, the furniture, other people, and where the person lives.
- **GDPR applies.** The user is in Hungary, which is in the EU. This brings at least: a lawful basis
  for storing the photo, a retention period, a way to delete, and a way to export.
- **The retention rule exists: 180 days.** The owner decided it on 2026-08-24 and wrote it into
  `factory/feature.md`. A photo is kept 180 days and then deleted automatically. **A storage
  lifecycle rule does the deleting, not application code**, so the rule holds even when the app is
  broken. A user can also delete their own photos on demand. The **text** result of an assessment is
  kept longer, so a plant's history survives without the images — how much longer is not named, and
  that part is still open (O-10). GDPR names no period for anything; it requires the owner to choose
  one, justify it, and actually delete when it expires.
- **The EU AI Act transparency duty is already in force.** Article 50(1) requires that a person is
  told they are interacting with an AI system, "at the latest at the time of the first interaction",
  unless it is obvious. Those obligations became applicable on **2 August 2026** — three weeks before
  this document was written
  ([European Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act),
  checked 2026-08-24). Whether this small personal project is in scope of the Act is a legal
  question and is **not** answered here. What is safe and cheap either way: say on screen that the
  assessment came from an AI model. 900 Security carries the question; the owner decides.
- **Plant advice is not medical advice, but the wording matters.** Anthropic's own vision page warns
  that Claude "is not designed to interpret complex diagnostic scans" and that its output "should not
  be considered a substitute for professional medical advice or diagnosis". The same care applies
  here in a smaller way: the app should not tell someone a plant is safe to eat, or safe around a
  cat, as a fact.
- **One thing was not checked.** In Hungary, `növényorvos` ("plant doctor") is used as a professional
  title in agriculture. Whether calling a feature "plant doctor" in Hungarian has any legal meaning
  was **not researched**. Recorded as open question **O-6**, low priority, cheap to avoid by choosing
  another word. It matters a little more now that Hungarian is a shipping language.
- **Cookies, tracking, payment, children's data:** **none known.** There is no payment, no
  advertising, no analytics vendor named in either input file, and no reason for a child to use it.
  If any of those arrive later, this part of the pack changes.

## 6. The push-back questions

For every input that was fuzzy, the question that would have been asked, and its answer. An answer
of "open" means it was not invented.

| # | Question that had to be asked | Answer |
| --- | --- | --- | 
| P-1 | "Assess the plant" — assess against what? A disease list, or free text? | **Answered from the input.** `factory/feature.md` fixes the output shape: a verdict, a confidence, and a next action. The list of possible verdicts is 200 Product's to define. |
| P-2 | The feature says "one model call". Is one call enough for a photo plus a plant name plus a history? | **Answered from the input.** One call is a scope limit, not a technical claim. `factory/feature.md` puts a follow-up chat out of scope and says it "changes the cost model". |
| P-3 | What does "confidence" mean — the model's own number, or one the system computes? | **Answered from the input.** `factory/feature.md`, "What confidence means on this project": neither. It is a **band**, one of `likely`, `unsure`, `cannot-tell`, and no percentage reaches the user. A self-reported number cannot be tested; a band can, by measuring agreement against a golden set. O-7 is closed. |
| P-4 | "Storing that photo, with a retention rule" — which rule? | **Answered from the input.** 180 days, then automatic deletion by a storage lifecycle rule (`factory/feature.md`). O-5 is closed. The period for the assessment **text** is still not named — see O-10. |
| P-5 | Is this even the right problem? Would a good watering schedule prevent most sick plants and make assessment rare? | **Partly.** It probably would reduce them. But `initial-plan.md` section 3 lists "I cannot tell what is wrong" as its own failure, next to the schedule failures, and section 4 says photo assessment is "the feature I care most about". The problem is real. The frequency is unknown, which is what hypothesis V2 measures. |
| P-6 | Why is the hardest feature first? | **Answered from the input.** `factory/feature.md`: it touches a camera, an upload, paid storage, a paid model call that can be wrong, and a written task. The later features inherit the architecture instead of arguing with it. |
| P-7 | Which languages, exactly? | **Answered from the input.** **Hungarian and English in run 1** (`factory/feature.md`, "Human decisions already made"). The market scan is given as part of the reason: the large apps ship no Hungarian. O-8 is closed. |
| P-8 | How many assessments per month should the system be built for? | **Open.** Section 4 uses 30 a month as a stated assumption. It was taken from four plants and one user, and the plant list has since grown to at least eight pots, so the assumption is now weaker, not stronger. Nobody has confirmed it. Recorded as **O-9**. |

## 7. Open questions

Every one of these belongs to a person or to a later role. None of them was guessed at.

### Still open

| # | Question | Owner | Blocks |
| --- | --- | --- | --- |
| O-1 | Confirm or replace the "8 out of 10 accepted" target in hypothesis V1. It is about the user acting, not about the model being right, so `factory/feature.md`'s agreement bars do not answer it. | The owner | 600 QA, when it writes the AI evaluation |
| O-2 | Measure the current baseline once, before building: how long does finding an answer take today, and how often does it fail? Even three written-down attempts would do. | The owner | Nothing. But without it, "the app is better" cannot be said |
| O-6 | Does the Hungarian word `növényorvos` carry a professional meaning that this app should avoid? | The owner | Nothing. Avoid the word and the question goes away |
| O-9 | Expected number of assessments per user per month. The 30 in section 4 came from four plants; there are now at least eight pots. | The owner | 800 Infra cost limits |
| O-10 | How long is the **text** result of an assessment kept? `factory/feature.md` says "longer" than the photo's 180 days and names no period. | The owner — never the model | 400 Architecture, 900 Security |

### Answered since this brief was first written

| # | Question | The answer, and where it is written |
| --- | --- | --- |
| O-3 | The date the AWS account was opened, so the closing date can be written down. | Opened **2026-07-01**, so the free window ends **2026-12-31**. `factory/feature.md`, "Known constraints the line must respect". Read by 800 Infra |
| O-4 | Does the AWS free plan cover Amazon Bedrock? | The question is gone. **Bedrock is not used.** The Anthropic API is paid from the owner's own Anthropic credits, on a separate account. `factory/feature.md`, "Human decisions already made" |
| O-5 | How long is a plant photo kept, and what deletes it? | **180 days**, then a **storage lifecycle rule** deletes it, not application code. The user can also delete on demand. `factory/feature.md`. This closes gate G-1 |
| O-7 | What does "confidence" mean, and what number turns the result into "not sure"? | No number. A **band**: `likely`, `unsure`, `cannot-tell`. `factory/feature.md`, "What confidence means on this project" |
| O-8 | Which languages ship, and in which order? | **Hungarian and English** in run 1. `factory/feature.md`, "Human decisions already made" |

---

## What this document does not decide

What gets built and in which order · what the value number means for the owner · whether any cost is
acceptable · which model is used · whether any idea in `03-market.md` is picked up. All of those
belong to a person or to a later role.

Two things on that list when this brief was first written — how long a photo is kept, and which
languages ship — have since been answered **by the owner**, in `factory/feature.md`. They were never
this document's to decide, and they still are not.
