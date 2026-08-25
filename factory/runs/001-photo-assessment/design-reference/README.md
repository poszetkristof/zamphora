# Design reference — the mockup the owner approved

**Approved 2026-08-25**, before 300 Design ran. Five screens: the three confidence bands at phone
size, plus tablet and desktop. The Hungarian copy is real, so the long-word constraint is visible.

Live canvas: <https://claude.ai/code/artifact/82b28bdb-30e0-4624-854c-3c4f95140f64>

## The three rules

1. **This is a reference, not a contract.** The values a role builds from live in
   `factory/feature.md` under "The visual identity". Where the two disagree, that file wins.
2. **After editing any `.dc.html` here, run one command:**
   ```bash
   node scripts/build-design-preview.mjs
   ```
   That rewrites `docs/design-preview.html`, which is the page a person opens. It covers every run
   that has a `design-reference/` folder, so run 2 appears there by existing, with no setup.
3. **The claude.ai link does not follow this folder.** It is a copy that was uploaded when it was
   published. Changing a file here does not change it — someone has to publish again from a session
   that can. `docs/design-preview.html` is the copy that tracks the repo.

## For a later feature

Copy this folder to the new run, replace the artboards, rebuild. Nothing else moves. A run without a
`design-reference/` folder is simply skipped.

## The mockups run on the real tokens

**Done 2026-08-25, once 300 Design produced `docs/300-design/03-tokens.md`.** The artboards no
longer carry hex values. They use `var(--color-ground)`, `var(--text-verdict)` and so on.

There is **one** place that turns the markdown table into CSS: `scripts/design-tokens.mjs`. It
writes `docs/300-design/tokens.css`, and that file is the only CSS copy of the palette. Everything
else takes it:

- `docs/design-preview.html` carries it once, in its own `<head>`. The page chrome around the
  mockups uses the same tokens, so the page cannot drift from the design it shows.
- Each `.dc.html` carries a **copy** between `tokens:start` and `tokens:end`. This one is a copy and
  not an import because the design canvas cannot resolve a stylesheet by name inside an artboard. A
  `<link>` there fails without an error.

**So the mockup cannot disagree with the spec any more.** Change a value in `03-tokens.md`, run the
two commands, and every screen changes.

Two commands, in this order:

```bash
node scripts/sync-design-tokens.mjs     # 03-tokens.md -> tokens.css -> every artboard
node scripts/build-design-preview.mjs   # artboards    -> docs/design-preview.html
```

The sync **fails loudly** if an artboard uses a token the file does not define, so a typo cannot
pass quietly. Never edit inside the `tokens:start` block, and never edit `tokens.css` — both are
overwritten.

One value is deliberately not a token: `#0A2318` in `CannotTell.dc.html` is a marked placeholder
standing in for a photo too dark to judge. It is picture content, not a design colour.

## About the `.dc.html` files

They are artboards for the Claude Design canvas and do not open on their own — they carry a
`<helmet>` block and a `support.js` reference the canvas supplies. The build script strips both. The
markup inside is ordinary HTML with inline styles, so exact values — spacing, type sizes, radii —
can be read straight out of them.
