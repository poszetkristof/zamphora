# Design tokens

**Written by** 300 Design, run 1 (`001-photo-assessment`). **Date:** 2026-08-25.
**Read next by** 500 Engineering, 600 QA.

This file is **flat on purpose**. It sits at `docs/300-design/03-tokens.md` and not inside a feature
folder, because tokens belong to the whole product. Run 1 writes it. Every later run reads it and
only adds to it.

A token is a name for a value. The name goes in a component; the value stays here. That is why
`02-SPEC.md` may never contain a hex number. If a component needs a value that has no name here, the
answer is to add a token, not to write the number.

**The direction is called Botanical and it was decided by the owner**, not by this role. It is in
`factory/feature.md` under "The visual identity", with the reasons and the two rejected attempts.
This file turns that decision into names.

---

## 1. Colour

**A green page, never a white one.** Every value below comes from the owner's palette in
`factory/feature.md`. No value was added, removed or adjusted here.

### 1.1 Surfaces

| Token | Value | Where it is used |
| --- | --- | --- |
| `--color-ground` | `#14513A` | The page. Never white, never near-white |
| `--color-well` | `#0B3526` | The dip a photo sits in, so the photo reads as its own plane |
| `--color-raised` | `#1B6446` | The `unsure` band, and the selected row at desktop width |
| `--color-line` | `#2E7C5A` | Dividers only. **Never a text colour** |

### 1.2 Text and action

The two contrast columns are measured in sRGB against WCAG 2.2. Both numbers matter, because the
same text colour is used on the page and on the raised surface.

| Token | Value | Where it is used | On `--color-ground` | On `--color-raised` |
| --- | --- | --- | --- | --- |
| `--color-verdict` | `#F3FAF2` | The verdict, headings, icons | 8.72:1 AAA | 6.68:1 AA |
| `--color-body` | `#DDEADF` | Body text | 7.46:1 AAA | 5.72:1 AA |
| `--color-muted` | `#BCD6C6` | Secondary text, captions, the AI notice | 5.98:1 AA | 4.59:1 AA |
| `--color-accent` | `#FFC94A` | Warm yellow. **The one action colour** | 6.04:1 AA | 4.63:1 AA |
| `--color-on-accent` | `#0B2E20` | Text on the yellow button. 9.61:1 AAA against the yellow | — | — |
| `--color-warn` | `#FFC2B0` | The `unsure` marker, its rule and its label | **6.00:1** | **4.60:1** |

**Two rules that keep this table true.**

- **`--color-warn` has no size rule any more, and that is deliberate.** It used to be limited to
  `--text-heading` size or larger, because the first value `#FF9478` measured only 3.3:1 on the
  raised surface — enough for large text, not enough for normal text, which needs 4.5:1. **Gate 23
  fixed it in the colour instead of in a rule** (owner, 2026-08-25): `#FFC2B0` measures 6.00:1 on the
  ground and 4.60:1 on the raised surface, so it passes AA at any text size. There is no rule left to
  forget. `02-SPEC.md` §3.7 and §3.12 say the same.
- **Every new colour is measured against both `--color-ground` and `--color-raised` before it is
  added.** One number is not enough. Two proposed values were caught this way and replaced before
  the palette was approved.

### 1.3 The three confidence bands

They must be different **without colour**, because colour alone fails for a colour-blind reader and
in bright light. Each band has a shape as well as a colour.

| Band | Colour tokens | The shape that carries it without colour |
| --- | --- | --- |
| `likely` | `--color-verdict` on `--color-ground` | A filled dot before the label |
| `unsure` | `--color-warn` on `--color-raised` | A 2 px rule above the band, and a warning triangle |
| `cannot-tell` | `--color-muted` only. **No accent anywhere** | No verdict at all. The label is the only heading |

If any band treatment changes, keep the property: colour is never the only signal.

### 1.4 Focus

| Token | Value | Notes |
| --- | --- | --- |
| `--focus-ring-color` | `var(--color-accent)` | 6.04:1 against the page, so it passes the 3:1 rule for a focus indicator |
| `--focus-ring-on-accent` | `var(--color-verdict)` | Used when the focused element is itself the yellow button. 8.72:1 against the page |
| `--focus-ring-width` | `2px` | The minimum in the owner's accessibility table |
| `--focus-ring-offset` | `2px` | The gap is the page colour, so the ring is measured against the page |

The ring sits **outside** the element. That is why both ring colours are measured against the page
and not against the thing they surround.

## 2. Type

**A serif for the verdict, a grotesque for everything else.** The verdict is the product, so it gets
its own voice. The pairing is also what keeps the screen from looking generated, because a single
neutral sans is the default of every machine-made interface.

| Token | Family | Why |
| --- | --- | --- |
| `--font-display` | `Fraunces`, then any serif | A serif with real character and a weight range wide enough for a 44 px verdict. Chosen by this role under `factory/feature.md`, which says 300 Design names the two and the owner may replace either |
| `--font-body` | `IBM Plex Sans`, then any sans-serif | A plain grotesque for labels, buttons and numbers. It is not Inter and not Roboto, which the owner ruled out |

**Check before shipping, and do not assume it:** both families must draw the Hungarian letters `ő`
and `ű` correctly. A font that falls back for those two letters will look broken in half the
product. Subset both families to the Latin range plus Latin Extended-A.

### 2.1 The scale

**Real jumps, not 14 / 16 / 18.** The owner's scale is 13 / 17 / 28 / 44.

| Token | Size | Line height | Family | Where |
| --- | --- | --- | --- | --- |
| `--text-caption` | `13px` | `1.4` | `--font-body` | The AI notice, the retention lines, timestamps |
| `--text-body` | `17px` | `1.5` | `--font-body` | Body text, buttons, labels, form text |
| `--text-heading` | `28px` | `1.25` | `--font-display` | Screen headings, the `unsure` label, the `cannot-tell` label |
| `--text-verdict` | `44px` | `1.1` | `--font-display` | The verdict, and nothing else |

| Token | Value |
| --- | --- |
| `--weight-regular` | `400` |
| `--weight-medium` | `500` |
| `--weight-bold` | `700` |

**A rule that comes from Hungarian.** Every label and every button must stay readable at **30
characters** without the layout breaking. Test with the Hungarian string, never the English one.
`--text-verdict` at 44 px is where this breaks first, so a verdict sentence wraps and is never cut
with an ellipsis.

## 3. Space

A 4 px step. Named by size so a component does not carry a number.

| Token | Value |
| --- | --- |
| `--space-3xs` | `4px` |
| `--space-2xs` | `8px` |
| `--space-xs` | `12px` |
| `--space-s` | `16px` |
| `--space-m` | `24px` |
| `--space-l` | `32px` |
| `--space-xl` | `48px` |
| `--space-2xl` | `64px` |

| Token | Value | Notes |
| --- | --- | --- |
| `--page-padding-inline` | `--space-s` | 16 px down each side of a phone screen |
| `--page-max-width` | `640px` | The content column stops growing here. Wider screens get margins, not longer lines |

## 4. Shape

**Not one radius everywhere.** A single value on every element is the clearest sign of a machine-made
screen.

| Token | Value | Where |
| --- | --- | --- |
| `--radius-card` | `2px` | Cards, the photo, the raised band, input fields |
| `--radius-pill` | `999px` | Buttons only. They are fully round |
| `--border-hairline` | `1px` | A divider, drawn in `--color-line` |
| `--border-rule` | `2px` | The rule above the `unsure` band, drawn in `--color-warn` |

### 4.1 Shadow

| Token | Value | Where |
| --- | --- | --- |
| `--shadow-sheet` | `0 -8px 24px rgb(0 0 0 / 0.35)` | **The confirm sheet, and nothing else** |

A shadow means "this floats above that". Exactly one element in this feature floats, so exactly one
token exists. Adding a second shadow needs a reason written next to it.

## 5. Touch and reach

| Token | Value | Notes |
| --- | --- | --- |
| `--target-min` | `44px` | The smallest tappable box. Never smaller, even if the icon inside is small |
| `--target-comfortable` | `56px` | The primary button, and anything used one-handed while standing |
| `--target-gap` | `24px` | The clear space between two tappable things |
| `--thumb-zone-bottom` | `--space-m` | The gap between the primary button and the bottom of the screen |

Nothing depends on hover. There is no hover on a phone.

## 6. Motion

| Token | Value | Where |
| --- | --- | --- |
| `--motion-fast` | `120ms` | A state change on one control |
| `--motion-slow` | `240ms` | The confirm sheet arriving or leaving |
| `--easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Every animation in the product |

**Motion happens only where something actually changed.** No fade-in on a page load, and no fade-in
on a list. Under `prefers-reduced-motion: reduce`, every duration above becomes `0ms` and the sheet
appears in place. There is no exception.

## 7. Layers

| Token | Value | Where |
| --- | --- | --- |
| `--z-sheet-scrim` | `100` | The dim layer behind the confirm sheet |
| `--z-sheet` | `110` | The confirm sheet |

## 8. Breakpoints

**The phone is the base.** These are the two widths where something is added, never where the design
starts.

| Token | Value | What changes |
| --- | --- | --- |
| `--bp-wide` | `600px` | The content column reaches `--page-max-width` and centres. The photo and the result sit side by side on the result screens |
| `--bp-desk` | `1024px` | A pot list can stand to the left of the flow. The selected row uses `--color-raised` |

Nothing new appears at a wider width. A wider screen only rearranges what the phone already has.

## 9. How to add a token

1. Check that no existing token means the same thing.
2. If it is a colour, measure it against **both** `--color-ground` and `--color-raised`, and write
   both numbers into section 1.
3. Add the row here first, then use the name in a component.
4. If it is a second shadow or a third radius, write the reason next to it. Both of those are rules
   the owner set, and a new value is a change to the rule.
