# docs — the warm layer

One folder per role. **One role owns one folder and writes nothing outside it** — that is what
makes a broken handoff visible instead of silently patched over. The owner of every file is
declared in `factory/subagent-registry.yaml`, and `node scripts/check-wiring.mjs` enforces it.

The numbers are role numbers, not a reading order. The line runs
`100 → 200 → 300 → 400 → 500 → 800 → 900 → 600`: Infra before Security because Security reviews the
infra surface, QA last because a real test plan needs everything else already written.

| Folder | Owned by | Holds | Written? |
| --- | --- | --- | --- |
| `context/` | 500-engineering | `stack.md` — the file that does the most work: versions, constraints, gotchas | ☐ |
| `100-consulting/` | 100-consulting | Context brief, ranked use cases, decisions, market scan | ☐ |
| `200-product/` | 200-product | PRD, user stories with testable ACs, traceability | ☐ |
| `300-design/` | 300-design | Journey map, `CONTEXT.md` + `SPEC.md` handoff, tokens | ☐ |
| `400-architecture/` | 400-architecture | Options, C4 diagrams, timed flow, patterns, NFR budgets, pre-mortem | ☐ |
| `500-engineering/` | 500-engineering | Conventions, contracts, web spec, API spec | ☐ |
| `600-qa/` | 600-qa | Test plan, test cases, AI evaluation plan | ☐ |
| `800-infra/` | 800-infra | Environments, IaC plan, cost guardrails, observability, CI/CD | ☐ |
| `900-security/` | 900-security | Assets, threats, mitigations, evidence | ☐ |
| `ADR/` | 400-architecture | Decisions. Each ends in an instruction with an explicit "do not" | ☐ |

Tick a row when its folder is filled by a factory run. An unticked row is not a gap in the plan —
it is a slot that has not run yet. See `/factory-run`.

## Three rules that apply to every file here

1. **A number with nothing checking it is a wish.** Every target in `400-architecture/06-nfrs.md`
   names the test that enforces it and the CI job that runs it.
2. **A decision is not a target.** "We use DynamoDB" is an ADR. "Under 400 ms" is an NFR. They live
   in different files on purpose.
3. **Update the doc in the same change that makes it necessary.** The real risk here is a document
   that no longer matches the code, not a thin one. An out-of-date document is trusted; a thin one
   is not.
