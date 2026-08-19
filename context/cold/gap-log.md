# Gap log — the cold layer

Things that were decided, or nearly decided, in a conversation that no file can recover. Careful
reading of the repo will not close these, because the reasoning never made it into a file.

Write one when you notice yourself thinking *"we talked about that"*. It costs a minute now and
saves an hour of re-deciding later.

## Format

```markdown
### <short title>

- **Date:** YYYY-MM-DD
- **What is missing:** the fact or the reasoning that only existed in a conversation
- **Why it matters:** what a person or an agent would get wrong without it
- **Closed by:** a file path, once someone writes it down properly
```

---

### The parcel-hub inheritance

- **Date:** 2026-08-18
- **What is missing:** this project's conventions, CI shape and backlog format were carried over
  from an earlier project (`parcel-hub`, Vue 3 + Express 5). The reasons some rules exist are in
  that repository's ADRs, not this one.
- **Why it matters:** a rule with no visible reason gets "cleaned up" eventually. Two carried
  rules with reasons worth re-recording here: colocated tests, and one error contract
  (problem+json) for every non-2xx response.
- **Closed by:** _(open — write the ADRs during the 400-architecture run)_

### Why the stack changed

- **Date:** 2026-08-18
- **What is missing:** Next.js + Nest.js were chosen over staying with Vue + Express partly for
  learning reasons, not only technical ones. That is a legitimate reason and it should be written
  down as one, so nobody later reads a technical justification that was never the real driver.
- **Why it matters:** an honest reason is defensible. A reconstructed one is not.
- **Closed by:** _(open — belongs in `docs/100-consulting/00-context-brief.md`)_

### Why one repository, and why the factory is not a plugin

- **Date:** 2026-08-19
- **What is missing:** the user argued strongly for separate front-end and back-end repositories,
  believing a single repo reads as unprofessional and that publishing a shared package needs its
  own repo. Both beliefs were checked against sources and did not hold. The decision is recorded
  in `.claude/memory/decisions-made.md`, but the **evidence that changed it** would otherwise be
  lost, and without it the argument simply restarts.
- **Why it matters:** a decision with no visible reasoning gets re-opened. Three findings did the
  work: Cal.com runs Next.js + Nest.js in one repo; tRPC publishes independently versioned npm
  packages from one repo using Changesets; Uber runs thousands of services from a few monorepos.
  No public example was found of a known product splitting a Next.js front end from its own back
  end with a published reason, and no evidence was found for "a monorepo reads as junior".
- **Also decided:** the factory is reused as a **GitHub template repository**, not a Claude Code
  plugin. A plugin has no install step and no component type for `factory/*.yaml`, the slot
  contracts or the permission lists, so it would freeze the generated agents away from the YAML
  they are derived from. A plugin may still suit the eight generic skills once a second project
  exists.
- **Closed by:** _(open — `docs/ADR/0001-repository-layout.md`, written during the 400 run)_
