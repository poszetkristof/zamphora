# Scratchpad — handoff note for any agent

This file is committed on purpose. It is the short state of the work in progress, so a different
agent or a fresh session can continue without reading the whole chat. Update it after every step.
Delete a section when its work is merged and the real document carries it.

**Last updated:** 2026-09-17, second session on branch `run-1/900-security-docs`.

## What happened on 2026-09-17, in order

### Session one — the architecture change

1. The owner asked for asynchronous cloud shapes to replace "the phone waits for the model". Two
   were drawn, scored and reviewed by a session with no context. The long file is
   `docs/400-architecture/08-async-options.md`; the short one, read first, is
   `08-async-options-short.md`.
2. **The owner chose Option E** and approved the grown shape for runs 2 to 6 (gate 72). The
   decision is in `factory/feature.md`, in ADR-0014 to ADR-0016, and in `00-options.md` §11.
3. Every document was updated for it.
4. **One thing went wrong.** The first pass compressed readable prose into dense fragments. The
   owner stopped it. Every file was restored from git and re-edited in its original style.

### Session two — the audit, and four decisions

A full cross-read of the pack against itself, the security analysis the owner asked for, and the
learning notes brought up to date.

5. **About twenty disagreements between documents were found and fixed.** The full list is in the
   chat; the ones that mattered are below.
6. **The owner answered four questions**, and every answer is written into a file a role can read:
   - **Gate 65, the hard stop, is closed.** Sending the photo outside the EU is accepted for run 1,
     on the household-activity reading: one account, and it is the owner's. The trigger to re-open
     is the day a second person's photo enters the product. **The photo path may now be built.**
   - **Gate 66 is closed.** Nothing is deleted automatically in run 1. The 11-month warning and the
     12-month deletion ship together in run 3's monthly `sweep`. Accepted as RR-11.
   - **Gate 68 is closed.** `image/gif` is out of `ACCEPTED_PHOTO_TYPES`. JPEG, PNG and WebP.
   - **Gate 73 is new and closed.** How `sharp` reaches the Lambda — see below.

## The one blocker the audit found

**`sharp` is a native module and no document said how it gets into the function.** `01-iac-plan.md`
§4.4 bundles with esbuild and ADR-0012 bans `bundling.nodeModules`. esbuild cannot inline a `.node`
binary, so the function would have deployed cleanly and thrown `Cannot find module 'sharp'` on the
first photo somebody sent.

**The answer (gate 73):** mark it external and copy it in after the bundle, together with
`node_modules/@img`, which holds the arm64 binary. The code is in `01-iac-plan.md` §4.4 and the rule
is in ADR-0012's summary. `infra-assert` asserts the asset contains
`node_modules/@img/sharp-linux-arm64`.

## The other findings worth knowing

- **A Critical risk was scored 15 for two weeks because a fact was unknown, not wrong.** T-27 and
  R-05: `04-ci-cd.md` was not in 900-security's `reads:`. Reading it dropped the score to 10. Two of
  the three properties hold as written; the third — that the preview role cannot touch a `Prod`
  stack — is a sentence, not an IAM policy, so it moves to the pre-deploy checklist.
- **R-02's proposed fix would not have worked.** It suggested a DynamoDB `ttl` on the profile item,
  copying the S3 lifecycle pattern. A TTL deletes **one item**, so it would have orphaned the pots,
  assessments, photos and the Cognito user. Written up in `ai-native-delivery.md` §10.
- **The daily limit changed meaning and three files had not noticed.** It counts assessments
  started, not model calls, so ten a day can now cost up to $0.12 rather than $0.040.
- **The Cognito tier was wrong in two places.** It is **Essentials**, corrected 2026-08-31.
  `human-gates.md` gate 52 still held the superseded answer.
- **Two owed changes from gates 53 and 62 had never been applied to ADR-0006.** They are now. One of
  them matters soon: **Claude Haiku 4.5 retires no sooner than 2026-10-15**, four weeks from today.
- **`01-iac-plan.md` §3 listed eight stacks and there are nine.** The ninth is
  `ZamphoraCloudFrontAlarmsStack`, in `us-east-1`, because CloudFront publishes its metrics only
  there.
- **The alarm count is twelve, not eleven**, so two are charged rather than one.

### Session three — the learning materials

7. **`docs/learn/backend-concepts.md` is new**, and the owner approved a fourth note before it was
   written. **74 concepts in seven parts**: the shape of a backend, data, talking to other systems,
   security, running it, how the code is arranged, and AI inside a backend.
8. **The format came from the owner, not from me.** They explained observability — three parts, each
   with the question it answers and the real AWS tool — and said that is how every concept should be
   written. Every entry now follows it: what it is · the parts, each with its question and its real
   tool · what zamphora does · **how else it is done** · the trap. The rule is in
   `.claude/memory/explain-concepts-not-only-decisions.md`.
9. **The other three notes now point into it** and no longer explain a concept in passing without
   naming it. `aws-and-the-pipeline.md` §9 was rewritten to lead with observability as a topic.
10. **A diagram primer was added**, at the top of the concept file: the five kinds of diagram in
    these notes, how to tell them apart, and what to read first in each.
11. **Every edit log was stripped out of the four learning notes.** The owner caught me writing
    "Updated 2026-08-28: sections 2, 7 and 16 changed" into a note. **Git records when a file
    changed; a note records what is true.** Only dates that go stale stayed — a version read from a
    registry, an AWS quota checked on a day. The rule is in
    `.claude/memory/explain-concepts-not-only-decisions.md`.

## Still the owner's, and open

**Three gates. Neither of the hard stops blocks writing code — both are before the first deploy.**

- **Gate 64** — how much web reach a research role gets. The lethal trifecta fired on 900 Security.
- **Gate 69, hard stop** — every residual risk needs a named, reachable person, and gate 58 keeps
  the owner's address out of a public repository. The contract asks for something the privacy rule
  forbids, so this is a change to the plugin as much as an answer.
- **Gate 71, hard stop** — is multi-factor sign-in on the AWS account? It is now item 12 of the
  pre-deploy checklist in `00-environments.md` §10.

Also open: whether to commit this change, and on which branch.

## What an agent does next

1. `/ai-factory:start` to read the state. The next role is **600 QA**. It now has NFR-07, NFR-08 and
   NFR-38 to plan for, EV-33 to EV-36 in the evidence pack, and the four closed gates above.
2. Optional, outside this repo: the AWS service facts from session one belong in the owner's AWS
   study notes. That folder is not a working directory of this session, so nothing was written
   there.
