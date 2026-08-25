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

## The next step, after 300 Design runs

Right now these files carry raw values — `#14513A`, `padding: 26px`, `font-size: 44px`. 300 Design
will turn those into named tokens in `docs/300-design/001-photo-assessment/03-tokens.md`.

**When it does, change these files to use the token names instead of the raw values**, and have the
preview page load the same token file. Then the mockup consumes the tokens rather than repeating
them, and the two cannot drift — changing a token changes the mockup. That is the only version of
"kept up to date" that does not depend on somebody remembering.

Until then, they are a snapshot, and the snapshot is honest about being one.

## About the `.dc.html` files

They are artboards for the Claude Design canvas and do not open on their own — they carry a
`<helmet>` block and a `support.js` reference the canvas supplies. The build script strips both. The
markup inside is ordinary HTML with inline styles, so exact values — spacing, type sizes, radii —
can be read straight out of them.
