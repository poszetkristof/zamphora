# ADR-0010 — Serve the web app and the API from one origin

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

ADR-0003 puts the session in a cookie with the `__Host-` prefix. That prefix has three requirements:
`Secure`, `Path=/`, and **no `Domain` attribute**. A cookie with no `Domain` is host-only — it is
sent to exactly one host and to no other, not even a sibling subdomain.

So the shape of the domains is not a deployment detail. It decides whether the strongest cookie
setting in the standard is usable at all.

Two shapes were possible:

- **Two hosts.** `app.zamphora.example` for the screens and `api.zamphora.example` for the API. A
  cookie set by the API is host-only to the API host, so the browser has to be told to send
  credentials on cross-origin requests, and the API has to answer preflight requests with an
  `Access-Control-Allow-Credentials` header and an exact origin allow-list.
- **One host.** Everything on one domain, with the path deciding where a request goes.

`00-context-brief.md` §5.3: one part-time developer, learning AWS. Split-readiness rule 5 in
`factory/feature.md` still requires each service to have its own CDK stack, so deploy borders must
survive whichever shape is chosen.

## Decision

**One origin. One domain for the whole product.**

A CloudFront distribution sits in front. **`/api/*` goes to the API. Everything else goes to the
web.** The two are still separate deployable units with separate CDK stacks; only the front door is
shared.

**The web app holds no credentials and reads no data store.** It renders the screens, ships both
languages, and fetches every value from `/api/*` in the browser. It has no permission on the table
and no permission on the bucket.

### The web app is a static export, and that follows from the sentence above

**Decided by the owner on 2026-08-26.** `apps/web` is built with Next.js `output: 'export'` into a
folder of plain files, put in a private S3 bucket, and served through the same CloudFront
distribution. **There is no Node server for the web and no second Lambda.**

This is not a new decision so much as the consequence of an old one. A web app that holds no
credentials, never reads the session and always paints a skeleton first is a static site already.
Running a server to deliver it would be paying for a capability the design forbids itself from
using.

**What it buys.**

- Nothing runs between requests on the web side, so an untouched week costs nothing there either.
- No second cold start in front of the one that already costs 800 ms.
- The web CDK stack becomes a bucket and an origin — the smallest deployable thing in the product.
- It removes a real build problem: Next.js traces which files a server needs, and that tracing has a
  known open bug with the symlinks a pnpm workspace uses. With no server, there is nothing to trace.

**What it costs, and both are real.**

- **`next/image` with the default loader stops working.** For a photo app that matters. The answer
  is that plant photos are served from the product's own bucket through CloudFront and signed by the
  API, so they never went through Next.js image optimisation anyway. A custom loader remains
  available for anything else.
- **Choosing Hungarian or English on the first visit needs somewhere to decide.** A static export
  cannot read `Accept-Language` on the server. Both languages are prerendered as separate routes;
  what is left is the redirect from `/`, which is either a small CloudFront function or a line of
  client-side JavaScript. **This is a task for 500 Engineering, not a gap in the design.**

**What is given up but never wanted:** server components that read cookies, Server Actions, Next.js
middleware, incremental static regeneration and draft mode. `02-SPEC.md` uses none of them, and
ADR-0003 forbids the first two by putting the session entirely in the API.

## Consequences

**What this buys.**

- **The `__Host-` prefix works**, so ADR-0003's cookie rules are usable as the standard writes them.
- **There is no cross-origin request anywhere in the product**, so there is no CORS configuration, no
  preflight, no origin allow-list, and no `Access-Control-Allow-Credentials`. Every one of those is a
  place where a wrong value either breaks the app or opens it, and none of them now exists.
- **`SameSite=Strict` costs nothing**, because every request the app makes is same-site by
  construction.
- One certificate, one domain to buy and renew, one thing to type into a phone.

**What it costs.** CloudFront becomes a part that can break, and a change to the path routing is a
change to a shared piece rather than to one service. That is a real coupling and it is small: the
routing rule is one line — `/api/*` and everything else.

**A second cost.** The web app cannot render a signed-in screen on the server, because it does not
read the session. Every screen loads its data from the browser after the shell paints. That matches
what `02-SPEC.md` already draws — every result screen has a `loading` state described as "a skeleton
of the same shape, no fade-in" — so nothing in the design has to change. It does mean the first
paint of a data screen is a skeleton, always.

**A third cost, and it is a benefit in disguise.** Because the web has no credentials, a bug in the
web app cannot read or write anything. The whole permission surface of the product is in one place:
`apps/api`. 900 Security has one process to review, not two.

**What it does not cost.** The deploy border. Rule 5 still holds: `apps/web`, `apps/api`, the table,
the bucket and the distribution each get their own CDK stack. A later split into separate domains
would be a routing change plus a CORS configuration, not a rewrite — and the trigger for it is the
same trigger as ADR-0001's.

## Alternatives considered

**Two subdomains with CORS.** Rejected. It is the shape that needs the most configuration to be
exactly right and gives nothing back at this size. Every browser rule about cookies gets harder:
`__Host-` stops being usable across the pair, `SameSite=Strict` has to be reasoned about, and
credentialed cross-origin requests need an exact origin allow-list that a wildcard would silently
break.

**Two subdomains with a cookie scoped to the parent domain.** Rejected. Dropping to `Domain=.zamphora.example`
means giving up the `__Host-` prefix, which is one of the four things
[draft-ietf-oauth-browser-based-apps-26](https://www.ietf.org/archive/id/draft-ietf-oauth-browser-based-apps-26.html)
§6.1.3.2 asks for (checked 2026-08-25). It also means every future subdomain gets the session cookie,
including any that is ever run by something else.

**Next.js proxying `/api` to the Nest.js API from its own server.** Rejected. It puts the API's
traffic through the web app's runtime, so the web container would need a network path to the API and
the two would share a scaling limit. It also makes the web app a hop that can fail, for no gain over
a routing rule in front of both.

**Putting the session in the Next.js server instead of the API.** Rejected. It would mean two
processes that both validate a session, which is the same rule written twice — and `05-patterns.md`
§3 exists because a rule written twice is a rule that drifts.

## Agent-Readable Summary

> The whole product is served from one domain: `/api/*` reaches `apps/api`, everything else reaches
> `apps/web`. Do not add a second origin, a second subdomain or any CORS configuration — if a change
> needs `Access-Control-Allow-Origin`, something has gone wrong. Do not give `apps/web` an IAM role,
> a database client, an S3 client or any credential; it fetches everything from `/api/*`. Do not
> validate the session in the Next.js server — there is no Next.js server. `apps/web` is built with
> `output: 'export'` and served from a bucket, so do not add a Next.js route handler, Server Action,
> middleware or server component that reads a cookie. Do not set a `Domain` attribute on either
> cookie, and do not drop the `__Host-` prefix.
