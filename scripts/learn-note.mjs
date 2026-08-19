#!/usr/bin/env node
// Prints the AI-native learning note and its sections, so /learn can pick one.
// The note lives in this repo. A missing file means someone moved or deleted it.

import { existsSync, readFileSync } from "node:fs"

const NOTE = "ai-native-learn/ai-native-delivery.md"

if (!existsSync(NOTE)) {
  console.log(`NOT FOUND at ${NOTE}`)
  console.log("Ask the user where the note moved to. Do not create a copy.")
  process.exit(0)
}

const text = readFileSync(NOTE, "utf8")
const lines = text.split("\n")

console.log(`${NOTE}  (${lines.length} lines)`)
console.log("")
console.log("Sections — add to one of these, never to a new file:")

for (const line of lines) {
  if (line.startsWith("## ")) console.log(`  ${line.slice(3)}`)
}
