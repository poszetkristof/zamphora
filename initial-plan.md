# The brief

This is my own description of what I want to build and why. I wrote it before any of the specs
existed, and it is the only document written entirely by me. Everything in `docs/` is derived from
it.

Rewritten on 2026-08-19 for clarity. **The content did not change** — only the English and the
structure. Where this file lists options, `factory/feature.md` records which ones I have since
chosen, and `.claude/memory/decisions-made.md` explains why.

---

## 1. Why I am building this

My previous project is a full-stack application that works, but it is not a modern design. Three
things are wrong with it, and I do not want to repeat any of them:

- **The front end and the back end are tightly coupled.** Changing one forces a change in the other.
- **There are security weaknesses** that I would not want a reviewer to find.
- **It was not built mobile-first**, and retro-fitting that has been painful.

So I want to start again, and this time build the specifications before the code.

## 2. What I mean by "AI-native"

The specifications are written by AI agents, into files in git, before any application code exists.
Each stage of the work has an agent that owns it, and a document that agent must produce.

The stages I want covered:

| Stage | Why it matters to me |
| --- | --- |
| Consulting | write down what everyone assumes but nobody records |
| Product / BA | turn that into requirements someone could actually test |
| Design | screens and states, so the UI is not invented during coding |
| **Architecture** | **the most important one** — it decides the technology and everything downstream |
| Engineering | conventions, contracts, API and web specifications |
| Infrastructure | environments, deployment, cost limits, CI |
| Security | threats and fixes decided at design time, not after an incident |
| QA | a test plan that covers the AI parts too, not only the code |

A data role may also make sense, but I am not sure it earns its place on a project this size.

**Apply only the parts that carry their weight.** My time, my attention and my token budget are all
limited, and a process I cannot keep up with is worse than a lighter one I can.

The method comes from my own course notes in `C:\Learn\AI\ai-run-mission-2026` — the `learning/`
and `katas/` folders in particular.

## 3. The problem I actually have

I keep houseplants in an apartment and I am not good at it. My favourites are **Monstera**,
**Rhaphidophora** (the mini monstera), **Zamioculcas** (`legénypálma` in Hungarian) and a cactus.

What goes wrong is always one of these:

- I lose track of **when to water** each plant, and every plant is different.
- I forget **when the soil needs replacing**.
- I do not know **where to put a plant** so it gets the right amount of sun.
- When a plant starts to look unwell, **I cannot tell what is wrong or what to do about it**.

## 4. What the app should do

- **Remember the care schedule** for each plant: watering intervals, soil replacement, and anything
  else that repeats.
- **Advise on placement** — how much light a given plant needs, and where that is in a home.
- **Record how each plant is doing over time**, so I can see whether things are improving.
- **Assess a plant from a photo.** I take a picture with my phone, and an AI vision model tells me
  what it sees and what to do next. This is the feature I care most about.
- **Send a notification** when it is time to act on a plant.
- Support **more than one language**.

Two things apply to all of the above rather than being features of their own:

- **Mobile first.** I will use this standing in front of a plant, holding my phone.
- **A genuinely good-looking interface.** Not a prototype look.

The photo and chat data should be stored efficiently. I do not want to pay to keep things I do not
need.

## 5. Technology I know, or am willing to learn

This is what I can work with. I want the architecture stage to choose from it, not to be handed a
decision.

| | |
| --- | --- |
| Front end | React, Next.js, Vue |
| Back end | Node.js, Express, Zod |
| Also possible | **Nest.js** — I have no experience with it, but I am open to it |
| Cloud | AWS. I am new to it and have a **free plan for six months** |
| AI | Anthropic APIs by preference, but I would like the AI layer to be generic enough that another provider could be swapped in |

**I want two or three candidate architectures with their advantages and disadvantages**, not a
single recommendation. I would rather understand the trade-off than be told the answer.

There are already some notes on migrating the previous project to AWS. They contain free-tier
figures worth reusing.

## 6. Constraints

- **Cost.** The AWS free plan is the boundary. Where a service is expensive, use the smaller option
  instead. I would rather have a modest architecture that survives than a good one that gets
  switched off.
- **CI must be strong, and it must be free.** I work from a personal GitHub account.
- **Security matters**, and I want it designed in rather than reviewed in at the end.
- **Performance and Core Web Vitals matter**, mainly at the code level.
- **Room to grow.** If the project gets larger I may want to move towards micro-frontends or
  microservices, so I do not want a design that makes that impossible.
- **My own capacity.** One developer, part-time.

## 7. What a good outcome looks like

I want a project that makes an impression in an interview. Not because it has many features, but
because every decision in it was made deliberately and written down, with the option that was
rejected recorded next to it.

**It should read as though a senior full-stack developer built it.** That is the bar.
