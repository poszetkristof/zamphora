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
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
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

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>zamphora — design preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
  * { box-sizing: border-box; }
  html { background: #0B2119; }
  body { margin: 0; padding: 40px 20px 80px; color: #DDEADF;
         font-family: 'IBM Plex Sans','Segoe UI',system-ui,sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: #FFC94A; }
  h1 { font-family: 'EB Garamond', Georgia, serif; font-size: 40px; font-weight: 500;
       letter-spacing: -0.02em; color: #F3FAF2; margin: 0 0 6px; }
  h2 { font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 13px; font-weight: 500;
       letter-spacing: 0.1em; text-transform: uppercase; color: #FFC94A; margin: 0 0 20px;
       padding-bottom: 10px; border-bottom: 1px solid #2E7C5A; }
  .lede { max-width: 64ch; line-height: 1.55; color: #BCD6C6; margin: 0 0 48px; }
  section { margin-bottom: 72px; }
  .grid { display: flex; flex-wrap: wrap; gap: 40px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 10px; }
  figcaption { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #BCD6C6; }
  .frame { border: 1px solid #2E7C5A; overflow: hidden; max-width: 100%; }
  .notes { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 44px; }
  .note { border-left: 2px solid #FFC94A; padding-left: 14px; white-space: pre-line;
          font-size: 13px; line-height: 1.6; color: #BCD6C6; max-width: 34ch; }
</style>
</head>
<body>
<h1>zamphora — design preview</h1>
<p class="lede"><strong>This page is generated, and it is a record rather than a contract.</strong>
What roles build from lives in <code>factory/feature.md</code> under "The visual identity", and in
each run's <code>docs/300-design/&lt;slug&gt;/03-tokens.md</code>. Where this page and those files
disagree, those files win. Rebuild with
<code>node scripts/build-design-preview.mjs</code>. Newest run first.</p>

${runs.map(section).join("\n\n")}
</body>
</html>
`

writeFileSync(OUT, html)
const total = runs.reduce((n, r) => n + r.boards.length, 0)
console.log(`docs/design-preview.html — ${runs.length} run(s), ${total} screens`)
