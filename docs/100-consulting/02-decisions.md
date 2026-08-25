# Decision memory — run 1, photo assessment

**Written by** 100 Consulting, run 1 (`photo-assessment`). **Date:** 2026-08-24.
**Corrected:** 2026-08-24, second pass, after both input files changed.

A decision memory is one short entry per thing that would otherwise be argued about twice. In six
months nobody remembers why a choice was made, and the argument starts again from nothing. Each
entry below says what was chosen, why, what was rejected, and who is allowed to change it.

**This is not the ADR folder.** An ADR (Architecture Decision Record) records a technical choice and
belongs to 400 Architecture. This file records the decisions made *before* the technical work — about
the problem, the value and the framing. Where an entry touches a technical choice, it names the role
that owns it and stops.

**Two kinds of entry.** Some of these were already decided by the owner and are written here so they
are not re-opened. Those say **source: `factory/feature.md`**. Others are this role's framing
decisions, and those say **source: this role**. A framing decision can be overturned by the owner at
any time.

---

## D-01 — The unit of value is the next action, not the name of the problem

**Decided.** The assessment is judged by whether the user does the thing it suggested, not by whether
the disease name was correct.

**Why.** A user standing in front of a plant cannot act on the word "chlorosis". `factory/feature.md`
already requires a verdict, a confidence **and a next action**. This entry says which of the three
carries the value, so that when the three parts compete for screen space, design and product know
which one wins.

**Rejected.** Judging the feature by naming accuracy. It is easier to measure and it measures the
wrong thing. A correct name with no action changes nothing in the apartment.

**Consequence.** Hypothesis V1 in `00-context-brief.md` counts accepted actions, not correct names.
600 QA should evaluate the same way. It is a different measurement from the agreement bars in
`factory/feature.md`, which count whether the model was right. Both exist; they are not the same
number.

**Who may change it.** The owner. **Source:** this role.

---

## D-02 — "Not sure" is a result, not a failure

**Decided.** When the model cannot tell, the app says so and offers a way forward. That answer counts
as a successful assessment, not as an error.

**Why.** `factory/feature.md` puts honest results in scope by name. Anthropic warns that the model
"might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images"
([Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision), checked 2026-08-24),
and a phone photo of a houseplant in the evening is exactly that. A confident wrong instruction can
kill the plant faster than doing nothing.

**Rejected.** Always returning a best guess and hiding the confidence. It looks better in a demo and
it is worse for the user.

**How the owner made it concrete.** `factory/feature.md`, section "What confidence means on this
project", turns this framing into three literal values: `likely`, `unsure` and `cannot-tell`. No
percentage ever reaches the user. `cannot-tell` is the one that gives the model a way to refuse; a
model with no way to refuse invents an answer.

**Consequence.** Error handling and "not sure" are different paths and need different screens. UC-3
and UC-6 in `01-use-cases.md` are separate for this reason.

**Who may change it.** The owner. **Source:** this role, from `factory/feature.md`.

---

## D-03 — The photo is personal data from the first byte

**Already decided by the owner.** A photo of the inside of a home is personal data, from the moment
it is captured, not from the moment it is stored.

**Why.** `factory/feature.md`: "The photo is of the inside of someone's home. Treat it as personal
data from the first file."

**Rejected.** Treating the photo as an ordinary file and adding protection later. Retro-fitting is
what `initial-plan.md` section 1 says went wrong in the previous project.

**Consequence.** Every role that touches the photo treats it as personal data. That includes the
temporary copy made while resizing it. The retention rule that follows from it is 180 days — see
D-12.

**Who may change it.** Nobody below the owner, and there is no good reason to.
**Source:** `factory/feature.md`.

---

## D-04 — No anonymous use

**Already decided by the owner.** Every user signs in. There is no path to an assessment without an
account.

**Why.** Two reasons, both in `factory/feature.md`: the photo is personal data, and the model call
costs money per call. `00-context-brief.md` section 4 sizes the second reason: the whole credit
balance is a few hundred calls on the most expensive model. That balance is the owner's own Anthropic
credit, on a separate account, so no AWS control can see the spend or stop it. Sign-in is what makes
a per-user limit possible at all.

**Rejected.** A "try it once without an account" path. It is good for growth and it is an open door
to the owner's money.

**Who may change it.** The owner. **Source:** `factory/feature.md`.

---

## D-05 — Cost per assessment is a product number, and it lives in the brief

**Decided.** The money each assessment costs is written into the consulting brief, not left for the
infrastructure role to find later.

**Why.** On this project cost is a correctness property, and there are **two bills**. The AWS free
plan does not send a bill; it *closes the account* — verified first-party: "The account closes on its
own 6 months after you open it or when your credits run out, whichever comes first"
([AWS Free Tier](https://aws.amazon.com/free/), checked 2026-08-24). That covers storage and compute.
The model call is the other bill: `factory/feature.md` decides that the Anthropic API is paid from
the owner's own Anthropic credits and that **Bedrock is not used**. A cost number that arrives after
the design is set arrives too late to change anything, and a model cost that no AWS alarm can see
has to be visible in a document instead.

**Rejected.** Treating cost as an infrastructure detail. That is the normal way to do it and it is
wrong here.

**Consequence.** `00-context-brief.md` section 4 carries a per-model cost table. 400 Architecture
chooses the model with that table in view. 800 Infra sets the limits, and it must count model calls
**inside the application**, because no AWS budget alarm reaches them.

**Who may change it.** The owner. **Source:** this role, plus `factory/feature.md` for the two-bill
split.

---

## D-06 — The app does not identify the species; the user names the plant

**Already decided by the owner.** The assessment starts from a plant the user has already named.

**Why.** `factory/feature.md` puts identification out of scope "deliberately". It removes a whole
class of error, a whole class of cost, and the largest single thing the competitors compete on. The
owner knows what his own plants are, and `initial-plan.md` says he uses the Hungarian names for
them.

**Rejected.** Identifying the plant from the photo. Every product in `03-market.md` does this, and
doing it too would mean competing on the one thing they are all good at.

**Consequence.** The prompt sent to the model contains the plant name as a fact, not a question. That
is a real advantage: the model is answering an easier question. It also means "the user has named the
plant" is one of the two free checks that run before the model call.

**Who may change it.** The owner. **Source:** `factory/feature.md`.

---

## D-07 — Nothing found by research enters this run

**Decided.** Every idea in section 2 of `03-market.md` waits. None of them is added to run 1, and
none of them is ranked above a backbone feature.

**Why.** `factory/feature.md` states the rule: "Anything not on this list is a proposal, not a
priority... A good idea does not become high priority by being a good idea." Scope growth on a
one-developer part-time project is the most likely way it never finishes.

**Rejected.** Adding a small competitor feature because it looked cheap. Nothing is cheap on this
budget of attention.

**Who may change it.** The owner, by picking an idea up in a later run.
**Source:** `factory/feature.md`.

---

## D-08 — The language list is the owner's, and he has now chosen

**Decided.** This role wrote down what it found — that the large plant-care apps do not ship
Hungarian — and did **not** turn that into a decision about which languages the product supports.
The owner then chose: **Hungarian and English in run 1**, decided 2026-08-24, written into
`factory/feature.md`.

**Why.** Naming a language is choosing scope, which is a human gate. The finding behind the choice is
real and worth keeping: of the apps checked on 2026-08-24, PictureThis and Planta both list their
supported languages and **neither lists Hungarian**, while Blossom, Plantix and Pl@ntNet do. Details
and sources are in `03-market.md`. `factory/feature.md` gives the same reason back: it is "the one
place the product is not a copy of something that already exists".

**Rejected.** Writing "the product is Hungarian-first" into the brief on this role's own authority.
That was the owner's call, and he made it.

**Consequence.** Open question O-8 in `00-context-brief.md` is closed. 200 Product plans the two
languages, and 300 Design and 500 Engineering need them before any text is fixed.
`initial-plan.md` adds one requirement on top: a plant's name must appear in the language the user is
reading, because the owner uses the Hungarian names.

**Who may change it.** The owner. **Source:** this role for the finding, `factory/feature.md` for the
decision.

---

## D-09 — The value hypothesis is measured against a baseline that must be recorded first

**Decided.** Before the feature is built, the owner writes down three real attempts at solving a sick
plant the way he does it today: what he searched for, how long it took, and whether it worked.

**Why.** Without a baseline, "the app helps" cannot be shown, only felt. Three attempts is a small
enough task to actually be done. `initial-plan.md` section 2 warns that "a process I cannot keep up
with is worse than a lighter one I can", so the measurement is deliberately tiny.

**Rejected.** Inventing a baseline such as "it takes 10 minutes today". Nobody measured it, and a
made-up number in a brief becomes a fact by the third document that quotes it.

**Consequence.** Open question O-2 in `00-context-brief.md`. It blocks nothing, but the run loses
its "before" picture if it is skipped.

**Who may change it.** The owner. **Source:** this role.

---

## D-10 — The model is not chosen here, but the cost of each choice is

**Decided.** 100 Consulting supplies the price table and stops. 400 Architecture picks the model.

**Why.** Choosing a model is an architecture decision with a technical side this role cannot judge —
how good each model is at reading a leaf. But it is also a money decision, and money decisions on
this project have to be visible before the choice, not after.

**Rejected.** Naming a model in the brief. It would look like a decision and would be copied
downstream without the reasoning.

**Consequence.** The table in `00-context-brief.md` section 4 shows the same assessment costing
$0.004, $0.008 or $0.020 depending on the model — a five times difference between the cheapest and
the most expensive. 400 Architecture records which it chose and why, with the option it rejected.

**Who may change it.** 400 Architecture, in an ADR. **Source:** this role.

---

## D-11 — Run 1 writes the care task and stops there

**Already decided by the owner.** The assessment creates a task. Nothing in run 1 schedules it,
sends it, or reminds anyone about it.

**Why.** `factory/feature.md` puts the watering-schedule engine and notification delivery out of
scope, and names them as the *consumers* of the task this run creates.

**Rejected.** Adding "just a small reminder" to run 1. It is the exact shape of scope growth the
feature file was written to stop.

**Consequence.** The task needs a written shape now, because a later run reads it. 500 Engineering
puts that shape in `packages/contracts`.

**Who may change it.** The owner. **Source:** `factory/feature.md`.

---

## D-12 — A photo is kept 180 days, and a lifecycle rule deletes it

**Already decided by the owner**, on 2026-08-24, after this role stopped and asked. It was the run's
one hard stop.

**Why.** `factory/feature.md`: GDPR "names no period for anything — it requires the owner to choose
one, justify it, and actually delete when it expires. This is that number." The **text** result of an
assessment is kept longer, so a plant's history survives without the images. A user can also delete
their own photos on demand.

**Rejected.** Deleting from application code. `factory/feature.md` is explicit: a storage lifecycle
rule does the deleting, "so the rule holds even when the app is broken".

**Consequence.** UC-5's Viability gate in `01-use-cases.md` passes. 400 Architecture designs the
storage against 180 days, and 900 Security checks it. One part is still missing: how long "longer" is
for the text. That is open question O-10.

**Who may change it.** The owner, and nobody below him. **Source:** `factory/feature.md`.

---

## Decisions this file did not make

Recorded so that a reader can tell the difference between "decided" and "nobody looked".

- ~~How long the **text** result of an assessment is kept.~~ **Answered 2026-08-24: no clock, it
  lives as long as the pot does.** The photo's 180 days is decided — see D-12.
- Which model is used, and how sign-in works. Belongs to 400 Architecture. Still open.
- ~~What the list of possible verdicts is.~~ **Answered: 200 Product wrote ten codes
  (`00-prd.md` 5.2), and the owner accepted them on 2026-08-25 with a review after the first 20 real
  assessments.**
- ~~Whether the EU AI Act applies to this project.~~ **Answered for run 1 on 2026-08-25: show the
  notice, take no legal advice.** Whether the Act applies is still not judged, on purpose — it
  changes nothing while the app has one user. **This re-opens the day the app is offered to another
  person.**
- Whether any idea in `03-market.md` is ever built. Belongs to the owner. **W-4, the second-opinion
  service, was rejected outright on 2026-08-25 and may not be proposed again.** The rest are still
  open.
