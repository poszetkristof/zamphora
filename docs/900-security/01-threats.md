# Threats — what could go wrong, scored

**Written by** 900 Security, run 1 (`001-photo-assessment`). **Date:** 2026-09-01.
**Updated 2026-09-17, twice.** First for ADR-0014 to ADR-0016: three scores went down and four
threats were added, which §7 lists. Then an audit lowered **T-27 from 15 to 10** by reading
`04-ci-cd.md`, the file this role's inputs did not include (`02-mitigations.md` §11), and recorded
that **T-19's fourth fix shipped** — `image/gif` left `ACCEPTED_PHOTO_TYPES` on gate 68.
**Read next by** 600 QA, and by 900 Security on every later run.

This file lists what could go wrong, one line at a time, with a score. `00-assets.md` says what is
worth protecting and where the lines are. `02-mitigations.md` says what to do about the ones that
score high enough.

**Three passes were run over this design, not one.**

1. **STRIDE**, over every trust boundary in `docs/400-architecture/02-containers.mmd`.
2. **The OWASP Top 10 for LLM Applications, 2026 edition**, because this product sends a photograph
   and a piece of user text to a language model, and the answer drives what the person is told to do.
3. **The OWASP Top 10 for Agentic Applications, 2026 edition**, over **the factory itself** — the
   eight roles that wrote these documents. That is a different system from the product, and it has
   its own risks.

---

## How this file grows

**This file belongs to the whole product.** Later runs **add** threats and **add** a section for
their own feature. They do not rewrite the scoring scale, and they do not delete a threat an earlier
run wrote. If a control ships and lowers a score, the row keeps its old score and gains a note
saying what changed and when.

---

## 1. The scoring scale

Every threat gets **likelihood × impact**, each from 1 to 5, giving a score from 1 to 25.

**Likelihood — how often would this happen if nothing were done about it?**

| | Meaning |
| --- | --- |
| 1 | Rare. Needs an attacker with resources nobody would spend on this product |
| 2 | Unlikely. Possible, but needs several things to line up |
| 3 | Possible. A motivated person, or an ordinary mistake, would get there |
| 4 | Likely. Expect it within the life of the product |
| 5 | Near certain. It is already true, or it happens on the first try |

**Impact — anchored to this product's real numbers, not to a generic scale.**

| | Meaning, for this product |
| --- | --- |
| 1 | Trivial. Nobody notices. No money, no data |
| 2 | Small. One failed request, or a few cents |
| 3 | Real. A stated promise is broken, or the feature goes dark until a person acts |
| 4 | Serious. Personal data reaches somebody it should not, or the Anthropic balance is emptied |
| 5 | Severe. The AWS account closes and takes the data with it, or a credential that opens everything is lost |

**The bands, and what each one obliges.**

| Score | Band | What must happen |
| --- | --- | --- |
| 1 to 4 | **Low** | Written down. No work required |
| 5 to 9 | **Medium** | Written down with the reason it is acceptable. Fix it if the fix is free |
| 10 to 14 | **High** | **Three fixes in `02-mitigations.md`: preventive, detective, responsive** |
| 15 to 25 | **Critical** | The three fixes, **and the owner signs it off before the first line of code** |

**The line is 10.** Every threat that scores 10 or more gets three fix types in `02-mitigations.md`.

**One thing about the scores in this file.** Most likelihood numbers are judgement, not measurement,
and they are written that way. Where a number comes from a document or a published advisory, the
source is named on the row. Where it is judgement, the "why" column says so.

---

## 2. STRIDE, over every trust boundary

**STRIDE** is six kinds of thing that go wrong: **S**poofing (pretending to be somebody),
**T**ampering (changing something), **R**epudiation (denying you did it), **I**nformation
disclosure (seeing what you should not), **D**enial of service (stopping it working), **E**levation
of privilege (getting a permission you should not have).

Every boundary TB-1 to TB-15 in `00-assets.md` §3 has at least one threat below. **TB-16 to
TB-19, the four boundaries the background run added on 2026-09-17, are scored in §7** rather than
here, so this section stays the record of the shape run 1 started from.

### TB-1 — the public internet reaches CloudFront

| # | S | Threat | L | I | **Score** | Band | Blast radius, as a number | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | D | A request flood that stops at the CloudFront edge. It never reaches the throttled gateway, and past the free 10,000,000 requests a month it is billed against the AWS credit | 2 | 4 | **8** | Medium | The whole **$200** credit. When it is gone the account **closes** and the table, the bucket and the user pool go with it | `01-iac-plan.md` §4.4 already names this and says there is no automatic answer on this account. The response is a person disabling the distribution by hand. Likelihood 2 because the host is a CloudFront name nobody has a reason to find |
| T-02 | T | The response headers policy is wrong, so a script that should not run does run. `script-src` is not written yet — `01-iac-plan.md` §5 leaves it open on purpose | 3 | 3 | **9** | Medium | 1 person's session and photos, through the browser | Likelihood 3 because the policy is not written, and the shape of the web app makes it hard. See T-03 |
| T-03 | T | **A static export cannot use a per-request nonce, so a strict `script-src` is not available.** Next.js `output: 'export'` writes inline `<script>` tags into the built HTML, and there is no server to generate a nonce | 4 | 3 | **12** | **High** | Same as T-02. A Content Security Policy set to `'unsafe-inline'` gives back most of what the policy was for | Likelihood 4 because it is a known limit of the chosen build mode, not a maybe ([Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy), and [vercel/next.js discussion 81703](https://github.com/vercel/next.js/discussions/81703), both checked 2026-09-01) |

### TB-2 — CloudFront reaches the static web bucket

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-04 | T | Somebody changes the built web files in the bucket, so every visitor runs their code | 1 | 5 | **5** | Medium | Every visitor. Today that is 1 person, and their session and photos | Likelihood 1: the bucket is Block Public Access, reached only through origin access control, and the only writer is a deploy role. It scores at all because the impact is total |

### TB-3 — CloudFront reaches the API

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-05 | D | An unauthenticated flood of `POST /api/assessments`. The guard refuses at step 1 and no model call is made, but every request still costs one gateway call and one function start | 2 | 3 | **6** | Medium | At the configured 100 requests a second, about **$0.36 an hour** against the $200 credit. Left at the AWS default of 10,000 a second it would be about **$36 an hour** (`01-iac-plan.md` §4.4) | The throttle is already a required setting. Likelihood 2 for the same reason as T-01 |
| T-06 | S | The `__Host-session` cookie value is stolen — a shared device, a browser extension, a script. It works for up to 30 days, nothing detects it, and there is no "sign out everywhere" | 2 | 4 | **8** | Medium | 1 person, for up to 30 days: every pot, every assessment and a signed URL for every photo that still exists — up to 1,800 photos | The cookie is `HttpOnly`, `Secure`, `__Host-` and `SameSite=Strict`, so a page script cannot read it (ADR-0003). What is left is device-level theft. Impact 4 because the data is photographs of the inside of a home |
| T-07 | E | A route added in a later run carries no decorator, so nobody checks who may call it | 1 | 4 | **4** | Low | Whatever that route touches | This is designed away. The global guard refuses a route with no decorator, and NFR-32 walks the router on every build (ADR-0004). Listed so nobody removes either half |
| T-08 | S | **Authorization code injection at `GET /api/auth/callback`.** The `state` in the query is not compared with the `state` in the `__Host-oauth` cookie, so an attacker's code is exchanged inside the victim's browser | 3 | 4 | **12** | **High** | 1 person, signed in to the **attacker's** account without knowing it. Every photo they then take goes to the attacker | ADR-0003 says the API checks the signature, issuer, audience and nonce. **No input says the `state` values are compared and the request refused on a mismatch.** Likelihood 3 because a step that is not written down is a step that gets missed |
| T-09 | S | Cross-site request forgery on `POST /api/assessments` or `POST /api/care-tasks` | 2 | 3 | **6** | Medium | 1 person: a spent model call, or an unwanted care task | Already covered by `SameSite=Strict` plus one origin plus no CORS. The real risk is a later change to `Lax`, which would open it in silence |
| T-10 | D | Ten assessments at once hold all ten reserved function copies for six to eight seconds, so every other route answers 429 | 1 | 2 | **2** | Low | 1 person, for about a second | **Lowered 2026-09-17.** The model call left the `api` function (ADR-0014). An assessment request now holds a copy for about one second, and the paid call runs in `assess` with its own concurrency of 1. The split ADR-0002 named as a trigger has happened |

### TB-4 — the browser reaches the API

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-11 | T | A script sends a file that is not an image, or a photo far larger than the browser would have sent | 4 | 2 | **8** | Medium | See T-19. On its own, one refused request | Likelihood 4 because it takes one `curl` command. Impact is low **only because** the server re-checks everything at steps 2, 5 and 5b (ADR-0007). Without step 5b the impact would be T-19's |
| T-12 | T | A request body carries a field nobody expected | 2 | 2 | **4** | Low | One refused request | Every request body is `z.strictObject` (`01-contracts.md` §11a). An unknown field is refused, on purpose |

### TB-5 — the API reaches the table

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-13 | I | One account reads another account's rows | 1 | 5 | **5** | Medium | Everything one other person owns | Designed away: the owner id is the partition key and it comes from the session only (ADR-0004). It is not a check that can be forgotten. **ADR-0004 names where this protection can first be undone: the secondary index that run 3 adds for backbone 6** |
| T-14 | T | A wrong value is typed by hand into the `CONFIG` partition — a model id that does not exist, or a daily limit of 10,000 | 3 | 3 | **9** | Medium | A wrong `MODEL_ID` fails every call, so the feature is dark. A wrong `DAILY_LIMIT` removes the spend ceiling: 10,000 × $0.0040 is **$40 a day** against a **$5** balance | The rows are written by hand with no validation on the way in (`01-iac-plan.md` §10). Reading validates against "a closed list or a range" (`03-api-spec.md` §6) — **but no input says what the range for `DAILY_LIMIT` is** |
| T-15 | D | The kill-switch cannot be relied on when the table itself is the problem. A failed read keeps the last known value, which is `true`, so the calls keep going | 2 | 4 | **8** | Medium | Up to the whole **$5** balance, if the table is unreadable while the model call still works | ADR-0009 chose "keep the last known value" on purpose, and the reason is good. The gap is that the switch and the thing it switches share one dependency. There is no second switch written down anywhere |
| T-16 | D | **The `IDEM#<requestId>` row is not cleared when an assessment fails, so the person's own next tap is refused with 409 for ten minutes** | 1 | 3 | **3** | Low | 1 person, for about one second | **Lowered 2026-09-17.** The `assessmentId` is now written on the `IDEM#` row **before** the `202`, at step 9 of `03-api-spec.md` §4, not after a successful call. A resend finds the id and gets the same run, whether that run later succeeded or failed. `409` is only possible in the second between the claim and the write. This is what R-08 in `02-mitigations.md` asked for, and the structure delivered it |

### TB-6 — the API reaches the photo bucket

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-17 | I | The GPS position inside a phone photo reaches the bucket and the provider | 2 | 4 | **8** | Medium | 1 person's home address, sitting in a bucket for 180 days and sent to a third party | The re-encode at step 5b removes it (`03-api-spec.md` §4b). Likelihood 2 is the chance the step is dropped, or that `sharp`'s metadata is put back with `.withMetadata()`. **No test asserts the absence of EXIF in any input** |
| T-18 | I | A 5-minute signed photo URL leaks — a shared screenshot, a browser history, a referrer header | 2 | 3 | **6** | Medium | 1 photo, for up to 5 minutes | Five minutes is short, and `Referrer-Policy: strict-origin-when-cross-origin` sends only the origin (`01-iac-plan.md` §5). This is close to as good as it gets without a much more complicated design |

### TB-7 — the API hands the photo to the model adapter

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-19 | E | **A crafted image reaches libvips through `sharp` and corrupts memory in the `api` function** | 2 | 4 | **8** | Medium | Every row in the table for every account, every object in the bucket (up to 1,800 photos), and the Cognito client secret. **Not the Anthropic API key any more** — since 2026-09-17 only the `assess` function can read it, and `assess` never decodes a photo (ADR-0014). Impact lowered from 5 to 4 for that reason | Four CVEs, published 2026-07-17, in the libvips loaders sharp uses: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591, rated High at CVSS 7.0 ([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), checked 2026-09-01). **The advisory names the GIF loader, and `image/gif` is in `ACCEPTED_PHOTO_TYPES`** (`01-contracts.md` §5). ADR-0002 hands this exact question to this role by name |
| T-20 | D | A small file that decodes into an enormous image — a "decompression bomb" — burns the whole 20,000 ms deadline and the function's memory | 3 | 3 | **9** | Medium | 1 request, and one of the person's ten attempts. Repeated, it holds the reserved concurrency | `sharp` has a `limitInputPixels` guard and **no input sets it**. A 2 MB PNG can decode to a very large surface. Likelihood 3 because it takes no skill |

### TB-8 — the adapter reaches Anthropic

Covered in §3, the LLM pass. TB-8 is where every LLM threat sits.

### TB-9 and TB-10 — sign-in

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-21 | S | The Cognito account is taken over — a reused password, or a guessed one | 2 | 4 | **8** | Medium | 1 person, permanently. Everything T-06 gives, and it does not expire in 30 days | The password policy is "Cognito's own" (`01-iac-plan.md` §4.3) and **no input says what it is**. **No input mentions multi-factor sign-in anywhere.** Self sign-up is off, so there is one account to attack |
| T-22 | R | Nothing in the product records a failed sign-in, so a slow password-guessing attempt leaves no trace anybody looks at | 3 | 2 | **6** | Medium | Nothing on its own. It is the missing warning before T-21 | Cognito keeps its own record. `03-api-spec.md` §11 says what the API logs, and sign-in attempts are not on the list |

### TB-11 and TB-12 — the admin, the AWS console and the table

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-23 | E | **The AWS console sign-in is the only admin path, and it opens everything.** No input says whether multi-factor sign-in is on | 2 | 5 | **10** | **High** | Everything: the $200 credit, the whole table, the whole bucket, both secrets, the user pool, and the ability to flip or hold the kill-switch. **There is no backup** — point-in-time recovery is off (gate 46) | ADR-0009 and gate 30 deliberately put the admin path outside the product. That is a good trade and it makes this one credential carry the whole weight. Likelihood 2 is judgement about one person's own account hygiene, which no input describes |
| T-24 | R | Flipping the kill-switch leaves no record in the product | 3 | 1 | **3** | Low | None | Accepted on purpose (ADR-0009). AWS keeps its own record of console changes. Listed because a later reader will look in the application log and find nothing |

### TB-13 — email delivery

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-25 | D | **The 11-month warning email is not built, so the 12-month account deletion has no warning in front of it** | 5 | 3 | **15** | **Critical** | 1 person loses their whole history with no notice. `factory/feature.md` calls the warning "not optional here" | Likelihood 5: it is already true. Email delivery moved to the notifications run (gate 29). See T-31 |

### TB-14 — the contracts package

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-26 | T | The web and the API validate with two different copies of a schema, so one side accepts what the other refuses | 2 | 2 | **4** | Low | One broken screen | Designed away by one imported package (`01-contracts.md` §1). The one real risk is `z.object` on responses versus `z.strictObject` on requests, and §11a already writes that rule down correctly |

### TB-15 — GitHub Actions reaches AWS

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-27 | E | **A pull request from a stranger runs CI on a public repository, and CI can assume a role that builds a whole AWS environment** | 2 | 5 | **10** | **High** | Everything in T-23, reached without any human sign-in | **Lowered from 15 on 2026-09-17, by reading `04-ci-cd.md` §4**, which this role's `reads:` block did not give it (seam S-901-1). Two of the three properties R-05 asked for are written down and hold: `pr-preview.yml` carries `if: github.event.pull_request.head.repo.full_name == github.repository`, so a fork's pull request never runs it, `pull_request_target` is banned by name in §11, and gate 55 holds every outside run for approval. The preview role's trust `sub` is `repo:poszetkristof/zamphora:pull_request`, not `…:*`, and §4 says plainly why a `*` would be wrong. **The third property is planned and not yet verifiable:** the preview role "may assume the CDK deploy roles for `preview` stacks only" is a sentence, and the IAM policy it describes does not exist yet. So likelihood 2 rather than 1, and the check moves to the pre-deploy list |
| T-28 | I | A secret is committed to the public repository | 2 | 5 | **10** | **High** | Whatever the secret opens. For the Anthropic key that is the $5 balance; for the Cognito client secret it is the sign-in flow | The design is right: both secrets live in Parameter Store, CDK never holds a value, and `.claude/settings.json` denies reading `.env` files (`00-environments.md` §8). **No input names any secret scanning on the repository or in CI.** Likelihood 2 is the chance of one careless paste |
| T-29 | T | A poisoned package runs an install script on the developer's machine or in CI and reads `~/.aws/credentials` | 2 | 5 | **10** | **High** | Everything in T-23 | pnpm 11 blocks install scripts unless the package is in `allowBuilds`, and ADR-0012 names this exact attack. **`sharp` may need to be in that list**, which is the one place the block gets relaxed |
| T-30 | D | The `preview` environment calls the real provider, because `LLM_PROVIDER` is missing or misspelled | 2 | 4 | **8** | Medium | Up to the whole **$5** balance, spent by a pull request nobody is watching | `00-environments.md` §4 sets it from an environment variable read at start-up. **No input says what happens when the variable is absent.** If the fallback is the real adapter, this fails in the expensive direction |

### Retention — the promises that have no mechanism yet

These do not sit on one boundary. They are about data that outlives the rule that was written for it.

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-31 | I | **The 12-month idle-account deletion is not built.** `05-patterns.md` Q-11 names a monthly `Scan`, and nothing in `01-iac-plan.md` creates a schedule, a rule or a function to run it | 5 | 3 | **15** | **Critical** | 1 account's photos and whole history kept past the date the owner set for them | Likelihood 5: it is already true. There is no scheduled anything in the eight CDK stacks. The 180-day photo rule **does** have a mechanism — the S3 lifecycle rule — so this gap is only about the account-level promise |
| T-32 | I | **There is no way for a person to delete their account or all of their data.** `DELETE /api/me/photos` was removed from run 1 on 2026-08-31 and US-10 AC-7 moved with it | 5 | 3 | **15** | **Critical** | 1 person cannot get their own photos and history removed on demand | Likelihood 5: it is already true. One photo can be deleted at a time (`DELETE /api/assessments/:id/photo`). Deleting everything has no route and no screen |
| T-33 | I | The day usage rollup (`PK = USAGE`) has no end date in any input | 3 | 1 | **3** | Low | None. It holds numbers only, no photo and no text (US-12 AC-3) | Listed for completeness. It is the one stored item with no stated life, and it is also the one that matters least |

---

## 3. The OWASP LLM pass

**The list used is the OWASP GenAI LLM Top 10, 2026 edition, published 2026-08-04**
([the project's own repository](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10), checked
2026-09-01). It replaced the 2025 edition. Eight of the ten entries moved position, and one was
renamed.

**Why this pass is not optional here.** Three things are all true at once in this feature: free text
a person typed reaches the model, an uploaded image is treated as content to interpret, and the
model's answer decides what the person is told to do and what date goes into their care schedule.

**One property makes almost every score below smaller than it would be in another product, and it is
worth naming before the table.** The model has **no tools**, makes **one call**, and its answer is
constrained by structured output to a closed shape whose fields are mostly closed lists (ADR-0005,
`01-contracts.md` §4). So a successful attack on the model cannot make it do anything. It can only
change the words that come back. That is the "small blast radius" shape the 2026 edition of the list
says to aim for.

| Item | Applies here? | Threat | L | I | **Score** | Band | Blast radius |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **LLM01:2026 Prompt Injection** | Yes | **T-34.** Instructions hidden in the photo (a plant photographed next to a sheet of printed text is still a photo) or typed into the plant nickname | 4 | 2 | **8** | Medium | 1 person gets a wrong verdict and wrong advice. Nothing else — no tool, no action, no second call |
| **LLM02:2026 Sensitive Information Disclosure** | Yes | **T-35.** A photograph of the inside of a home, and a nickname the person typed, are sent to a third party outside the EU on every assessment | 5 | 3 | **15** | **Critical** | Every photo ever assessed: up to 1,800, about 180 in six months. Likelihood 5 because it is not an attack — **it is what the feature does** |
| **LLM03:2026 Excessive Agency** | Partly | **T-36.** The model chooses `followUpDays`, and that number becomes a dated care task in the person's schedule. That is the model taking an action inside the product | 3 | 2 | **6** | Medium | 1 care task on a wrong date. Bounded to 1 to 30 by a check in our own code, and refused entirely on `cannot-tell` and on `nothing-wrong` |
| **LLM04:2026 Supply Chain** | Yes | **T-37.** A dependency on the money path is compromised or has a known hole. `sharp` and libvips are the live case (T-19). `multer` and `@codegenie/serverless-express` are on the same path | 3 | 4 | **12** | **High** | Everything in T-19's blast radius |
| **LLM05:2026 Data and Model Poisoning** | **No** | Nothing is trained, fine-tuned or stored for the model to learn from. Anthropic states images are not used to train models (`00-context-brief.md` §5.3, quoted in ADR-0007) | — | — | — | — | — |
| **LLM06:2026 Unbounded Consumption** | Yes | **T-38.** Denial of wallet. Calling the paid endpoint faster than a person could, until the balance is empty | 2 | 3 | **6** | Medium | The **$5** balance is about **1,250** assessments. The daily limit caps one account at 10 a day, so one account needs **125 days** to empty it. The feature goes dark until a person pays |
| **LLM07:2026 Misinformation** | Yes | **T-39.** A wrong verdict, said with a `likely` band, kills a plant. **Nobody has measured how often the model is right** | 4 | 3 | **12** | **High** | 1 person's plant, per wrong answer. NFR-20 asks for agreement 8 times in 10 and ADR-0006 says plainly there is **no evidence** for any model yet |
| **LLM08:2026 Hidden Context Exposure** (was System Prompt Leakage) | Yes, and it does not matter | **T-40.** The system prompt is extracted | 3 | 1 | **3** | Low | None. It is a constant with no secret in it, in a **public** repository. It is already published |
| **LLM09:2026 Vector and Embedding Weaknesses** | **No** | There is no vector store, no embedding and no retrieval step anywhere in the design | — | — | — | — | — |
| **LLM10:2026 Improper Output Handling** | Yes | **T-41.** `nextAction` is free text the model wrote. It is stored, and drawn on a screen | 2 | 3 | **6** | Medium | 1 person. The ceiling is that it must never be put into the page as HTML, and must never be used to build a query, a path or a command |

**Two of the ten do not apply, and that is written down rather than left blank.** LLM05 and LLM09
have no surface in this design. If a later run adds a vector store or any kind of retrieval, both
come back and this line is the reminder.

**T-35 is the highest-scoring threat in this file, and it is not a bug.** It scores 15 because the
likelihood is 5 — sending the photo to Anthropic is the feature, not an accident. The score is honest
about that. What follows from it is not "stop doing it"; it is that **the owner has to sign off the
transfer, decide what counts as personal data here, and hold the compliance position**. Those three
are on the list of decisions this role never makes. They go to the owner in `02-mitigations.md` §6.

---

## 4. The agentic pass — over the factory, not the product

**The list used is the OWASP Top 10 for Agentic Applications, 2026 edition, published 2025-12-09**
([OWASP GenAI Security Project](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/),
checked 2026-09-01).

**This is a different system from the product.** Eight roles write files, read files, and reach the
web. They have tools and they have write access to a repository. The product has none of that. So it
gets its own pass, and the findings belong to the factory, not to zamphora.

| Item | Threat to this factory | L | I | **Score** | Band | Blast radius |
| --- | --- | --- | --- | --- | --- | --- |
| **ASI01 Agent Goal Hijack** | **F-01.** A web page a role fetches contains text telling it to change its task. **This role fetched 8 outside pages during this run** | 3 | 3 | **9** | Medium | One document written wrong, in a way that reads correct. It then becomes an input to the next role |
| **ASI02 Tool Misuse & Exploitation** | **F-02.** A role writes outside its `writes:` list and overwrites another role's file | 2 | 4 | **8** | Medium | One role's whole output. The seam ledger would show it, but only afterwards |
| **ASI03 Agent Identity & Privilege Abuse** | **F-03.** A message from another agent is treated as the owner's approval. This is the exact shape a "recorded-open" gate turns into a silent "approved" | 3 | 4 | **12** | **High** | A decision that is the owner's — a retention period, a residual risk, a cost — made by a model and written into a document as settled |
| **ASI04 Agentic Supply Chain Compromise** | **F-04.** Two shapes. First, the factory itself is a plugin at a version path, and a changed version steers all eight roles. Second, **a model invents a package name, a role writes it into a spec, and somebody registers that name** | 2 | 5 | **10** | **High** | Every document in a run, or a dependency on the money path. See §5 for the check that was actually run |
| **ASI05 Unexpected Code Execution** | **F-05.** A specification carries a command, and a later coding session runs it | 2 | 4 | **8** | Medium | The developer's own machine, including `~/.aws/credentials` — which is T-29's blast radius |
| **ASI06 Memory & Context Poisoning** | **F-06.** `.claude/memory/` is committed and loaded every session. A wrong "decision already made" is then never re-asked, by design | 3 | 3 | **9** | Medium | Every later session. The rule "do not re-ask these" is what makes a wrong entry expensive |
| **ASI07 Insecure Inter-Agent Communication** | Not applicable. Roles do not talk to each other. They pass files, and `handoff-map.yaml` names every edge | — | — | — | — | — |
| **ASI08 Cascading Agent Failures** | **F-07.** A wrong number in an early document is copied by four later roles, and it looks confirmed because it appears four times | 3 | 3 | **9** | Medium | A whole run. `03-flow.md` §6 already fights this by listing every guessed number in one place, which is the right pattern |
| **ASI09 Human-Agent Trust Exploitation** | **F-08.** A document written in a confident voice, with a guessed number that reads as measured | 4 | 3 | **12** | **High** | Any decision the owner makes from it. This is the same failure as T-39, one level up |
| **ASI10 Rogue Agents** | Not applicable in run 1. Nothing runs on a schedule and nothing runs without a person starting it | — | — | — | — | — |

### The "lethal trifecta" gate fired during this run

`factory/handoff-map.yaml` `human_gate_policy.stop_when` lists this shape:

> a subagent holds private project data, reads untrusted outside content, and has a way to send data
> out

**All three were true of this role, at the same time, on 2026-09-01.** It held the whole repository
in context, it fetched eight outside pages, and a fetched URL is itself a way to send data out.

**Recorded, with status `recorded-open`. Nothing was sent out.** Every URL fetched came from a search
result chosen by this role, none was built from repository content, and no fetched page changed the
task. It is written down because a gate that fires and is not recorded is the same as a gate that
does not fire. The full entry is in `02-mitigations.md` §6.

---

## 5. The dependency existence check

This role's contract requires every dependency named in a specification to be checked against the
real registry before it is accepted. Models invent package names, and attackers register the invented
ones. **All four below were read from the npm registry on 2026-09-01, and all four are real.**

| Package | Named in | Real? | What was found |
| --- | --- | --- | --- |
| `@nestjs/platform-express` | ADR-0007 (at 11.2.3), `03-api-spec.md` §1 | Yes | Latest is **12.0.1**. Version **11.2.3** exists. Both pin `multer` at exactly **2.2.0** and `express` at **5.2.1** |
| `multer` | ADR-0007 | Yes | Arrives at **2.2.0** through the package above. That is the patched version — see below |
| `@codegenie/serverless-express` | `03-api-spec.md` §1 | Yes | Version **5.0.0**, Apache-2.0, repository `github.com/CodeGenieApp/serverless-express`. It is the named successor to `aws-serverless-express` |
| `sharp` | `03-api-spec.md` §4b, `01-iac-plan.md` §4.4 | Yes | Version **0.35.4**. It ships prebuilt binaries as optional dependencies, including `@img/sharp-linux-arm64`, which is why the arm64 build runner matters |

**The multer version is already safe, and this is worth knowing because ADR-0007 raised it.** That
ADR says multer "has had nine denial-of-service advisories in fourteen months". Two of the recent
ones were checked directly:

- **CVE-2026-2359**, High, CVSS 8.7, published 2026-02-27. A dropped connection during an upload
  causes resource exhaustion. Affects **below 2.1.0**
  ([GHSA-v52c-386h-88mc](https://github.com/advisories/GHSA-v52c-386h-88mc), checked 2026-09-01).
  **This one matters here**, because the design's own budget allows a 4,000 ms upload on a weak
  signal (`03-flow.md` §2), and a weak signal is exactly when a connection drops.
- **CVE-2026-5038**, Moderate, CVSS 5.3, published 2026-06-15. Aborted uploads leave orphaned
  partial files. Affects **2.0.0-alpha.1 to 2.1.x**, patched in **2.2.0**
  ([GHSA-3p4h-7m6x-2hcm](https://github.com/advisories/GHSA-3p4h-7m6x-2hcm), checked 2026-09-01).
  **It only affects `diskStorage`**, and ADR-0007 already requires memory storage. So the design
  avoids it twice over.

**2.2.0 is above both.** The risk that remains is drift: nothing in any input pins or watches this
version over time. That is a control in `02-mitigations.md`, not a threat of its own.

---

## 6. What run `001-photo-assessment` added

This was the first run, so every threat above is new. Three groups exist only because this feature
was chosen first:

- **The whole LLM pass in §3**, and the model adapter boundary TB-8. No other backbone feature calls
  a model.
- **T-17, T-19 and T-20** — everything about decoding an image somebody else supplied. This is the
  only feature that accepts a file.
- **T-35** — sending personal data to a third party. Nothing else in the product leaves AWS.

**A later run that does not add a new outside call, a new store or a new boundary does not need this
pass again.** `factory/feature.md` already says which roles run on a later feature. What that run
**must** do is read this file and check that its own change does not raise a score here. The clearest
example is written in ADR-0004: **run 3 adds a secondary index that crosses accounts, and T-13 is
where that shows up.**

---

## 7. What the 2026-09-17 architecture change added and corrected

The owner moved the assessment into a Step Functions workflow (ADR-0014), the result onto a stream
from a Lambda Function URL (ADR-0015), and allowed a refund when no call was made (ADR-0016). That
added four boundaries, TB-16 to TB-19 in `00-assets.md`, and this section scores them.

**Corrected.** T-10 fell from 6 to 2: the paid call no longer holds an `api` copy. T-16 fell from
12 to 3: the id is on the `IDEM#` row before the `202`, so the lock-out cannot happen. T-19 fell
from 10 to 8: the function that decodes the photo cannot read the model key any more.

**Added.**

| # | S | Threat | L | I | **Score** | Band | Blast radius | Why this score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-42 | D | **The `watch` function's URL is reachable without CloudFront.** A Function URL with `authType: NONE` is a public address. Anybody could hold a 55-second stream open, over and over, against the Lambda allowance, and try assessment ids under a stolen session | 2 | 4 | **8** | Medium | The Lambda free allowance, so the AWS credit (A-11); and A-03 for one account if a session is also held | `01-iac-plan.md` §4.4b sets `AWS_IAM` and origin access control, so only the distribution can call it. Likelihood 2 is one wrong CDK property, which `infra-assert` checks (EV-34) |
| T-43 | D | **A retry cap is raised or a hidden retry is left on.** `MaxAttempts` above 2, `retryOnServiceExceptions` left at its default of six attempts, or `maxRetries` above 0 on the client | 3 | 4 | **12** | **High** | Up to 10 photos a day × up to 6 × 3 calls, against the **$5** balance. A worst day is about **$0.70** instead of $0.12 | Three settings in three files that all have to be right, and two of them have a default that is wrong. Likelihood 3 because a default is the easiest thing to leave alone. `infra-assert` and the NFR-04 stub test are the controls (EV-33) |
| T-44 | D | **A row is left `running` for ever.** A machine-level timeout skips every `Catch`; an `assess` crash outside its own handler; a `mark-failed` invocation that fails twice | 2 | 2 | **4** | Low | 1 person, one attempt spent with no answer and no failure screen. The waiting screen ends at 60 seconds on its own | Three nets: per-task `Catch`, the EventBridge rule, and alarm 12 on the dead-letter queue. Impact 2 because the phone gives up by itself |
| T-45 | T | **The `Refund` step is reached after a call was made**, so a person gets attempts back for calls that were paid | 2 | 3 | **6** | Medium | The daily ceiling stops being a ceiling: a person could spend more than 10 calls a day on the **$5** balance | `Refund` is reachable only from the two refusal branches, and NFR-38 plus `infra-assert` check that. Likelihood 2 because it takes a change to the state machine, which is code review's job |

**Not raised.** T-13, one account reading another's rows: the `watch` function reads the row under
the partition key of the session, exactly as the API does, so the stream adds no new path across
accounts. T-35, personal data to a third party: the same photo goes to the same provider, from a
different function.
