---
name: coding-standards
description: TypeScript, React/Next.js and Nest.js conventions for this repo — const objects over enums, server vs client components, layer boundaries, comment style. Load before writing or reviewing any .ts or .tsx file.
---

# Coding standards

Full reference: `docs/500-engineering/00-conventions.md`. This is what comes up constantly.

## TypeScript

```ts
// Const object + derived union. Never a TypeScript enum.
export const CARE_TASKS = { WATER: "water", REPOT: "repot", FEED: "feed" } as const
export type CareTask = (typeof CARE_TASKS)[keyof typeof CARE_TASKS]
```

- Default to `type`. Use `interface X extends Y` to compose object types, and `interface` for
  declaration merging. Never `type A = B & C` for an object. Why: `00-conventions.md` §3.
- No `any` outside tests — use `unknown` and narrow.
- **Zod 4.** Custom messages use one parameter: `z.string({ error: "…" })`. `required_error`,
  `invalid_type_error` and `errorMap` are Zod 3, and Zod 4 **ignores them in silence** — the message
  becomes default English. Write `z.email()` and `z.iso.datetime()`, not the `z.string().…` forms.
- No `!` to silence the compiler. Handle the null, or write the invariant down.
- `??` not `||` — `||` swallows `0` and `""`.
- `import type` for type-only imports. Return types on exported functions.
- **No bare string literals** for route names, roles, task kinds, statuses or analytics labels.

## Functions

Guard clauses over nesting: return early, keep the happy path unindented. No boolean parameters —
take an options object or write two functions. `async` only when you `await`. Never leave a promise
floating. If a function needs a comment explaining its second half, that half is a function.

## React

**This app is a static export. There is no server at request time** (ADR-0010) — so the usual
"fetch on the server" advice does not apply here.

- **Server Component by default**, and remember what that means here: it renders **at build time**,
  into a file. It can hold layout and text. It cannot see the person, their session or their data.
- **Every value belonging to a person is fetched in the browser**, from `/api/*`, after the shell
  has painted (`02-web-spec.md` §4). A loading state is not optional — it is the first thing every
  screen shows.
- Add `"use client"` for state, effects, browser APIs or event handlers, and push it to the smallest
  leaf. A `"use client"` on a page pulls the whole tree into the bundle.
- One component per file, named after the file. Props are a `type` above the component. No
  `React.FC`.
- **`params` is a Promise — `await` it.** Next.js 16 removed the synchronous form, so
  `const { locale } = await params`.
- **React Compiler is stable and handles memoisation.** In new code, write it plainly and let the
  compiler do it; add `useMemo` or `useCallback` when you have a reason. Leave existing memoisation
  alone — removing it changes effect dependencies.
- `key` is a stable id, never the array index.
- More than two nested ternaries in JSX means a variable or an early return is missing.
- Custom hooks live beside the feature, named `use*`, and are tested directly.

## Nest

- One module per feature folder: `plants.module.ts`, `.controller.ts`, `.service.ts`,
  `.repository.ts`.
- The controller does HTTP only: parse, delegate, shape the response. No business rules.
- **A service never sees `Request` or `Response`.** If it needs the caller, take the id as an
  argument.
- Only repositories touch the data client. A service importing the SDK is a defect.
- Validation happens in a pipe built from the shared Zod schema, never hand-written in a handler.
- Providers are injected through the constructor. No static singletons.

## Layer boundaries

**Web:** `app/` → `features/` → `lib/api`. Components take props; they do not fetch, and read global
state only through a named hook. `lib/api` imports nothing from `features/` or `components/`.

**API:** controller → service → repository.

**Everywhere:** no wire type outside `packages/contracts`, and import from the barrel, never a deep
path. Both boundary sets are enforced by `no-restricted-imports`.

## Styling

Tailwind utilities in the JSX. Tokens from the `@theme` block — a hex value in a component is a
defect. `cn()` for composition, `class-variance-authority` for variants. **Mobile first**: the
unprefixed classes are the phone layout, `sm:` and up are additions. Never `outline: none` without a
visible replacement.

## AI calls

Every model call goes through the `LlmProvider` port. A feature importing the Anthropic SDK directly
breaks the swap this project is designed around (ADR-0005). Every call carries a timeout and a token
budget. There is no "just this once".

**One call per assessment, and nothing retries it** (owner, 2026-08-26). `assess()` returns a parsed
answer or a **named failure** — it never throws a vendor error. A failure that reaches the top of a
request is a bug, answered as `code: 'unknown'`.

## Comments

One or two lines, plain English. Explain **why**, never **what**.

```ts
// Resize before upload: a phone photo is ~4 MB and the vision call is billed by image size.
const upload = await resizeToLongestEdge(file, 1000)
```

No commented-out code. No `TODO`. Update the comment when you change the code.

## Copy and simplicity

User-facing text lives in the i18n message files, never inline. Sentence case. Say what happened and
what to do next. Every string has a key in every locale or the build fails.

Solve the problem in front of you. Copy twice before extracting. Check for an existing helper first.
Match the neighbours over a better convention nobody else uses. A shorter diff is usually better.
