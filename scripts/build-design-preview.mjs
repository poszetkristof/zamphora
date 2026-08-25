#!/usr/bin/env node
// Builds ONE page showing the approved design of every run that has one, newest first.
//
//   node scripts/build-design-preview.mjs
//
// It reads every factory/runs/<slug>/design-reference/ folder. A run with no such folder is
// skipped, so this keeps working whether one run has a mockup or six do.
//
// The output is DERIVED. Edit the .dc.html artboards, then re-run this — never edit the page.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { ROOT, tokenCss } from "./design-tokens.mjs"

const RUNS = join(ROOT, "factory/runs")
const OUT = join(ROOT, "docs/design-preview.html")

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// A .dc.html is a <helmet> block of styles plus markup. Neither needs the canvas runtime.
function parseBoard(dir, file) {
  const src = readFileSync(join(dir, file), "utf8")
  const body = src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/)?.[1].trim()
  if (!body) throw new Error(`${file}: no markup between </helmet> and </x-dc>`)
  return body
}

const runs = []
for (const slug of readdirSync(RUNS).sort().reverse()) {
  const dir = join(RUNS, slug, "design-reference")
  if (!existsSync(join(dir, "canvas.json"))) continue
  const canvas = JSON.parse(readFileSync(join(dir, "canvas.json"), "utf8"))
  runs.push({
    slug,
    boards: canvas.artboards.map((a) => ({ ...a, body: parseBoard(dir, a.file) })),
    notes: (canvas.annotations ?? []).map((n) => n.text),
  })
}
if (runs.length === 0) {
  console.error("no run has a design-reference/ folder — nothing to build")
  process.exit(1)
}

const section = (r) => `<section>
  <h2>${esc(r.slug)}</h2>
  <div class="grid">
${r.boards
  .map(
    (b) => `    <figure>
      <figcaption>${esc(b.title ?? b.file)}</figcaption>
      <div class="frame" style="width:${b.w}px; height:${b.h}px;">${b.body}</div>
    </figure>`,
  )
  .join("\n")}
  </div>
  <div class="notes">
${r.notes.map((n) => `    <div class="note">${esc(n)}</div>`).join("\n")}
  </div>
</section>`

// This page carries the tokens ONCE, for itself and for every artboard pasted into it. The chrome
// around the mockups uses them too, so the page cannot drift from the design it is showing.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>zamphora — design preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
${tokenCss().css}

  * { box-sizing: border-box; }
  html { background: var(--color-well); }
  body { margin: 0; padding: 40px 20px 80px; color: var(--color-body);
         font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
  a { color: var(--color-accent); }
  h1 { font-family: var(--font-display); font-size: 40px; font-weight: 500;
       letter-spacing: -0.02em; color: var(--color-verdict); margin: 0 0 6px; }
  h2 { font-family: var(--font-body); font-size: var(--text-caption); font-weight: 500;
       letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-accent);
       margin: 0 0 20px; padding-bottom: 10px;
       border-bottom: var(--border-hairline) solid var(--color-line); }
  .lede { max-width: 64ch; line-height: 1.55; color: var(--color-muted); margin: 0 0 48px; }
  section { margin-bottom: 72px; }
  .grid { display: flex; flex-wrap: wrap; gap: 40px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 10px; }
  figcaption { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
               color: var(--color-muted); }
  .frame { border: var(--border-hairline) solid var(--color-line); overflow: hidden; max-width: 100%; }
  .notes { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 44px; }
  .note { border-left: var(--border-rule) solid var(--color-accent); padding-left: 14px;
          white-space: pre-line; font-size: var(--text-caption); line-height: 1.6;
          color: var(--color-muted); max-width: 34ch; }
</style>
</head>
<body>
<h1>zamphora — design preview</h1>
<p class="lede"><strong>This page is generated, and it is a record rather than a contract.</strong>
What roles build from lives in <code>factory/feature.md</code> under "The visual identity", and in
<code>docs/300-design/03-tokens.md</code>. Where this page and those files disagree, those files
win. Rebuild with <code>node scripts/build-design-preview.mjs</code>. Newest run first.</p>

${runs.map(section).join("\n\n")}
</body>
</html>
`

writeFileSync(OUT, html)
const total = runs.reduce((n, r) => n + r.boards.length, 0)
console.log(`docs/design-preview.html — ${runs.length} run(s), ${total} screens`)
