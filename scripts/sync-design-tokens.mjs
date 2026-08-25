#!/usr/bin/env node
// Writes docs/300-design/tokens.css, then copies it into every design-reference artboard.
//
//   node scripts/sync-design-tokens.mjs
//
// The design canvas cannot resolve a stylesheet by name inside a .dc.html, so an artboard has to
// carry the values. It carries a copy of tokens.css between two markers, never its own hex values.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { ROOT, tokenCss } from "./design-tokens.mjs"

const OUT = join(ROOT, "docs/300-design/tokens.css")
const RUNS = join(ROOT, "factory/runs")
const OPEN = "/* tokens:start — a copy of docs/300-design/tokens.css. Do not edit. */"
const CLOSE = "/* tokens:end */"
const MARKED = /\/\* tokens:start[\s\S]*?tokens:end \*\//

const { css, names } = tokenCss()
writeFileSync(OUT, css + "\n")

// the marker already says where this came from, so drop the generated header line
const block = [OPEN, css.split("\n").slice(1).join("\n"), CLOSE].join("\n")

let files = 0
const missing = new Set()

for (const slug of readdirSync(RUNS)) {
  const dir = join(RUNS, slug, "design-reference")
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".dc.html"))) {
    const path = join(dir, name)
    let s = readFileSync(path, "utf8")

    for (const m of s.matchAll(/var\((--[a-z0-9-]+)\)/gi)) {
      if (!names.has(m[1])) missing.add(`${name}: ${m[1]}`)
    }

    s = MARKED.test(s) ? s.replace(MARKED, block) : s.replace("<style>", `<style>\n${block}`)
    writeFileSync(path, s)
    files += 1
  }
}

if (missing.size > 0) {
  console.error("These artboards use tokens that 03-tokens.md does not define:")
  for (const m of missing) console.error("  " + m)
  process.exit(1)
}

console.log(`docs/300-design/tokens.css — ${names.size} tokens, copied into ${files} artboard(s)`)
