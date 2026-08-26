# ADR-0003 — Sign in with OpenID Connect through Cognito, and keep every token on the server

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

`factory/feature.md` names this as a question 400 Architecture must answer, not assume: *"How
sign-in works — the protocol, the flow, and where tokens live."*

What is already fixed:

- **Every user signs in.** A photo is personal data and the AI endpoint costs money per call, so
  there is no anonymous use (`factory/feature.md`).
- **A session lasts 30 days** (gate G-7, 2026-08-25). Seven days was rejected because the app is
  opened every few weeks. Ninety was rejected because a lost phone would stay signed in to photos
  of the inside of a home for three months.
- US-07 AC-1, AC-2, AC-4 and AC-5: no plant data without a session, a refusal must not reveal
  whether the thing exists, every returned row belongs to the caller, and no session means no model
  call.
- The photograph is of the inside of a home and is treated as personal data from the first file.

What the standard says. The IETF's working draft for browser applications lists three shapes: a
**Backend-For-Frontend**, a **token-mediating backend**, and an OAuth client running in the browser.
Of the first it says: *"This architecture is strongly recommended for business applications,
sensitive applications, and applications that handle personal data"* (§6.1.4.3). Of the second:
*"Only when the use cases or system requirements would prevent the use of a proxying BFF should the
token-mediating backend be considered"* (§6.2.4.4). For the BFF's cookies it requires `Secure` and
`HttpOnly`, and asks for `SameSite=Strict` and the `__Host-` prefix (§6.1.3.2).
([draft-ietf-oauth-browser-based-apps-26, December 2025](https://www.ietf.org/archive/id/draft-ietf-oauth-browser-based-apps-26.html),
checked 2026-08-25.) **It is still a draft and not yet an RFC.** That is said plainly rather than
dressed up; it is the current best-practice text either way.

## Decision

**The protocol is OpenID Connect on top of OAuth 2.0. The flow is the authorization code flow with
PKCE. The shape is a Backend-For-Frontend, and the backend is `apps/api`.**

**No token of any kind ever reaches the browser.**

**The flow is drawn as a sequence diagram in `05-patterns.md` §2**, which is where the step list
lives. The decision here is the shape and the rules, not the steps.


**Two cookies, both `__Host-` prefixed:** `__Host-oauth` for 10 minutes during the round trip, and
`__Host-session` for 30 days afterwards. **Their exact attributes, and why one is `Lax` and one is
`Strict`, are in `05-patterns.md` §2.**

**The session is ours, not Cognito's.** Sign-out is a delete of a row. The 30 days is one number in
one place. And the API never holds a refresh token for weeks.

**The account type is not in the session.** It is read from the profile item on every request, in
the second of the two reads (ADR-0004). US-14 AC-4 requires a changed type to decide the very next
request.

**One origin.** ADR-0010 puts the web and the API behind one domain, which is what allows the
`__Host-` prefix and removes cross-origin requests entirely.

## Consequences

**What this buys.** A cross-site scripting bug in the web app cannot read a token, because there is
no token to read and the cookie is `HttpOnly`. Revoking a session is a real delete. Password
storage, reset flows and breach handling stay with Cognito, which is the right place for a solo
developer to leave them. The cost is inside the free tier: Cognito's Lite and Essentials tiers give
10,000 monthly active users, and *"the free tier does not automatically expire at the end of your
12-month AWS Free Tier term"* ([Cognito pricing](https://aws.amazon.com/cognito/pricing/), checked
2026-08-25).

**What it costs.** Every request reads the session item, which is one extra `GetItem` — combined
**as two reads in order**, not one batch: the profile's key is the user id, and that id is inside
the session item. Budgeted together at 30 ms in `03-flow.md` step 5.

**A second cost, named because it is a real product effect.** The sign-in pages are Cognito's, not
ours. The Botanical identity in `factory/feature.md` does not fully reach them, and how much
Hungarian they show depends on Cognito, not on our own message files. `01-CONTEXT.md` §4 already
puts the sign-in screen out of scope for run 1, so nothing is contradicted — but the owner should
know that "out of scope" now means "Cognito's pages", not "ours, later". **Recorded as gate 31.**

**A third cost, small and named.** `SameSite=Strict` means a link from the 11-month warning email
lands on a page that looks signed out until the person navigates once more. Accepted. If it is ever
not acceptable, the fix is a second read-only `Lax` cookie, and that is a decision, not a drift.

## Alternatives considered

**Tokens in the browser, in `localStorage`.** Rejected outright. The draft is explicit that a
browser-based client is the weakest of the three shapes, and any script that runs on the page can
read `localStorage`. The data behind this session is photographs of the inside of a home.

**A token-mediating backend** — the API gets the tokens and hands the access token to the browser.
Rejected by the standard's own words: it is for cases where a proxying BFF is prevented by the
requirements. Nothing here prevents one, because the API *is* the resource server.

**Keeping the Cognito tokens server-side and refreshing them.** Rejected as more moving parts for no
gain. The API is the only resource server; there is nothing to present an access token to. Keeping
a refresh token for 30 days would put a long-lived provider credential in the table for no purpose.

**Auth0, Clerk or a similar hosted product.** Rejected. Each is a second outside vendor, a second
account and a second bill in a project with zero budget, and `initial-plan.md` names learning AWS as
one of the reasons the project exists.

**Our own passwords.** Rejected. Password hashing, reset links, rate limiting on sign-in and breach
handling are a body of work with sharp edges, and one part-time developer should not own them.

**Which sign-in method — password, magic link or a social provider — was not decided here.** It is
closer to a product choice than an architecture one, and no story names it. The line continued on
email and password through Cognito's own pages, because it needs no extra vendor and no extra cost.
**Recorded as gate 31 with the point above.**

## Agent-Readable Summary

> Sign-in is OpenID Connect, authorization code flow with PKCE, against a Cognito user pool, with
> `apps/api` as a Backend-For-Frontend. Do not put an access token, an ID token or a refresh token
> in `localStorage`, `sessionStorage`, a URL or any response body — the browser only ever holds the
> opaque `__Host-session` cookie. Do not read the account type from the session item; read it from
> the profile item on every request. Do not drop the `Secure`, `HttpOnly` or `__Host-` settings on
> either cookie, and do not change `__Host-session` away from `SameSite=Strict` without a new ADR.
