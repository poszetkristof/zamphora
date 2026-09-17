# Mitigations — what to do about each threat

**Written by** 900 Security, run 1 (`001-photo-assessment`). **Date:** 2026-09-01.
**Updated 2026-09-17, twice.** First for ADR-0014 to ADR-0016: R-08 and RR-03 are closed by the new
structure, R-09 is smaller, R-18 to R-20 are new, and §8 has four more instructions. §10 lists that.
Then an audit of the whole pack closed four of the gates in §6 and found two things wrong here. §11
lists that.
**Read next by** 600 QA. This is the file `factory/handoff-map.yaml` sends to the test role.

`01-threats.md` scores what could go wrong. This file says what to do about it, and what is left over
after that is done.

**Every risk that scored 10 or more gets three fixes, not one.** One control is a single point of
failure dressed as a solution. Three is the smallest set that survives one of them being wrong:

| Fix type | The question it answers | The letter it protects |
| --- | --- | --- |
| **Preventive** | What stops this happening? | The one the threat attacks |
| **Detective** | If it happens anyway, how does anybody find out? | Mostly **I**ntegrity and **A**vailability |
| **Responsive** | Once it is found, what is the first thing a person does? | Mostly **A**vailability |

**C** is confidentiality, **I** is integrity, **A** is availability.

---

## How this file grows

**This file belongs to the whole product.** A later run reads it whole, then adds its own risks under
a new heading at the bottom. It does not rewrite an earlier run's controls, and it never marks a
residual risk as accepted — **only the owner can do that**, and §6 is where the question is asked.

---

## 1. The critical risks — score 15

**Every one of these needs the owner's sign-off before the first line of code.** None of them is
this role's to close.

### R-01 — Personal data goes to a third party on every assessment (T-35, score 15)

A photograph of the inside of a home, and a nickname a person typed, are sent to the Anthropic
Messages API. This is not an attack. It is what the feature does.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Send the least that works. The re-encode at step 5b already strips EXIF, so the location does not travel (`03-api-spec.md` §4b). The photo is capped at 1000 px on its longer side. **Never send the pot's room**, and never send anything from another assessment | **C** |
| **Detective** | Every assessment already records the model id, the token counts and the cost (`03-api-spec.md` §11). Add nothing about the picture. **The count of calls is the record of how many photos left the account** — US-12's three numbers are that log, and they are already written on every row | I |
| **Responsive** | The kill-switch. One row edit stops every new call inside 30 seconds (ADR-0009). That is the fastest control in the whole system, and it is the right one here: it stops the transfer while a question is answered | A |

**What is already good and should not be traded away.** Anthropic states that image uploads are
ephemeral, are not stored beyond the request, and are not used to train models
(`00-context-brief.md` §5.3, quoted in ADR-0007, checked 2026-08-24). Everything else is stored in
`eu-central-1`, which gate 44 chose so that the question of moving personal data out of the EU never
has to be answered for the **stored** copy. The model call is the one place it leaves anyway.

**Residual risk RR-01. Signed off by the owner on 2026-09-17 (gate 65): accepted for run 1.**
The reason that stands on its own, and it is not a legal opinion: in run 1 there is **one account
and it belongs to the owner**, because self sign-up is off and the owner creates every account by
hand (gate 49). **GDPR Article 2(2)(c) excludes processing by a natural person in the course of a
purely personal or household activity**, and a person photographing their own plants for their own
use is that. **The exemption ends the moment a second person's photo enters the product**, which is
already the written trigger on gates 5 and 31 and on RR-01 in §5. On that day the transfer is a real
question with a real answer needed, and it has to be answered before that person signs in, not
after.

### R-02 — The 12-month deletion has no mechanism (T-31, score 15)

`factory/feature.md` says an account with no sign-in for 12 months is deleted. `05-patterns.md` Q-11
names the operation: a monthly `Scan` with a filter. **Nothing in `01-iac-plan.md` creates a schedule,
a rule, or a function to run it.** There are eight CDK stacks and none of them runs anything on a
timer.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | **Nothing is deleted automatically in run 1** (gate 66, the owner, 2026-09-17). The deletion and its warning ship together in run 3, in the monthly `sweep` function of the grown shape that gate 72 approved (`../400-architecture/08-async-options-short.md` §8). **A DynamoDB `ttl` on the profile item was considered and is wrong**, and the reason is worth keeping: **a TTL deletes one item.** It would remove the profile row and leave the pots, the assessments, the photo objects and the Cognito user behind, owned by a profile that no longer resolves. That is worse than deleting nothing. Deleting an account needs something that can walk several items and one bucket prefix, which is a function, not a table setting | **C** |
| **Detective** | One number, once a month: how many profiles have a `lastSignInAt` older than 11 months. If that number is not zero and nothing has run, the promise is broken and somebody can see it | I |
| **Responsive** | Delete by hand from the AWS console, which is already the admin path (gate 30). At one account this is a two-minute job, and it is a real answer rather than a placeholder | A |

**Closed on 2026-09-17 by the owner (gate 66): defer both to run 3, and write that down.**
So the honest position in run 1 is: **the app makes a promise on screen that nothing yet keeps.**
US-10 AC-2 tells the person an idle account is deleted after 12 months. Nothing deletes it. That is
recorded here, in T-31, and in RR-11, rather than hidden. At one account, which is the owner's own,
the cost of the gap is nothing; what it must not do is survive into the run where a second person
signs in. **Run 3's `sweep` function is where this closes, and R-04 ships with it.**

### R-03 — There is no way to delete an account or all of its data (T-32, score 15)

`DELETE /api/me/photos` was removed from run 1 on 2026-08-31, for a good reason: a half-finished bulk
delete is worse than none. US-10 AC-7 moved out with it. What is left is one photo at a time.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Nothing prevents this — it is a missing capability, not an attack. The honest control is to **say so on the screen**: the retention line the design already draws (US-10 AC-1) should not imply a delete-everything button that does not exist | **C** |
| **Detective** | A person asking for it is the detection. There is one account, and the owner is that person | I |
| **Responsive** | Delete by hand: the S3 objects under `photos/<userId>/`, the rows under `USER#<sub>`, and the Cognito user. **Write that sequence down before the first deploy**, because doing it from memory during a request is how a row gets missed | A |

**The order matters and should be recorded now:** delete the Cognito user last. Deleting it first
leaves rows whose owner id no longer resolves to anybody, which is the worst of both.

### R-04 — The 12-month deletion has no warning in front of it (T-25, score 15)

`factory/feature.md` is explicit: *"The warning is not optional here."* Email delivery moved to the
notifications run (gate 29). So the warning does not exist in run 1.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | The cheapest correct answer is not to build email. It is **not to delete anything automatically until the warning exists**. R-02's mechanism and this warning ship together, or neither ships. **The owner chose "neither" for run 1 on 2026-09-17 (gate 66)**, so this holds by construction: no deletion can happen without a warning, because no deletion happens | **C**, A |
| **Detective** | The same monthly number as R-02: how many accounts are past 11 months | I |
| **Responsive** | The owner mails the person by hand. At one account that works, and it is honest | A |

**Answered with R-02 on 2026-09-17 (gate 66): neither in run 1, both in run 3.** The `sweep`
function sends the warning through SES and deletes at 12 months, in that order and a month apart.
SES is **not** on the free plan — it is about $0.10 per 1,000 messages — and one message a year for
one account is a rounding error, which is why it was never the reason to defer.

### R-05 — CI on a public repository can reach AWS (T-27, score 10 since 2026-09-17)

The repository is public (gate 47). `00-environments.md` §9 says a second role, restricted to pull
requests, can build the whole `preview` environment. **When this was written the role could not read
`docs/800-infra/04-ci-cd.md`, so the score was set to 15 because the fact was unknown, not because
the design was wrong** (seam S-901-1).

**That file was read on 2026-09-17 and two of the three properties below hold as written.** The
third is still only a sentence, so the risk drops from Critical to High rather than closing.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Three properties have to be true, and each one is a line somebody can read. **First**, no workflow that can assume an AWS role runs on `pull_request_target` or on a fork's `pull_request` without an approval step. **Second**, the preview role's trust policy pins the `sub` claim to this repository **and** to a pull-request context, not to `repo:owner/name:*`. **Third**, the preview role can create the preview stacks and **cannot touch a `Prod` stack** | **C**, **I** |
| **Detective** | The CDK deploy difference is the record. A preview deploy that names a `Zamphora-Prod-*` stack is the signal, and it is visible in the job output | I |
| **Responsive** | Delete both OpenID Connect roles in the AWS console. That is one action and it stops every deploy, including a good one. The rebuild is `cdk bootstrap` plus two roles, which `00-environments.md` §10 already documents as a by-hand step | A |

**What was found on 2026-09-17, property by property:**

| Property | Verified? | Where |
| --- | --- | --- |
| No AWS-capable workflow runs on `pull_request_target`, or on a fork's `pull_request` without approval | **Yes** | `04-ci-cd.md` §4: `pr-preview.yml` carries `if: github.event.pull_request.head.repo.full_name == github.repository`, §11 bans `pull_request_target` by name, and gate 55 holds every outside run for the owner's approval |
| The preview role's `sub` names the repository **and** a pull-request context | **Yes** | `04-ci-cd.md` §4: the claim is `repo:poszetkristof/zamphora:pull_request`, and the section says plainly that `repo:…:*` would be satisfied by any branch |
| The preview role cannot touch a `Prod` stack | **Not yet.** The plan says so; the IAM policy does not exist | `04-ci-cd.md` §4 describes it in one sentence. **This is the whole of what is left, and it belongs in the pre-deploy checklist** |

**So the remaining work is one check, not five.** When the two OpenID Connect roles are created by
hand (`01-iac-plan.md` §10), read the preview role's policy and confirm it names no `Zamphora-Prod-*`
stack. Until then RR-09 stays open and it is still the owner's to sign.

---

## 2. The high risks — score 10 to 14

### R-06 — A strict Content Security Policy is not available on a static export (T-03, score 12)

Next.js `output: 'export'` writes inline `<script>` tags into the built HTML, and there is no server
to make a per-request nonce ([Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy)
and [vercel/next.js discussion 81703](https://github.com/vercel/next.js/discussions/81703), both
checked 2026-09-01). `01-iac-plan.md` §5 left `script-src` out on purpose and asked this role to
decide it.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | **Use hashes, not `'unsafe-inline'`.** After `next build`, read every inline `<script>` out of the built HTML, take its SHA-256, and write `script-src 'self' 'sha256-…'` into the CloudFront response headers policy. This is a build step, and it is the only way to keep a strict policy on a static export. **If the hashes turn out to change on every build, the answer is still not `'unsafe-inline'` — it is to make the build step produce the policy** | **I** |
| **Detective** | Add `report-to` and a reporting endpoint, **or** — because there is no endpoint and adding one costs money — run the browser once with the policy in `Content-Security-Policy-Report-Only` and read the console. That is a first-deploy check, not a running control, and it is written that way in `03-evidence.md` | I |
| **Responsive** | The policy is one CloudFront property. Changing it is a `cdk deploy` of one stack, and level 3 of the rollback in `01-iac-plan.md` §9 covers it | A |

**The full starting policy, replacing the row in `01-iac-plan.md` §5.** Two lines change and the rest
is confirmed as written:

```
default-src 'self';
script-src 'self' 'sha256-<one hash per inline script, from the build>';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://<the photo bucket host>;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
form-action 'self'
```

Three notes, because each one is a place a later change goes wrong:

- **`style-src` needs `'unsafe-inline'` and that is much less bad than it sounds.** Tailwind produces
  a stylesheet, but a copied shadcn component can carry a `style` attribute. An inline style cannot
  run code. It is worth measuring on the first build and tightening if it is not needed.
- **`form-action 'self'` is added.** Without it, an injected form can post the page's data anywhere.
  It costs nothing and this product submits to its own origin only.
- **`img-src` must name the photo bucket's own host.** Photos come from a signed S3 URL on a
  different host (ADR-0007). Leave it out and every photo silently fails to draw.

### R-07 — The `state` value may not be compared at the callback (T-08, score 12)

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | `GET /api/auth/callback` refuses unless **all four** are true: the `__Host-oauth` cookie is present, the `state` in the query equals the `state` in the cookie, the PKCE verifier from the cookie is sent to the token endpoint, and the ID token's `nonce` matches. **A missing cookie is a refusal, never a fresh sign-in.** Then clear the cookie, whether the exchange worked or not | **I** |
| **Detective** | Log a `state` mismatch by its own name. It is not a normal event, and one of them is worth looking at | I |
| **Responsive** | Delete the session row. Sign-out is a row delete (ADR-0003), so cutting a session that should not exist is one operation | A |

**This is a change owed to `03-api-spec.md` §3**, which lists what the cookie holds and not what the
callback compares. Recorded as seam S-901-2.

### R-08 — A failed assessment locks the person out of their own retry (T-16, score 12)

`03-api-spec.md` §4a: the browser makes one UUID **when the photo is chosen**, so a resend carries
the same id. The `assessmentId` is written onto the `IDEM#` row only at step 14, which only runs on
success. Nothing clears the row on failure. Since 2026-08-26 there is no automatic retry and *"the
person taps again"* is the whole recovery path.

**Both readings of the current text break something**, which is why this is a decision and not a bug
fix:

- If the browser reuses the id after a failure, the person gets `409 request-in-flight` for ten
  minutes after every failure.
- If the browser makes a new id after a failure, the protection against a double charge is gone for
  exactly the case it was written for — a slow upload where the person taps twice.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | **Write the outcome on the `IDEM#` row, not only the success.** On a failure, set a `failedAt` and the failure code. A second send carrying the same id and finding a failure row is allowed to proceed and overwrite. A row with neither an `assessmentId` nor a `failedAt` is genuinely in flight, and only then is `409` correct | **A** |
| **Detective** | Count `409 request-in-flight`. It should be close to zero. A rising count means this rule is wrong | I |
| **Responsive** | The row carries a 10-minute time-to-live, so the worst case already ends by itself. Nothing else is needed once it is counted | A |

**This is 500 Engineering's file to change, not this one.** Recorded as seam S-901-3 and gate
G-901-4, because it changes behaviour a person sees.

**Closed by structure on 2026-09-17.** ADR-0014 writes the `assessmentId` onto the `IDEM#` row
**before** the `202`, at step 9 of `03-api-spec.md` §4, whether the run later succeeds or fails. A
resend finds the id and is answered with the same run. So the preventive fix above is no longer
needed, the `409` can only happen inside the second between the claim and the write, and T-16 is
now Low. The detective count stays: it is cheap and it would show a regression.

### R-09 — A crafted image corrupts memory in the `api` function (T-19, score 8 since 2026-09-17)

**The title of this risk changed on 2026-09-17.** It used to say "the one function that holds
everything". Since ADR-0014 the function that decodes the photo cannot read the model key, so a
compromise of it reaches the table, the bucket and the Cognito secret, and not the $5 balance. The
four preventive fixes below are unchanged and still needed.

Four CVEs in the libvips loaders `sharp` uses, published 2026-07-17, two rated High
([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), checked 2026-09-01):
CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591. **The advisory names the GIF, TIFF
and VIPS loaders. `image/gif` **was** in `ACCEPTED_PHOTO_TYPES` and was removed on 2026-09-17**
(gate 68, `01-contracts.md` §5). Preventive fix 4 below is therefore done; the other three are not.

ADR-0002 hands this question to this role by name: *"900 Security owns this when that role runs, and
should look at it with the `sharp` decode path in `01-iac-plan.md` §4.4 in mind."*

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Four things, and the first three cost nothing. **1.** Pin `sharp` to **0.35.3 or higher**, which carries libvips 8.18.3 with the fixes. Today's latest is 0.35.4. **2.** Call the advisory's own guard at start-up, even on a fixed version, so a future hole in those loaders is closed before it is published: `sharp.block({ operation: ['VipsForeignLoadNsgif', 'VipsForeignLoadTiff', 'VipsForeignLoadVips'] })`. **3.** Set `limitInputPixels` — this also closes T-20. **4.** **DONE 2026-09-17 (gate 68): `image/gif` is out of `ACCEPTED_PHOTO_TYPES`**, because a plant photograph from a phone camera is never a GIF, and the GIF loader is one of the three the advisory names. Do not put it back | **C**, **I** |
| **Detective** | Count decode failures by their own name. A rise is either a broken client or somebody probing the decoder. `03-api-spec.md` §11 already records a failure code per assessment, so this is one more code, not a new mechanism | I |
| **Responsive** | The kill-switch does **not** help here — the decode happens at step 5b, before the kill-switch is read at step 6. So the responsive control is different: **set the `api` function's reserved concurrency to 0 in the AWS console.** That stops every request, including the decode, and it needs no deploy. **Then rotate the Cognito client secret**, because a compromised function could read it. The model key does not need rotating for this risk since 2026-09-17, because the `api` role cannot read it | A |

**Point 4 changed a value a person sees**, because US-01 AC-2 requires the refusal to name the
accepted formats. So it was gate G-901-5, and **the owner answered it on 2026-09-17: drop GIF.**
`01-contracts.md` §5, `02-SPEC.md` state 6 and US-01 AC-2 all name three formats now.

**Two things about this that are easy to get wrong later.** `sharp.block()` has to run once at module
load, not per request, or a cold start races it. And **`.withMetadata()` must never be called** on the
output — it is the one call that puts the EXIF back, which would undo T-17's whole fix.

### R-10 — The AWS console sign-in opens everything, and there is no backup (T-23, score 10)

Gate 30 deliberately moved the admin path outside the product. That removes a whole class of risk and
puts the whole weight on one credential. Point-in-time recovery is off (gate 46), so there is nothing
to restore from.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | **Multi-factor sign-in on the AWS account, on the root user and on any user the owner signs in as.** No input names it, so it may already be on — it has to be checked, not assumed. And the owner should not use the root user for daily work | **C**, **I** |
| **Detective** | AWS's own record of console activity is the only place a kill-switch flip or a table edit appears (ADR-0009). **It is a different place from every other log in this system**, which is why it is written here rather than assumed | I |
| **Responsive** | **The manual export in `01-iac-plan.md` §8 is the whole recovery plan, and it has a date on it: before 2026-12-31.** Bringing it forward is the single cheapest improvement in this file — an export today turns "everything is lost" into "a day of data is lost" | A |

### R-11 — A secret reaches the public repository (T-28, score 10)

The design is already right: both secrets live in Parameter Store, CDK names the parameter and never
holds the value, and `.claude/settings.json` denies reading `.env` files (`00-environments.md` §8).
**No input names any secret scanning.**

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Keep every rule in `00-environments.md` §8 as written. Add one: **the Anthropic admin key never reaches AWS or CI**, which `03-api-spec.md` §8 already says and which is worth repeating because it is the strongest credential in the project | **C** |
| **Detective** | Turn on GitHub secret scanning and push protection. Both are free on a public repository. That is a setting, not a service, and it stops the commit rather than reporting it afterwards | I |
| **Responsive** | **Rotate first, remove second.** A secret in a public repository is public the moment it is pushed, and rewriting the history does not un-publish it. Write the two rotation steps down now: a new Cognito app client secret, and a new Anthropic key | A |

### R-12 — An install script reads the developer's AWS credentials (T-29, score 10)

ADR-0012 names this attack and pnpm 11 blocks install scripts unless a package is listed in
`allowBuilds`.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Keep `allowBuilds` as short as it can be. **Check whether `sharp` needs to be on it at all** — it ships prebuilt binaries as optional dependencies (`@img/sharp-linux-arm64` and the rest, read from the registry 2026-09-01), so it may install with no script. If it does not need to be listed, do not list it | **C** |
| **Detective** | The lock file is the record. A change to `allowBuilds` or a new package with an install script shows up in a pull request difference, and it is small enough to read | I |
| **Responsive** | Rotate the AWS access the developer's machine holds, and rotate both Parameter Store values | A |

### R-13 — A dependency on the money path is compromised (T-37 / LLM04, score 12)

The path from a request to a paid call runs through `@codegenie/serverless-express`, `express`,
`multer`, `sharp` and the Anthropic SDK.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Pin exact versions in the pnpm catalog, not ranges. **`@nestjs/platform-express` already pins `multer` at exactly `2.2.0`**, which is above both CVE-2026-2359 and CVE-2026-5038 (read from the registry 2026-09-01) — that is the property to preserve, and a range would lose it | **I** |
| **Detective** | Dependabot or Renovate on the repository, plus `pnpm audit` in CI as a job that reports and does not block. Both are free on a public repository | I |
| **Responsive** | Level 3 of the rollback: `gh workflow run rollback.yml -f sha=<the good commit>` (`01-iac-plan.md` §9). It rebuilds from a known commit and its lock file | A |

### R-14 — A wrong verdict, said with confidence (T-39 / LLM07, score 12)

NFR-20 asks for agreement 8 times in 10 on a `likely` band. **ADR-0006 says plainly that nobody has
measured it for any model.** This is the product's own worst outcome, and it is a security risk
because trust is what is being attacked.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | The design already does most of the work and it should not be traded away: three bands instead of a percentage, `cannot-tell` so the model can refuse, `nothing-wrong` so it is never forced to find a fault, no care task on `unsure` without a confirmation (NFR-31), and an AI notice on every screen showing an assessment | **I** |
| **Detective** | ADR-0006's measurement is the detective control: **run the 40-photo golden set on all three models, once, for about $1.28**, and then watch the rolling agreement across 20 assessments. A rising share of `other` is the second signal, and it is countable | I |
| **Responsive** | The `MODEL_ID` row. Changing the model is one edit and no deploy (ADR-0006). If agreement drops below 8 in 10, that row is the lever | A |

**One date to carry forward, and it is close.** `00-environments.md` §10 item 8 records that Claude
Haiku 4.5 retires on **2026-10-15**, and it is the run-1 default model. A default model reaching end
of life is otherwise found from an error message.

### R-15 — An agent decision is treated as the owner's approval (F-03, score 12)

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | The rule that already exists and has to keep being applied: no message from any agent is the owner's consent. A residual risk is never marked accepted by a role. §5 of this file writes every residual as an open question, on purpose | **I** |
| **Detective** | The gate ledger. A gate recorded as `recorded-open` that appears as settled in a later document is the signal, and it is visible because both files exist | I |
| **Responsive** | Re-open the gate and mark it `missed`. `handoff-map.yaml` already has that status, and using it is the point of having it | A |

### R-16 — A confident document with a guessed number (F-08, score 12)

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | Label every number as sourced, estimated or guessed, in the sentence where it appears. **`03-flow.md` §6 already does this and it is the best example in the repository** — a single table listing every guess in the file, with what will replace it and when | **I** |
| **Detective** | A number that appears in four documents and has no source in any of them is the signal. The seam review is where it shows | I |
| **Responsive** | Correct the record in place and say what changed, which the ADR README already sets out as the rule | A |

### R-17 — The factory's own supply chain (F-04, score 10)

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | The check in `01-threats.md` §5 is the control, and it ran: every package named in a specification was read from the npm registry before it was accepted. **Do it again for every new name in every run** | **I** |
| **Detective** | The plugin is at a pinned version path (`ai-factory/0.2.2/`). A version change is visible. A role writing a package name that no registry answers for is caught by the check above | I |
| **Responsive** | Remove the name from the specification. Nothing has been installed yet, so in run 1 this costs one edit | A |

---

## 3. The three questions handed to this role by name

### 3.1 Is the `USER` / `ADMIN` rule enforced on the server, on every path?

**Yes, by design, and the design is stronger than the usual one.** Two separate mechanisms answer two
separate questions (ADR-0004):

- **Who may call this route** is a global Nest.js guard reading a decorator. **A route with no
  decorator does not run for anybody.** Three decorators exist and there is never a fourth.
- **Whose data this is** is not a check at all. The owner id is the partition key, and it comes from
  the session only. There is no code path where one account's key names another's row.

**All thirteen routes carry a decorator** (`03-api-spec.md` §2). Three are `@Anonymous()`:
`GET /api/health`, `GET /api/auth/sign-in` and `GET /api/auth/callback`. That set is minimal and
correct — the first two hold nothing, and the third is the one that has to be anonymous to work.
**R-07 is the check the third one is missing.**

**Where the check runs: the file does not exist yet, and no input names its path.** No application
code has been written. `05-patterns.md` §3 says "a single global Nest.js guard", so the shape is
fixed and the location is not. **The first task that writes it must record the path in this section.**
Two properties have to be true of that file and they are testable before it exists:

1. It is registered once, globally, so no route can opt out.
2. It reads the account type from the **profile** item, never from the session and never from a token
   claim (ADR-0003, ADR-0004, US-14 AC-4).

**And NFR-32's router test is not optional.** It walks the whole router and asserts every route
carries one of the three decorators. The guard makes a missing decorator safe; the test makes it
loud. `03-evidence.md` carries both as checks.

### 3.2 Does the sign-in decision still hold against current guidance?

**Yes, and the guidance is stronger now than when ADR-0003 was written.**

ADR-0003 cites `draft-ietf-oauth-browser-based-apps-26` and says: *"It is still a draft and not yet an
RFC."* **That sentence is now out of date.** The draft became **RFC 10017, BCP 212, in August 2026**
([RFC 10017](https://www.rfc-editor.org/rfc/rfc10017.html), checked 2026-09-01).

The three sentences ADR-0003 relies on survived into the RFC, at the same section numbers:

- **§6.1.4.3** — *"This architecture is strongly recommended for business applications, sensitive
  applications, and applications that handle personal data."* That is the Backend-For-Frontend, which
  is what this design uses, for data that is photographs of the inside of a home.
- **§6.1.3.2** — *"The BFF MUST enable the `Secure` flag for its cookies"*, *"The BFF MUST enable the
  `HttpOnly` flag"*, *"The BFF SHOULD enable the `SameSite=Strict` flag"*, *"The BFF SHOULD set its
  cookie path to `/`"*, and *"The BFF SHOULD NOT set the `Domain` attribute for cookies."*

**Every one of those five is already in the design**, in ADR-0003, `05-patterns.md` §2 and
`03-api-spec.md` §3. Nothing has to change.

**One line in the RFC is new and worth writing down.** §6.1.3.2 also says: *"The BFF SHOULD start the
name of its cookie with a prefix indicating the cookie was set via HTTP, for example, by using the
`__Host-Http-` prefix."* That prefix comes from `I-D.ietf-httpbis-layered-cookies`, which is still a
draft, and the RFC does not claim browsers support it.

**So `__Host-` stays.** It is what browsers enforce today, and it already gives the three properties
this design needs: `Secure`, `Path=/` and no `Domain`. **The trigger to look again:** when
`__Host-Http-` is supported by the browsers this product runs on. That is a re-check, not a change,
and it is not urgent.

**Three more sign-in facts checked, and all three hold.**

- **Token lifetime.** No token ever reaches the browser. The Cognito tokens are used once and thrown
  away. There is no refresh token stored anywhere, so there is no long-lived provider credential in
  the table. That is the strongest form of the recommendation, not a compromise.
- **Session lifetime.** 30 days is the owner's decision (gate G-7) and the RFC sets no number. What
  the RFC's shape does give is a real revoke: sign-out is a row delete, not a token waiting to
  expire. The residual is RR-04.
- **The `__Host-` prefix on a free CloudFront hostname.** `00-environments.md` §6 chose
  `d…….cloudfront.net` as the host. The `__Host-` prefix does not care whether a name is pretty, so
  the cookie rules work. **One fact behind this is reported but unverified: whether `cloudfront.net`
  is on the Public Suffix List.** If it is, no other CloudFront customer can set a `Domain=`
  cookie that reaches this host. If it is not, they can — though **not** a `__Host-` prefixed one,
  which only the exact host may set, so the session cookie is safe either way. The check is in
  `03-evidence.md` and it takes one minute.

### 3.3 Is SSE-S3 enough for the photo bucket? (ADR-0007 asked this role to overrule it)

**Recommendation: yes, SSE-S3 is enough for run 1 — and the reason is not "it is free".**

A customer-managed KMS key buys two things: a key policy that can deny a principal even when IAM
allows it, and a record of every decrypt. **Neither helps against the highest risk on this bucket.**
R-09 is a compromised execution role, and that role would hold `kms:Decrypt` along with everything
else. The key would be handed over with the rest.

What it costs is real on this account: a monthly charge per key plus a charge per request, on an
account that **closes** when the credit is gone (ADR-0002).

**Two things must be true for that recommendation to stand**, and both already are: Block Public
Access is on, and no bucket policy grants anonymous read (`01-iac-plan.md` §4.2).

**The trigger to re-open it**, written as a condition and not a feeling: **the day a second person's
photos are in that bucket**, or the day the account leaves the free plan. That is the same trigger
as gates 5 and 31.

**This is a recommendation, not an acceptance.** It is residual risk RR-05 and the owner signs it.

---

## 4. The kill-switch, checked against its three properties

This role's contract asks three things of a kill-switch. Here are all three, answered honestly.

| Property | Answer |
| --- | --- |
| **A named, reachable person** | **The owner** — one person, who is also the developer and the only account holder (`02-containers.mmd`, gate 30). **No input this role may read names a real person or a contact.** The alarm email address is deliberately kept out of the repository (gate 58), so a reachable contact exists and is not written anywhere. **That is correct for a public repository and it means the ledger entry cannot be completed here.** See gate G-901-6 |
| **Independent of the component it kills** | **Partly, and the gap is worth knowing.** It is independent of the code and of a deploy, which is what US-13 AC-2 asks for — no release is needed. **It is not independent of DynamoDB.** The switch is a row in the same table the API reads on every request, and a failed read keeps the last known value, which is `true` (ADR-0009). So a table that cannot be read is a switch that cannot be flipped, while the model calls continue |
| **A test date** | **There is none.** `00-environments.md` §10 lists eight things to do before the first deploy and none of them is "flip the switch and time it". A switch nobody has flipped is a paragraph, in the same way `01-iac-plan.md` §9 says a rollback nobody has run is a plan |

**Three backup switches exist, cost nothing, and are not written down anywhere.** All three are
independent of DynamoDB, and all three should be in the runbook. **Since 2026-09-17 there are four
functions, so the switch has to name one**, and which one depends on what is going wrong:

1. **Set the `assess` function's reserved concurrency to 0** in the AWS console. **This is the one
   that stops the money.** No model call can run, including a run already queued in the workflow.
   The rest of the product keeps working: sign-in, the pots, the photos and the old assessments.
   It is the closest thing to the kill-switch that does not depend on the table being readable.
2. **Set the `api` function's reserved concurrency to 0.** Every request stops at once, including
   the photo decode. It is blunter — it stops the whole product — and it is the right answer to
   R-09, where the harm happens at step 5b, before the kill-switch is even read.
3. **Disable the CloudFront distribution.** This is already the named answer to an edge flood
   (`01-iac-plan.md` §4.4), and it is the outermost stop.

**Two things to add to the pre-deploy checklist in `00-environments.md` §10**, recorded here because
this role may not write that file:

- **Item 9: flip the kill-switch once on purpose, time it, and write the number down.** The promise
  is 60 seconds and the cache is 30.
- **Item 10: run level 3 of the rollback once on purpose.** `01-iac-plan.md` §9 already asks for
  this and it is not on the checklist.

---

## 5. Residual risks

A **residual risk** is what is still there after the controls above are built. Every one carries five
fields, and none of them is accepted here.

**One field cannot be filled by this role.** "A named person" means a real name and a way to reach
them. The only person on this project is the owner, and no input this role may read names them or
gives a contact. Every row says "the owner", and **gate G-901-6 asks for the name and the contact to
be written into the ledger**.

| # | What could still happen | Named person | Review date | Trigger for an earlier review | Who can sign it off |
| --- | --- | --- | --- | --- | --- |
| **RR-01** | Every plant photo and nickname is sent to a third party outside the EU. Anthropic says the images are ephemeral and not used for training, and that is their statement, not something this project can verify | The owner | **2026-12-31**, when the free account plan ends and the project is reviewed anyway | **A second person's photos enter the product** — that is the trigger that ends the household-activity reading — or Anthropic changes its data statement | **Accepted by the owner on 2026-09-17 (gate 65)**, for run 1 only, on the reading in R-01. Re-opening it is the owner's too |
| **RR-02** | A photo can sit in the bucket for a short time after day 180. AWS says *"there may be a delay between the expiration date and the date at which Amazon S3 removes an object"* (ADR-0007). NFR-41 already measures at 182 days | The owner | **2026-12-31** | The number 180 changes, or a person asks how long their photo is really kept | The owner. Gate 27 already exists for this |
| **RR-03** | ~~The one function holds one IAM execution role over the whole table, the whole bucket and both secrets.~~ **Closed 2026-09-17 by ADR-0014.** The model call and its key are in `assess`, with the smallest role in the product; `watch` is read-only; the `api` role can start one state machine and cannot read the model key. What remains: the `api` function still holds one role over the whole table and bucket for every route, `GET /api/health` included. That remainder is RR-10 | The owner | closed | — | — |
| **RR-10** | The `api` function's one role still covers the whole table, the whole bucket and the Cognito secret, for every route. The blast radius of R-09 is that, and it is still every account's rows | The owner | **2026-12-31** | A second person's data is in the table, or R-09 happens | The owner. A per-route role is not possible on one function, and a function per route is the trigger in ADR-0002 |
| **RR-04** | A stolen session cookie works for up to 30 days. Nothing detects it, and there is no "sign out everywhere" | The owner | **2026-12-31** | A second person uses the product, or a device is lost | The owner. The 30 days is gate G-7 and is theirs to change |
| **RR-05** | The photo bucket uses SSE-S3, not a customer-managed key. There is no key policy and no per-decrypt record | The owner | **2026-12-31** | A second person's photos are in the bucket, or the account leaves the free plan | The owner. ADR-0007 asked for exactly this decision |
| **RR-06** | There is no backup. Point-in-time recovery is off (gate 46), so a bad write or a deleted row cannot be undone | The owner | **Before 2026-12-31** — the manual export in `01-iac-plan.md` §8 has that deadline | The table holds a real person's history rather than test rows. `01-iac-plan.md` §8 already names this trigger | The owner |
| **RR-07** | Nobody has measured how often the model is right. NFR-20 asks for 8 in 10 and there is no evidence for any model | The owner | **After the first 20 real assessments**, which `factory/feature.md` already fixes as a review point | The share of `other` verdicts rises, or a plant is lost following the advice | The owner. Accepting an unmeasured accuracy claim is a risk acceptance |
| **RR-08** | Up to 30 seconds of model calls still go out after the kill-switch is flipped | The owner | **2026-12-31** | The switch is used in a real incident and 30 seconds turns out to be too long | The owner. Gate G-8 already accepted this and the reasoning is good |
| **RR-11** | **The app tells the person an idle account is deleted after 12 months, and nothing deletes it** (US-10 AC-2, T-31, T-25). Accepted for run 1 with both the deletion and its warning deferred to run 3 | The owner | **Before run 3 ships, and before a second person signs in, whichever comes first** | A second account exists, or the product is offered to anyone else | **Accepted by the owner on 2026-09-17 (gate 66).** A promise nobody keeps is fine while the only person it is made to is the person who made it. It stops being fine on the first outside account |
| **RR-09** | CI can build a whole AWS environment on a public repository. **Two of the three walls are verified** (R-05, 2026-09-17): fork pull requests cannot run the deploy workflow, and the preview role's trust claim is pinned to a pull-request context. What is left is that the preview role's IAM policy does not exist yet, so nothing proves it cannot touch a `Prod` stack | The owner | **Before the first deploy** | Any change to a workflow trigger | The owner, when the two OpenID Connect roles are created by hand |

---

## 6. Questions for the owner — gates, not decisions

**None of these is answered here.** Each one is on the list of decisions a model never makes: a
retention period, a compliance position, spending money, signing off a residual risk, or changing
what a person sees.

**These gates belong in `factory/runs/001-photo-assessment/human-gates.md`**, and this role may not
write that file. **They have to be copied there.** A gate that fires and is not recorded in the
ledger is a `missed` gate, which `handoff-map.yaml` weighs the same as a broken seam.

| # | The question | The options | Status |
| --- | --- | --- | --- |
| **G-901-1** | **The lethal trifecta fired on this role.** It held the whole repository, fetched 8 outside pages, and a fetched URL is a way to send data out. Nothing was sent, no fetched page changed the task, and every URL came from a search result this role chose. Does the owner accept that shape for a research role, or should web access be narrowed? | **(a)** Accept, and keep the rule that every outside fact carries its link and the date. **(b)** Narrow web access to a list of allowed domains. **(c)** Split the role: one pass with the web and no repository, one with the repository and no web | `recorded-open` |
| **G-901-2** | **Personal data leaves the EU on every assessment (R-01, RR-01).** The photo is of the inside of a home. Does the owner accept the transfer, and what is the compliance position for run 1? | **(a)** Accept for run 1, as a project with one user who is the owner, and re-open the day it is offered to anyone else — the same shape gate 25 already used for the EU AI Act. **(b)** Accept and write a short data statement into the product. **(c)** Do not accept, which means the feature does not ship | **closed 2026-09-17: (a), by the owner.** Accepted for run 1 on the household-activity reading, with the re-open trigger written into RR-01. **The hard stop is lifted, so the photo path may be built** |
| **G-901-3** | **The 12-month deletion and its warning have no mechanism (R-02, R-04).** Both are the owner's own decisions from 2026-08-24, and neither exists in the plan | **(a)** Build neither in run 1 and say so in writing, so no deletion happens without a warning. **(b)** Build the deletion with a DynamoDB `ttl` on the profile item plus a check in code, and delay the warning to the notifications run. **(c)** Build both, which needs email and pulls gate 29's decision forward | **closed 2026-09-17: (a), by the owner.** Neither in run 1. Both ship in run 3's monthly `sweep`. **Option (b) was also found to be wrong** — a DynamoDB TTL deletes one item and would orphan the rest of the account. See R-02 |
| **G-901-4** | **A failed assessment may lock the person out of their own retry for ten minutes (R-08).** Which rule does the owner want? | **(a)** Write the failure on the `IDEM#` row, so a second send is allowed after a failure and refused only while one is genuinely running. **(b)** The browser makes a new id on a retry, which gives back the double-charge risk the row was added to stop | **closed 2026-09-17 by structure.** ADR-0014 writes the id on the `IDEM#` row before the `202`, so the lock-out cannot happen and neither option is needed. See R-08 |
| **G-901-5** | **Drop `image/gif` from the accepted photo formats (R-09).** The libvips GIF loader is one of the three the July 2026 advisory names. A phone camera never produces a GIF. This changes a message a person reads, because US-01 AC-2 says the refusal names the formats | **(a)** Drop GIF, leaving JPEG, PNG and WebP. **(b)** Keep GIF and rely on the `sharp.block()` guard and the version pin alone | **closed 2026-09-17: (a), by the owner.** `ACCEPTED_PHOTO_TYPES` is JPEG, PNG and WebP |
| **G-901-6** | **Every residual risk needs a named, reachable person and this role cannot supply one.** The owner is the only person on the project, and no readable input carries a name or a contact | **(a)** Write the name and a contact into `human-gates.md`, which is not published. **(b)** Name the alarm email address as the contact, which gate 58 keeps out of the repository | `hard-stop` for the ledger. The rest of this file does not depend on it |
| **G-901-7** | **Splitting `POST /api/assessments` into its own function with its own IAM role (RR-03).** It is the structural answer to R-09 and it costs a second deployable unit | **(a)** Not now. ADR-0002's written trigger already covers when. **(b)** Do it now, because the decode path is the one place a compromise is plausible | **closed 2026-09-17** by gate 72 and ADR-0014: the model call has its own function and its own role. The decode stays in `api`, which is RR-10 |
| **G-901-8** | **Multi-factor sign-in on the AWS account (R-10).** No input says whether it is on, and that one credential opens everything with no backup behind it | **(a)** Confirm it is on and record that in the pre-deploy checklist. **(b)** Turn it on before the first deploy | `hard-stop` before the first deploy |

---

## 7. Seams — facts this role needed and no input carried

A **seam** is a place where the line handed a role less than it needed. Recording it is the point;
guessing the fact is the failure.

**These belong in `factory/runs/001-photo-assessment/seam-ledger.md`**, which this role may not write.
**They have to be copied there.**

| # | The fact needed | The file that would have carried it | Label | Effect |
| --- | --- | --- | --- | --- |
| **S-901-1** | The CI workflow triggers, the two OpenID Connect roles' trust policies, and what each role may deploy | `docs/800-infra/04-ci-cd.md` — **not in this role's `reads:` block** | **under-supply** | **Closed 2026-09-17 by reading the file.** T-27 and R-05 were scored at 15 because the fact was unknown; two of the three properties hold and the score is now 10. The seam itself is real and the fix still belongs in the plugin: `04-ci-cd.md` must be added to `900-security`'s `reads:` (run-record change 23), or the next run scores the same wasted Critical again |
| **S-901-2** | Whether `GET /api/auth/callback` compares the `state` in the query with the `state` in the cookie and refuses on a mismatch | `docs/500-engineering/03-api-spec.md` §3, or ADR-0003 | **under-supply** | R-07. The cookie's contents are written down; the comparison is not |
| **S-901-3** | Whether the browser reuses `requestId` after a failed assessment | `docs/500-engineering/03-api-spec.md` §4a | **under-supply** | R-08. Both readings of the current text break something |
| **S-901-4** | The valid range for `DAILY_LIMIT`. `03-api-spec.md` §6 says every `CONFIG` value is checked "against a closed list or a range" and names no range | `docs/500-engineering/03-api-spec.md` §6, or ADR-0008 | **under-supply** | T-14. A limit of 10,000 typed by hand would be $40 a day against a $5 balance |
| **S-901-5** | The Cognito password policy. `01-iac-plan.md` §4.3 says "Cognito's own" and no input says what that is. Nothing anywhere mentions multi-factor sign-in for the product's own users | `docs/800-infra/01-iac-plan.md` §4.3 | **under-supply** | T-21. The account is the strongest key to one person's photos and its strength is unstated |
| **S-901-6** | What happens when `LLM_PROVIDER` is missing or misspelled | `docs/800-infra/00-environments.md` §4 | **under-supply** | T-30. If the fallback is the real adapter, a pull request can spend the $5 balance |
| **S-901-7** | The path of the file the global guard lives in | No input. **No application code exists yet**, so this is a fact that does not exist rather than one that was withheld | **clean, but open** | §3.1. The first task that writes the guard records the path there |
| **S-901-8** | A real name and a contact for the person who owns a residual risk | `factory/runs/001-photo-assessment/human-gates.md` — **not in this role's `reads:` block**, and deliberately not published | **under-supply** | §5 and G-901-6 |

---

## 8. The short list — what a coding agent must not do

Everything above, reduced to instructions. Each one has an explicit "do not".

- **Do not remove the re-encode at step 5b**, and **do not call `.withMetadata()`** on the output. It
  is the only thing that keeps a home address out of the bucket and out of a third party's request.
- **Do not use the bytes that arrived** for the S3 write or the model call. Use the re-encoded bytes.
- **Do not leave `sharp` on a version below 0.35.3**, and **do not remove the `sharp.block()` call**
  for `VipsForeignLoadNsgif`, `VipsForeignLoadTiff` and `VipsForeignLoadVips`.
- **Do not leave `limitInputPixels` unset.**
- **Do not use multer's `diskStorage`**, and do not leave its `limits` unset (ADR-0007). Do not move
  `multer` off the exact version `@nestjs/platform-express` pins.
- **Do not accept a callback with no `__Host-oauth` cookie, and do not skip the `state` comparison.**
  A missing cookie is a refusal, never a fresh sign-in.
- **Do not change `__Host-session` away from `SameSite=Strict`.** It is the only thing standing
  between this product and cross-site request forgery, and there is no token to fall back on.
- **Do not put `'unsafe-inline'` in `script-src`.** Use hashes computed from the build.
- **Do not put a user value in the system prompt**, in any form. Do not build the prompt by joining
  strings.
- **Do not render `nextAction` as HTML**, and do not use any model-written value to build a query, a
  path, a command or a URL.
- **Do not log** the photo bytes, the pot name, the next-action text, the verdict sentence, a cookie
  value or a token (`03-api-spec.md` §11).
- **Do not answer 403** for a row that belongs to somebody else. Answer exactly as if it did not
  exist (ADR-0004).
- **Do not add a `@Public()` style opt-out**, and do not disable NFR-32's router test.
- **Do not let `LLM_PROVIDER` fall back to the real adapter.** The default is the stub, and only
  `prod` names the real one.
- **Do not mark any residual risk in §5 as accepted.** Only the owner can, and §6 is where the
  question is asked.

One more, added 2026-09-17 when the owner answered gate 68:

- **Do not put `image/gif` back into `ACCEPTED_PHOTO_TYPES`**, and do not accept any format whose
  loader is on the `sharp.block()` list. Accepting a type and blocking its loader only produces a
  failure nobody can explain.

Four more, added 2026-09-17 for the background run (ADR-0014 to ADR-0016):

- **Do not give the `api` function's role a read on the model key parameter**, and do not import
  `LlmProvider` into any `api` module. Only `assess` calls the model.
- **Do not create the `watch` Function URL with `authType: NONE`**, and do not add a second
  behaviour that reaches it. One `GET` path, through CloudFront with origin access control, is all.
- **Do not raise `MaxAttempts` above 2, do not leave `retryOnServiceExceptions` at its default, and
  do not set `maxRetries` above 0** on the Anthropic client. Do not add a retry in code anywhere.
  Do not add a `Retry` on a name that is not one of the three thrown ones.
- **Do not put a timeout on the state machine**, and do not make `Refund` reachable from any state
  after `Assess` has made a call. Do not let the browser's `EventSource` reconnect without the
  session cookie: the stream route is guarded exactly as every other route.

---

## 9. What run `001-photo-assessment` added

This was the first run, so every control above is new. Two of them exist only because this feature
was chosen first and a later run inherits them rather than re-deciding them: **the photo decode
guards in R-09**, and **the whole LLM section**. The rest — the sign-in check, the guard, the
secrets, the deploy path, the kill-switch — belong to the product and apply to every feature after
this one.

---

## 10. What the 2026-09-17 architecture change added and corrected

The owner moved the assessment into a Step Functions workflow (ADR-0014), the result onto a stream
(ADR-0015), and allowed a refund when no call was made (ADR-0016). `01-threats.md` §7 scores the
four threats that came with it. This section says what to do about them.

**Closed.** R-08, because the id is on the `IDEM#` row before the `202`. RR-03 and gate G-901-7,
because the model call has its own function and its own role. What RR-03 left behind is RR-10.

**Smaller.** R-09, because the decoding function cannot read the model key.

### R-18 — A retry cap is raised or a hidden retry is left on (T-43, score 12)

Three settings have to be right at once, and two have a wrong default: `MaxAttempts: 2` on the
`Assess` task, `retryOnServiceExceptions: false` on the CDK task, and `maxRetries: 0` on the
Anthropic client.

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | `infra-assert` reads the retry list off the synthesised state machine and fails on anything but the four named errors with `MaxAttempts: 2` (EV-33). The NFR-04 stub test counts calls: three thrown timeouts give exactly 3 | **A** |
| **Detective** | The retry query in `03-observability.md` §7, and alarm 6 on calls per hour | A |
| **Responsive** | The kill-switch stops the next `assess` call inside 30 seconds, because `assess` re-reads it. Then fix the setting | A |

### R-19 — The stream's Function URL becomes public (T-42, score 8)

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | `authType: AWS_IAM` and origin access control on the one CloudFront behaviour that reaches it. `infra-assert` fails on `NONE` (EV-34). The `watch` handler validates the session exactly as the guard does, so even a reached URL answers nothing without a cookie | **C**, **A** |
| **Detective** | Lambda `Invocations` on `watch` against `api` invocations of the assessment route. They should be about equal | A |
| **Responsive** | Set the `watch` function's reserved concurrency to 0 in the console. The fallback `GET` still works, so the product degrades to polling rather than stopping | A |

### R-20 — A row is stranded, or an attempt is refunded after a call (T-44, T-45, scores 4 and 6)

| Fix | What | Protects |
| --- | --- | --- |
| **Preventive** | No machine-level timeout, a `Catch` on every task, the EventBridge rule to `mark-failed`, and `Refund` reachable only from the refusal choice. `infra-assert` checks all four (EV-33, EV-35) | **I**, A |
| **Detective** | Alarm 12 on the dead-letter queue, and alarm 3 on failed executions | A |
| **Responsive** | Write `state: failed` on the stranded row by hand in the console, exactly as the kill-switch is flipped | A |

---

## 11. What the 2026-09-17 audit closed and corrected

An audit read this pack against every other document and against the owner. It changed four risks
and it found two things in this file that were wrong rather than out of date.

**Closed by an owner's answer.**

- **R-01 / gate 65.** The transfer of a photo outside the EU is accepted for run 1, on the
  household-activity reading in R-01, with the re-open trigger written into RR-01. **The hard stop
  on the photo path is lifted.**
- **R-02 and R-04 / gate 66.** Nothing is deleted automatically in run 1. The warning and the
  deletion ship together in run 3's monthly `sweep`. The gap is accepted as RR-11.
- **R-09's fourth preventive fix / gate 68.** `image/gif` is out of `ACCEPTED_PHOTO_TYPES`.

**Lowered by reading a file this role was not given.**

- **R-05 / T-27** fell from 15 to 10. `04-ci-cd.md` §4 answers two of the three properties. Seam
  S-901-1 is closed for this run, and the fix to the handoff map is still owed in the plugin.

**Two things here were wrong, not stale, and that is the difference worth noticing.**

1. **R-02's preventive fix would not have worked.** It proposed a DynamoDB `ttl` on the profile item
   as "the closest match" to the S3 lifecycle rule. **A TTL deletes one item.** It would have
   removed the profile row and left the pots, the assessments, the photo objects and the Cognito
   user behind, owned by an id that no longer resolves. The shape was borrowed from ADR-0007 because
   it reads the same — *let the store do the deleting* — and the two stores do not have the same
   power. **A control copied for its shape rather than its behaviour is the failure this row
   records.**
2. **§4's backup switch said "the function" when there are four functions.** Since ADR-0014 the
   money is spent in `assess`, not in `api`, so setting the `api` function's concurrency to 0 stops
   new requests and does **not** stop a run already queued in the workflow. §4 now names three
   switches and says which one each is for.

**The remaining open gates are 64, 69 and 71.** Gates 69 and 71 are hard stops before the first
deploy. Neither blocks writing code.
