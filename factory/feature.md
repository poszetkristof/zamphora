# The one feature this run covers

**Run slug:** `001-photo-assessment`

That slug is the folder name for everything this run produces: `docs/<role>/001-photo-assessment/`
and `factory/runs/001-photo-assessment/`. The number is the run order, so the folders sort the way
the runs happened. Run 2 uses `002-<its-feature>` and cannot overwrite this one.

**Change this line before starting a new run.** The roles read it from here, and the scripts resolve
every `{feature}` path from it. One line moves the whole run.

This run writes the specs for **one feature only**. Every document the eight roles write must stay
inside what this file describes.

If a role wants to add something this file does not list, it must stop and ask you. That stop is a
**human gate**. It is the right behaviour, not a failure.

---

## The product, in one paragraph

A plant-care companion for someone who keeps houseplants in an apartment and keeps getting it
wrong. It remembers what each plant needs and when, tells them what to do today, and lets them
photograph a plant that looks unwell to get an assessment and a next step. It works on a phone,
in more than one language.

## The feature

**Photograph a plant that looks unwell, and get back an assessment with a next action.**

It was chosen because it touches every part of the system: a camera on a phone, a file upload,
storage that costs money, a model call that costs money and can be wrong, a result that must be
shown honestly, and a follow-up task written into the care schedule. If the eight roles can handle
this feature, they can handle the easier ones.

## When is this run finished?

This run does not produce working software. It produces the documents that describe it.

The run is finished when a developer could start coding from these files alone. If they still have
to ask a basic question, a file is missing something.

## In scope

- Capturing or choosing a photo of one plant, on a phone.
- Storing that photo, with a retention rule.
- One model call that assesses the plant and returns a verdict, a confidence, and a next action.
- Showing the result honestly, including when the model is unsure.
- Turning the next action into a scheduled care task.
- The costs, the failure modes and the abuse cases of all of the above.

## Out of scope for this run

**"Out" means not this run. It does not mean never.** Each line below is a later run of the same
line, on an edited copy of this file. See "This is run 1 of several" at the end.

| Out | Why, and who owns it |
| --- | --- |
| Watering-schedule engine | A separate feature. It consumes the task this one creates |
| Push notification delivery | A separate feature. Named here only as the consumer of the task |
| Sharing a plant between two people | Not in the product yet. Product owns the decision |
| Admin screens and admin-only actions | The account type exists from day one (see below), but the admin **screens** are a later feature |
| Plant identification from a photo | Deliberately not attempted. Assessment assumes the user named the plant |
| A conversational follow-up chat | Named as a later option. It changes the cost model and needs its own pass |

## Known constraints the line must respect

- One developer, part-time.
- AWS free account plan. The account **closes** rather than billing, so cost is a correctness
  property, not a finance one. **The account was opened 2026-07-01, so the free window ends
  2026-12-31.** Write that date into the context brief.
- GitHub free tier for CI, on a personal account.
- The photo is of the inside of someone's home. Treat it as personal data from the first file.
- Anthropic API as the default model provider, behind a port, so another provider is a swap.

## Human decisions already made

- Stack: Next.js (React) for the web, Nest.js for the API, Zod contracts shared between them.
- The line runs eight roles: 100 · 200 · 300 · 400 · 500 · 800 · 900 · 600.
- There is no Data role in this run. Data design belongs to 400 Architecture.
- **Every user signs in.** A photo is personal data and the AI endpoint costs money per call, so
  there is no anonymous use of this feature.
- **Two repositories, decided 2026-08-21.** `ai-factory` holds the line and ships as a Claude Code
  plugin. `zamphora` holds the whole product: web app, API, shared contracts, infra, the specs and
  the learning note. Whether the API ships as one deployable unit or several is Architecture's
  decision, and it does not need a third repository either way.
- **Two account types from day one: `USER` and `ADMIN`.** A user sees only their own plants and
  photos. An admin can read usage and cost figures, and can turn the AI feature off. The permission
  check ships with this feature. The admin **screens** are a later feature.
- **A photo is kept 180 days, then deleted automatically, decided 2026-08-24.** A storage lifecycle
  rule does the deleting, not application code, so the rule holds even when the app is broken. A
  user can also delete their own photos on demand. GDPR names no period for anything — it requires
  the owner to choose one, justify it, and actually delete when it expires. This is that number.
- **The assessment text lives as long as the pot does, decided 2026-08-24.** There is no clock on
  it. Delete a pot and its assessments go with it; delete the account and everything goes. The
  reason it is not a number: the purpose of the text is backbone feature 4, the record of how a
  plant is doing over time, and a history on a timer deletes the early part, which is the part worth
  having. GDPR Article 5(1)(e) asks for no longer than the purpose needs, so ending the purpose is a
  stronger justification than any date.
- **An account with no sign-in for 12 months is deleted, decided 2026-08-24.** This is the backstop
  the rule above needs, because "as long as the pot exists" otherwise means forever for somebody who
  signs up once and never returns. **Warn by email at 11 months**, delete at 12. The warning is not
  optional here: 12 months is short enough that a person with hardy plants could reach it without
  neglecting anything, and deletion takes their whole history. 24 months was the other option and
  was rejected as holding personal data longer than needed.
- **Two languages in run 1: Hungarian and English, decided 2026-08-24.** The market scan found the
  large apps ship no Hungarian, so this is also the one place the product is not a copy of
  something that already exists.
- **The model bill is not an AWS bill, decided 2026-08-24.** The Anthropic API is paid from the
  owner's own Anthropic credits, on a separate account. Amazon Bedrock is not used. Two things
  follow. A runaway retry loop cannot close the AWS account, because the model spend never reaches
  AWS — it burns Anthropic credits instead, which is still an outage when they run out. And the
  cost guardrail must count model calls in the application, because no AWS budget alarm can see
  them.
- **The Anthropic credit is small and topped up by hand, stated by the owner 2026-08-25.** The
  balance is $5 at the time of writing, and the owner adds more when it runs out. So the project is
  never permanently blocked, and it is never far from empty either. This changes what the money risk
  is. The worst case is **not** a large bill — the API stops when the balance reaches zero. The worst
  case is that the balance reaches zero, the feature goes dark, and it stays dark until a person
  notices and pays. At the prices in `00-context-brief.md` section 4, $5 is about 250 assessments on
  Opus 5, 625 on Sonnet 5 or 1,250 on Haiku 4.5. **No document may describe a sum larger than the
  balance as money the owner can lose.** A price is what calls would cost. It is not a bill.
- **There is no total spend cap. The credit runs out and the feature stops, decided 2026-08-25.**
  No monthly budget, no alarm at a percentage, no automatic switch-off before zero. The balance
  reaching zero **is** the stop. This was chosen over a cap because a cap is a second number to pick,
  to enforce and to keep correct, and it would only ever fire before the thing that already stops the
  calls. Two things follow, and both belong to 500 Engineering and 800 Infra. **Running out of credit
  is a normal failure state, not a crash** — it gets its own message, and the message says topping up
  is what fixes it. And **retrying does not help**, so the retry rule in US-09 must not retry this
  one. Nothing else in the product changes when the balance is empty: sign-in, the pots, the photos
  and the old assessments all keep working. Only the model call stops.
- **A user may run 10 assessments a day, decided 2026-08-24.** The check runs before the model call
  and before any retry, so a failed call still counts. Every attempt costs money, which is the whole
  point of the limit. Real use is expected at about 30 a month, so 10 a day is ten times headroom
  and a bad week where several plants look unwell still fits. The reason this number exists at all:
  an endpoint with no limit can be called by a script faster than any person, and the balance is
  only a few hundred calls. The feature would be dead in a minute. Where the limit is enforced
  is 400 Architecture's decision. That it is enforced is not. **10 a day is not by itself a budget
  guard:** 10 a day for a month is 300 calls, which is $6.00 on Opus 5 and $1.20 on Haiku 4.5. What
  keeps spend under $5 is the model choice plus a total cap, and the total cap does not exist yet.
- **The model returns four fields, not three, decided 2026-08-24.** Verdict, confidence band, next
  action, and **the follow-up in whole days**. The scope list below names three, and three is not
  enough: a care task needs a date, and the date must arrive in a shape code can read rather than
  inside a sentence. The number of days is chosen by the model, because how soon you check a plant
  again depends on how bad it looks. The rejected option was a fixed table from verdict to interval,
  which is cheaper and fully testable but always gives the same date for the same verdict.
- **A user waits at most 30 seconds for a result, decided 2026-08-25.** Measured from the tap that
  takes the photo to something on screen, so it covers the resize, the upload and the model call.
  Past 30 seconds the app stops waiting and says it failed. 15 seconds was rejected because on a weak
  signal the upload alone can take that long, so the app would throw away answers it had already paid
  for. 60 seconds was rejected because a minute in front of a plant feels broken, and the user taps
  again, which costs a second call.
- **Two attempts per assessment, decided 2026-08-25.** One try, then one retry after a short wait,
  and both must finish inside the 30 seconds above. It retries only what retrying can fix: a
  timeout, a 429, a 503. It never retries a bad request, a rejected photo, or an empty credit
  balance. Both attempts count against the 10-a-day limit. **Five tries with exponential backoff was
  considered and rejected**, and the reason is worth keeping: the usual advice assumes a retry is
  nearly free, but here every attempt is a paid model call, and 1+2+4+8 seconds of backoff alone
  overruns the 30-second limit before the model has been asked five times. Five tries is the right
  answer once the assessment runs in the background instead of in front of a waiting person, which
  needs notifications — backbone 6, run 3.
- **A session lasts 30 days, decided 2026-08-25.** The app is opened every few weeks, not daily, so 7
  days was rejected: the user would meet the sign-in screen almost every visit, which is where people
  give up. 90 days was rejected because a lost phone would stay signed in to photos of the inside of
  a home for three months.
- **The kill-switch takes effect within 60 seconds, decided 2026-08-25.** The on/off value may be
  held in memory for up to a minute, so a few calls can still slip through after it is flipped.
  Checking it on every single request was rejected as the more complicated answer: with no cached
  value there is no obvious behaviour when that read itself fails, and someone would have to decide
  whether it fails on or off. 5 minutes was rejected because the switch exists for when something is
  already going wrong.
- **The ten verdict codes ship as written, and are reviewed after the first 20 real assessments,
  decided 2026-08-25.** No plant reference was used to build them, and that is accepted for run 1
  because the list cannot silently fail: `other` and `nothing-wrong` mean the model is never forced
  to invent a fault, so a missing code shows up as a pile of `other` answers, which is countable.
  The 40-photo test set will expose the rest. Adding a plant reference before 300 Design runs was
  rejected as a new input to the whole line rather than a fix to one list.
- **The EU AI Act position for run 1: show the notice, take no legal advice, decided 2026-08-25.**
  Every screen showing an assessment says it came from an AI model. That is cheap and it is safe
  whether or not the Act applies to a personal project with one user. **This decision is scoped to
  run 1 and must be re-opened the day the app is offered to anyone else** — that is a different
  question with a different answer.
- **No second opinion API. Rejected outright, not deferred, decided 2026-08-25.** `03-market.md` W-4
  proposed `plant.health` by Kindwise to give a second verdict. The owner is not interested in it, in
  this run or a later one. This is stronger than the "not this run" label the market scan gave it:
  **no role may propose it again**, and no design should leave a place for it. The reasons that stand
  in the file: it doubles the cost of every assessment, adds a second outside service that has to
  keep working, and needs a rule for what the screen shows when two services disagree. If a second
  opinion is ever wanted, that is a new decision by the owner, starting from nothing.

## What "confidence" means on this project

The scope list asks the model call to return "a verdict, a confidence, and a next action". This
section says what the second word means, so 300 Design can draw it, 500 Engineering can put it in a
contract, and 600 QA can test it.

**Start from the problem.** If you ask a language model how sure it is, it writes a number. That
number is the model talking about itself. It is not a measurement, and a wrong answer said at 95%
looks exactly like a right one. So a percentage on screen tells the user nothing true, and worse,
it makes the answer look measured when it is not.

**The rule: confidence is a band, not a number.** The model returns one of three literal values.
No percentage is ever shown to the user.

| Value | What the app does with it |
| --- | --- |
| `likely` | Show the verdict and the next action. Offer to write the care task |
| `unsure` | Show the verdict, say plainly that it may be wrong, and say what a better photo would be. Never write a care task without asking first |
| `cannot-tell` | Show no verdict at all. Say why — too dark, not a plant, more than one plant in frame |

`cannot-tell` is the important one. Without it the model has no way to refuse, so it invents an
answer instead. A refusal is a correct result, not an error.

**What makes the band testable.** A self-reported number cannot be tested. A band can, because the
band is a claim about the world that a person can check. QA builds a golden set — real photos, each
with a verdict a human wrote down — and measures **agreement**: how often the model's band matched
what was actually true.

Two provisional bars, to be replaced by measurements after the first 20 real assessments:

- When the model says `likely`, a person agrees with the verdict at least **8 times in 10**.
- When the model says `cannot-tell`, a person agrees the photo was unusable at least **8 times in
  10**. A model that hides behind `cannot-tell` is failing too, just quietly.

**Two checks run before the model call**, because they are free and the model is not: the file must
be an image the app accepts, and the user must have named the plant. Neither needs a model call to
fail.

## The visual identity — decided by the owner, 2026-08-25

**300 Design does not choose this.** Its own contract says brand voice and visual identity are handed
back to a person, so the answer is here, before the role runs. 300 turns it into `03-tokens.md` and
uses the token names in `02-SPEC.md`.

**A drawn mockup of all five screens was approved on 2026-08-25.** Its source is in
`factory/runs/001-photo-assessment/design-reference/`, and it is a **reference, not a contract** —
no role reads that folder. Everything in it that matters is written out below, in words and numbers.
Where the two disagree, this file wins.

### The direction: **Botanical**

**A green page, never a white one.** Rich green ground, light green-white type, one warm yellow for
actions. It should feel alive and planted, like a botanical plate — sunlight through leaves.

**Why not the obvious green.** Every app in `03-market.md` is green — PictureThis, Planta, Blossom,
Greg — and every one of them is **white with mint or emerald**. The green belongs on the page, not
on a white page. That single inversion is what separates this from the whole category.

**Why yellow and not lime.** Lime and chartreuse read as budget or playful. Yellow, teal and pink
are what give energetic contrast against a deep green ground, and yellow on green is what a
botanical plate already looks like.

**The first attempt was rejected and the reason is worth keeping.** It was warm paper `#F7F4EC` with
a terracotta accent — which is Claude's own palette, reproduced without noticing. A design assembled
from what the designer looks at all day is a different flavour of the same averaging problem the
MUST NOT list exists to stop.

### The palette

Measured in sRGB, WCAG 2.2, against **both** surfaces. The numbers are checked, not assumed.

| Token | Value | Use | On ground | On raised |
| --- | --- | --- | --- | --- |
| `--color-ground` | `#14513A` | the page. **Never white, never near-white** | — | — |
| `--color-well` | `#0B3526` | the photo sits in a dip, so it reads as its own plane | — | — |
| `--color-raised` | `#1B6446` | the `unsure` band, and the selected row on desktop | — | — |
| `--color-line` | `#2E7C5A` | dividers only. Never a text colour | — | — |
| `--color-verdict` | `#F3FAF2` | the verdict, headings, icons | **8.72:1** AAA | **6.68:1** AA |
| `--color-body` | `#DDEADF` | body text | **7.46:1** AAA | **5.72:1** AA |
| `--color-muted` | `#BCD6C6` | secondary text | **5.98:1** AA | **4.59:1** AA |
| `--color-accent` | `#FFC94A` | warm yellow. **The one action colour** | **6.04:1** AA | **4.63:1** AA |
| `--color-on-accent` | `#0B2E20` | text on the yellow button — **9.61:1** AAA | — | — |
| `--color-warn` | `#FF9478` | the `unsure` marker only. **Never body text** | 4.3:1 | 3.3:1 |

**Two values were rejected during the check, and both would have shipped.** `#A9C7B5` for muted
passed on the ground and failed on the raised surface at **3.9:1** — and the raised surface is
exactly where secondary text sits, in the `unsure` band. `#BCD6C6` passes on both. `#FF9478` is
strong enough for a rule, an icon and a label, and not for a paragraph, so it is fenced to those.

**Every new colour is measured against both surfaces before it is added.** One number is not enough.

### How the three confidence bands look

They must be **visibly different without relying on colour alone**, because colour alone fails for a
colour-blind user and in bright light. Each band therefore has a shape as well as a colour.

| Band | Colour | The shape that carries it without colour |
| --- | --- | --- |
| `likely` | verdict white on the ground | a filled dot before the label |
| `unsure` | `#FF9478` on the raised band | a **2px rule above the band** and a warning triangle |
| `cannot-tell` | muted only, **no accent anywhere** | no verdict at all, and the label is the only heading |

`cannot-tell` also **shows the bad photo** rather than only describing it. If the reason is "too
dark", the photo on screen is too dark.

### Typography

**A serif for the verdict, a grotesque for everything else.** The verdict is the product, so it gets
its own voice; the pairing is what stops the design looking generated. A serif also survives long
Hungarian words better at large sizes.

- `--font-display` — a serif with real character, for the verdict and headings.
- `--font-body` — a plain grotesque for UI text, labels and numbers.
- **Not Inter and not Roboto** for either. Both are the default of every generated interface.
- A type scale with real jumps — **13 / 17 / 28 / 44**, not 14 / 16 / 18.

300 Design names the two families and says why. The owner may replace either.

### MUST NOT — the list that keeps it from looking machine-made

These go into `01-CONTEXT.md` as hard constraints. They come from published analysis of why generated
interfaces look alike: the model falls back to the average of what it has seen.

- **No purple or indigo, and no gradient anywhere.** That is the default look of a generated app.
- **No white or near-white page background, and no `#FFFFFF` anywhere.** The page is green.
- **Not one radius everywhere.** Cards are `2px`, buttons are fully round. A single `16px` on every
  element is the strongest tell there is.
- **No drop shadow at 0.1 opacity on everything.** A shadow means "this floats above that". If
  everything has one, nothing does.
- **No centred hero with one button**, and **no row of three icon cards**.
- **No emoji as an icon.**
- **The accent colour covers less than 10% of any screen.** If the yellow is everywhere, it stops
  meaning "act on this".
- **No fade-in on every element.** Motion happens where something actually changed.
- **No hex value in `02-SPEC.md`.** Token names only. Every token is defined in `03-tokens.md`.

### Two constraints that come from this product, not from taste

- **Hungarian words are long.** Every label and button must be readable at 30 characters without the
  layout breaking. Test with the Hungarian string, not the English one.
- **The app is used in the evening, indoors, in poor light, one-handed, standing.** Dark mode is a
  variant to be added later, not the base. The base is chosen for outdoor legibility and because a
  plant photo sits well on a warm neutral.

## The backbone — the features the human named

These came from the person who owns the product. They are the **highest priority and the shape of
the whole system**. Everything below is already approved. Rank them first, design around them, and
never move one down the list because research turned up something newer.

| # | Backbone feature | From |
| --- | --- | --- |
| 1 | Watering intervals per plant | the owner |
| 2 | Soil replacement intervals per plant | the owner |
| 3 | Placement advice — where a plant goes for the right amount of sun | the owner |
| 4 | Documenting how a plant is doing over time | the owner |
| 5 | **Photo assessment by AI** — this run's one feature | the owner |
| 6 | Notifications when it is time to act | the owner |

Two of the owner's requirements are not features. They apply to everything above: **more than one
language (i18n)** and **phone first**.

**These are product features. A calendar app is not the answer to any of them.** The owner wants
this app to tell them when to act — a notification, an email, whatever a web app does well. Feature
5 writes the care task and feature 6 delivers it. Any document that argues watering, soil or
placement is "just a schedule problem someone else already solved" has moved an approved backbone
feature down the list, which the rules above forbid.

**Anything not on this list is a proposal, not a priority.** An idea from the market scan, or from
a role's own thinking, goes in the "worth considering later" list and waits for the owner to pick
it up. A good idea does not become high priority by being a good idea.

## What the roles must investigate, not assume

These are open on purpose. The line is expected to research them and write down the choice with the
option it rejected. Do not treat a name below as a decision already made.

| Question | Who answers it | Where it lands |
| --- | --- | --- |
| What already exists — apps doing plant care or plant diagnosis in Hungary, the EU and the USA, what they charge, and what they do badly | 100 Consulting | `docs/100-consulting/03-market.md` |
| Which features are worth building **later**, including ones nobody has asked for yet | 100 Consulting, then 200 Product | `03-market.md`, then the PRD's Out list |
| How sign-in works — the protocol, the flow, and where tokens live | 400 Architecture | an ADR, plus `05-patterns.md` |
| How the two account types are enforced, and where the check runs | 400 Architecture, checked by 900 Security | an ADR, then `docs/900-security/02-mitigations.md` |
| How the product repository is laid out, and what would justify splitting it further | 400 Architecture | `docs/ADR/0001-repository-layout.md` |
| Whether the product repo uses Turborepo, Nx or plain npm workspaces | 400 Architecture | the same ADR |

**On the repository ADR.** Two repositories are decided; how the product one is arranged is not.
The ADR must name the layout, the tool that runs the workspace, the option it rejected, and the
**trigger** that would justify splitting further. Research already done, for the ADR to use or to
challenge:

- Cal.com runs a Next.js app and a **Nest.js** API in one repo with shared packages — the closest
  public match to this stack. Next.js itself is a monorepo publishing several npm packages.
- Shopify consolidated into one repo in 2024 and gave an AI-native reason: *"code is going to be
  increasingly written with AI, and our infrastructure needs to be the substrate for that."*
- A shared package can be published to npm **from inside** a monorepo (tRPC does this with
  Changesets and the `workspace:*` protocol). A second repository is not needed to make
  `packages/contracts` consumable by an outside project.
- **Every coding agent indexes one repository.** A repo border blocks the agent from seeing who
  uses the code it changes, needs several pull requests for one change, and resets its context. Nx
  sells an enterprise product, Polygraph, whose only job is to hide that from agents.
- Measured cost of the rejected option: **4 to 6 pull requests** per change that crosses the wire.
  Cloudflare published four pull requests per change before they automated it down to one.
- Companies that published a move from many repos to one: Block (450 services), Proton (15
  developers), Airbnb, and Uber — which runs thousands of services out of a few monorepos, so
  **splitting deployment units does not require splitting repositories**. **No first-party
  engineering post was found going the other way and calling it a win.**
- On Turborepo: it worked for the user in a previous project, but that project was several
  front-end packages. Mercari found remote caching gave little benefit on a repo with no internal
  package dependencies. Weigh it against plain npm workspaces before adding a tool.
- AWS CDK guidance warns that several CDK apps sharing one pipeline means a change to one deploys
  all of them. The answer is **path-filtered workflows and one stack per service**, not a second
  repository.

### The six split-readiness rules

The product repo must be built so a later split is a change of configuration, not a rewrite. These
six rules cost nothing today, because no application code exists yet. **400 Architecture must carry
them into the ADR, and 500 Engineering must carry them into the conventions.**

1. **No relative import crosses an app border.** `apps/web` never writes `../../api/src/...`. If
   two apps need the same thing, it moves to `packages/contracts`.
2. **`packages/contracts` is imported by package name only**, never by relative path. This one rule
   is what decides whether a later split is cheap or expensive.
3. **Each app owns its `package.json`** with its real dependencies listed. Never rely on hoisting.
4. **Each app builds from its own folder.** `cd apps/api && npm run build` works on its own.
5. **Each service gets its own CDK stack**, so deploy borders exist from day one.
6. **CI is path-filtered per app** from the first workflow file.

**The trigger to revisit.** Split further when one of these becomes true, and not before: a second
person owns one side; a service is written in a language other than TypeScript, so the Zod
contracts give it nothing; or CI on the product repo passes about 15 minutes. Write the trigger
into the ADR as a checkable condition, not as a feeling.

---

## This is run 1 of several

The line runs **once per feature**. This file is the only thing you change between runs. Copy it,
rewrite "The feature", rewrite the two scope lists, and run the line again.

Run 1 is different from every run after it, because most of what it writes is not about photos:

| Written once in run 1, later runs only **read** it | Rewritten for **every** feature |
| --- | --- |
| `docs/100-consulting/` — brief, market scan, decisions | `docs/200-product/` — stories, PRD, traceability |
| `docs/400-architecture/` — options, C4, patterns, ADRs | `docs/300-design/01-CONTEXT.md`, `02-SPEC.md` |
| `docs/500-engineering/00-conventions.md`, `docs/context/stack.md` | `docs/500-engineering/01-contracts.md`, `03-api-spec.md` |
| `docs/800-infra/` — environments, IaC, CI/CD, cost limits | `docs/900-security/01-threats.md` for the new surface |
| `docs/300-design/03-tokens.md` | `docs/600-qa/01-test-cases.md`, `02-ai-evals.md` |

That is why the hardest feature goes first. Photo assessment forces the architecture to be right —
a camera, an upload, storage that costs money, a model call that can be wrong. The later features
inherit that architecture instead of arguing with it.

### Which roles run on a later feature

Ask one question: **does this feature change the shape of the system?** A new data store, a new
outside call, a new deployment unit, a new trust boundary.

| Answer | Roles that run |
| --- | --- |
| **No** — it fits the existing shape | 200 · 300 · 500 · 600. Four roles, not eight |
| **Yes** | all eight, but 400 and 800 **extend** their documents rather than starting again. A new ADR is added; an accepted one is never edited |

**Write the answer down** in the run's `run-record.md`, with the reason. "We skipped Security" is a
finding if nobody wrote why.

### The planned runs

| Run | Feature | Changes the shape? |
| --- | --- | --- |
| 1 | Photograph a sick plant, get an assessment and a next action | yes — it defines the shape |
| 2 | Watering and soil intervals, and the care schedule | likely yes — a scheduler and time-based work |
| 3 | Notifications when it is time to act | likely yes — a delivery channel outside the app |
| 4 | Placement advice — light and position per plant | no |
| 5 | Documenting a plant's state over time | no |
| 6 | Admin screens | no |

This table is a plan, not a promise. The owner may reorder it. What may not happen is two features
in one run.
