# ADR-0011 — Build the components on Base UI

- **Status:** **Accepted 2026-08-26 by the owner**, with one addition: components arrive through
  **shadcn/ui**, which uses Base UI underneath
- **Date:** 2026-08-25. Accepted 2026-08-26

## Context

`factory/feature.md` is explicit about who decides: *"Which component library the web app builds on
— 400 Architecture proposes, **the owner accepts** — a library is a new dependency."* So this record
is a proposal with the work already done, not a decision.

**The shape is not in question.** Headless primitives, Tailwind `@theme` tokens, and component code
owned in this repository. That is what `.claude/skills/` already assumes and it holds up. Only which
primitive is open.

The research in `factory/feature.md`, checked 2026-08-25:

| | Base UI | Radix | React Aria |
| --- | --- | --- | --- |
| Newest commit | 2026-08-25 | 2026-07-31 | 2026-08-24 |
| Commit authors, 90 days | 6 people | **95 of the last 100 by one person** | 6+ Adobe engineers |
| Who funds it | MUI, a company. 7 named maintainers | WorkOS. No funding or roadmap statement | Adobe |
| Hungarian strings | none | none | **`hu-HU` ships, 37 locales** |
| One menu, gzipped | about Radix + 10 KB | the baseline | **about 50 KB** |
| Restyling to a fixed identity | easiest. No CSS bundled, `className` takes a function of state | nearly as good | needs a Tailwind plugin for its `data-` attributes |

Four things the input says this record must not skip, and each is answered below: Radix is not
deprecated; shadcn changed shape in July 2026 and Base UI is now its default; React Aria has the
stronger accessibility claim and ships Hungarian, so **the record must say which way it weighed
accessibility against bundle size**; and no library ships WCAG 2.2 AA, because every rule in
"Accessibility that is not open to judgement" lives in the styling layer, which is this project's
own in every option.

**One fact from this project that changes the weighing, and it comes from counting the design spec.**
`02-SPEC.md` §3 lists nineteen components. Going through them one by one against what a primitive
library actually gives you:

| Needs a primitive | Native HTML is enough |
| --- | --- |
| `ConfirmSheet` — focus trap, focus return, escape, scrim click, scroll lock | `PrimaryButton`, `QuietButton`, `DangerButton` — `<button>` |
| | `PotPicker` — a group of `<input type="radio">` |
| | `VerdictGroup` — `role="group"` with `aria-labelledby` |
| | `StepList`, `WorkingIndicator` — `aria-live` |
| | `FailureNote` — `role="alert"` |
| | `AppFrame`, `ScreenHeading`, `PhotoAdder`, `PhotoWell`, `PhotoPreview`, `BandMark`, `NextActionCard`, `UnsureBand`, `RetakeAdviceList`, `ReasonLine`, `NoticeLines`, `RetentionNote`, `LimitNote` — text and layout |

**Exactly one component in this whole feature needs a library.** That is the number the decision has
to be weighed against.

## Decision

**Base UI for the behaviour, delivered by shadcn/ui.** Component code stays in this repository,
styled with Tailwind against the tokens in `docs/300-design/03-tokens.md`.

### The three layers, because they are easy to confuse

| Layer | What it is | How it enters the repo |
| --- | --- | --- |
| **shadcn/ui** | A tool that **copies** a finished, styled component file into `apps/web`. Never a dependency | `pnpm dlx shadcn add dialog`, once per component |
| **Base UI** | The behaviour: focus traps, keyboard handling, screen-reader wiring. Ships no CSS | A real dependency, pulled in by the copied file |
| **Tailwind + our tokens** | What it looks like | Already decided in `03-tokens.md` |

**shadcn is not an alternative to Base UI.** Since July 2026, Base UI is what `shadcn init` uses for
a new project; Radix stays available behind a `-b radix` flag. So this is one choice, not two.

**Why shadcn is part of the decision and not a detail.** The owner's requirement, 2026-08-26: keep
hand-written CSS to a minimum and have components that are laid out well from the start. Base UI on
its own does not do that — it ships no styles, so nineteen components in `02-SPEC.md` would each
need their Tailwind written by hand, every state, every size. shadcn hands over those files already
written. The remaining work is re-theming to Botanical by changing token values, which is much less
work than writing components.

**What that costs, stated plainly.** Base UI is at `1.0.0-rc.0` — a release candidate, so its API can
still move before a final 1.0. And shadcn's files arrive in shadcn's own look, which is a long way
from Botanical. The edit pass below is therefore not optional, and it is bigger than it sounds.

**Which way accessibility was weighed against bundle size, said plainly.**

React Aria has the stronger accessibility claim, and it would be the defensible answer if
accessibility outranked size. Here it does not win, for a reason specific to this feature rather
than a general preference for smaller things:

**React Aria's Hungarian is Hungarian for its own built-in strings** — a date picker's month names, a
table's sort announcements, a slider's value text. Run 1 has none of those. Every user-visible string
in `02-SPEC.md` is ours and lives in our own message files, including the band labels, the ten
verdict sentences, the four reason lines, the four pieces of retake advice and every failure message
in §6. So React Aria's clearest advantage over Base UI is worth close to nothing **in run 1**.

And the accessibility rules that actually decide whether this product is usable are not in any
library. Base UI's own page says *"it's the developer's responsibility to visually indicate focus"*.
Every line in `02-SPEC.md` §8 — the focus ring at 2 px and 3:1, the 44 px targets and 24 px gaps,
`lang` on each text block, the photo's real alternative text, the verdict and its band announced as
one group, motion respecting `prefers-reduced-motion` — is ours to write in every option. The
library is not what makes this accessible.

**The trigger to re-open this record, written now so it is not a matter of remembering.** Re-open it
and weigh React Aria again the moment a component with built-in strings enters the product. Run 2
adds watering and soil intervals, which almost certainly means a **date picker**. That is the single
component where React Aria's 37 locales stop being decorative.

**Why Base UI over Radix.** Not because Radix is deprecated — it is not, its downloads grew through
2026, and shadcn's own changelog says *"Radix is not being deprecated… we're not migrating"*. The
question is who will be fixing accessibility bugs in five years, and 95 of the last 100 commits by
one person with no funding statement is a risk signal on a project whose whole value is that
somebody else maintains the hard parts. Base UI is funded by a company with 7 named maintainers, and
shadcn made it the default for new projects in July 2026, which is where the largest pool of
ready-made editable component code will land.

**Why Base UI over writing the one dialog by hand.** This was the closest call, because the count
above says one component. It lost on the trigger, not on run 1: run 2 needs a date picker and run 6
needs a menu, and a hand-written focus trap that is nearly right is the kind of thing that is wrong
in a way nobody notices for a year.

### The condition this proposal carries

**The edit pass belongs in the first web task, not "later".** Reading shadcn's live registry rather
than its documentation shows its button ships `h-9` for default, `h-8` for small and `size-9` for
icon — **nothing reaches the 44×44 this project requires**. Its focus ring is 50% opacity, which will
probably miss 3:1 on `#14513A`. It uses `transition-all` with no reduced-motion guard, and
`rounded-md` everywhere against the round-button rule. That is not an argument against shadcn, which
exists to be edited. It means the edit is task one, or the accessibility rules are broken on day one.

**And the size figures are not a measurement.** They are the projects' own published numbers.
`factory/feature.md` asks for one real screen to be built and measured before committing, and NFR-50
holds a placeholder of 170 KB that is explicitly a guess. **Build SC-1, measure it, and write the
real number into NFR-50 before this record is accepted.**

## Consequences

**What this buys.** One dependency instead of nineteen hand-written components, with the hard parts
of the one hard component owned by somebody who does this full time. The largest pool of editable
starting code. No bundled CSS to fight, which matters because the Botanical identity overrides
nearly every default.

**What it costs.** A new dependency on a project with zero budget and one part-time developer, added
for one component in run 1. A styling API to learn. And the edit pass above, which is real work
before the first screen is right.

**What it does not buy.** WCAG 2.2 AA. No library ships it, and every rule in `02-SPEC.md` §8 is
still ours.

**Two gaps left open on purpose**, carried from `factory/feature.md`: no conformance report (VPAT or
ACR) was found for any of the three, which is **unknown, not absent**; and the size figures are
published claims, not measurements.

## Alternatives considered

**React Aria.** The stronger accessibility claim, Adobe behind it, `hu-HU` in 37 locales, at roughly
50 KB for one menu and needing a Tailwind plugin for its `data-` attributes. Set aside for run 1
because its Hungarian advantage covers strings this feature does not have. **Named as the answer to
re-open at the first component with built-in strings.**

**Radix.** Nearly as good to restyle and the current baseline for size. Set aside on the maintenance
signal — one author, no funding statement, newest commit 2026-07-31 — not on quality and not on
deprecation.

**No library. Write all nineteen by hand.** The honest runner-up, and it wins on run 1 alone by the
count above. It loses on run 2 and run 6, and a hand-written focus trap is a thing that is quietly
wrong for a year.

**A full component kit with its own styling — MUI, Chakra, Mantine.** Rejected. The identity in
`factory/feature.md` is deliberately unlike anything a kit ships, and fighting a kit's own CSS is
more work than starting from nothing. The MUST NOT list in `01-CONTEXT.md` §3.3 is a list of exactly
the defaults a kit would bring.

## Agent-Readable Summary

> Components come from **shadcn/ui**, which uses **Base UI** underneath. Copy each component into
> `apps/web` with the shadcn CLI, then style it with Tailwind against the tokens in
> `docs/300-design/03-tokens.md`. Do not add shadcn itself as a dependency — it copies files, it is
> not installed. Do not add React Aria or Radix, and do not run `shadcn init` with `-b radix`. Do not ship any component copied from a registry without the edit
> pass first — raise every tap target to 44×44, replace the 50%-opacity focus ring with one that
> meets 3:1, guard every transition behind `prefers-reduced-motion`, and replace `rounded-md` with
> `--radius-card` or `--radius-pill`. Do not write a hex value in a component; token names only. Do
> not treat any published bundle-size figure as measured — build SC-1, measure it, and put the real
> number in NFR-50.
