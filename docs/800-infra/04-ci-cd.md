# The pipeline — build, test, scan, deploy, and how to go back

**Written by** 800 Infra, run 1 (`001-photo-assessment`). **Date:** 2026-08-27.
**Updated** 2026-08-28 with the owner's answers to gates 43 to 63.
**Read next by** 900 Security, 600 QA.

This file says which workflows exist and what each one runs. It says which checks must pass before a
change can merge, and how a bad change is undone. It solves one problem. A gate has to fail the
change, not the customer.

`06-nfrs.md` §1 already names seven jobs and when each runs. This file turns that table into
workflows, adds the ones it does not name, and answers the question it leaves open — how the deploy
reaches AWS without a stored password.

**The repository is `poszetkristof/zamphora` and it is public** (gate 47, owner, 2026-08-27). That
one fact changes several things in this file, and each is marked where it appears.

**§6 is the list of work owed outside this document.** Two workflow files already exist and one does
not match. Files that belong to other roles need changes this role may not make. Read §6 before
writing any code.

---

## 1. The rules this pipeline is built under

| Rule | Where it comes from |
| --- | --- |
| GitHub Actions. **Minutes are unlimited and free, because the repository is public** | Gate 47 |
| A whole pull-request run finishes in **≤ 10 minutes** | NFR-51. At 15 minutes the repository split trigger fires (ADR-0001) |
| **Every workflow is filtered by path** | NFR-52, ADR-0001 rule 6. A test reads the workflow files and asserts it |
| **Node 24**, pnpm 11, Turborepo | Gate 60, and ADR-0012 for the rest |
| `ai-eval` never runs on a push | NFR-11. 40 photos is $0.16 a run; nightly is the whole balance |
| No AWS access key is ever stored | This role's contract, and common sense on an account that closes |
| **Every action is pinned to a full-length commit SHA** | Gate 57 |
| **Only actions on the allow-list may run** | Gates 59 and 63 |
| **Nothing secret is in the repository** | Gate 47. It is public. Every key is in Parameter Store |

**NFR-51's 10 minutes is still the target even though minutes are now free.** The reason changed
rather than disappearing. It was about a limited allowance. It is now about the developer's own
waiting time, and about ADR-0001's split trigger, which fires at 15 minutes.

### Node 24, and why the number has a date beside it

**Decided by the owner on 2026-08-27, gate 60.** ADR-0012 said Node 22 for both the Lambda runtime
and the CI image. It is now **Node 24 in both places**, and the reason is support length rather than
a feature.

Checked first-hand on the
[AWS Lambda runtimes page](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) on
**2026-08-27**:

| Runtime identifier | Deprecates |
| --- | --- |
| **`nodejs24.x`** — a managed runtime on Amazon Linux 2023 | **2028-04-30** |
| `nodejs22.x` | 2027-04-30 |

**A full year longer.** Node 22 would have meant making this decision again in early 2027, on a
product whose whole AWS account plan ends in 2026. Staying on 22 also lost on three smaller counts.
It would mean downgrading the owner's own machine. It would mean editing
`.github/workflows/ci.yml`, which already says 24. And it would keep three files disagreeing about
one number.

**Write the date next to the number wherever it appears.** A version with no date is a number
somebody has to re-derive. `01-iac-plan.md` §4.4 carries the same table for the Lambda side.

### Pinning, and why it is a security rule rather than tidiness

**Decided by the owner on 2026-08-27, gate 57.**

A label like `actions/checkout@v7` is a moving name. The person who owns the action can point that
label at different code at any time. That code then runs inside the workflow, **next to the one-hour
AWS credentials the deploy job holds**.

So every `uses:` line names a full-length commit SHA. A SHA is the 40-character identifier of one
commit in git:

```yaml
- uses: actions/checkout@<40-character commit sha>   # v7.0.1
```

Three parts, and all three are needed:

1. **The SHA in the `uses:` line.** A commit SHA cannot be moved.
2. **The version in a comment beside it**, so a human can read what it is.
3. **The repository setting *"Require actions to be pinned to a full-length commit SHA"* is ticked**,
   so it cannot slip back to a label by accident.

**Updates still arrive.** Dependabot is already in this repository and opens a pull request when a
new version exists. The change is then approved rather than applied in silence.

**Why OpenID Connect does not cover this.** OpenID Connect, or OIDC, lets GitHub prove to AWS which
repository and which branch a workflow is running in, so AWS can hand out short-lived credentials
with no stored password. It removes the stored password, which is a different attack. It cannot help
once somebody else's code is already running inside the workflow. Pinning and the allow-list in §4
are what cover that case.

**Two rejected options.** Keeping the labels, which is the convenient answer. And pinning only the
workflows that reach AWS. That one fails because it is a rule a person has to remember at every new
workflow, and a rule that depends on memory is the weak part.

## 2. The four questions this pipeline has to answer

1. **What ships?** One esbuild bundle for the API, one folder of static files for the web, one
   CloudFormation change set per stack (`01-iac-plan.md` §2).
2. **Where is the deployment written down?** CDK, in `infra/`, in git. Never a console click.
3. **What is the pipeline?** §5 and §7.
4. **What is the one-step rollback?** §8, and it is `gh workflow run rollback.yml -f sha=<sha>`.

## 3. Every workflow

| File | Runs when | Jobs | Touches AWS |
| --- | --- | --- | --- |
| `ci.yml` | Push to `main`, and every pull request | `detect`, `quality`, `audit`, `test`, `build`, `infra-assert`, **`ci-ok`** | No |
| `codeql.yml` | Push to `main`, every pull request, and weekly | `detect`, `analyze` | No |
| `pr-preview.yml` | Every pull request to `main` **from a branch in this repository** | `deploy-preview`, `bundle-budget`, `e2e`, `perf-flow`, `destroy-preview`, **`preview-ok`** | Yes |
| `deploy-prod.yml` | **A person presses the button** | `deploy` | Yes |
| `rollback.yml` | A person presses the button, with a git SHA | `rollback` | Yes |
| `retention-audit.yml` | Monthly, on a schedule | `retention-audit` | Yes, read only |
| `ai-eval.yml` | **A person presses the button, and never anything else** | `ai-eval` | No — it calls Anthropic |

**Two of these exist today**, `ci.yml` and `codeql.yml`. The other five do not. See §6.

**Only two run on their own without a person or a pull request.** Those are
`retention-audit.yml`, which only reads, and the weekly run of `codeql.yml`, which touches no cloud
account at all.

## 4. How CI reaches AWS with no password

**GitHub OpenID Connect, with a role restricted by repository and by branch.** No
`AWS_ACCESS_KEY_ID`, no `AWS_SECRET_ACCESS_KEY`, nothing long-lived. A stored key on this account is
a key that can end the account. On a public repository, a key committed by accident is a key the
whole internet has.

**One identity provider, created once by the owner:**

```
https://token.actions.githubusercontent.com
audience: sts.amazonaws.com
```

**Three roles, and they are not the same role on purpose.**

| Role | May be assumed from | May do |
| --- | --- | --- |
| `zamphora-github-deploy` | `repo:poszetkristof/zamphora:ref:refs/heads/main` | Assume the CDK deploy roles for the `prod` stacks |
| `zamphora-github-preview` | `repo:poszetkristof/zamphora:pull_request` | Assume the CDK deploy roles for `preview` stacks only |
| `zamphora-github-audit` | `repo:poszetkristof/zamphora:environment:audit` | Read only: `s3:ListBucket`, `s3:GetObject`, `dynamodb:Query`, `dynamodb:Scan`, `cloudformation:Describe*` |

**Why the third role exists** (added 2026-08-31). §8 says the monthly retention audit "uses a
read-only role", but only two roles were defined. A scheduled workflow runs on the default branch,
so its OIDC claim is `repo:poszetkristof/zamphora:ref:refs/heads/main` — which matches the **deploy**
role. An unattended job running every month with nobody watching would have held full deploy rights
on `prod`. That is the exact thing §8's sentence exists to prevent.

**The `environment:audit` claim is what makes it tight.** `retention-audit.yml` declares
`environment: audit`, and GitHub then puts `environment:audit` in the token's `sub` instead of the
branch. So the deploy role's trust policy no longer matches this workflow, and this role's policy
matches nothing else.

**The `sub` condition must name the branch, not just the repository. This is the protection.** A
trust policy that says only `repo:poszetkristof/zamphora:*` can be satisfied by **any** branch in
that repository.

**Both roles are created by hand, once, by the owner** (`01-iac-plan.md` §10). CI cannot create the
role it needs in order to sign in.

### Where the role's ARN lives

**Decided by the owner on 2026-08-27, gate 54: a repository secret, `secrets.AWS_ROLE_ARN`.**

**The honest finding first, because it is the useful part: no placement changes security.** An ARN
is the full name AWS gives to one resource. It contains the 12-digit AWS account id, and it unlocks
nothing on its own. To use it, a caller needs a token signed by GitHub saying the repository and the
branch match the role's trust rule. Nobody else can make GitHub sign one.

A repository variable was equally correct and arguably more honest, since nothing here is secret.
Plain text in the workflow was also safe. **The secret was chosen because it is the common
convention and it keeps the account id off the internet**, which is worth a little on a public
repository.

**Do not mistake the secret for the protection.** The `sub` condition above is the protection.

### The allow-list, and the one action added to it by name

**Set by the owner on 2026-08-27, gate 59.** GitHub's actions policy for this repository is *"Allow
poszetkristof, and select non-poszetkristof"*, with only **"Allow actions created by GitHub"**
ticked.

Every action in use today is GitHub's own — `actions/checkout`, `actions/setup-node`,
`github/codeql-action`.

**`aws-actions/configure-aws-credentials` is the one exception, and it is added by name**
(gate 63, owner, 2026-08-28). `deploy-prod.yml`, `rollback.yml`, `pr-preview.yml` and
`retention-audit.yml` all need it. It is Amazon's action, not GitHub's, so the current list refuses
it, and without the change the first deploy fails with an error about a disallowed action.

- **The entry names that one action, with a commit SHA**, which is the same rule as gate 57.
- **Nothing else changes.** Everything not on the list stays blocked, so the allow-list stays a real
  list of what is trusted.

**Ticking *"Allow actions by Marketplace verified creators"* was rejected, and the reason is worth
keeping. Verified means the publisher is who they say they are. It does not mean the code is safe.**
Ticking it would allow every action from every verified publisher, for ever, in order to get one
action working today.

It is step 3 of the checklist in §10, and it has to happen before the first deploy.

**One setting that was checked and is safe.** Workflow permissions are set to *"Read repository
contents and packages"*. That sets the **default** for `GITHUB_TOKEN` only. A workflow may still ask
for more in its own YAML, so `id-token: write` for OpenID Connect and `security-events: write` for
CodeQL both keep working. Every workflow states its own permissions:

```yaml
permissions:
  contents: read
  id-token: write     # only in the workflows that reach AWS
```

### The public repository has two walls, and neither is a substitute for the other

**Wall one — GitHub will not sign a token for a fork.** A pull request from a fork gets no OpenID
Connect token, because otherwise anybody on the internet could open a pull request that assumes a
role in this AWS account. **This cannot be switched off, and it is the wall that matters.**

So `pr-preview.yml` carries a condition:

```yaml
if: github.event.pull_request.head.repo.full_name == github.repository
```

**Wall two — *"Require approval for all external contributors"*.** Set by the owner on 2026-08-27,
gate 55, in Settings → Actions → General. **No workflow runs on anyone else's pull request until
the owner approves it, every time.** GitHub's own default only holds a *first-time* contributor;
after one merge they would run without asking, and this setting removes that.

**A correction belongs here, because the wrong idea is easy to hold.** There is **no setting that
turns off pull requests from forks** on a public repository. Branch protection stops a pull request
being *merged*. Nothing stops one being *opened*. That is what the two walls above are for.

**Do not use `pull_request_target` to get around wall one.** That trigger runs the *base* branch's
workflow with full permissions while checking out the *fork's* code, which hands a stranger the
account. It is the single most common way a public repository is taken over.

**What that means in practice today:** there is one developer, working on branches in this
repository, so every pull request is a full run. If an outside contribution arrives, the owner reads
it, approves the run, and then re-opens it from a branch here. §9 says what that means for merging.

## 5. `ci.yml` and `codeql.yml` — the fast pipeline, on every push

Everything here is free, needs no AWS credential and no Anthropic key, and is over in a few minutes.

**`ci.yml` is six real jobs plus a guard**, and the shape below is what the file must contain. What
is in the file today is described in §6, and it is not this.

```
detect         is there a package.json yet?
   ├── quality       pnpm format:check, pnpm lint
   ├── audit         pnpm audit --audit-level=high
   ├── test          per workspace: pnpm type-check, pnpm test
   └── infra-assert  cdk synth + assertions, only when infra/ changed
        │
        build        pnpm build   (needs quality and test)
        │
        ci-ok        one of the two required checks. §9
```

| Job | What it runs | Guards |
| --- | --- | --- |
| `detect` | Looks for a `package.json` | Lets CI pass on a repository that is still only specs |
| `quality` | `pnpm format:check`, `pnpm lint` | ADR-0001 rule 1 lives in the linter: no relative import crosses an app border |
| `audit` | `pnpm audit --audit-level=high` | A high or critical advisory stops the merge. Low and moderate are reported and do not fail |
| `test` | Per workspace, in a matrix over `apps/web`, `apps/api`, `packages/contracts`: `pnpm type-check`, then `pnpm test` | NFR-04, NFR-05, NFR-12, NFR-23, NFR-30, NFR-31, **NFR-32**, NFR-34, NFR-35, NFR-36, NFR-42, NFR-43, NFR-52 |
| `infra-assert` | `cdk synth` and assertions, no AWS call | **NFR-40**, and the capacity total in §6 |
| `build` | `pnpm build` | A change that does not build cannot ship |
| `ci-ok` | Asserts every job above succeeded | §9 |

**Every job runs on Node 24** (§1). The runner is set up with `node-version: 24`, which matches the
`nodejs24.x` Lambda runtime in `01-iac-plan.md` §4.4 and the owner's own machine.

**Eight things about this that are decisions rather than habits.**

- **`type-check` runs inside `test`, not beside `lint`.** Vitest does not check types while it runs
  (ADR-0013), so the two belong together in the same job, over the same workspace.
- **The test job is a matrix over the three workspaces.** ADR-0013 gives each package its own
  `vitest.config.ts`, and ADR-0012 says per-package configs are what let Turborepo skip work. A
  matrix keeps the failure message pointed at one package.
- **`infra-assert` makes no AWS call.** It runs `cdk synth` into a template in memory and asserts
  against it, so it needs no credential and costs nothing (`06-nfrs.md` §1). Two assertions on day
  one. First, the photo bucket's lifecycle rule expires objects at exactly 180 days (NFR-40).
  Second, the DynamoDB read and write capacity is 20 in `prod` and 5 in `preview`, and the total
  never adds up to more than 25 (gate 43, `01-iac-plan.md` §4.1).
- **The router test is in `test` and it is the one that guards a security rule.** NFR-32: a test
  walks the whole Nest.js router and asserts every route carries `@Anonymous()`, `@Roles('USER')` or
  `@Roles('ADMIN')`. A new route with none fails the build before anybody can call it (ADR-0004).
- **`--frozen-lockfile` on every install.** A build that quietly changes the lock file is a build
  that shipped something nobody chose.
- **Path filters on every workflow**, per NFR-52 and ADR-0001 rule 6. A change to a document must
  not run the whole pipeline. A test reads the workflow files and asserts each names a `paths`
  filter.
- **Turborepo's cache is stored in the GitHub Actions cache.** No remote cache service, because that
  is a paid product and ADR-0012 already says Turborepo has nothing to cache yet at four packages.
- **Every `uses:` line names a commit SHA** (§1).

**A pull request that deletes a test file fails** unless the commit message says
`DELETE_TESTS: <reason>` (`CLAUDE.md`). That check belongs in this workflow.

### `codeql.yml`

**CodeQL is here because the repository is public** (gate 47). GitHub's own code scanning is free on
a public repository and is charged on a private one. It is the "scan" step of
build → test → scan → deploy, and it costs nothing. **On a private repository this job would have to
go**, which is one of the reasons the owner chose public.

It runs on a push to `main`, on every pull request, and weekly, so new rules are applied even when
nobody pushes. It scans JavaScript and TypeScript with the `security-and-quality` queries. It has
its own guard, because CodeQL fails outright when it finds no source at all.

**CodeQL blocks a merge, and it does so through a different kind of rule.** §9 explains why it could
never have been part of `ci-ok`.

## 6. Work owed outside this document

Two kinds. The first is a file in this repository that disagrees with these specifications. The
second is a set of changes in files that belong to other roles, which this role may name but may not
make.

### 6.1 `.github/workflows/ci.yml` exists and does not match

**Every command in it is `npm`.** `npm ci`, `npm run`, `npm -w`, and `cache: npm`.

**ADR-0012 says pnpm 11 with a workspace catalog, and `docs/context/stack.md` says the same.** So
the file and the decision disagree. **The file is out of date rather than mistaken.** It was written
as a placeholder so that CI would survive a repository that holds only specs and has no
`package.json` yet. It predates ADR-0012.

**This document is right and the file has to change.** Naming it here rather than leaving it to be
discovered is the point of this section.

> **Work owed before the first code lands.** One change to `.github/workflows/ci.yml`:
>
> 1. **Every `npm` command becomes `pnpm`**: `pnpm install --frozen-lockfile`, `pnpm format:check`,
>    `pnpm lint`, `pnpm --filter <workspace> type-check`, `pnpm --filter <workspace> test`,
>    `pnpm build`, `pnpm audit --audit-level=high`. Add the pnpm setup step, because pnpm is not on
>    the runner by default.
> 2. **`cache: npm` becomes the pnpm store cache.**
> 3. **Add the `infra-assert` job** and put it in `ci-ok`'s `needs:` list. NFR-40 has no other place
>    to run.
> 4. **Add a `paths` filter**, which NFR-52 requires of every workflow and the file does not have.
> 5. **Pin every `uses:` to a full-length commit SHA** (gate 57). Today they are `@v7` and `@v4`.
> 6. **`npm audit --package-lock-only` has no exact pnpm equivalent.** `pnpm audit` reads
>    `pnpm-lock.yaml` and does not need an install. Check the flags when the change is written.
>
> **`node-version: 24` is already correct and is not on this list.** Gate 60 chose Node 24, and this
> file was the one that already had it right.
>
> **`.github/workflows/codeql.yml` needs only item 5.** Its shape already matches §5 — the guard,
> the weekly run, the two languages and the `security-events: write` permission are all as this
> document describes. Its `uses:` lines are `@v7` and `@v4` and must become SHAs.
>
> **One thing to remove at the same time, but not before.** The `detect` job exists so CI passes on
> a repository with no `package.json`. **Delete it in the same change that adds the first
> `package.json`.** After that point a missing `package.json` is a failure, not a reason to skip
> every job, and leaving the guard in means a broken repository would go green.

**Nothing above changes what `ci-ok` is or how branch protection works.** That part of the file is
already right, and §9 describes it.

### 6.2 Changes owed in files this role may not write

Every line below was named somewhere in `docs/800-infra/`. They are collected here so the owner has
one list instead of five.

**Status 2026-08-31: the owner applied every line marked DONE below**, plus a set of changes that
came out of a full review of the pack. Lines still marked OWED are the ones left.

**Two lines were missing from this table and are now in it:** `docs/context/stack.md` §3 still said
"fixed at 25 write and 25 read units", and its gotcha table said "run 1 has one table". Only the
Node line was listed. That is how a stale rule survives a list of stale rules.

| File | Section | The change, in one sentence | From |
| --- | --- | --- | --- |
| **DONE** `docs/ADR/0002-run-the-api-on-lambda-and-store-data-in-dynamodb.md` | Decision, and the Agent-Readable Summary | "fixed at 25 write and 25 read units" and "Do not add a second table in run 1" both become: one table per environment, `prod` at 20/20 and `preview` at 5/5, and **the total across every table in the Region must never pass 25** | Gate 43 |
| `docs/ADR/0006-choose-the-model-by-measuring-it.md` | The 2026-08-27 note about the model id | **Both id forms are real, and neither is an error.** `claude-haiku-4-5-20251001` is the pinned snapshot and `claude-haiku-4-5` is an alias pointing at it. Say that the dated snapshot is the one written into `CONFIG`, because a provider can move an alias with no deploy and no warning. **This is a correction, not the removal of a mistake** | Gate 53 |
| `docs/ADR/0006-choose-the-model-by-measuring-it.md` | Decision 3, the run-1 default | Record that **Claude Haiku 4.5 retires no sooner than 2026-10-15** (checked 2026-08-28), and add the re-check trigger. The id lives in a DynamoDB row, not in code, so changing model is one edit and no deploy | Gate 62 |
| **DONE** `docs/ADR/0012-run-the-workspace-on-pnpm-and-turborepo.md` | "What it costs", the second cost | *"pnpm 11 needs Node 22"* becomes **Node 24**, with both deprecation dates written in: `nodejs24.x` deprecates 2028-04-30 and `nodejs22.x` deprecates 2027-04-30 (checked 2026-08-27) | Gate 60 |
| **DONE** `docs/context/stack.md` | §1 | "22 or newer" becomes **24**, so the three files stop disagreeing about one number | Gate 60 |
| **DONE** `docs/context/stack.md` | §3 and the gotcha table | "fixed at 25 write and 25 read units" and "run 1 has **one** table" become the two-table split and the unit-hour model. **This line was missing from the list** | Found 2026-08-31 |
| **DONE** `docs/ADR/0001-keep-one-product-repository.md` | Agent-Readable Summary | The summary named ADR-0012 and then said *"Do not add Turborepo or Nx"* in the next sentence. Turborepo is in use, so that clause told an agent to remove it | Found 2026-08-31 |
| `docs/400-architecture/05-patterns.md` | §1, the item shapes | Add the circuit breaker's row: how many model calls failed in a row, when it opened, when it may next let one call through, and a time-to-live. **It must never be `PK = CONFIG, SK = AI_ENABLED`** | Gate 50 |
| `docs/500-engineering/03-api-spec.md` | §8.1, the item table | Add the same breaker row, so the API's own list of what it reads and writes is complete | Gate 50 |
| `docs/500-engineering/03-api-spec.md` | §4, the fifteen steps | Add the breaker check **between step 6 and step 7** — after the kill-switch, before the daily limit — so an open breaker does not spend one of the person's ten | Gate 50 |
| **DONE** `docs/400-architecture/06-nfrs.md` | NFR-06 | *"Read from the `InitDuration` CloudWatch metric"* is wrong: there is no such metric — use the Logs Insights query in `03-observability.md` §4. **The number also changed, 2026-08-31: 800 ms described a plain Node handler, not a bundled Nest+Express one. It is now 2,000 ms** | Found by this role |
| `docs/500-engineering/03-api-spec.md` | §9, first bullet | The bullet contradicts itself: it says the photo key uses the timestamp "**not** the assessment id", then says the key carries a `#`. ADR-0007 gate 38 settled it — delete the stale half | Found by this role |

**One more, and it is conditional.** If the owner wants the open circuit breaker to have its own
failure code rather than reusing `provider-unavailable`, then
`docs/500-engineering/01-contracts.md` §8 gains the code and `docs/300-design/001-photo-assessment/02-SPEC.md`
§6 gains a screen for it first (ADR-0005). **This role's recommendation is to reuse
`provider-unavailable` and make neither change** — see `02-cost-guardrails.md` §5.

## 7. `pr-preview.yml` — the jobs that need a real deploy

**This workflow does not exist yet.** Gate 43 gave the `preview` environment its own DynamoDB table
at 5 read and 5 write units. `prod` dropped to 20 and 20, so the two fit inside the free allowance
of about 18,250 capacity-unit-hours a month (`00-environments.md` §5). So it can be built.

```
deploy-preview ─> bundle-budget ─> e2e ─> perf-flow ─> destroy-preview  (always runs)
                                                    └─> preview-ok      (always runs)
```

| Job | What it does | Requirement |
| --- | --- | --- |
| `deploy-preview` | `cdk deploy --all` into a stack named for the pull request, in `eu-central-1` | — |
| `bundle-budget` | `size-limit` on the built output for SC-1 | NFR-50 |
| `e2e` | Playwright: sign in, then assert `localStorage` and `sessionStorage` are empty and the only cookie is `__Host-session` with `HttpOnly`, `Secure` and `SameSite=Strict`. Assert the two AI notice lines on SC-3, SC-4 and SC-5 in both languages | NFR-33, NFR-37 |
| `perf-flow` | The whole journey, network throttled to 400 kbps up, a fixed 200 KB photo, the provider replaced by a stub. **Run it twice: once with the stub sleeping 8,000 ms and once with it sleeping 18,000 ms.** Both must assert p95 ≤ 30,000 ms | NFR-01 |
| `destroy-preview` | `cdk destroy --all`, **with `if: always()`** | The environment must not survive a failed run |
| **`preview-ok`** | Asserts the three test jobs succeeded. **`if: always()`** | The second required check. §9 |

**Five things that are easy to get wrong here.**

- **`destroy-preview` must run even when an earlier job failed.** Without `if: always()`, a broken
  test leaves a stack behind. A stack left behind bills 5 read and 5 write units for every hour it
  survives — about 3,650 unit-hours if it lives a month, which is the whole slice the allowance has
  spare. It does not take capacity away from `prod`; it quietly spends the free allowance.
- **`preview-ok` needs `if: always()` for the same reason `ci-ok` does**, and the reason is in §9.
  Its `needs:` list is `[bundle-budget, e2e, perf-flow]` — **not** `destroy-preview`, because a
  clean-up that failed should be seen and fixed but must not block a merge on its own.
- **~~Only one preview environment at a time.~~ Withdrawn 2026-08-31.** This rule was written on the
  belief that 25 capacity units is a ceiling applying at every moment, so two preview tables would
  "break the 25 total". That is not how DynamoDB bills. The allowance is about **18,250
  capacity-unit-hours a month** (`00-environments.md` §5), and a second short-lived preview table
  costs unit-hours, not capacity taken from `prod`. A pull request that lives a few hours costs a
  fraction of a cent. **Two open pull requests are fine.** What still matters is a preview stack left
  running for weeks, and the answer to that is the clean-up job plus the monthly `cdk diff`, not a
  queue.
- **`perf-flow` runs twice, and the second run is the one that matters.** The 8,000 ms stub is the
  budgeted model latency, and `03-flow.md` §6 calls that number *"the weakest in the file. No source
  at all"*. A job that only ever sleeps 8,000 ms can never fail for the reason the architecture
  itself names as its biggest risk. The second run sleeps **18,000 ms** — the point at which the
  server's own 20,000 ms deadline is about to fire — and must still finish under 30,000 ms. The real
  model latency is checked by the first live call, not by this job.
- **The preview environment never calls the real Anthropic API.** `LLM_PROVIDER` is `stub`. NFR-01's
  own description already says the provider is a stub that sleeps for the budgeted time. A preview
  that made real calls would spend the same one $5 balance on every pull request.
- **The e2e sign-in needs an account, and self sign-up is off** (gate 49). The owner creates one
  test account in the `preview` user pool by hand, once. Its password is a GitHub secret, not a file
  in the repository — the repository is public.

**The concurrency group:**

```yaml
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: false
```

**Both lines changed on 2026-08-31, and the second one is the important change.**
`cancel-in-progress: true` can stop a `cdk deploy` in the middle. CloudFormation does not roll back
because the runner went away; the stack is simply left in `UPDATE_IN_PROGRESS` and the next deploy
refuses to start until somebody fixes it by hand. That risk was accepted to protect a capacity limit
that does not work the way this file assumed. With the limit understood correctly, the group is now
per pull request and nothing is cancelled.

**NFR-50 is a placeholder and must be replaced.** `06-nfrs.md` says the 170 KB figure is a guess and
asks for the measurement of the real SC-1. **Build SC-1, measure it, write the real number into
NFR-50 and into the `size-limit` config, in the first web task.**

## 8. The three workflows a person starts

### `deploy-prod.yml`

**`workflow_dispatch` only. A push to `main` does not deploy. Decided by the owner on 2026-08-27,
gate 48.**

Merging builds and tests. Deploying is a separate workflow that a person starts by hand.

**The reason is this account.** A bad deploy can spend credit. The Free account plan then closes the
account rather than sending a bill, and takes the resources with it. The rollback below exists, and
it runs **after** the damage. Automatic deploy on merge is normal practice, and it assumes a bill
somebody can pay.

**The trigger to revisit is a paid plan, not a feeling of confidence.**

```
checkout ─> install ─> build
   ─> aws-actions/configure-aws-credentials with secrets.AWS_ROLE_ARN   (§4)
   ─> cdk deploy --all --require-approval never
```

- `--require-approval never` is safe **only** because the change was already reviewed as code and a
  person pressed the button. It means "do not stop and ask me in the terminal", not "do not ask
  anybody".
- **A concurrency group of `prod`, with `cancel-in-progress: false`.** Two deploys must never run at
  once, and cancelling a deploy halfway is worse than letting it finish.
- The stack order is the one in `01-iac-plan.md` §3.
- **This is the workflow that needs the allow-list entry in §4.** It cannot run until
  `aws-actions/configure-aws-credentials` is allowed by name.

### `rollback.yml` — the one-step rollback

```
gh workflow run rollback.yml -f sha=<the git commit that was good>
```

The workflow checks out that commit, builds it, and runs `cdk deploy --all`. One command, one input,
one result.

**It is one of three levels and they are for three different problems** (`01-iac-plan.md` §9):

| Level | Command | Takes | Undoes |
| --- | --- | --- | --- |
| 1 — stop the money | Set `CONFIG / AI_ENABLED` to `false` in the AWS console | Under a minute | Nothing. It stops new model calls |
| 2 — old API code | `aws lambda update-alias --function-name zamphora-prod-api --name live --function-version <N>` | About a minute | The API code only |
| 3 — everything | `gh workflow run rollback.yml -f sha=<sha>` | One deploy | Code and infrastructure |

**Level 2 gives time and does not end the incident.** The next `cdk deploy` moves the alias forward
again, because CDK believes the alias belongs to the newest code.

**Neither level 2 nor level 3 undoes data. There is no backup at all** (gate 46,
`01-iac-plan.md` §8). A row written by the bad version is still there.

**There is a fourth thing that is not a rollback and needs nobody.** The circuit breaker stops model
calls on its own after five failures in a row (`02-cost-guardrails.md` §5). It is the only
protection in this product that works while everybody is asleep.

### `ai-eval.yml`

**`workflow_dispatch` only, and never on a push. This is the rule that protects the balance.**

`06-nfrs.md` §1 does the arithmetic: 40 photos at $0.0040 is $0.16 a run, so nightly would be about
$4.80 a month, which is the entire Anthropic balance. *A test that empties the balance it is testing
is not a test.*

- The Anthropic key comes from a GitHub **environment** with required reviewers, so starting the
  workflow needs a second click.
- **The script prints its total before it starts and refuses to run if the set is larger than 50
  photos** (NFR-11).
- It runs the golden set for NFR-20, NFR-21 and NFR-22, which is 600 QA's work.
- ADR-0006 uses it once against all three models — 40 × ($0.0040 + $0.0080 + $0.020) = **$1.28** —
  to choose the model by measurement instead of by price.
- **The id it runs against is the dated snapshot `claude-haiku-4-5-20251001`, never the
  `claude-haiku-4-5` alias** (gate 53). An eval run is a measurement, so the model behind it has to
  be one exact version. An alias can move to a newer version with no deploy and no warning, and the
  measurement would then describe a model nobody chose.

### `retention-audit.yml`

Monthly, on a schedule. Lists the photo bucket and asserts no object has a creation date older than
**182 days** (NFR-41).

**182, not 180, and the two extra days have a reason.** AWS states: *"There may be a delay between
the expiration date and the date at which Amazon S3 removes an object"*
([S3 lifecycle expiration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html),
checked 2026-08-25 in `06-nfrs.md`). A test demanding zero objects at day 181 would fail on a working
system. The owner closed this as gate 27 on 2026-08-26: the screen still says 180 days, and the test
checks at 182.

It uses the **read-only** `zamphora-github-audit` role from §4, and declares `environment: audit`
so its OIDC claim cannot match the deploy role. A job that runs unattended once a month must not be
able to delete anything.

**It also runs `cdk diff --all` and fails if anything differs.** §11 of `01-iac-plan.md` says "a
resource created by hand fails this plan", and until now nothing checked. This is the check. It
costs nothing and it is read-only.

## 9. What blocks a merge

**Decided by the owner on 2026-08-27, gates 56 and 61.** Three rules protect `main`, and they are
**two different rule types**. Telling them apart is the whole of this section.

| # | Rule | Type | Exists |
| --- | --- | --- | --- |
| 1 | **`ci-ok`** | Required status check | **Yes, today** |
| 2 | **`preview-ok`** | Required status check | **No — added with `pr-preview.yml`** |
| 3 | **A code scanning rule for CodeQL** | Code scanning rule | To be turned on |

### One aggregate per workflow

**A required status check can only name a check that a workflow reports.** An aggregate check is one
job that passes only when every other job it lists has passed. An aggregate job like `ci-ok` can
only wait on jobs **inside its own workflow file**, because `needs:` does not reach across files.
That is why one aggregate is not enough. This pipeline has two workflows that produce
merge-blocking jobs, so it has two aggregates.

```
ci.yml          quality, audit, test, infra-assert, build   ->  ci-ok
pr-preview.yml  bundle-budget, e2e, perf-flow               ->  preview-ok
```

**Gate 56's reasoning is kept exactly, not weakened.** Its point was that a new job should be
covered with no branch-protection edit, so a job nobody remembered to add cannot become a check
nobody enforces. One aggregate per workflow keeps that: add a job to `ci.yml` and to `ci-ok`'s
`needs:`, and it is enforced the same day.

### `ci-ok`, and why `if: always()` is not optional

```yaml
ci-ok:
  if: always()
  needs: [quality, audit, test, build]     # add infra-assert — see §6.1
  runs-on: ubuntu-latest
  steps:
    - name: Fail unless every job succeeded
      run: |
        [ "${{ needs.quality.result }}" = "success" ] \
          && [ "${{ needs.audit.result }}" = "success" ] \
          && [ "${{ needs.test.result }}" = "success" ] \
          && [ "${{ needs.build.result }}" = "success" ]
```

**A skipped check counts as a pass in branch protection.** Without `if: always()`, a job in `needs:`
that fails makes the aggregate **skip** rather than fail — and a skipped required check does not
block the merge. The failed build would merge.

So `always()` makes the job run whatever happened, and the `run:` step is what turns each result into
a pass or a fail. **The two halves belong together: `always()` alone would make every run green.**

**`preview-ok` is the same shape**, over `[bundle-budget, e2e, perf-flow]`. It carries NFR-01,
NFR-33, NFR-37 and NFR-50 — the four requirements that would otherwise run, report a number and stop
nothing.

### A code scanning rule is not a required status check

**CodeQL could never have been part of `ci-ok`**, and not only because it is in a different file.
The two rule types watch different things:

| | Required status check | Code scanning rule |
| --- | --- | --- |
| Watches | A **check run** a workflow job reports: pass or fail | The **alerts** a scanning tool produced, by severity |
| Named by | The job's name | The tool's name, plus a severity threshold |
| Where in the ruleset | The status-check rule | Its own rule, beside it |

So the ruleset for `main` gains a code scanning rule naming **CodeQL**, with a severity threshold the
owner sets. An alert at or above that level blocks the merge. **Turning it on is a settings change,
not a workflow change** — `codeql.yml` already produces the alerts.

### Two things about `preview-ok` that must not be left implied

**1. A fork's pull request can never satisfy `preview-ok`, so it can never merge on its own.**
GitHub will not sign an AWS token for a fork (§4), so `deploy-preview` cannot run, so the three test
jobs cannot run, so `preview-ok` never reports. A required check that never reports is a merge that
never happens.

**The owner has accepted this.** For a repository with one developer who merges their own branches,
it is the right trade. The path for an outside contribution is the one in §4: the owner reads it,
approves the run, and re-opens the change from a branch in this repository, where all three checks
run.

**2. `preview-ok` goes into branch protection in the same change that adds `pr-preview.yml`, and
never before.** A required check that never reports blocks **every** merge, including the owner's
own. Adding the rule first would lock the repository until the workflow landed. It is step 8 of the
checklist in §10, written as its own line so it cannot be folded into something else.

### The jobs behind the two gates

**They are jobs inside two workflow files, not eight entries in the ruleset.**

| Job | Workflow | Blocks a merge because |
| --- | --- | --- |
| `quality` | `ci.yml` | Formatting, and ADR-0001 rule 1 in the linter: no relative import crosses an app border |
| `test` | `ci.yml` | Type errors, and NFR-04, NFR-05, NFR-12, NFR-23, NFR-30, NFR-31, **NFR-32**, NFR-34, NFR-35, NFR-36, NFR-42, NFR-43, NFR-52 |
| `audit` | `ci.yml` | A high or critical dependency advisory |
| `infra-assert` | `ci.yml` | **NFR-40**, the 180-day lifecycle rule, and the 25-unit capacity total |
| `build` | `ci.yml` | A change that does not build cannot ship |
| `bundle-budget` | `pr-preview.yml` | NFR-50 |
| `e2e` | `pr-preview.yml` | NFR-33, NFR-37 |
| `perf-flow` | `pr-preview.yml` | NFR-01 |

### The rest of the `main` ruleset

- `ci-ok` must pass. `preview-ok` must pass, from the day `pr-preview.yml` lands.
- A CodeQL alert above the chosen severity blocks the merge.
- The branch must be up to date before merging.
- Force push and deletion are off.
- **No review requirement, because there is one developer.** A required review from a person who is
  also the author is a rule that teaches people to click past rules. **The trigger to add it is the
  same as every other trigger in this project: a second person.**

**Every gate above fails the change.** None of them fails the customer, because nothing here runs
against `prod`.

## 10. Before the first deploy, and once afterwards

A checklist. `00-environments.md` §10 has the AWS half; this is the pipeline half.

1. **Rewrite `.github/workflows/ci.yml` from npm to pnpm**, with the six items in §6.1. Do this
   before the first `package.json` lands, or the first real CI run installs with the wrong tool.
2. Pin every `uses:` line in `ci.yml` and `codeql.yml` to a full-length commit SHA, then tick
   *"Require actions to be pinned to a full-length commit SHA"* (gate 57).
3. **Add `aws-actions/configure-aws-credentials` to the actions allow-list by name, with a commit
   SHA** (gate 63). **Do not tick *"Allow actions by Marketplace verified creators"*.** Verified
   means the publisher is who they say they are. It does not mean the code is safe, and ticking it
   would allow every action from every verified publisher for ever. The list is GitHub-authored
   actions only today, so without this entry the first deploy workflow is refused.
4. The owner creates the GitHub OpenID Connect provider and the two roles for
   `poszetkristof/zamphora` (§4).
5. The owner puts the deploy role's ARN in the repository secret `AWS_ROLE_ARN` (gate 54).
6. Confirm the `main` ruleset requires `ci-ok` (§9).
7. **Turn on the code scanning rule for CodeQL in the `main` ruleset**, with a severity threshold
   (gate 61). This can be done today, because `codeql.yml` already produces the alerts.
8. **Add `preview-ok` to the ruleset in the same change that adds `pr-preview.yml` — never before**
   (gate 61). A required check that never reports blocks every merge, including the owner's own.
9. Confirm *"Require approval for all external contributors"* is on (gate 55).
10. The owner creates the GitHub environment that holds the Anthropic key, with required reviewers.
11. The owner creates one test account in the `preview` Cognito pool, and puts its password in a
    GitHub secret. Self sign-up is off (gate 49), so `e2e` cannot make its own.
12. **After the first `prod` deploy, run `rollback.yml` once on purpose**, then deploy the newest
    commit again, and write down how long it took. **A rollback nobody has ever run is a paragraph,
    not a rollback.**
13. Measure SC-1 and replace the 170 KB guess in NFR-50 with the real number.
14. Read `InitDuration` out of the logs and replace the 2,000 ms estimate in NFR-06
    (`03-observability.md` §4).

**Steps 1 to 3 are the ones that fail loudly if they are skipped**, and all three fail at the worst
moment: the first time somebody is trying to ship something.

## 11. What is not in this pipeline, and why

| Not here | Why |
| --- | --- |
| A remote build cache | A paid product. ADR-0012 says Turborepo has nothing to cache yet |
| `cdk-nag` or any infrastructure policy scanner | A new dependency, and infrastructure security review is 900 Security's. **Recommended to them, not added here** |
| A secret scanner beyond GitHub's own | GitHub's built-in secret scanning is free on a public repository and needs no new tool |
| A container build | Nothing in this product is a container (`01-iac-plan.md` §2) |
| A staging deploy | There is no staging environment (`00-environments.md` §2) |
| An automatic deploy on merge | Gate 48: a person starts every deploy |
| `pull_request_target` | It hands a stranger the AWS account. §4 |
| Every Marketplace verified creator | Gate 63: one action by name, not a whole class of publishers. §4 |
| A long list of branch-protection entries | Gates 56 and 61: two aggregate checks, one per workflow, plus a code scanning rule. §9 |

## 12. What this document does not decide

Whether anything is deployed · what counts as a release · the go / no-go on shipping the feature ·
which new scanning tools may be added · the severity threshold on the code scanning rule · what
happens to preview capacity if a second person ever works on this repository at the same time.
