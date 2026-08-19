---
name: project-zamphora
description: What the app is, the hard constraints it must respect, and why cost counts as correctness here.
metadata:
  type: project
---

A plant-care companion for someone who keeps houseplants in an apartment and keeps getting it
wrong. It remembers what each plant needs and when, tells the user what to do today, and lets them
photograph a plant that looks unwell to get an assessment and a next step. Phone first, more than
one language.

**Hard constraints**

- One developer, part-time. There is no team to hand anything to.
- **AWS free account plan** (the July 2025 model). It cannot send a surprise bill — it **closes the
  account** instead and takes the resources with it. Data is kept 90 days after that.
- So the real risk is losing the work, not the money. Everything is in CDK, in git, from the first
  resource, and a destroyed account comes back with one deploy.
- The six-month window has a real end date. It belongs in the context brief in writing.
- GitHub free tier for CI, on a personal account.
- A plant photo is a photo of the inside of someone's home. Personal data from the first document,
  with a retention rule and EXIF stripped.

**Cost is a correctness property here, not a finance one.** A runaway retry loop on a model call
does not produce an invoice, it produces a closed account. Treat an unbounded AI call the same way
you would treat a missing auth check.

**Free-tier traps that are the default somewhere**

- DynamoDB **on-demand** is the CDK default and the not-free one. The allowance is provisioned only.
- A NAT Gateway costs about $33 a month at zero traffic. Never create one.
- Secrets Manager charges per secret. Parameter Store SecureString is free.
- A customer-managed KMS key is $1 a month forever. AWS-managed keys are free.

See [[decisions-made]] and [[where-things-are]].
