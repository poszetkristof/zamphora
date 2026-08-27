# ADR-0007 — Keep photos in one private bucket, and let a lifecycle rule delete them

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The photograph is of the inside of someone's home. `factory/feature.md` treats it as personal data
from the first file. It can show the room, the furniture, other people, and where the person lives.

What is already decided by the owner:

- **180 days, then automatic deletion** (2026-08-24). *"A storage lifecycle rule does the deleting,
  not application code, so the rule holds even when the app is broken."*
- A user can also delete their own photos on demand.
- The assessment **text** has no clock. It lives as long as the pot does.

What the stories add:

- **US-01 AC-4.** The photo sent has a longer side of at most 1000 px.
- **US-10 AC-3.** Deleting one photo removes it **and every resized or cached copy of it**.
- **US-10 AC-4.** After the photo is gone, the assessment text is still there and says so.
- **US-10 AC-6.** The 180-day deletion happens even when the application is stopped or broken.
- **US-07 AC-2.** A request for another account's photo must not reveal whether it exists.

One useful fact for the boundary: Anthropic states *"Image uploads are ephemeral and not stored
beyond the duration of the API request"* and *"Anthropic does not use uploaded images to train
models"* (`00-context-brief.md` §5.3, checked 2026-08-24). So the retention question is entirely
about this project's own storage.

## Decision

**One private S3 bucket. One object per photo. No second copy anywhere.**

**1. The upload goes through the API, in the same request that asks for the assessment.** The
browser sends `multipart/form-data` with the resized photo, the pot id and the language. The API
checks it, writes it to the bucket, and then calls the model with the bytes it already holds.

**The server re-checks what the browser checked.** Format, shorter side at least 200 px, longer side
at most 1000 px, and a hard ceiling of **2 MB** on the body. A check that only runs in the browser
is not a check.

### How the upload is parsed — confirmed by the owner 2026-08-26, gate 34

**The parser is multer, and it is not a new dependency.** It is a direct dependency of
`@nestjs/platform-express` 11.2.3, so it installs with the Express adapter whether or not any route
uses it (read from the npm registry, 2026-08-26). Nest's own file-upload page documents
`FileInterceptor` on top of it. **Three conditions came with the owner's decision:**

1. **Memory storage, never disk storage.** Multer's disk mode leaves partial files behind when an
   upload is aborted, and a Lambda's `/tmp` survives between requests in the same warm environment,
   so those pieces outlive the request that made them.
2. **Every limit set explicitly** — 2 MB of file, one file, and low caps on the number of fields and
   the length of a field name. Multer has had nine denial-of-service advisories in fourteen months,
   every one of them a request that makes the parser work forever. On this account that is not a
   crash, it is spent credit.
3. **The size cap is checked on the server**, not only in the browser resize.

**Two things that must never change without re-opening this record:**

- **Do not set `binaryMediaTypes`.** That setting belongs to API Gateway *REST* APIs. This project
  uses an **HTTP API**, which base64-encodes a binary body automatically based on the content type
  and hands Lambda `isBase64Encoded: true`. The adapter decodes it into a real buffer before multer
  sees it, so no configuration is needed and none should be added.
- **Do not move this route to a REST API.** On a REST API with `binaryMediaTypes` unset, the photo
  is run through UTF-8 and silently corrupted before the application ever sees it. There is no
  error — multer parses damaged bytes and the assessment fails for a reason nothing explains. This
  is the single sharpest trap on the upload path, and it only appears if somebody changes the
  gateway type, most likely to escape the 30-second ceiling.

**The size headroom is not close.** API Gateway's payload limit is 10 MB and cannot be raised;
Lambda's synchronous limit is 6 MB each way. Base64 adds about a third, so a 6 MB event carries
roughly 4.5 MB of photo. This ADR caps the body at 2 MB and a real photo is about 200 KB — **about
3% of the ceiling.**

**2. The key is `photos/<userId>/<potId>/<createdAt>.jpg`.** The owner id is in the path, which
means an IAM policy can be written to match it later if it is ever needed.

**This said `<assessmentId>` until 2026-08-26, and the owner changed it (gate 38).** 500 Engineering
found that the assessment id is not a plain value: with no secondary index, the row is found by pot
id **and** timestamp, so the id is those two joined with a `#`. Written into the old key it produced
`photos/u123/pot9/pot9#2026-08-26T10:00:00Z.jpg` — the pot id twice, and a `#` inside an S3 key,
which AWS lists as a character needing special handling. **The timestamp alone is enough**, because
the pot id is already the folder above it, and the folder then sorts by time with no extra work.

**3. The bucket is private.** Block Public Access on. No bucket policy grants anonymous read.
Encryption at rest is SSE-S3 (`AES256`).

**4. A photo is read through a signed URL that lasts 5 minutes** (NFR-43). Never through a public
object, never through a content delivery network.

**5. Deletion at 180 days is an S3 lifecycle expiration rule**, written in CDK, on the whole
`photos/` prefix. **No application code deletes on a schedule.**

**6. Delete on demand deletes the object and the photo key on the assessment row**, in that order.
The assessment row stays, with the key cleared, which is exactly what US-10 AC-4 draws.

**7. No derivative is ever made.** No thumbnail bucket, no cached copy, no image-resizing service.
The single object is the only copy.

## Consequences

**What this buys.** US-10 AC-3 says "every resized or cached copy" must go. The cheapest way to
satisfy that is to never make one, and this design never does. US-10 AC-6 comes for free: the rule
runs in S3, so it fires whether or not the application is up. US-07 AC-2 comes for free too, because
a signed URL is only ever produced from a row the caller already owns (ADR-0004), so a photo that is
not yours cannot be reached, and the answer is the same as for a photo that does not exist.

**What it costs, and this one changes how a promise has to be measured.** AWS states: *"There may be
a delay between the expiration date and the date at which Amazon S3 removes an object"*
([S3 lifecycle expiration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html),
checked 2026-08-25). So the object can sit in the bucket for a short time after day 180. Three
things are true and all three should be said together:

- The photo is **not readable through the app** after 180 days, because the app only signs a URL for
  a row that still points at it.
- Storage is **not charged** after expiry — the same page says so.
- The object may still physically exist for a short time.

NFR-41 therefore measures at **182 days**, not 180. **This is a change to how M-07 reads, and the
number is printed on a screen (US-10 AC-1), so it goes to the owner as gate 27** rather than being
adjusted quietly.

**A second cost.** Sending the photo through the API means the bytes pass through the function. At
2 MB that is fine, and it is well inside the API Gateway payload limit. If a later run raises the
size, this decision has to be re-opened — the trigger is written into the summary below.

**A third cost.** No cache in front of the photos means every view of an old assessment signs a
fresh URL and fetches the object again. At one user and a handful of assessments a week that is
nothing. It would matter at a size this product is not built for.

## Alternatives considered

**A signed PUT straight from the browser to the bucket.** Rejected for run 1. It saves the function
from carrying the bytes, and it costs an extra round trip inside a 30-second budget, a second
endpoint, and a second place where the format and size checks have to happen — because a signed PUT
does not validate what is uploaded. **Trigger to re-open:** if the photo ever exceeds 5 MB, or if
the assessment moves to a background job in run 3.

**Encryption with a customer-managed KMS key.** Rejected for run 1. It is the stronger answer and it
adds a monthly key charge plus a per-request charge, on an account with a $200 credit that closes.
SSE-S3 is free and encrypts at rest. **900 Security may overrule this**, and it should be asked to.

**A thumbnail, generated on upload.** Rejected. Every screen in `02-SPEC.md` shows the photo at one
of two sizes and the object is already at most 1000 px. A thumbnail would be a second copy that
US-10 AC-3 would then have to chase.

**Serving photos through CloudFront.** Rejected. A cache is a copy. US-10 AC-3 would need it purged
on every delete, and a purge is slower and less certain than a five-minute URL that simply expires.

**Deleting at 180 days with a scheduled job in application code.** Rejected by the owner's own
words: the rule must hold when the app is broken. A scheduled job is application code.

**Versioning on the bucket.** Rejected. Versioning would keep a deleted photo as a noncurrent
version, which is the opposite of what US-10 AC-3 asks for. A second lifecycle rule could clean it,
which is two rules where one will do.

## Agent-Readable Summary

> Photos live as one object each in one private S3 bucket, at
> `photos/<userId>/<potId>/<createdAt>.jpg` — the timestamp, **not** the assessment id, which
> contains a `#`. And are deleted at 180 days by an S3 lifecycle rule
> written in CDK. Do not write a scheduled job in application code to delete photos. Do not create a
> thumbnail, a resized copy, or any second copy of a photo anywhere. Do not serve a photo through
> CloudFront or any cache, and do not make the bucket or any object public — always sign a URL that
> lasts at most 5 minutes. Do not enable bucket versioning. Do not trust the browser's size and
> format checks; re-run them in the API and reject any body over 2 MB. The upload is
> `multipart/form-data` parsed by **multer in memory storage** — do not use disk storage, and do not
> leave its `limits` unset. Do not set `binaryMediaTypes`; it does not exist on an API Gateway HTTP
> API. Do not move this route to a REST API — the photo would be silently corrupted before the
> application sees it.
