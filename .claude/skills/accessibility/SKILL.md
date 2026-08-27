---
name: accessibility
description: Accessibility rules for this repo — semantic HTML first, Base UI owns focus and keyboard behaviour, forms and lists have specific requirements, touch targets are a real constraint. Load when writing or reviewing JSX, forms, dialogs, lists or ARIA.
---

# Accessibility

Target: WCAG 2.2 AA. **Base UI** does the hard parts. The failures that remain are ours.

**Components come from shadcn/ui, which uses Base UI underneath** (ADR-0011, accepted 2026-08-26).
shadcn copies a styled file into `apps/web`; Base UI is the dependency inside it. **Every copied
component needs an edit pass before it ships** — shadcn's defaults miss three rules on this list:
tap targets arrive at 32 to 36 px instead of 44, the focus ring is 50% opacity instead of 3:1, and
transitions have no `prefers-reduced-motion` guard.

Automated checks catch about a third of real problems. Before calling a component accessible, tab
through it: can you reach everything, tell where you are, and get out of the dialog?

**An accessibility fix must not change the visuals**, unless the visuals are the defect (contrast,
focus ring). If your fix moves things on screen, that is a design change and needs sign-off.

## Mobile first is an accessibility rule here

- **Touch targets are at least 44×44 px here, with 24 px between them** — `--target-min` and
  `--target-gap`. **Cite the project rule, not WCAG**, because WCAG 2.2 **AA** only asks for
  **24×24** (SC 2.5.8); 44×44 is SC 2.5.5, which is **AAA**. This project is stricter on purpose, so
  a 32 px button passes AA and still fails here. (2.5.8 also has a spacing exception: an undersized
  target passes if a 24 px circle centred on it does not touch another target's circle. The 24 px
  gap is what satisfies it.)
- Nothing depends on hover. A hover-only tooltip does not exist on a phone.
- Works at 320px wide and at 200% zoom, with no sideways scrolling — **SC 1.4.10 Reflow (AA)**.
- Primary actions sit in the lower half of the screen, where a thumb reaches.
- **SC 2.4.11 Focus Not Obscured (AA), and this design guarantees the condition that breaks it.**
  A focused element must not be *entirely* hidden by author content — and a **fixed bottom button**
  is the classic cause. SC-1 has exactly that. When a person tabs down the page, the focused field
  can scroll under the fixed bar and vanish. The fix is `scroll-padding-bottom` on the scroll
  container, sized to the bar. **axe cannot see this**; you find it by tabbing to the last field.

## Do not rebuild what Base UI gives you

Focus trapping, roving tabindex, `aria-expanded`, `Escape`, portal focus return, listbox typeahead —
all handled. Hand-written focus traps are where accessibility bugs come from. If a Base UI primitive
lacks a prop you need, **edit the generated component in `components/ui/`** — we own that code.

## Semantic HTML first

A `<div>` with a click handler is a defect.

- `<button>` for an action, `<a href>` for navigation. Never swap them.
- Anything clickable must be focusable and work with Enter and Space. A native element gives that
  free; a div gives three bugs.
- One `<main>` and one `<h1>` per page. Heading levels never skip. Lists of things are lists.

## Names

Every interactive element needs an accessible name. Icon-only controls get `aria-label`, and the
icon itself gets `aria-hidden="true"`. Decorative images get an empty `alt`. Never use `title` as
the name.

**A user's plant photo needs real alt text**: the plant's name and why it is shown — "Monstera,
photo from 3 May, showing yellowing leaves" — not "plant photo".

## Forms

- Every input has a `<label>` with matching `htmlFor`/`id`. Generate ids with `useId()`.
- **Placeholder is not a label.** Ever.
- Errors are wired with `aria-describedby` and announced (`role="alert"`). Invalid fields get
  `aria-invalid="true"`.
- **Do not disable submit on invalid state.** A disabled button cannot be reached and explains
  nothing. Let submit validate and move focus to the first error.
- Use the right `inputMode` and `autoComplete`. A phone keyboard showing the wrong keys is an
  accessibility problem.

## The camera flow — highest risk screen

- The capture control is a real `<button>` with a name, not a styled unlabelled file input.
- There is always a non-camera path: choose an existing photo.
- Capture, upload and assessment are three announced states, not one silent spinner.
- The result is text first. A colour-coded badge with no words is not a result.

## Dialogs

Base UI handles the trap, `Escape` and focus return. Still yours: a real title wired as the accessible
name, a button trigger so focus has somewhere to return, and **no stacked dialogs** — if you need a
second one the flow is wrong. On a phone a full-screen sheet is usually right, and it still needs
the dialog role.

## Focus, colour, motion, language

- Focus is always visible — **SC 2.4.7 Focus Visible (AA)**. **Never `outline: none`** without an
  equally visible replacement. Use `focus-visible:`, and the ring needs **3:1** contrast, which comes
  from **SC 1.4.11 Non-text Contrast (AA)**. The 2 px thickness in `--focus-ring-width` comes from
  **SC 2.4.13 Focus Appearance**, which is **AAA** — so cite 1.4.11 for the contrast and the project
  token for the thickness.
- Focus order follows visual order. No positive `tabIndex`, ever.
- Colour is never the only carrier of meaning. Text contrast 4.5:1, 3:1 for large text, borders and
  rings 3:1. Check light **and** dark — a token can pass in one and fail in the other.
- Announce async results that appear without a page change (`aria-live="polite"`), and urgent ones
  with `role="alert"`. Never put a live region on something that updates constantly.
- Respect `prefers-reduced-motion`.
- Set `lang` on `<html>` from the active locale, and again on any element in another language — a
  botanical name inside an English sentence is the common case.
- On every client-side navigation: update the document title and move focus to the `<h1>`.

## Reviewing

Only flag a real violation, and name the WCAG criterion or the axe rule. "Could be more accessible"
is not a finding. If the problem is in a `components/ui/` primitive, the fix is to edit that
primitive.
