---
name: coding-standards
description: How code is organised and written in this repo — where a file goes in apps/web and apps/api, the layer borders and what enforces each, TypeScript rules, Next.js 16 static-export rules, Nest.js clean-architecture rules, naming, comments. Load before writing or reviewing any .ts or .tsx file, and before creating any new file or folder.
---

# Coding standards

**Reasoning lives in `docs/500-engineering/00-conventions.md`. This file is the rules.** Where the
two disagree, the doc is right and this file is stale — say so rather than following it.

Versions are pinned in `docs/context/stack.md`. The ones that change how you write code:
**Next.js 16.3.3 · React 19.2.8 · Nest.js 11.2.3 · Zod 4.4.3 · TypeScript 6.0.3 · Vitest 4.**

---

## 1. Where a file goes

This is the section people skip and then get wrong. **Decide the folder before you write the file.**

### `apps/web` — Next.js, static export

```
apps/web/src/
├── app/                    routing ONLY. Thin files that render a feature
│   └── [locale]/assess/    page.tsx · layout.tsx · loading.tsx · error.tsx
├── features/
│   └── assessment/         the real code — components/ · hooks/ · api.ts
├── components/             UI used by two or more features
└── lib/                    fetch client, i18n, formatting
```

- **The trap is real code in `app/`.** Every file there is tied to a URL, so moving the URL moves
  the code whether or not it belongs to that page. A `page.tsx` renders a feature and does little
  else.
- **A component leaves `features/` for `components/` the *second* time another feature needs it.**
  Not the first time.

### `apps/api` — Nest.js, one Lambda, clean architecture

```
apps/api/src/
├── main.ts                 the Lambda handler and bootstrap
├── app.module.ts
├── shared/                 guards, filters, interceptors, config
└── modules/<feature>/
    ├── domain/             rules and types. Imports NOTHING
    ├── application/        use cases. Names ports, never DynamoDB
    ├── infrastructure/     DynamoDB, S3, LlmProvider adapters
    ├── presentation/       controllers and DTOs. HTTP lives here
    └── <feature>.module.ts the only file that wires them together
```

**Dependencies point inwards only.** `presentation → application → domain`, and
`infrastructure → application → domain`. Presentation and infrastructure never import each other.

| Layer | Holds | Never holds |
| --- | --- | --- |
| `domain` | A verdict, a band, "an `unsure` result may not write a task" | Any import at all — no Nest decorator, no SDK, no HTTP |
| `application` | The steps: check the limit, store the photo, call the model, save | Which database. It names a **port** |
| `infrastructure` | The adapters behind those ports | Business rules |
| `presentation` | Controllers, and DTOs turning HTTP into domain types | Anything worth testing on its own |

**Test for the right layer:** if you cannot unit-test it without starting Nest or AWS, it is in the
wrong one.

### Naming

`kebab-case.ts` for files, one exported thing per file named after the file. React components are
`PascalCase.tsx`. Nest files carry their role: `assessment.controller.ts`, `.service.ts`,
`.repository.ts`, `.module.ts`.

---

## 2. The borders, and what checks each

Package borders are in `00-conventions.md` §3 as a permission table. The four that get broken most:

- **`apps/web` may not import** `@aws-sdk/*`, `@anthropic-ai/sdk`, any `node:` module, or `apps/api`.
- **`packages/contracts` imports `zod` and nothing else.** Every other package and every vendor SDK
  is forbidden.
- **The Anthropic SDK appears in exactly one folder**, `packages/llm/src/adapters/`. Nowhere else.
- **Import `@zamphora/contracts` by package name**, never a relative path, never a deep path.

`no-restricted-imports` catches the paths. pnpm catches an undeclared dependency at build time,
because a package sees only what it declared.

---

## 3. TypeScript

```ts
// Const object + derived union. Never a TypeScript enum.
export const CARE_TASKS = { WATER: "water", REPOT: "repot", FEED: "feed" } as const
export type CareTask = (typeof CARE_TASKS)[keyof typeof CARE_TASKS]
```

- **Default to `type`.** Use `interface X extends Y` to compose object types — interface
  relationships are cached and an intersection turns a property conflict into `never` in silence.
  Use `interface` for declaration merging. **Never `type A = B & C` for an object.**
- **No `enum`.** The const object above is the pattern. `z.enum(...)` is a Zod function and is fine.
- **No `any`.** `unknown` plus a Zod parse is the way in from outside.
- **No `!` to silence the compiler.** Handle the null, or write the invariant down.
- **`??` not `||`** — `||` swallows `0` and `""`.
- **`import type` for type-only imports.** Return types on exported functions.
- **Branded ids are branded on purpose.** `UserId`, `PotId`, `AssessmentId`. A plain `string` can be
  passed to the wrong parameter; a branded id cannot. Only the repository layer builds keys from
  them.
- **Route names, roles, task kinds, statuses and analytics labels come from a named `const` list** —
  in `packages/contracts` when the value crosses the wire, beside its code when it does not.

**Every type that crosses the wire is a Zod schema in `packages/contracts`, imported by both sides.**
Writing `type PlantResponse = {…}` in an app is always wrong: the two sides must fail on the same
input, and they only do that when the same schema object checks both.

### Zod 4

```ts
z.string({ error: "Give the pot a name." })   // the one way to write a custom message
z.email()  ·  z.iso.datetime()  ·  z.enum(NativeEnum)
```

**Zod 3's `required_error`, `invalid_type_error` and `errorMap` are accepted and ignored** — no
error, no warning, your message replaced by default English. On a two-language app that is a
requirement broken by a default. `z.string().email()` and `z.string().datetime()` still work and are
deprecated.

---

## 4. Errors are values

A failure the product expects is **returned**. A `throw` that reaches the top of a request is a
**bug**, logged and answered as `code: 'unknown'`.

- `LlmProvider.assess()` returns a parsed answer or a **named failure**. It never throws a vendor
  error.
- Every non-success answer is the `Problem` envelope — real **RFC 9457**, sent as
  `application/problem+json`, built by one exception filter. No controller writes an error body.
- **Branch on `code`**, never on `type` (a URI) and never on a message string.
- `retryHint` decides whether a try-again button is drawn. A wrong hint is a wrong screen.

---

## 5. React and Next.js 16

**There is no server at request time.** `apps/web` is a static export, so the usual "fetch on the
server" advice does not apply.

- **Server Components render at build time**, into a file. They hold layout and text. They cannot
  see the person, their session or their data.
- **Every value belonging to a person is fetched in the browser**, after the shell paints. A loading
  state is not optional — it is the first thing every screen shows.
- **`params` is a Promise.** `const { locale } = await params`. Next 16 removed the sync form.
- **`"use client"` goes on the smallest leaf**, never a page — it pulls the whole tree into the
  bundle.
- **React Compiler is stable and does memoisation.** Write new code plainly; add `useMemo` or
  `useCallback` when you have a reason. **Leave existing memoisation alone** — removing it changes
  effect dependencies.
- One component per file, named after the file. Props are a `type` above it. No `React.FC`.
- `key` is a stable id, never the array index.
- More than two nested ternaries in JSX means a variable or an early return is missing.
- **Do not reach for**: route handlers, Server Actions, `proxy.ts` (the old `middleware.ts`), ISR,
  `revalidateTag`, or the image optimiser. A static export has none of them.

---

## 6. Nest.js

- **The guard is global.** You never add one. Every route carries exactly one of `@Anonymous()`,
  `@Roles('USER')`, `@Roles('ADMIN')`, and a route with none refuses everybody.
- **Ownership is not a check.** The owner id is the partition key and comes from the session — never
  a path parameter, a query string or a body. Do not write `if (row.userId !== session.userId)`.
- **The API never answers 403.** Another account's row answers as a row that does not exist.
- **Validation is a pipe built from the shared Zod schema.** Never hand-written in a handler, never
  class-validator — the contract is the schema.
- **A service never sees `Request` or `Response`.** If it needs the caller, take the id as an
  argument.
- **Only repositories touch the data client.** A service importing the AWS SDK is a defect.
- Providers are injected through the constructor. No static singletons.

---

## 7. Model calls

Every call goes through the `LlmProvider` port. A feature importing the Anthropic SDK breaks the swap
this project is built around (ADR-0005).

**One call per assessment, and nothing retries it.** The client is built with `maxRetries: 0` —
the SDK retries twice by default, which would make three paid calls and turn an 18,000 ms timeout
into 54,000 ms, past the deadline and past the gateway's hard cut-off.

`max_tokens: 1024` · `timeout: 18_000` (**milliseconds**) · `maxRetries: 0`.

Read `stop_reason` before the content. `refusal` and `max_tokens` are normal successes, not errors,
and neither is ever retried.

---

## 8. Styling

Tailwind utilities in the JSX. Tokens from the `@theme` block — **a hex value in a component is a
defect**. `cn()` for composition, `class-variance-authority` for variants. **Mobile first**: the
unprefixed classes are the phone layout, `sm:` and up are additions. Never `outline: none` without a
visible replacement.

---

## 9. Functions, comments, copy

Guard clauses over nesting: return early, keep the happy path unindented. No boolean parameters —
take an options object or write two functions. `async` only when you `await`. Never leave a promise
floating. If a function needs a comment explaining its second half, that half is a function.

**Comments are one or two lines, plain English, and explain *why*.**

```ts
// Resize before upload: a phone photo is ~4 MB and the vision call is billed by image size.
const upload = await resizeToLongestEdge(file, 1000)
```

No commented-out code. No `TODO`. Update the comment when you change the code.

User-facing text lives in the i18n message files, never inline. Sentence case. Say what happened and
what to do next. Every string has a key in every locale or the build fails.

Solve the problem in front of you. Copy twice before extracting. Check for an existing helper first.
Match the neighbours over a better convention nobody else uses. A shorter diff is usually better.

---

## 10. Stop and ask

**Never decide these yourself:** adding any dependency, adding a tool the model may call, reversing
an ADR, changing a public API shape after it ships, or anything that spends money or deploys.

An ADR outranks your judgement. Each one ends in an explicit "do not". If a change would contradict
one, **stop and name it** — do not write the code and mention it after.
