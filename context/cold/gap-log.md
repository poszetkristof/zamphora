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
