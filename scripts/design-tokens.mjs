// docs/300-design/03-tokens.md is the one source of the design values. This turns it into CSS.
// Everything that needs them imports tokenCss(); nothing else parses the markdown.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SOURCE = join(ROOT, "docs/300-design/03-tokens.md")

// A font row names one family. The fallback stack cannot be written in a markdown table.
const STACKS = {
  "--font-display": "'Fraunces', Georgia, serif",
  "--font-body": "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
}

// Token rows look like:  | `--name` | `value` | prose… |
export function tokenCss() {
  const rows = new Map()
  for (const line of readFileSync(SOURCE, "utf8").split("\n")) {
    const m = line.match(/^\|\s*`(--[a-z0-9-]+)`\s*\|([^|]+)\|/i)
    if (!m) continue
    const [, name, cell] = m
    const raw = (cell.match(/`([^`]+)`/)?.[1] ?? cell).trim()
    // a value that is itself a token name needs var(), or the declaration is silently dead
    const value = STACKS[name] ?? (raw.startsWith("--") ? `var(${raw})` : raw)
    if (value && !rows.has(name)) rows.set(name, value)
  }
  if (rows.size === 0) throw new Error(`no token rows found in ${SOURCE}`)

  const css = [
    "/* Generated from docs/300-design/03-tokens.md. Do not edit by hand. */",
    ":root {",
    ...[...rows].map(([n, v]) => `  ${n}: ${v};`),
    "}",
  ].join("\n")
  return { css, names: new Set(rows.keys()) }
}
