# The one feature this run covers

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
  rule does the deleting, not application code, so the rule holds even when the app is broken. The
  **text** result of an assessment is kept longer, so a plant's history survives without the
  images. A user can also delete their own photos on demand. GDPR names no period for anything — it
  requires the owner to choose one, justify it, and actually delete when it expires. This is that
  number.
- **Two languages in run 1: Hungarian and English, decided 2026-08-24.** The market scan found the
  large apps ship no Hungarian, so this is also the one place the product is not a copy of
  something that already exists.
- **The model bill is not an AWS bill, decided 2026-08-24.** The Anthropic API is paid from the
  owner's own Anthropic credits, on a separate account. Amazon Bedrock is not used. Two things
  follow. A runaway retry loop cannot close the AWS account, because the model spend never reaches
  AWS — it burns Anthropic credits instead, which is still an outage when they run out. And the
  cost guardrail must count model calls in the application, because no AWS budget alarm can see
  them.
- **What "confidence" means, decided 2026-08-24.** See the section below.

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
