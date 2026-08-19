# Cost guardrails for a factory run

An eight-role run costs roughly fifteen times a single chat. That is fine once. It is not fine by
accident, and it is not fine three times in a row because the first two runs were not read.

## Hard bounds

| Bound | Value |
| --- | --- |
| Subagent calls per run | **One pass per slot.** Eight calls |
| Re-runs of a single slot | **One**, and only after a human read the first output |
| Model | **Default model first.** A premium model needs one named decision, a human review, and the reason written in `run-record.md` |
| Output size | About one page per file. A subagent producing five pages has misread its contract |
| Parallelism | **None.** No background teams, no parallel autonomous workers, no recursive subagent calls |
| Token budget | **250,000 tokens per role.** Past that, stop and ask a person before continuing. A budget with no number is a wish |
| Web access | Only the roles with `tools:` in `subagent-registry.yaml`. Role 100 researches the market. Roles 400, 800 and 900 only check a fact they are about to write down |

## Stop conditions

Stop the run and talk to a person when:

- a slot has stopped twice on the same missing input
- the same seam appears in two consecutive runs
- a slot asks for a paid service, a deployment, or a credential
- you are about to start a third full run in one day

## What is not a cost saving

- **Hand-feeding a subagent the context it should have received.** It makes the run cheaper and the
  evidence worthless. A stop is the finding you paid for.
- **Skipping the adversarial pass.** It is one call, and it is the one that finds the expensive
  mistake.
- **Skipping the seam ledger.** Then the next run repeats the same failure at full price.
- **Re-running a role until its output looks clean.** A role that finishes without writing its named
  output file has given you an under-supply finding. Record it. Re-rolling hides the cause and you
  pay twice.

## The loop that pays this back

```
Run → Evidence → Improvement proposal → Human decision → Factory patch → Next run
```

One finding becomes one suggestion. A person decides whether to apply it. The *next* run tests
whether the patch actually worked. A run that produced no findings either was staged, or was not
read.

## Choosing a model, when the default is not enough

Do not decide by feel. Six steps, and they fit in ten lines of `run-record.md`:

1. Write down 3 or 4 things that matter **before** you run anything — for example accuracy on this
   task, cost per call, speed, how well it follows a long contract.
2. Put **one identical prompt** through two models.
3. Score each model 1 to 3 on each criterion, with one sentence of evidence per score.
4. Pick on the criterion that matters most, not on the total.
5. Name the one thing the losing model was worse at.
6. Write the **active constraint**: what could change this decision in the next 30 days. Prices and
   models both move.

Without this you have a conclusion nobody can check, including you in six months.

## Recording

Every run fills the table in `factory/runs/<slug>/run-record.md`: one row per role call — role, model, why
that model, and roughly how large the output was. It takes a minute and it is the only way to know
whether the line is getting cheaper.
