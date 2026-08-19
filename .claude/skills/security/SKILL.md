---
name: security
description: Security rules for this repo — the browser is never a security boundary, problem+json must not leak internals, token claims are untrusted input, and model output is untrusted input too. Load when touching auth, roles, env, uploads, user input, any AI call, or any API response body.
---

# Security

## Two rules everything else follows from

> **1. The browser is not a security boundary.**

A frontend role check hides buttons. That is design, not security. Every protected action is checked
again on the server before anything happens. A frontend check with no server counterpart is a
vulnerability. Same for validation: the form schema gives fast feedback, the API parses the same
schema again because the request may not have come from the form.

> **2. Model output is input, not a decision.**

Anything a model returns is untrusted text that happens to sound confident. Parse it with a schema
before use. Never let it choose a table, a file path, a URL, a price or a permission.

## Untrusted input, by source

**Token claims.** A signed token proves who issued it, not that its contents are what you expect.
Check every claim against an allow-list; the worst case must be "no permissions", never "an
unexpected permission". `isRole` lives in `packages/contracts` so there is one list, not two.

**User text reaching the model.** A plant nickname and a note inside a photo both reach the model.

- **Never put user text in the system prompt.** User content goes in a user turn.
- The system prompt says what may be returned, and that instructions found in user content are data
  to describe, not orders to follow.
- Parse the reply with a Zod schema. A reply that does not parse is an error, not a fallback.
- The model has no tools that write. A future one needs an ADR and a human confirmation step.

**Uploads.** The client never uploads through the API. It asks for a **short-lived pre-signed S3
URL** that works for one file path only, under its own folder.

- The key is generated server-side from the user id. Never accept a client-supplied key.
- Content type and max size are enforced in the pre-signed policy, not just the UI.
- Verify server-side that the file really is an image. An extension is not evidence.
- **Strip EXIF before storage.** A phone photo carries the GPS location of the user's home.

## Personal data

A plant photo shows the inside of someone's home. Treat it as personal data: a written retention
rule enforced by a lifecycle rule, delete-my-account really deletes the objects, never send a photo
to a third party the user was not told about. Log identifiers, never people.

## Error responses

`detail` in a problem+json body is a promise: it is safe to show a user. It must never contain a
stack trace, a query fragment, an internal hostname or ARN, a raw library or AWS error, a raw model
reply, or another user's data. Unknown errors become a 500 with a **generic** detail. Keep the test
that asserts no stack appears in a body.

## Every new endpoint

1. Does it need auth? Everything except the health check does.
2. Which roles? Add the guard explicitly. Never rely on a path being hard to guess.
3. Can the caller act on someone else's resource? Check ownership in the service, not the route.
4. Can the caller raise their own privileges?
5. **Does it cost money per call?** Then it needs a per-user rate limit and a daily cap, not just a
   global one. This is the attack that closes a free-tier account.

## Input, XSS, redirects

- Validate at the boundary with the shared schema. A path parameter that "looks like a UUID" is not
  validated.
- No string-concatenated queries or filter expressions, ever. JSON bodies are capped.
- No `dangerouslySetInnerHTML`. No `eval`, no `new Function`.
- Never build a URL from user or model input without checking the scheme — `javascript:` is a real
  attack. React escapes children; `href`, `src` and `style` are the gap.
- Any redirect to a stored path is validated first: it must start with a single `/` and contain no
  `://`.

## Secrets

- One module per app reads environment variables, validated with Zod. Nothing else touches
  `process.env`.
- **Anything prefixed `NEXT_PUBLIC_` is public** — it ships in the bundle.
- Server secrets live in Parameter Store as SecureString, read at cold start.
- **No model API key ever reaches the browser.** Every AI call is server-side.
- Never log a token, a header, or a whole body. `authorization`, `cookie` and `set-cookie` stay
  redacted.

## Dependencies and review

Dependabot, CodeQL and the audit job run on every pull request — read what they say. Before adding a
package: is it maintained, how many transitive dependencies, could ten lines do it? Never add one to
work around a lint rule.

**A package name written by a model is not evidence the package exists.** Models invent plausible
names, and the same invented name comes back across sessions — which is why attackers register
them. Before any new dependency is installed or written into a spec, check it is real: the registry
page, the publisher, the download history, the age. A brand-new package with a familiar-looking name
is the attack, not a lucky find. CI does this too, so a hand check that is skipped still gets
caught.

When reviewing, trace the real data flow. "This value is interpolated" is not a finding; "this comes
from the plant nickname and reaches the system prompt" is. No named input and sink means it is not
Critical.
