# ADR-0015 — Deliver the result over one server-sent-events stream

- **Status:** Accepted 2026-09-17, by the owner (gate 72)
- **Date:** 2026-09-17
- **Adds one sentence to:** ADR-0010 (one origin). Everything else there stands.

## Context

ADR-0014 moves the model call into the background. The phone now needs to learn when the answer is
ready. Polling every two seconds was the first idea. It wastes requests and adds up to two seconds
of dead time.

## Decision

**After the `202`, the phone opens one connection and the result is pushed to it.**

The mechanism is **server-sent events** (SSE): a plain HTTP response the server keeps open and
writes lines to. The browser has it built in as `EventSource`, with automatic reconnection. It is
the same mechanism the model provider uses to stream tokens.

| Piece | Setting |
| --- | --- |
| Route | `GET /api/assessments/:id/events` |
| Function | `watch`, a second entry point of `apps/api`, built from the same session module. Native Lambda response streaming, no adapter |
| Front door | A **Lambda Function URL**, reached only through CloudFront with an origin access control. One CloudFront behaviour sends exactly this path to it |
| What it does | Validates the session, reads the assessment row every 500 ms, sends a heartbeat comment every 5 seconds, sends one `done` or `failed` event with the four fields, then closes |
| Clocks | The stream closes itself at 55 seconds. CloudFront's origin timeout counts the gap between packets, so the heartbeat keeps it open. `EventSource` reconnects on its own |
| Fallback | `GET /api/assessments/:id` still answers the row with its `state`. It sends `Cache-Control: no-store` and sits under the `/api/*` behaviour with caching off |
| Give-up | The waiting screen shows `deadline-passed` after 60 seconds, whatever the workflow is doing |

Why a Function URL and not API Gateway: API Gateway's HTTP API cannot stream. The REST API can, but
ADR-0007 forbids it because it corrupts uploads. A Function URL streams and costs nothing beyond
Lambda.

Why only this one route: CloudFront's signed access to a Function URL requires the **browser** to
send a SHA-256 hash of every `POST` body. A stream is a `GET` with no body, so the rule never
applies. The upload stays on the HTTP API.

## Consequences

- **No dead time.** The result arrives within about half a second of the write.
- **One more function and one more CloudFront origin.** ADR-0010 gains one sentence: the second
  origin is under the same host name, for one `GET`, so the cookie rules are untouched.
- **The `watch` function is billed for the whole wait**, about a minute at 128 MB per assessment.
  Inside the free 400,000 GB-seconds by a wide margin.
- **Ownership is by construction**, as everywhere: `watch` takes the user id from the session and
  reads the row under that partition (ADR-0004).

## Alternatives considered

- **Poll every 2 seconds.** Rejected for the dead time and the requests, once the stream turned
  out to cost nothing extra.
- **A WebSocket API.** Cents at this size, but a second host name, so the `__Host-session` cookie
  does not reach it and a second sign-in path is needed.
- **Web Push for the result.** Needs a permission prompt and a service worker before the first
  assessment. Right for backbone 6, wrong for the first minute of first use.
- **The whole API behind a Function URL.** It would remove the 30-second gateway ceiling for every
  route and the $1 per million. Rejected for now because every `POST` would need a browser-computed
  body hash, including the photo upload. Trigger to re-open: a second route that needs to stream.

## Agent-Readable Summary

> The assessment result reaches the phone over `GET /api/assessments/:id/events`, a server-sent-
> events stream served by the `watch` function behind a Lambda Function URL, through CloudFront
> only. Do not add a second streaming route without re-opening this record. Do not put the upload
> or any `POST` route behind a Function URL. Do not cache the fallback `GET`. Do not let the stream
> run past 55 seconds; the browser reconnects. Do not add a WebSocket API or a poll loop in the
> browser.
