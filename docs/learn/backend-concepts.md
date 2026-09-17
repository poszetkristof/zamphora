# Backend and infrastructure concepts, in plain words

## How every entry is written

The same five parts, every time. Skip the ones an entry does not need.

| Part | What it gives |
| --- | --- |
| **What it is** | One or two plain sentences: the thing, and the problem it solves |
| **The parts** | If it breaks into pieces, each piece with **the question it answers** and **the real tool** |
| **In zamphora** | Where it is in this repository, with a real file and a real value |
| **How else it is done** | The other ways, named, and when each one wins |
| **The trap** | The thing people get wrong, said as a mistake and not as advice |

**This file is not read front to back.** It is a dictionary. The order builds, so reading it in order
works, but the normal use is to look one thing up. **Nothing here is specific to AWS unless it says
so** — the ideas are the same on Google Cloud, on Azure and on a rented server.

---

## How to read the diagrams in these notes

The diagrams in these notes are **five different kinds**. Each kind answers a different question, and
reading one as if it were another is how a picture confuses instead of helping. They are all written in **Mermaid**, which is a plain-text way of describing a diagram —
the source is readable in the file itself, and GitHub draws it.

| Kind | Answers | How to tell | Read it by |
| --- | --- | --- | --- |
| **Flowchart** | What connects to what | `flowchart TD` at the top. Boxes and arrows | Following an arrow from one box to the next. **The arrow labels are the important part** |
| **Sequence** | What happens, in what order, over time | `sequenceDiagram`. Names across the top, vertical lines below | Reading **top to bottom**. Each horizontal arrow is one message. Time goes down, not across |
| **State** | What states a thing can be in, and what moves it | `stateDiagram-v2`. Rounded boxes, `[*]` for start and end | Picking one box and asking which arrows leave it. **An arrow's label is the event that causes the move** |
| **C4 container** | The pieces of one system and their responsibilities | `C4Container`. Boxes with a description inside them | Reading each box's description first, then the arrows. **Every arrow says what crosses it and over what protocol** |
| **Layered flowchart** | What stops what, in order | A `flowchart` where each box is a defence | Top to bottom, asking at each step **what gets through** and what is refused |

**Four habits that make any of them useful.**

- **Read the arrow labels, not only the boxes.** A box says a thing exists. **An arrow label says what
  crosses that line**, and that is where the design actually is. `02-containers.mmd` labels every
  arrow with both the operation and the protocol, on purpose.
- **Look for the box with no arrow in.** It is either the start, or something nobody uses.
- **In a C4 diagram, a missing arrow is a finding.** The pre-mortem in this project caught exactly
  that: a box whose description claimed a connection the diagram never drew, and the missing arrow was
  hiding an undecided question.
- **A diagram that does not match the code is worse than no diagram**, because it is trusted. That is
  why each one in these notes carries the date it was redrawn.

**The C4 model, since it appears by name.** It is a way of drawing software at four zoom levels:
**context** (this system and what it talks to), **container** (the deployable pieces inside it),
**component** (inside one piece), and **code**. **This project draws only the first two**, because the
lower two go out of date the moment somebody refactors, and nobody updates them.

---

## Contents

**A — The shape of a backend**

1. [What a backend is](#1-what-a-backend-is) · 2. [The browser is never trusted](#2-the-browser-is-never-trusted) ·
3. [Stateless and stateful](#3-stateless-and-stateful) · 4. [Synchronous and asynchronous](#4-synchronous-and-asynchronous) ·
5. [API styles: REST, RPC, GraphQL, gRPC](#5-api-styles-rest-rpc-graphql-grpc) ·
6. [The status codes that carry meaning](#6-the-status-codes-that-carry-meaning) ·
7. [Contract-first, and validating at the edge](#7-contract-first-and-validating-at-the-edge)

**B — Data**

8. [SQL and NoSQL](#8-sql-and-nosql) · 9. [Access patterns first](#9-access-patterns-first) ·
10. [Partition key and sort key](#10-partition-key-and-sort-key) · 11. [Indexes](#11-indexes) ·
12. [ACID and transactions](#12-acid-and-transactions) · 13. [Strong and eventual consistency](#13-strong-and-eventual-consistency) ·
14. [Race conditions and atomic writes](#14-race-conditions-and-atomic-writes) ·
15. [Optimistic and pessimistic locking](#15-optimistic-and-pessimistic-locking) ·
16. [Normalised and denormalised](#16-normalised-and-denormalised) · 17. [The N+1 query](#17-the-n1-query) ·
18. [Migrations](#18-migrations) · 19. [Backups, RPO and RTO](#19-backups-rpo-and-rto)

**C — Talking to other systems**

20. [Timeouts and deadlines](#20-timeouts-and-deadlines) · 21. [Retries, backoff and jitter](#21-retries-backoff-and-jitter) ·
22. [Idempotency](#22-idempotency) · 23. [The circuit breaker](#23-the-circuit-breaker) ·
24. [Bulkheads and backpressure](#24-bulkheads-and-backpressure) · 25. [Rate limiting and throttling](#25-rate-limiting-and-throttling) ·
26. [Queues, topics and fan-out](#26-queues-topics-and-fan-out) · 27. [The dead letter queue](#27-the-dead-letter-queue) ·
28. [At-least-once, at-most-once, exactly-once](#28-at-least-once-at-most-once-exactly-once) ·
29. [Orchestration and choreography](#29-orchestration-and-choreography) ·
30. [Getting an answer back later](#30-getting-an-answer-back-later) · 31. [Caching](#31-caching)

**D — Security**

32. [Authentication and authorization](#32-authentication-and-authorization) ·
33. [OAuth 2.0, OpenID Connect and tokens](#33-oauth-20-openid-connect-and-tokens) ·
34. [Sessions, JWTs and the BFF](#34-sessions-jwts-and-the-bff) · 35. [Cookies](#35-cookies) ·
36. [CSRF](#36-csrf) · 37. [XSS and the Content Security Policy](#37-xss-and-the-content-security-policy) ·
38. [CORS](#38-cors) · 39. [Least privilege and IAM](#39-least-privilege-and-iam) ·
40. [Secrets](#40-secrets) · 41. [Trust boundaries and threat modelling](#41-trust-boundaries-and-threat-modelling) ·
42. [OWASP](#42-owasp) · 43. [Defence in depth](#43-defence-in-depth) ·
44. [Personal data, GDPR and retention](#44-personal-data-gdpr-and-retention)

**E — Running it**

45. [Infrastructure as code](#45-infrastructure-as-code) · 46. [Servers, containers, serverless](#46-servers-containers-serverless) ·
47. [Cold starts](#47-cold-starts) · 48. [Scaling up and scaling out](#48-scaling-up-and-scaling-out) ·
49. [Load balancing](#49-load-balancing) · 50. [The CDN and the edge](#50-the-cdn-and-the-edge) ·
51. [DNS](#51-dns) · 52. [Deploy strategies](#52-deploy-strategies) · 53. [Rollback](#53-rollback) ·
54. [Environments](#54-environments) · 55. [Observability](#55-observability) ·
56. [Alerting](#56-alerting) · 57. [SLI, SLO, SLA and the error budget](#57-sli-slo-sla-and-the-error-budget) ·
58. [NFRs and ADRs](#58-nfrs-and-adrs) · 59. [Cost as a correctness property](#59-cost-as-a-correctness-property)

**F — How the code is arranged**

60. [Clean architecture, ports and adapters](#60-clean-architecture-ports-and-adapters) ·
61. [Dependency injection](#61-dependency-injection) ·
62. [Monolith, modular monolith, microservices](#62-monolith-modular-monolith-microservices) ·
63. [Monorepo and polyrepo](#63-monorepo-and-polyrepo) · 64. [CI and CD](#64-ci-and-cd) ·
65. [Trunk-based development](#65-trunk-based-development) · 66. [The testing pyramid](#66-the-testing-pyramid) ·
67. [Feature flags and kill switches](#67-feature-flags-and-kill-switches)

**G — AI inside a backend**

68. [What a model call actually is](#68-what-a-model-call-actually-is) ·
69. [Structured output](#69-structured-output) · 70. [Prompt injection](#70-prompt-injection) ·
71. [Evals and the golden set](#71-evals-and-the-golden-set) · 72. [Tokens, cost and denial of wallet](#72-tokens-cost-and-denial-of-wallet) ·
73. [RAG, embeddings and vector stores](#73-rag-embeddings-and-vector-stores) ·
74. [One call, a chain, or an agent](#74-one-call-a-chain-or-an-agent)

---

# A — The shape of a backend

## 1. What a backend is

**What it is.** A **backend** is a program that sits on a computer you control, waits for requests,
and answers them. It exists for one reason: **there are things the user's device must not be allowed
to do.** It must not hold the database password, it must not decide its own permissions, and it must
not be trusted to say who it is.

**The shape of almost every request**, in four steps that repeat everywhere:

| Step | What happens | Where it goes wrong |
| --- | --- | --- |
| **Route** | The URL and the method pick a handler | Two routes match, or none does |
| **Guard** | Who is this, and may they do this? | The check is missing on one route |
| **Work** | Read or write the store, call another service | The slow part. Everything in part C lives here |
| **Answer** | Turn the result into a status code and a body | Internals leak into the error message |

**In zamphora.** `apps/api` is a Nest.js application. The guard runs before every controller and
refuses any route that does not declare who may call it (ADR-0004). The work is DynamoDB and S3. The
answer is a Zod-validated body, or an RFC 9457 problem document.

**How else it is done.** A **monolith on a rented server** runs the same four steps in a process that
never stops. A **serverless function** runs them in a process that starts on the first request and is
thrown away later. A **BFF**, backend for frontend, is a backend whose only job is to serve one front
end, which is what this project has. The four steps do not change in any of them.

**The trap.** Putting the guard inside the handler instead of in front of it. It works, until
somebody adds route number fourteen and forgets.

## 2. The browser is never trusted

**What it is.** Everything the browser sends can be a lie. A person can open the developer tools, or
skip the browser entirely and send the request with `curl`. So **every check that matters runs again
on the server**, even when the browser already did it.

**The sentence worth memorising:** *a check that only runs in the browser is not a check, it is a
convenience.*

**In zamphora.** The browser checks the photo format and resizes it before uploading, so the person
gets a fast answer and a smaller upload. The API checks the format again, then **decodes and
re-encodes the image** — which proves the bytes really are an image instead of trusting the file name
(`03-api-spec.md` §4, steps 5 and 5b). The web app holds no credentials at all (ADR-0010).

**How else it is done.** Some teams send a signed value from the server and check the signature when
it comes back. That is fine for data the server produced. It does nothing for data the user produced,
which still has to be validated.

**The trap.** Hiding a button and calling it a permission. If the route still answers, the permission
does not exist.

## 3. Stateless and stateful

**What it is.** A server is **stateless** when it keeps nothing in its own memory between requests.
Everything it needs arrives in the request or is read from a shared store. A **stateful** server
remembers things: a signed-in session, an upload in progress, a counter.

**Why the word matters more than it sounds.** A stateless server can be copied. Ten copies behave
identically, so any of them can answer any request and a new copy can be added under load. A stateful
server cannot, unless the state is moved somewhere shared.

| | Stateless | Stateful |
| --- | --- | --- |
| Where the session lives | A shared store | The server's own memory |
| Adding a second copy | Just works | Breaks, unless requests are pinned to one copy |
| A copy dies | Nothing is lost | Whatever it held is lost |

**In zamphora.** Lambda functions are stateless by force, because a copy can be destroyed at any
moment. The session is a row in DynamoDB, not memory. **One thing is deliberately kept in memory:**
the kill-switch value, cached for 30 seconds, and ADR-0009 says out loud what happens while that copy
is wrong.

**How else it is done.** **Sticky sessions** pin one user to one server. That is the old answer and it
makes every deploy painful. **Redis** or **Memcached** as a shared session store is the usual answer
for container and server setups.

**The trap.** In-memory caching that is correct on one copy and wrong across ten, because each copy
has its own idea of the truth.

## 4. Synchronous and asynchronous

**What it is.** **Synchronous** means the caller waits with the connection open until the answer is
ready. **Asynchronous** means the caller is told "I have it, go away", and the answer arrives later by
some other route.

**The one question that decides which a design needs:** is the work reliably faster than the shortest
timeout between the user and the code? If not, it has to be asynchronous.

| | Synchronous | Asynchronous |
| --- | --- | --- |
| The answer code | `200 OK` with the result | `202 Accepted` with an id |
| Who holds the clock | Every layer between: browser, CDN, gateway, function | Only the worker |
| Can it retry? | Rarely. A retry eats the same clock | Yes. The clock is its own |
| Cost | Simple, fewer pieces | A queue or a workflow, a way to report back, more failure states |

**In zamphora.** Run 1 was synchronous: the phone waited while the model answered. That put the model
call under four stacked clocks and left it about 16 seconds. It became asynchronous (ADR-0014): the
API answers `202` in about a second, a Step Functions workflow makes the call, and the
phone gets the result over an open stream. **A retry became possible only because of that change** —
that is the whole trade in one sentence.

**How else it is done.** A **queue plus a worker** is the classic shape: the API writes a message to
SQS or RabbitMQ, and a separate process reads it. A **background job library** such as Sidekiq,
Celery or BullMQ does the same inside one application. A **cron job** handles work with no caller
waiting at all.

**The trap.** Going asynchronous and forgetting that the user still needs the answer. The hard part is
never the queue. It is telling the phone the result is ready — entry 30.

## 5. API styles: REST, RPC, GraphQL, gRPC

**What it is.** Four common ways to shape the calls between a client and a server. They differ in what
the URL means, and in who decides the shape of the answer.

| Style | The idea | Best at | Weak at |
| --- | --- | --- | --- |
| **REST** | URLs are **things**, HTTP methods are the verbs: `GET /pots/42` | Public APIs, caching, being obvious | A screen needing five things makes five calls |
| **RPC** | URLs are **actions**: `POST /assessPlant` | Internal calls that really are function calls | Caching, and agreeing what counts as a "thing" |
| **GraphQL** | One URL. The client writes a query for exactly the fields it wants | Many different screens over one data set | Caching, and one bad query can be very expensive |
| **gRPC** | Binary, defined in a `.proto` file, over HTTP/2 | Service to service, high volume, strict types | Browsers cannot call it without a proxy |

**In zamphora.** REST, and mostly by default rather than by argument: thirteen routes, `GET /api/pots`,
`POST /api/assessments`, ids in the path (`03-api-spec.md` §2). At one user with seven screens, REST's
"five calls per screen" weakness never arrives.

**How else it is done.** **tRPC** is the one worth knowing for a TypeScript project: the client calls
what looks like an ordinary function, and the types come straight from the server with no code
generation. It only works when both sides are TypeScript in one repository, which is exactly this
project's shape. It lost here because shared Zod contracts already give most of the same benefit
without tying the wire format to one language.

**The trap.** Arguing about REST purity. Whether it is `POST /assessments` or `POST /assess` changes
nothing that matters. Whether the response shape is validated on both sides changes a lot.

## 6. The status codes that carry meaning

**What it is.** The three-digit number in every HTTP answer. Most are noise. **About twelve of them
are a design decision**, because a client behaves differently for each one.

| Code | Means | What the client should do |
| --- | --- | --- |
| `200` | Here is the answer | Use it |
| `201` | Created, and here is where it lives | Follow the `Location` header |
| `202` | **Accepted, not finished** | Wait for the result somewhere else |
| `204` | Done, nothing to send back | Nothing |
| `400` | Your request is malformed | Fix it. Retrying the same thing fails the same way |
| `401` | I do not know who you are | Sign in |
| `403` | I know who you are, and no | Stop. Signing in again will not help |
| `404` | No such thing — **or, you may not know** | Stop |
| `409` | Conflict with the current state | Sometimes retry, sometimes not |
| `429` | Too many requests | Wait, then retry. Read `Retry-After` |
| `500` | I broke | Retry carefully |
| `503` | I am temporarily unable | Retry with backoff |

**In zamphora.** `202` is the whole asynchronous change in one status code. **`404` is used where many
systems would use `403`**, on purpose: asking for another account's row answers exactly as if that row
did not exist, so nobody can learn which ids are real (ADR-0004). `409` is the idempotency conflict,
and the design makes it nearly impossible to reach.

**How else it is done.** Some APIs answer `200` with `{"error": ...}` in the body. It is not wrong, but
it breaks every tool that reads status codes — client retries, alarms, CDN caching rules — so it costs
more than it saves.

**The trap.** `403` where `404` would be safer. The first tells an attacker the row exists.

## 7. Contract-first, and validating at the edge

**What it is.** A **contract** is the agreed shape of the data that crosses between two programs.
**Contract-first** means that shape is written down in one place both sides import, rather than being
described twice and drifting apart.

**Validating at the edge** is the matching rule: **untrusted data is checked once, at the boundary,
and everything inside the boundary is then typed and trusted.**

**In zamphora.** Every type that crosses the wire is a **Zod** schema in `packages/contracts`, imported
by the web app and by the API (`01-contracts.md`). Writing `type PlantResponse = {...}` inside an app
is banned by `CLAUDE.md`. Requests use `z.strictObject`, so an unexpected field is refused. Responses
use `z.object`, so adding a field does not break an old client (§11a).

**How else it is done.** **OpenAPI** is a YAML file describing the API, from which clients are
generated. It is the right answer when the two sides are in different languages. **Protobuf** does the
same for gRPC. **JSON Schema** is what Zod compiles down to. zamphora uses Zod because both sides are
TypeScript, so one schema is the validator and the type at the same time.

**The trap.** Trusting a TypeScript type. A type is erased when the code is compiled and checks
nothing at run time. Only the schema actually runs.

---

# B — Data

## 8. SQL and NoSQL

**What it is.** Two families of database, separated by one question: **does the database know the
shape of your data, or do you?**

| | **Relational (SQL)** | **Key-value / document (NoSQL)** |
| --- | --- | --- |
| Examples | PostgreSQL, MySQL, SQLite, Aurora | DynamoDB, MongoDB, Redis, Cassandra |
| The shape | Tables and columns, fixed, enforced by the database | Whatever you write. The database does not care |
| Asking a new question | Write a new `SELECT`. It works | Often impossible without a new index or a full scan |
| Joining two things | Built in, and good at it | You do it yourself, or you store them together |
| Growing very large | Hard past one machine | Designed for it |
| The bill | Usually per hour, whether used or not | Often per request, or per reserved capacity |

**The real difference is when you have to be clever.** With SQL you design the data honestly and get
clever later, when a query is slow. With NoSQL you must be clever **first**, because the questions you
did not plan for are the ones you cannot ask.

**In zamphora.** DynamoDB, one table, key-value. **The reason is not scale — it is the bill.** A
relational database on this AWS plan either has no free offer at all, or is a trial that is switched
off on a free account (ADR-0002). And the eleven questions this product asks of its data are all
"give me this one item" or "give me the items under this one owner" (`00-options.md` §1), which is the
shape key-value is good at. **Honest note in the ADR:** a relational store would not be wrong here, it
is simply not needed and not affordable.

**How else it is done.** **SQLite** is genuinely underrated for a one-user project: one file, no
server, no hourly cost. **Redis** is key-value held in memory — very fast, and it forgets things when
it restarts unless configured not to. **Cassandra** and **ScyllaDB** are what you reach for at a scale
this project will never see.

**The trap.** Choosing NoSQL for "scale" on a project with one user, and then discovering six months
later that the report the business now wants needs a query the key design cannot answer.

## 9. Access patterns first

**What it is.** The design rule for any key-value store, and a good habit even in SQL: **write down
every question the data must answer before you design where it goes.** The key design then comes from
that list, instead of the list being squeezed into a key design somebody guessed.

**What a question looks like when written properly.** Not "we store pots". It is *"which pots does
this one user own, and how often is that asked?"* — an entity, an owner, and a frequency.

**In zamphora.** `00-options.md` §1 lists eleven questions, Q-1 to Q-11, before any technology is
named. **The finding is how short the list is**, and how ten of the eleven name one user or one day.
Only Q-11, "which accounts have not signed in for 11 or 12 months", looks across all accounts — it
runs once a month, and it is exactly the one with no mechanism yet (entry 19).

**How else it is done.** In SQL the same habit is called **query-driven design**, and it is optional
because a missing query is a new `SELECT` rather than a new table. **Event sourcing** turns it around
completely: store every change that ever happened, and build whatever view you need later. That buys
perfect history and costs a lot of machinery.

**The trap.** Designing entities like a class diagram — Pot, Assessment, User — and only then asking
what gets read. In a key-value store that produces a design that answers the easy questions and none
of the real ones.

## 10. Partition key and sort key

**What it is.** How DynamoDB, Cassandra and their family find data fast. The **partition key** decides
**which machine** the item lives on. The **sort key** decides **the order of items inside that
partition**, so a range of them can be read in one go.

| | What it does | What it costs |
| --- | --- | --- |
| **Partition key** | Picks the machine. Must be given exactly — never a range | Two items with different partition keys cannot be read in one query |
| **Sort key** | Orders items inside one partition, and supports "starts with" and "between" | Only useful inside one partition |

**Single-table design** falls out of this: put different kinds of item in the same table, and tell them
apart by a readable prefix in the sort key. One query then returns a user's profile, pots and
assessments together.

**In zamphora.** The partition key is `USER#<sub>` — the owner's id — for nearly everything
(`05-patterns.md` §1). The sort key is `PROFILE`, `POT#<id>`, `ASSESS#<potId>#<timestamp>`,
`TASK#<due>#<id>`, `QUOTA#<date>`. **The security consequence is the important part:** because the
owner id is the partition key and it comes only from the session, there is no code path where one
account's key can name another account's row. **Ownership is not a check that can be forgotten. It is
the address** (ADR-0004).

**How else it is done.** In SQL the same protection is a `WHERE user_id = ?` on every query, which is
a check, which means it can be left out of one query. Row-level security in PostgreSQL moves it into
the database and gets closer to the DynamoDB property.

**The trap.** A **hot partition**: choosing a key that sends most traffic to one machine, such as
today's date. And reaching for a **scan**, which reads the whole table, because the key design cannot
answer the question.

## 11. Indexes

**What it is.** An **index** is a second copy of some of your data, kept in a different order, so a
question that would otherwise read everything can read a little.

**The cost is always the same in every database:** a write now updates the table **and** every index
on it, and each index takes storage. So an index makes reads faster and writes slower and more
expensive.

| | SQL | DynamoDB |
| --- | --- | --- |
| Name | `CREATE INDEX` | **GSI** — global secondary index, a different partition key. **LSI** — local, same partition key, different sort key |
| Without one | A full table scan. Slow, and it still works | Often no way to ask the question at all |
| Added later | Yes, though it locks or rebuilds | Yes for a GSI, and it back-fills |

**In zamphora.** **There is no index in run 1**, and that is written down as a decision rather than an
omission (`03-api-spec.md` §8.1). The first one arrives in run 3, for "which care tasks are due
today", which is the first question that crosses accounts. **ADR-0004 names that index as the place
where the ownership protection can first be undone**, because a global index uses a different
partition key — so the address stops being the owner.

**How else it is done.** A **materialised view** in SQL is the same idea at a larger size. A search
engine such as OpenSearch or Elasticsearch is what you add when the question is "find me anything
containing this word", which no normal index answers well.

**The trap.** Adding an index to fix a slow query without asking what it costs on write. On DynamoDB
there is a second trap: a GSI has its own capacity, so it can be throttled while the table is fine.

## 12. ACID and transactions

**What it is.** A **transaction** is several changes that must all happen or none happen. **ACID** is
the four promises a relational database makes about them.

| Letter | Promise |
| --- | --- |
| **A**tomic | All of the changes, or none. No half-done state |
| **C**onsistent | The database's own rules — keys, constraints — are never broken |
| **I**solated | Two transactions at once do not see each other half-finished |
| **D**urable | Once it says it is saved, a power cut does not lose it |

**The classic example is the only one needed:** moving money. Take 100 from A, add 100 to B. If the
second half fails and the first does not, money has been destroyed.

**In zamphora.** **There is no multi-item transaction anywhere, on purpose.** Every write that must not
be raced is a **single atomic operation on a single item** instead — which is a stronger and simpler
guarantee, because one item is always all-or-nothing. The daily limit is one `UpdateItem` with a
condition (ADR-0008). The idempotency claim is one conditional `PutItem`.

**How else it is done.** DynamoDB does have `TransactWriteItems` for up to 100 items, and it costs
double the capacity. In a distributed system the grown-up answer is usually the **saga**: a sequence of
steps, each with a compensating step that undoes it, because a real transaction across services does
not exist. **zamphora's `Refund` step is a compensating action** — it gives the attempt back when the
run is refused after the count (ADR-0016). That is a saga with one step.

**The trap.** Reading a value, changing it in code, and writing it back. That is not atomic, and entry
14 is what goes wrong.

## 13. Strong and eventual consistency

**What it is.** After a write succeeds, can the next read see it?

- **Strong consistency** — yes, always. Every read sees the newest write.
- **Eventual consistency** — not necessarily. A read may return a slightly old value, and it catches up
  in milliseconds.

**Why anyone would accept the weaker one:** it is cheaper and faster, because the read can be answered
by any copy instead of by the one that holds the truth. On DynamoDB an eventually consistent read costs
**half** a strongly consistent one.

**In zamphora.** The reads that decide something use **strongly consistent** reads, and the free-tier
arithmetic is done against that: 20 read units means about 20 strongly consistent reads a second
(`02-cost-guardrails.md` §3). The kill-switch is different on purpose — it is cached for 30 seconds,
which is **deliberate staleness**, and the promise to the owner is 60 seconds so the stale window fits
inside it (ADR-0009).

**How else it is done.** A read replica of a SQL database is eventually consistent for the same reason
and with the same trade. **CAP** is the name of the underlying rule: when the network between two parts
of a system breaks, a system can stay consistent or stay available, not both.

**The trap.** Writing an item and immediately reading it back with a cheap read, then reporting a bug
that the data "did not save". It did.

## 14. Race conditions and atomic writes

**What it is.** A **race condition** is when two things happen at the same time and the result depends
on which one wins. In a backend it almost always means **read, decide, write** — where somebody else
wrote in the gap.

**The example that shows the whole problem.** The limit is ten. Ten requests arrive together:

```
Wrong:  each reads "9 used"  ->  each decides "9 < 10, allowed"  ->  each writes 10
        Result: ten calls made, counter says 10. Nine too many.

Right:  each sends one operation: "add 1, but only if the value is under 10"
        The database serialises them. Exactly one hits the limit and is refused.
```

**In zamphora.** The daily limit is one `UpdateItem` with `ADD attempts :one` and a condition of
`attempts < :limit` (ADR-0008). **The ADR says plainly that ten simultaneous requests must produce
exactly ten successes, and that a read-then-write would let all ten read 9.** The idempotency row uses
the same shape: a conditional `PutItem` that only succeeds if nothing is there.

**How else it is done.** In SQL it is `UPDATE quota SET used = used + 1 WHERE used < 10` in one
statement, or `SELECT ... FOR UPDATE` which locks the row. Redis has `INCR`, which is atomic for the
same reason.

**The trap.** Believing the race is unlikely because it needs perfect timing. The whole point of an
abuse case is that an attacker sends the ten requests **on purpose**, at the same moment, in a loop.

## 15. Optimistic and pessimistic locking

**What it is.** Two ways to stop two people overwriting each other's edit of the same thing.

| | **Pessimistic** | **Optimistic** |
| --- | --- | --- |
| The idea | Lock it before touching it. Everyone else waits | Do not lock. Check nothing changed when you save |
| How | `SELECT ... FOR UPDATE` | A `version` number, and "write only if version is still 7" |
| Good when | Conflicts are common, and waiting is cheap | Conflicts are rare, which is nearly always |
| The cost | Held locks, queues, deadlocks | The loser has to be told and to retry |

**In zamphora.** **Every item carries a `version` field** (`05-patterns.md` §1), which is optimistic
locking, and the same mechanism is what lets the shape of an item change safely over time. The
conditional writes in entry 14 are the same family: "only if the world still looks like this".

**How else it is done.** HTTP has this built in: `ETag` on the response and `If-Match` on the update,
which answers `412 Precondition Failed` when somebody else got there first. It is the same idea moved
one layer out, and it is worth knowing because almost nobody uses it.

**The trap.** Neither one, and calling it fine because two people never edit at once. Then two browser
tabs belonging to one person do exactly that.

## 16. Normalised and denormalised

**What it is.** **Normalised** means every fact is stored once, and everything else points at it.
**Denormalised** means a fact is copied into the places that need it.

| | Normalised | Denormalised |
| --- | --- | --- |
| A user renames their pot | One row changes. Done | Every copy has to be found and changed |
| Reading a screen | Several joins | One read |
| Risk | Slow reads | Copies that disagree |

**In zamphora.** The care task stores the pot it belongs to and the assessment it came from as ids, and
it also stores the **action text**, which is a copy of the model's answer. That copy is deliberate: the
task must still make sense if the assessment is later deleted.

**How else it is done.** Key-value stores push you towards denormalising, because joins do not exist.
The common shape is to store the read-ready version and accept the update cost. **CQRS** is the formal
name for splitting it: one model for writing, a different one for reading.

**The trap.** Copying a value that changes, without deciding what happens when it does. Copying a
value that is a snapshot by nature — a price at the time of sale, an assessment's advice — is correct,
and it should be said in a comment so nobody "fixes" it.

## 17. The N+1 query

**What it is.** The most common slow-database bug there is. Fetch a list of N things, then loop over it
and fetch one related thing per item. One query becomes N+1 queries.

```
Slow:  SELECT * FROM pots WHERE user_id = 7         -> 20 pots
       for each pot: SELECT * FROM assessments ...  -> 20 more queries
       21 round trips.

Fast:  SELECT * FROM assessments WHERE pot_id IN (...)   -> 1 query
       or a join, or DynamoDB BatchGetItem
```

**Why it hides.** On a developer's machine with 3 rows it is instant. With 500 rows and 2 ms of network
each, it is a second of pure waiting.

**In zamphora.** The key design avoids it by accident and by design at once: one `Query` on
`PK = USER#<sub>` returns the profile, the pots and the assessments together, because they share a
partition. That is the main practical reward of single-table design.

**How else it is done.** An ORM such as Prisma or TypeORM causes most real cases of this, and each one
has an escape: `include`, `eager loading`, `DataLoader` in GraphQL. **GraphQL makes it worse by
default**, because each field resolver can fire its own query, which is why DataLoader exists.

**The trap.** Not looking. The fix is always easy; finding it needs a query log or a trace, which is
entry 55.

## 18. Migrations

**What it is.** A **migration** is a recorded, repeatable change to the shape of stored data —
add a column, rename a field, back-fill a value. It is in version control, it runs in order, and every
environment runs the same ones.

**The rule that makes them safe:** **expand, migrate, contract.** Three deploys, never one.

1. **Expand** — add the new field. Write both old and new. Nothing reads the new one yet.
2. **Migrate** — back-fill the old rows. Start reading the new field.
3. **Contract** — stop writing the old field, then delete it.

**Why three.** During any deploy, old code and new code are running at the same time. A single deploy
that renames a column breaks every request served by the copy that has not restarted yet.

**In zamphora.** There is no schema in the database to migrate, because DynamoDB stores whatever is
written. **The shape still changes, so the problem still exists**, and the answer is the `version`
field on every item plus the rule that a reader must handle an older version (`05-patterns.md` §1).
`01-contracts.md` §11a carries the matching wire rule: adding an optional field is safe, removing one
or making one required is not.

**How else it is done.** Flyway and Liquibase in the Java world, Alembic in Python, Prisma Migrate and
Knex in Node. They all do the same job: a folder of ordered files, and a table recording which have
run.

**The trap.** Believing a schemaless database removes the problem. It removes the `ALTER TABLE`. It
does not remove the two versions of the code reading the same item.

## 19. Backups, RPO and RTO

**What it is.** Two numbers that turn "we have backups" into something testable.

| | Full name | The question | Example |
| --- | --- | --- | --- |
| **RPO** | Recovery point objective | **How much data may be lost?** | "At most one hour of writes" |
| **RTO** | Recovery time objective | **How long may it be down?** | "Back within four hours" |

**Both are chosen, not discovered.** RPO decides how often backups run. RTO decides how they are
stored and practised.

**In zamphora.** **There is no backup, and that is a decision with a name.** DynamoDB point-in-time
recovery is charged per gigabyte with no free allowance, so it is off (gate 46). `01-iac-plan.md` §9
says plainly that a bad deploy which writes wrong rows cannot be undone, rather than implying a safety
net that does not exist. **The replacement is a manual export before 2026-12-31**, and the residual
risk RR-06 records that the owner accepted it. **The reason this is survivable is one user with test
data, and it stops being survivable on the day it is not.**

**How else it is done.** Point-in-time recovery on DynamoDB or RDS gives an RPO of about five minutes.
A nightly `pg_dump` to S3 gives an RPO of a day and costs almost nothing. **Replication is not a
backup:** a replica faithfully copies the `DELETE` too.

**The trap.** A backup nobody has restored. It is a plan, not a backup, until it has been read back
once. `01-iac-plan.md` §9 says the same thing about the rollback, and item 10 of the pre-deploy
checklist exists to make somebody do it.

---

# C — Talking to other systems

**This whole part is one subject: your code is calling something that can be slow, wrong, or gone.**
Every entry here is a named answer to that. They combine, and a serious system uses most of them.

## 20. Timeouts and deadlines

**What it is.** A **timeout** is the longest one call may take. A **deadline** is the longest the whole
request may take, set once when it arrives and shared by everything inside it.

**Why the difference matters.** Five steps with a 10-second timeout each can take 50 seconds, and
nobody added that up. A deadline cannot be beaten that way: every step asks "how much is left?"

**The rule that is easy to get wrong:** **every clock in the chain must be smaller than the clock
outside it**, so your code fails first, with a message you wrote. If the outer clock fires first, the
user gets a `504` from a gateway and your application never even knows the request existed.

**In zamphora.** Run 1 stacked four: the app at 20 s, the function at 22 s, CloudFront at 25 s, API
Gateway at 30 s (`03-flow.md` §4). The model got what was left, about 16 seconds. **The clocks are the
reason the whole architecture changed.** Since ADR-0014 the paid call has no platform clock above it at
all: the model aborts at 18 s, the workflow task at 25 s, the function at 30 s, and there is
deliberately **no timeout on the state machine**, because a machine-level timeout skips every error
handler and leaves a row stuck.

**How else it is done.** Go passes a `context.Context` with a deadline through every call, which is the
cleanest version of this idea in any language. gRPC sends the remaining deadline over the wire so the
server knows how long the caller will still wait.

**The trap.** A generous timeout per step and no total. Also: a timeout longer than the caller's, which
means the work continues after nobody is listening — and on a paid call, that is money spent on an
answer nobody receives.

## 21. Retries, backoff and jitter

**What it is.** Trying again after a failure. Three words go with it:

| Word | What it means |
| --- | --- |
| **Retry** | Send it again |
| **Backoff** | Wait longer each time — 1 s, 2 s, 4 s, 8 s — so a struggling service is not hit harder |
| **Jitter** | Add a random amount to the wait, so a thousand clients do not all retry at the same instant |

**The rule that decides everything: only retry what retrying can fix.** A timeout, a `429` and a `503`
are worth retrying. A `400`, a `403` and "your balance is empty" are not — they will fail identically,
and the retry only costs money and time.

**The other rule: a retry needs idempotency** (entry 22), or a retry after a slow success does the work
twice.

**In zamphora.** This rule was decided three times, and the sequence is the lesson. **Two attempts**
first. Then **no retry at all**, because while the phone waited, two calls cost about $0.0070 against
a $0.0040 ceiling and each attempt had to fail early to leave room for the other. Then **a cap of two
extra tries**, allowed again only once the work moved into the background and stopped sharing the
user's clock (ADR-0014). **Whether a retry is safe is a property of the shape around it, not of the
call** — the call never changed. **The cap lives in one place**, `MaxAttempts: 2` in the state
machine, plus `maxRetries: 0` on the Anthropic client so the SDK does not retry underneath.

**The AWS trap that is worth knowing by name.** CDK's `LambdaInvoke` task adds a **hidden retry of six
attempts** on Lambda service errors unless `retryOnServiceExceptions: false` is set. One of those
errors can arrive *after* the call was made. Left alone, one photo could become many paid calls with
nothing in the code saying so.

**How else it is done.** Libraries: Polly in .NET, resilience4j in Java, `p-retry` in Node.
`aws-sdk` retries three times by default, which is usually right and is exactly wrong on a paid call.

**The trap.** **Retry storms.** Every layer retries three times, and three layers deep that is 27
calls for one request. The fix is to retry at **one** layer and let the others fail fast.

## 22. Idempotency

**What it is.** An operation is **idempotent** when doing it twice gives the same result as doing it
once. It matters because networks repeat things: a phone loses signal, a person taps again, a queue
delivers the same message twice.

**How it is done, in one line.** The **caller** invents an **idempotency key**, usually a UUID, and
sends it with the request. The server records that key on the first attempt and replays or refuses on
the second.

| | |
| --- | --- |
| The question it answers | "This request arrived twice. Do I do the work twice?" |
| The usual tool | A unique key stored with a conditional write |

**HTTP already has an opinion:** `GET`, `PUT` and `DELETE` are meant to be idempotent, and `POST` is
not. That is why `POST` endpoints are the ones that need a key.

**In zamphora.** **The browser makes one UUID when the photo is chosen, not when the request starts**,
so a resend carries the same one. The API claims it with a conditional `PutItem` on
`SK = IDEM#<requestId>`, and writes the assessment id onto that row **before** answering `202`, so a
resend gets the same run back (`03-api-spec.md` §4a). Without it, one tap on a weak signal could be
two paid model calls and two rows, for one result on screen.

**How else it is done.** **Stripe** takes an `Idempotency-Key` header and stores the whole response for
24 hours, so a repeat returns the identical body. A queue consumer usually stores processed message ids
instead — the same idea, moved to the reader.

**The trap.** Generating the key on the server, or generating a new one for each attempt. Both defeat
it completely: the whole point is that the **retry carries the same key as the original**.

## 23. The circuit breaker

**What it is.** A switch that **stops calling a service that is already failing**, so you stop wasting
time and money on calls that will fail anyway, and so the struggling service gets a chance to recover.

**Three states, and the third is the clever one:**

| State | Behaviour |
| --- | --- |
| **Closed** | Normal. Calls go through. Failures are counted |
| **Open** | After N failures in a row, every call is refused at once without trying |
| **Half-open** | After a wait, **exactly one** call is allowed through as a test. Success closes it; failure opens it again |

**In zamphora.** Five failed model calls in a row open it, and it allows one test call every ten
minutes (`02-cost-guardrails.md` §5.6). It is a row in DynamoDB, `PK = CONFIG, SK = BREAKER`, written
by the `assess` function. **The half-open test is exactly one call, and the reason is neat:** `assess`
runs with reserved concurrency of 1, so only one copy can exist to make it.

**The design point worth keeping.** The breaker deliberately **does not share a row with the
kill-switch**. The kill-switch is a person's decision and the breaker is a machine's. If they shared a
row, the machine could undo the human — and ADR-0009 puts the human above the machine on purpose.

**How else it is done.** Netflix's Hystrix made the pattern famous and is retired; resilience4j and
Polly are the current libraries. A service mesh such as Istio can do it outside the application
entirely.

**The trap.** A breaker with no half-open state, which stays open until somebody notices. And a breaker
that counts failures across every kind of error, so one bad request opens it for everybody.

## 24. Bulkheads and backpressure

**What it is.** Two ways of stopping one slow thing from taking down everything else.

- **Bulkhead** — give each kind of work its own fixed share of the resources. One kind can be exhausted
  without touching the others. The name comes from ship compartments: one floods, the ship floats.
- **Backpressure** — when you cannot keep up, **say so**, instead of accepting work you will never
  finish. Refusing fast is a feature.

**In zamphora.** The bulkhead is **reserved concurrency**: the `api` function may run 10 copies at
once, `assess` exactly 1, `watch` 5. A flood of photo requests cannot take every copy and leave the
plant list unanswerable. The backpressure is the daily limit and the API Gateway throttle — the
eleventh request is refused in milliseconds, having spent nothing.

**How else it is done.** Thread pools per dependency is the classic Java version. A bounded queue is
backpressure in its purest form: when it is full, the producer is blocked or rejected. Reactive
streams, and TCP's own window, are the same idea at different levels.

**The trap.** An **unbounded** queue. It looks like it is coping, right up to the moment memory runs
out, and by then the oldest item in it is far past being useful to anyone.

## 25. Rate limiting and throttling

**What it is.** A cap on how many requests are allowed in a period. **Rate limiting** usually means per
user or per key; **throttling** usually means the whole endpoint. The difference matters because they
defend against different things.

| Layer | What it protects from | Tool |
| --- | --- | --- |
| Per account, per day or minute | One user, honest or not, using more than their share | Your own code plus a counter |
| Per endpoint, per second | A flood from anywhere | API Gateway, nginx, a load balancer |
| Per IP address | Crude, and easy to get around with many addresses | A WAF or CDN rule |

**The two algorithms worth knowing.** A **fixed window** counts per clock period and is simple, and it
allows a double burst across the boundary. A **token bucket** refills at a steady rate and allows a
controlled burst, which is what most real limiters use.

**In zamphora.** Three layers, and each stops something the others cannot:

- **10 assessments per account per day**, one atomic conditional write, in the application (ADR-0008).
  This is the one that protects the **money**, because no AWS setting can see a model call.
- **100 requests a second at API Gateway**, with a burst of 50. Left at the AWS default of 10,000 a
  second, a flood would cost roughly **$36 an hour** against a credit balance whose loss closes the
  account.
- **Reserved concurrency of 10** on the function, which caps the work even if requests get through.

**How else it is done.** Redis is the usual shared counter when several servers must agree on one
limit. `429` with a `Retry-After` header is the correct answer, and telling the client when to come
back is what turns a limit from hostile into usable.

**The trap.** A limit that costs more to enforce than to ignore — for example a read-then-write counter
that is both raceable and slower than the work it guards.

## 26. Queues, topics and fan-out

**What it is.** Three different shapes of "send a message instead of making a call". They are not the
same and the words are often mixed up.

| Shape | Who reads it | Example |
| --- | --- | --- |
| **Queue** | **One** consumer gets each message. Others do not see it | SQS, RabbitMQ |
| **Topic (pub/sub)** | **Every** subscriber gets a copy | SNS, Google Pub/Sub |
| **Stream / log** | Consumers read at their own speed and can re-read the past | Kafka, Kinesis, DynamoDB Streams |

**Fan-out** is one event causing several things to happen, usually a topic with several subscribers.

**What a queue actually buys**, and it is three things at once: the caller stops waiting, a burst is
absorbed instead of dropped, and the work survives the worker restarting.

**In zamphora.** **There is no queue on the working path, and the reason is money.** An idle SQS queue
that a Lambda function is polling **still costs receive requests**, forever, for nothing. So the design
uses Step Functions, which pushes to the next step rather than being polled. **One queue exists**: a
dead letter queue that nothing reads (entry 27).

**How else it is done.** **Kafka** is the one to understand as a contrast: messages are not deleted
when read, so a new consumer can start from the beginning and rebuild its own view. That is what makes
event sourcing and replay possible, and it is why Kafka is a different tool rather than a bigger SQS.

**The trap.** A queue with no dead letter queue, so a message that always fails is retried forever and
blocks everything behind it. And ordering: most queues do **not** guarantee it unless you ask and pay.

## 27. The dead letter queue

**What it is.** A **dead letter queue**, or DLQ, is where a message goes after it has failed too many
times. It exists so a poison message stops blocking the queue, and so a person can look at it later.

**The whole idea in one sentence:** *failures that nobody can see are failures nobody fixes.*

**In zamphora.** One SQS queue, attached to the EventBridge rule that marks a run as failed. **Nothing
reads it**, which is correct — reading it would cost polling requests. Instead an alarm fires when it
stops being empty, and the owner looks at it by hand (`03-observability.md` §5, alarm 12).

**How else it is done.** Lambda has one for asynchronous invocations. SQS calls it a redrive policy,
and AWS added a redrive button that sends the messages back to the main queue after the bug is fixed.

**The trap.** A DLQ with no alarm on it. It fills up quietly and nobody knows anything was lost until
somebody asks why a customer never got their email.

## 28. At-least-once, at-most-once, exactly-once

**What it is.** The three possible delivery promises, and the reason idempotency matters so much.

| Promise | Means | Cost |
| --- | --- | --- |
| **At-most-once** | Send and forget. It may be lost | Simple, and it loses things |
| **At-least-once** | Keep retrying until acknowledged. **It may arrive twice** | The normal choice. The consumer must cope with duplicates |
| **Exactly-once** | Arrives once and only once | **Does not really exist across a network** |

**Why exactly-once is not real.** The sender cannot tell "the message was lost" apart from "the reply
was lost". So it must either risk losing it or risk sending it twice. Systems that advertise
exactly-once are doing at-least-once delivery plus deduplication at the receiver — which is a
reasonable thing to do, and it is worth saying out loud that it is what they are doing.

**In zamphora.** The design assumes duplicates everywhere and makes them harmless. **Step Functions
Standard is the exception worth knowing:** a repeated `StartExecution` with the same name returns the
existing run instead of starting a second one. **The execution is named with the assessment id**, so a
duplicate start is free (ADR-0014). Step Functions **Express** works the other way — it runs steps at
least once — which is one of the reasons it was rejected.

**How else it is done.** Kafka has "exactly-once semantics" through transactions within Kafka, and the
honest reading is the same: deduplication with a lot of machinery behind it.

**The trap.** Reading "at-least-once" and building as if it said "once". The duplicate always arrives
eventually, usually on the day with the most traffic.

## 29. Orchestration and choreography

**What it is.** Two ways to make several services do one job in order.

| | **Orchestration** | **Choreography** |
| --- | --- | --- |
| The idea | One conductor calls each step in order | Each service publishes an event, others react |
| Where the sequence lives | In one place, readable | Nowhere. It is the sum of everyone's reactions |
| Finding out what happened | Look at the run | Reconstruct from logs across services |
| Adding a step | Change the conductor | Add a subscriber, change nothing else |
| Tools | Step Functions, Temporal, Airflow, Camunda | EventBridge, Kafka, SNS |

**In zamphora.** **Orchestration, and the comparison was written down.** Option E uses Step Functions:
the state machine says `ClaimRun → Assess → Persist → Rollup`, with the retry and the error handling as
**configuration rather than code**. Option F was the choreography version — every write becomes an
event that something else reacts to — and it was rejected because nothing planned needs it
(`00-options.md` §11).

**The sentence from that comparison worth keeping:** in the orchestrated shape the retry rule is one
declared line that a test can read off the deployed machine. In the choreographed shape it is spread
across thirteen places, each with its own default, and `08-async-options.md` §8 lists all thirteen.

**How else it is done.** **Temporal** is the one to know if Step Functions is ever too limited: the
workflow is written as ordinary code that can pause for days, and it is the same idea with a much
better developer experience and a server to run.

**The trap.** Choreography chosen for looseness, and then nobody can answer "why did this order not
ship?" without reading four services' logs. Orchestration's real cost is the opposite: the conductor
becomes a thing everything depends on.

## 30. Getting an answer back later

**What it is.** Once work is asynchronous (entry 4), the client still needs the result. There are five
ways, and choosing between them is a real design decision.

| Way | How it works | Cost |
| --- | --- | --- |
| **Polling** | The client asks "ready?" every few seconds | Wasted requests, and up to one interval of dead time |
| **Long polling** | The server holds the request open until there is news | Holds a connection. Simple, and it works everywhere |
| **Server-sent events (SSE)** | One long-lived HTTP response the server writes lines into. **One direction only** | Built into browsers as `EventSource`, reconnects by itself |
| **WebSocket** | A two-way connection that stays open | Two-way, and a different protocol with its own auth and its own infrastructure |
| **Webhook / push** | The server calls the client back later | Needs the client to be reachable. This is Web Push, or a callback URL between servers |

**In zamphora.** **SSE**, and the reasoning is a good example of choosing by constraint rather than by
taste (ADR-0015). Polling was the first idea and was rejected for the wasted requests and up to two
seconds of dead time. A **WebSocket** was rejected because it would need a **second host name**, and
then the `__Host-` session cookie would not reach it and a second sign-in path would be needed. **Web
Push** was rejected for the first minute of first use, because it needs a permission prompt and a
service worker before anything can be shown — it is right for reminders in a later run, wrong here.

**Two details from that decision that are worth knowing generally.** SSE runs over ordinary HTTP, so
cookies and proxies just work. And a long-lived response needs a **heartbeat** — zamphora sends a
comment line every 5 seconds — because the timeouts in between count the gap between packets, not the
total length.

**How else it is done.** Long polling is what Slack and older chat systems used for years, and it is
still the most compatible option. GraphQL subscriptions are usually WebSockets underneath.

**The trap.** Choosing WebSockets by reflex for one-way updates. It is twice the machinery for a
capability that is not used, and SSE is one of the most useful things a backend developer can know
about, precisely because so few people reach for it.

## 31. Caching

**What it is.** Keeping a copy of an answer so the expensive work is not repeated. **The only two hard
questions are where it lives and when it is wrong.**

**Where it can live**, from closest to the user outwards. Each layer catches what the next one would
have to do:

| Layer | Example | Typical life |
| --- | --- | --- |
| The browser | `Cache-Control` on a response | Minutes to a year |
| The CDN | CloudFront, at the edge | Minutes to forever, for static files |
| The application's memory | A variable in the process | Seconds. **Different per copy** |
| A shared cache | Redis, Memcached | Minutes. Every copy agrees |
| The database's own cache | Almost always already on | Automatic |

**How a cached value stops being wrong** — there are only three ways, and picking one is the decision:
**time to live**, so it expires by itself; **invalidation**, where the writer deletes the cached copy;
or **versioning**, where the key contains a version so a new value has a new key.

**In zamphora.** Almost nothing is cached, and it is written down as a decision. **ElastiCache and DAX
were rejected in ADR-0002** because they are charged by the hour and would save about 24 ms on a
project with one user. The static web files are cached hard at CloudFront, because they are built ahead
of time. **Every `/api/*` answer has caching disabled on purpose** — a cached `GET /api/me` would hand
one person another person's answer, which is the failure that makes caching frightening. **The one
in-memory cache is the kill-switch at 30 seconds**, and the design names the stale window and fits it
inside the 60-second promise.

**How else it is done.** **Cache-aside** is the common pattern: look in the cache, miss, read the
database, write it back. **Write-through** updates the cache on every write, so it is never stale and
every write is slower.

**The trap.** A **cache stampede**: a popular key expires, a thousand requests all miss at once, and
they all hit the database together. The fix is a short lock, or refreshing just before expiry. And the
older trap: caching something that is different per user, in a place that is shared by all users.

---

# D — Security

## 32. Authentication and authorization

**What it is.** Two different questions that are constantly mixed up because both start with "auth".

| | Question | Answer lives in | HTTP code when it fails |
| --- | --- | --- | --- |
| **Authentication** (authn) | **Who are you?** | A session or a token | `401` |
| **Authorization** (authz) | **May you do this?** | Roles, permissions, ownership | `403` |

**A third question hides behind the second, and it is the one that actually leaks data:** *is this
row yours?* That is not a role check. A `USER` may read pots — but only their own. This is called
**object-level authorization**, and it is the most common serious hole in real APIs. OWASP puts it
first on its API list for that reason.

**In zamphora.** The three questions are answered by three different mechanisms on purpose (ADR-0004):

- **Who** — an opaque session id in a cookie, looked up in the table.
- **May you call this route** — a global Nest.js guard reading a decorator. **A route with no
  decorator does not run for anybody**, and a test walks the whole router on every build (NFR-32).
- **Is this row yours** — **not a check at all.** The owner id is the partition key, and it comes only
  from the session. There is no code path where one account's key names another's row.

**That third line is the good idea worth carrying to any project:** turn an ownership check into an
addressing scheme, and it cannot be forgotten in one query.

**How else it is done.** **RBAC** — role-based access control — gives roles permissions, which is what
`USER` and `ADMIN` are here. **ABAC** — attribute-based — writes rules over attributes instead, such
as "the owner, or a manager in the same department". ABAC is more powerful and much harder to reason
about.

**The trap.** Reading the role from the token or from the request instead of from the server's own
store. A token claim is user-controlled input once the token is minted by anything the user touches.

## 33. OAuth 2.0, OpenID Connect and tokens

**What it is.** Two standards that get mixed up, and the difference is one sentence:

- **OAuth 2.0 is about access.** It gives an application permission to do something on your behalf. It
  never says who you are.
- **OpenID Connect (OIDC) is OAuth 2.0 with identity bolted on.** It adds an **ID token** — a signed
  statement saying *this is who signed in*.

**The flow that matters** is the **authorization code flow**, and it exists so the password and the
final token never pass through the browser's address bar:

```
1. App sends the browser to the identity provider
2. Person signs in there. The app never sees the password
3. Provider sends the browser back with a short-lived CODE in the URL
4. The app's SERVER swaps that code for tokens, over a back channel
5. The app checks the ID token's signature, issuer, audience and nonce
```

**Three values guard that flow and all three have jobs:**

| Value | Stops |
| --- | --- |
| **`state`** | Someone swapping in **their** code, so you end up signed into the attacker's account |
| **PKCE** (a one-time secret) | Someone stealing the code in step 3 and using it themselves |
| **`nonce`** | A token minted for a different sign-in being replayed into this one |

**In zamphora.** Cognito is the provider, sign-in happens on Cognito's own pages, and the API is a
**confidential client** — it holds a client secret, so it can prove it is really the application
(ADR-0003). **The security review found one thing missing and it is a good example of how these holes
appear:** the design said which values the cookie holds and never said that `state` from the query is
**compared** with `state` from the cookie and refused on a mismatch. Nothing was wrong; a step was
simply never written down, and a step that is not written down is a step that gets missed (R-07).

**How else it is done.** SAML is the older enterprise standard, XML instead of JSON. "Sign in with
Google" is OIDC. **Auth0, Clerk, Okta, Keycloak and Supabase Auth** are the usual alternatives to
Cognito, and the flow they implement is the same one.

**The trap.** The **implicit flow**, where tokens come back in the URL fragment. It is deprecated and
should never be used in new work. And accepting a token without checking its `aud` claim, which means
a token minted for a different application is accepted by yours.

## 34. Sessions, JWTs and the BFF

**What it is.** Two ways to remember that somebody is signed in, and they fail in opposite directions.

| | **Server session** | **JWT** |
| --- | --- | --- |
| What the client holds | A meaningless id | The facts themselves, signed |
| Where the truth is | Your database | Inside the token |
| Checking it | One read per request | Verify a signature. No read |
| **Signing out** | Delete the row. Instant | **You cannot.** It is valid until it expires |
| Changing a role | Next request sees it | Not until the token expires |
| Scaling | Needs a shared store | Nothing shared needed |

**The honest summary:** a JWT trades *revocation* for *not needing a lookup*. Most projects do not have
the scale problem that trade is meant to solve, and most projects do want to be able to sign somebody
out.

**The BFF pattern** is the third option and it is what current guidance recommends for browser
applications: **the tokens never reach the browser at all.** The server keeps them, the browser gets an
ordinary session cookie, and the server attaches the real credentials when it calls onwards.

**In zamphora.** The BFF, and the recommendation behind it became a standard during this project:
`draft-ietf-oauth-browser-based-apps` became **RFC 10017, BCP 212, in August 2026**, and §6.1.4.3 says
this architecture is *"strongly recommended for business applications, sensitive applications, and
applications that handle personal data"* — which photographs of the inside of a home are. **No token
ever reaches the browser.** Cognito's tokens are used once and thrown away, so there is no long-lived
provider credential stored anywhere. Sign-out is a row delete, 30-day session.

**How else it is done.** A **refresh token** plus a short access token is the usual JWT answer to the
revocation problem, and it half works: the access token is still valid until it expires. Some systems
keep a deny-list of revoked token ids, which reintroduces the lookup the JWT was chosen to avoid.

**The trap.** A JWT in `localStorage`. Any script on the page can read it, which makes every XSS bug
into a full account takeover. A cookie with `HttpOnly` cannot be read by script at all.

## 35. Cookies

**What it is.** A small value the browser stores and sends back automatically on every request to the
same site. **The attributes matter more than the value**, and there are five worth knowing exactly.

| Attribute | What it does | Why |
| --- | --- | --- |
| **`HttpOnly`** | JavaScript cannot read it | An XSS bug cannot steal the session |
| **`Secure`** | Only sent over HTTPS | Nobody on the network reads it |
| **`SameSite=Strict`** | Not sent when another site links or posts to yours | This is the CSRF defence — entry 36 |
| **`Path=/`, no `Domain`** | Only this exact host, everywhere on it | A sibling subdomain cannot set or read it |
| **`__Host-` prefix** | The browser **refuses** the cookie unless `Secure`, `Path=/` and no `Domain` are all true | The rules become enforced rather than remembered |

**`__Host-` is the one most people have not met**, and it is free. Renaming a cookie to
`__Host-session` makes the browser itself reject any future change that weakens it.

**In zamphora.** Two cookies. `__Host-session` holds an opaque id and nothing else, 30 days,
`SameSite=Strict`. `__Host-oauth` holds the sign-in flow's temporary values and is cleared afterwards
whether the exchange worked or not. **The prefix works on the free CloudFront hostname**, because the
prefix cares about "one exact host" and not about the name being pretty (gate 45).

**How else it is done.** `SameSite=Lax` is the browser default now and allows the cookie on top-level
navigation, which is what you need if sign-in redirects back into your site and must land signed in.
zamphora can use `Strict` because the callback creates the session itself.

**The trap.** Changing `Strict` to `Lax` later to fix a redirect, and not noticing that it was the only
CSRF defence in the system. `02-mitigations.md` §8 names exactly that as a thing not to do.

## 36. CSRF

**What it is.** **Cross-site request forgery.** An attacker's page makes the victim's browser send a
request to your site. The browser **helpfully attaches the victim's cookie**, so the request is
authenticated — and the attacker never sees the response, they only need the side effect.

```
evil.example.com contains:
  <form action="https://yourbank.example/transfer" method="POST" hidden>
    <input name="to" value="attacker"><input name="amount" value="1000">
  </form>
  <script>document.forms[0].submit()</script>
```

**The three defences, and one of them is now usually enough:**

| Defence | How it works |
| --- | --- |
| **`SameSite=Strict` or `Lax`** | The browser does not attach the cookie on a cross-site request |
| **A CSRF token** | A random value in the page and in the request. The attacker's page cannot read it |
| **Checking `Origin`** | Refuse a request whose `Origin` header is not yours |

**In zamphora.** `SameSite=Strict`, plus everything on one origin, plus no CORS configuration at all.
The threat model scores it Medium and says the real risk is not an attack — **it is a later change to
`Lax` that opens it in silence** (T-09).

**The trap.** Believing an API is safe because it is JSON. It is safe only if it **refuses**
`Content-Type: application/x-www-form-urlencoded`, because a plain HTML form can send that cross-site
with no CORS check at all.

## 37. XSS and the Content Security Policy

**What it is.** **Cross-site scripting** is somebody else's JavaScript running on your page. Once it
runs, it can do anything the user can do.

**Three kinds:** **stored**, where the script is saved in your database and served to everyone who
looks; **reflected**, where it comes back from a URL; and **DOM-based**, where your own JavaScript
takes something from the URL and writes it into the page.

**The first defence is not a library.** It is: **never build HTML by joining strings.** React, Vue and
every modern framework escape text by default. The holes are the escapes from that default —
`dangerouslySetInnerHTML`, `v-html`, `innerHTML` — and each one is a place to look.

**A Content Security Policy (CSP)** is the second wall: a header telling the browser which sources of
code and images it may use. `script-src 'self'` means inline scripts do not run, so an injected
`<script>` is dead even if it reaches the page.

**In zamphora.** **The CSP turned out to be genuinely hard, and the reason is worth knowing.** Next.js
with `output: 'export'` writes inline `<script>` tags into the built HTML, and there is no server to
generate a per-request **nonce** — the usual answer. So the policy is built from **SHA-256 hashes** of
the inline scripts, computed after the build (R-06). **The instruction in `02-mitigations.md` §8 is
"do not put `'unsafe-inline'` in `script-src`"**, because that one word gives back most of what the
policy was for.

**Two more lines from that policy that are easy to miss.** `form-action 'self'` stops an injected form
posting the page's data elsewhere, and it costs nothing. `img-src` must name the photo bucket's host,
or every photo silently fails to draw.

**How else it is done.** A nonce per request is the normal answer and needs a server that renders
HTML. Trusted Types is the newer browser feature that makes `innerHTML` refuse unsafe values outright.

**The trap.** Model output. **`nextAction` is free text a language model wrote**, and it is stored and
drawn on a screen. `02-mitigations.md` §8 says do not render it as HTML and never use any
model-written value to build a query, a path, a command or a URL. That is entry 70, arriving as an XSS
problem.

## 38. CORS

**What it is.** **Cross-origin resource sharing.** A browser rule: JavaScript on `a.example` may not
read a response from `b.example` unless `b.example` sends a header saying it is allowed.

**What it is not.** CORS is **not** a security control for your server. It protects **the user's
browser** from reading your data on another site's page. It stops nothing from `curl`, and it stops no
server from calling you.

**The part that confuses everyone:** for anything other than a simple request, the browser first sends
an `OPTIONS` **preflight** and waits for permission. A "CORS error" in the console is almost always
that preflight being refused, and the fix is on the server.

**In zamphora.** **There is no CORS configuration anywhere**, and that is the tell that the design is
right: the web app and the API are on **one origin**, behind one CloudFront distribution (ADR-0010).
`01-iac-plan.md` §4.4 says that if a change ever needs `Access-Control-Allow-Origin`, something has
gone wrong. One origin is also what makes the `__Host-` cookie and `SameSite=Strict` work.

**The trap.** `Access-Control-Allow-Origin: *` together with credentials, which browsers refuse
anyway — and reflecting whatever `Origin` arrives, which allows everybody while looking careful.

## 39. Least privilege and IAM

**What it is.** **Least privilege** is one sentence: **every part of the system gets the smallest set
of permissions that lets it do its job, and nothing more.** The point is not to stop your own code
misbehaving. It is that when something is compromised, the attacker inherits exactly that list.

**IAM** — identity and access management — is how a cloud expresses it. Four words:

| Word | Meaning |
| --- | --- |
| **Principal** | Who is asking. A user, or a running function |
| **Role** | A set of permissions something can **assume**. No password |
| **Policy** | The document listing allowed actions on allowed resources |
| **Trust policy** | Who is allowed to assume this role |

**In zamphora.** This is where splitting the functions paid off most clearly. Before it, one function
held one role covering the whole table, the whole bucket, the Cognito client secret **and the Anthropic
key** — so a hole in the image decoder would have handed over all of it. Now:

| Function | What its role can reach |
| --- | --- |
| `api` | The table, the bucket, Cognito, and permission to start one state machine. **Not the model key** |
| `assess` | The model key, two config rows, the breaker row, the photo object. **Nothing else** |
| `watch` | Read the session row and the assessment row. Read only |
| `mark-failed` | Write `failed` on one row |

**The remaining honest gap is written down** as RR-10: `api` still holds one role covering every route,
including `GET /api/health`. A role per route is not possible on one function, and the trigger to split
further is in ADR-0002.

**How else it is done.** Kubernetes has service accounts and RBAC. On a plain server it is the Unix
user the process runs as. The idea does not change with the technology.

**The trap.** `"Action": "*"` while developing, and never coming back. And a trust policy that says
`repo:owner/name:*`, which lets **any branch** of that repository assume the role — `04-ci-cd.md` §4
names that exact mistake.

## 40. Secrets

**What it is.** A **secret** is a value that grants access: a database password, an API key, a signing
key. The rules are short and they are mostly about where it is **not**.

**The four rules, in order of how often they are broken:**

1. **Never in the repository.** Not in code, not in a config file, not in a commit that was later
   removed — the history keeps it, and a public repository is scraped within minutes.
2. **Injected at run time**, from a secret store or an environment variable set by the platform.
3. **Rotatable**, and rotated when someone leaves or something leaks.
4. **Least privilege applies to secrets too.** One key that can do everything is worse than three keys
   that each do one thing.

**In zamphora.** Two secrets live in **AWS Parameter Store as `SecureString`**, and CDK names the
parameter without ever holding the value. **Parameter Store rather than Secrets Manager, because
Secrets Manager charges per secret per month and Parameter Store's standard tier is free** — a real
free-tier decision, written down in `02-cost-guardrails.md`.

**Two details worth copying.** **The Anthropic admin key never goes on a server or into CI at all** —
it is the strongest credential in the project and it stays on the owner's own machine, so the usage
comparison is a local script rather than an endpoint (`03-api-spec.md` §8). And **the alarm email
address is deliberately not in the repository**: it is subscribed by hand in the console once, because
the repository is public and a personal address published for no reason is a small harm with no
benefit (gate 58).

**How else it is done.** HashiCorp Vault is the big one and it can issue short-lived database
credentials. Doppler and 1Password Secrets are the small-team answers. Kubernetes Secrets are
base64-encoded, **not encrypted**, which surprises people.

**The trap.** Rotating after a leak but not first. **A secret pushed to a public repository is public
from that second**, and rewriting the git history does not un-publish it. `02-mitigations.md` R-11 says
it as an order: **rotate first, remove second.**

## 41. Trust boundaries and threat modelling

**What it is.** A **trust boundary** is a line where data moves between things with different levels of
trust, or where one side has a permission the other does not. **Threat modelling** is walking every one
of those lines and asking what could go wrong.

**STRIDE** is the checklist, and it is six words:

| Letter | Threat | Plain question |
| --- | --- | --- |
| **S**poofing | Pretending to be somebody | Can they claim to be another user? |
| **T**ampering | Changing something | Can they alter data in flight or at rest? |
| **R**epudiation | Denying you did it | Is there a record of who did what? |
| **I**nformation disclosure | Seeing what you should not | Can they read another person's data? |
| **D**enial of service | Stopping it working | Can they make it unavailable, or expensive? |
| **E**levation of privilege | Getting a permission you should not have | Can a user become an admin? |

**Scoring** turns the list into a plan: **likelihood × impact**, and above a line every risk gets three
fixes — **preventive** (stops it), **detective** (tells you it happened), **responsive** (what a person
does first). One control is a single point of failure dressed as a solution.

**In zamphora.** Nineteen trust boundaries are listed with what crosses each one (`00-assets.md` §3),
and every one has at least one scored threat. **The impact scale is anchored to this project's real
numbers rather than to a generic scale** — a 5 means the AWS account closes, a 4 means the $5 Anthropic
balance is emptied. That is what makes the scores arguable instead of decorative.

**Two boundaries in that list teach something general.** **TB-4 is the browser**, drawn as untrusted
even though "we wrote it" — because a script is not the browser. **TB-12 is the AWS console**, which
goes around the product completely: there is no admin route to attack because there is no admin route,
and the cost is that nothing in the application records that the kill-switch was flipped. **Both good
and bad are written on the same line**, which is what an honest threat model looks like.

**How else it is done.** **PASTA** and **LINDDUN** are the other named methods; LINDDUN is specifically
about privacy. **Attack trees** work backwards from a goal. STRIDE is the one worth memorising because
six words fit in your head.

**The trap.** Threat modelling a diagram that does not match what is built. And scoring everything
High, which is the same as scoring nothing.

## 42. OWASP

**What it is.** The **Open Worldwide Application Security Project**, a non-profit that publishes free
security lists. **The Top 10 is the one everybody means**, and it is a list of the most common serious
weaknesses in web applications, updated every few years.

**Three lists worth knowing exist now**, because the old one stopped covering the newer shapes:

| List | Covers | Example from it |
| --- | --- | --- |
| **Top 10** | Web applications | Broken access control, injection, misconfiguration |
| **API Top 10** | APIs specifically | Object-level authorization — entry 32's third question |
| **LLM Top 10** | Applications calling a language model | Prompt injection, unbounded consumption, improper output handling |

**In zamphora.** Two full passes were run, and the second one is the interesting choice. The **LLM Top
10** covers the product, because it sends a photo and free text to a model. The **Agentic Top 10**
covers **the factory itself** — the eight AI roles that wrote these documents, which have tools, web
access and permission to write files. **That is a different system from the product and it has its own
risks**, and running the list over it found real ones, including memory poisoning: a wrong "decision
already made" in `.claude/memory/` is never re-asked, by design.

**Two of the ten did not apply and that was written down rather than left blank.** There is no vector
store and nothing is trained, so those entries come back the day either changes.

**The trap.** Treating the Top 10 as a certification. It is a list of common mistakes, not a
definition of secure. Passing all ten and having no rate limit still means a bill nobody can pay.

## 43. Defence in depth

**What it is.** **Assume every single control will fail, and put another one behind it.** Not because
any one is bad, but because the one that fails is never the one anybody expected.

**In zamphora.** The clearest example is the money path, where six layers each stop something the
others cannot:

```
A flood arrives
  -> CloudFront          no automatic limit. An alarm fires, a person disables it
  -> API Gateway         100 requests a second, burst 50. Refused cheaply
  -> Lambda concurrency  10 copies at once. Throttled, an alarm fires
  -> DynamoDB            fixed capacity. Refused, an alarm fires
  -> Daily limit         the 11th assessment, refused before any money is spent
  -> Circuit breaker     5 failures in a row, stops calling
  -> The model call
```

**The honest part of that picture is the first line.** There is no automatic defence at the CloudFront
layer on this account, so it is a person and an alarm. Writing that down is worth more than pretending
otherwise, because it is the layer somebody would otherwise assume was covered.

**A second example, from the same repository.** The public repository has **two walls** against a
stranger's pull request reaching AWS: the workflow refuses to run for a fork, **and** GitHub is set to
require approval for every outside contributor. `04-ci-cd.md` says plainly that neither is a substitute
for the other.

**The trap.** Counting a layer twice. Two checks that both fail for the same reason — both reading the
same table, both trusting the same header — are one layer wearing two hats. **zamphora names its own
example:** the kill-switch is independent of the code and of a deploy, and it is **not** independent of
DynamoDB, because the switch is a row in the same table the API reads. So the backup switches are
things outside the table entirely.

## 44. Personal data, GDPR and retention

**What it is.** **Personal data** is anything that identifies a living person, directly or with a
little work. It is wider than most people assume: an IP address, a device id, and **a photograph of the
inside of a home** all count.

**The four ideas from GDPR that change how a system is built:**

| Idea | What it means in code |
| --- | --- |
| **Purpose limitation** | Collect it for a stated reason, do not use it for another |
| **Data minimisation** | Do not collect or send what you do not need |
| **Storage limitation** | **Every piece of personal data needs an end** — a date, or an event |
| **The rights** | A person can ask for a copy, a correction, or deletion, and you must be able to do it |

**The part people miss: GDPR names no retention period.** It requires you to **choose** one, justify
it, and actually delete when it expires. "Forever" is not a choice, it is the absence of one.

**In zamphora.** Every stored thing has an end, and the reasoning for each is recorded:

- **The photo: 180 days**, deleted by an **S3 lifecycle rule** and not by application code — so the
  rule keeps working even when the app is broken.
- **The assessment text: as long as the pot exists.** Not a number, on purpose: the purpose of the text
  is the history of the plant, and a clock would delete the early part, which is the part worth having.
  **Ending the purpose is a stronger justification than any date.**
- **An idle account: 12 months, with a warning at 11.** This is the backstop the rule above needs,
  because "as long as the pot exists" otherwise means forever for somebody who signs up once.
- **The location inside the photo: zero seconds.** A phone photo of a plant on a windowsill carries the
  GPS position of that window, which is a home address, in a file the person did not know carried it.
  The re-encode strips it before the photo is stored or sent anywhere.

**Two honest positions are recorded rather than hidden.** The 12-month deletion **has no mechanism
yet** and ships in run 3, so the app currently makes a promise nothing keeps (RR-11). And the photo
leaves the EU on every assessment — accepted for run 1 because there is one account and it is the
owner's, which GDPR Article 2(2)(c) leaves out as a purely personal or household activity, **with the
re-open trigger written as the day a second person's photo arrives**.

**How else it is done.** Larger products build a data map, a retention schedule per field, and a
"delete my account" job. **The AWS Region is part of this**: zamphora is in `eu-central-1` so the
stored copy never leaves the EU (gate 44).

**The trap.** Soft-deleting and calling it deletion. A row marked `deleted = true` is still personal
data, still in the backups, and still discoverable.

---

# E — Running it

## 45. Infrastructure as code

**What it is.** Describing every cloud resource — the database, the bucket, the network, the
permissions — as **files in version control**, and creating them by running a tool rather than by
clicking in a console.

**What it buys, and only the last one is the real reason:**

- The same environment can be built twice and be identical.
- A change is reviewed as a diff before it happens.
- The console stops being the place where the truth lives.
- **A destroyed account comes back with one command**, because the description was never in the
  account.

**In zamphora.** **AWS CDK** in TypeScript, nine stacks, in `infra/`. The last point above is not
theoretical here: **the AWS free account plan closes the account instead of sending a bill**, so
losing everything is a real outcome. Everything being in CDK, in git, from the first resource, is what
turns that from a disaster into a redeploy.

**What is deliberately not in CDK, and why that list matters.** A few things cannot be or should not
be: the OIDC roles CI assumes, because CI cannot create the role it needs in order to sign in; the
secret values; the alarm email subscription, because AWS sends a confirmation link a person must click;
and the three config rows, because they are data. **Writing that list down is what stops somebody
assuming a fresh deploy is a working system.**

**How else it is done.** **Terraform** is the biggest, works across clouds, and uses its own language.
**CloudFormation** is the AWS YAML that CDK compiles down to. **Pulumi** is CDK's idea for any cloud.
**The difference worth knowing:** CDK and Pulumi are real programming languages, so you get loops and
types and can write a test; Terraform is declarative, so it is harder to make a mess in.

**The trap.** **Drift.** Somebody fixes something in the console at 2 a.m., and the next deploy either
undoes it or fails. The rule is to fix it in code and deploy, and if the console must be used, write
down what was done.

## 46. Servers, containers, serverless

**What it is.** Three ways to run code, and they mostly differ in **what you are responsible for** and
**what you pay for when nobody is using it**.

| | **A server** | **Containers** | **Serverless** |
| --- | --- | --- | --- |
| Example | EC2, a rented machine | ECS, Kubernetes | Lambda, Cloud Functions |
| You manage | The OS, patches, the process | The image and the orchestrator | Nothing |
| Cost when idle | Full price | Full price for the cluster | **Zero** |
| Scaling | You add machines | The orchestrator adds copies | Automatic, per request |
| Startup cost | None, it is already running | Seconds | **Cold start** — entry 47 |
| Long jobs | Fine | Fine | A hard limit, 15 minutes on Lambda |
| A WebSocket, a background thread | Natural | Natural | Awkward or impossible |

**In zamphora.** **Serverless, and the reason is "cost when idle" alone.** An app used a few times a
week on an account that closes when the credit runs out cannot pay by the hour. `aws-and-the-pipeline.md`
§7 works out the alternative honestly: the same product as containers behind a load balancer would be
about **$150 a month sitting idle** — a NAT gateway is about $33 of that on its own, with zero traffic.

**The shape used is the "Lambdalith"**: **one** function holding every route, rather than one function
per route. Fewer cold starts, one deployment, one set of permissions to reason about. The cost is that
the permissions are shared across every route, which is written down as RR-10. **The split that did
happen was by job, not by route**: `assess` makes the paid call, `watch` streams, and each got a
smaller role than the one they left.

**How else it is done.** **Fargate** is containers without managing the machines, and it is the
middle option. **Cloudflare Workers** and **Deno Deploy** are serverless with near-zero cold starts,
because they run V8 isolates instead of containers.

**The trap.** Choosing serverless and then fighting it: a long-running job, a WebSocket server, a
connection pool to a relational database. Each is a sign the shape is wrong, not that the platform is.

## 47. Cold starts

**What it is.** The first request to a serverless function has to wait while the platform creates a
new copy: download the code, start the runtime, run everything at the top of the file, **then** run the
handler. A **warm** copy skips all of that.

**What actually takes the time**, and the third one is the one you control:

1. The platform starting a container — you cannot change this.
2. The runtime starting — Node and Python are fast, the JVM is slow.
3. **Your code's top-level work** — every `import`, every client created, every file read at start-up.

**In zamphora.** The budget is **2,000 ms at p95**, and the honest story behind that number is the
lesson. **It was 800 ms first**, taken from articles measuring a plain Node.js handler. This is not a
plain handler: it is Nest.js plus Express plus multer plus Zod plus the AWS SDK clients, all loaded
before the handler runs. **A published figure for a bundled Nest mono-Lambda is about 905 ms for a
near-empty application**, so the number was corrected to 2,000 ms — and marked as an estimate about
the right kind of application rather than a measurement.

**There is a second lesson in it.** NFR-06 says plainly that **no CI job can enforce this**, because a
cold start is a property of the platform on the day. It is written down so that a run which regularly
misses it is recognised as a change rather than as bad luck. **And AWS has no `InitDuration` metric** —
it is only in the logs, which is why the note names a Logs Insights query instead.

**Once the work moved into the background, the cold start moved with it.** It now sits in front of
the `202` rather than in front of the answer, so it has twenty seconds of headroom instead of competing with the model call.

**How else it is done.** **Provisioned concurrency** keeps copies warm and costs money by the hour,
which defeats the point on this account. **SnapStart** takes a snapshot after initialisation. Smaller
bundles and lazy imports are free and help every time.

**The trap.** Creating database clients inside the handler instead of at the top of the file, so every
request pays for it — or the opposite mistake, doing slow work at the top that most requests do not
need.

## 48. Scaling up and scaling out

**What it is.** Two ways to handle more load.

| | **Vertical — scaling up** | **Horizontal — scaling out** |
| --- | --- | --- |
| What you do | A bigger machine | More machines |
| Ceiling | The biggest machine that exists | Effectively none |
| Needs | Nothing. It just works | **Statelessness** — entry 3 |
| Cost curve | Gets expensive fast at the top | Roughly linear |
| Failure | One machine dies, everything is down | One dies, the rest carry on |

**The order in real life is almost always: scale up first, because it is free work, then scale out when
you must.** A single larger database server solves more problems than most teams expect.

**In zamphora.** Horizontal scaling is automatic and invisible, because Lambda simply runs more
copies — and **the design's problem is the opposite of everyone else's**: it must stop scaling.
Reserved concurrency of 10 exists to **cap** copies, because an account that closes when the credit
runs out cannot afford unlimited automatic scaling. **The one vertical knob is memory**: Lambda gives
CPU in proportion to memory, so 1024 MB is a CPU choice as much as a memory one, and it is marked as a
starting value to be measured after the first deploy.

**How else it is done.** Databases are where it gets hard. **Read replicas** scale reads.
**Sharding** splits the data across machines by key, and it is the thing DynamoDB does for you with the
partition key. **Auto-scaling groups** add and remove machines against a metric.

**The trap.** Assuming horizontal scaling helps when the bottleneck is one shared database. Ten copies
of a web server all waiting on the same table is ten times the waiting, not ten times the speed.

## 49. Load balancing

**What it is.** One address in front of several copies, spreading requests between them and skipping
the ones that are broken.

**Two jobs, and the second is the one people forget:**

- **Spread the work**, by round robin, by fewest connections, or by hashing something in the request.
- **Health checks.** The balancer asks each copy "are you alive?" and stops sending traffic to one that
  is not. **That is what turns a crash into a slow moment instead of an outage.**

**In zamphora.** There is no load balancer, and it is a cost decision with a number: an Application
Load Balancer is about **$16 a month with no traffic at all**, and on this account that is real money.
**Lambda does the same job internally** — the platform routes to a copy and creates one if needed — and
CloudFront is the one public address in front of everything.

**How else it is done.** **Layer 4** balances on TCP and is fast and blind. **Layer 7** reads HTTP, so
it can route `/api/*` to one place and everything else to another — which is exactly the job CloudFront
behaviours do here. nginx, HAProxy and Envoy are the software ones.

**The trap.** A health check that only checks the process is alive. A copy with a broken database
connection answers that check happily and fails every real request.

## 50. The CDN and the edge

**What it is.** A **content delivery network** is a set of servers spread around the world that keep
copies of your files near your users. **The edge** is those locations.

**Three things it does, and only the first is the famous one:**

| Job | What it means |
| --- | --- |
| **Cache static files near the user** | A photo served from Frankfurt instead of Virginia |
| **Terminate HTTPS at the edge** | The connection is established close by, which is most of the speed gain |
| **Be the one public front door** | Everything behind it can be private |

**In zamphora, the third job is the one that matters.** CloudFront gives the whole product **one host
name**, and that single fact makes several other decisions work:

- The `__Host-` cookie needs exactly one host (ADR-0010).
- **No CORS configuration is needed anywhere**, because nothing is cross-origin.
- The S3 buckets are fully private, reachable only through **origin access control**, so there is no
  public bucket anywhere in the design.

**One CloudFront detail worth remembering generally.** **Behaviours are matched in order**, so
`/api/assessments/*/events` must be listed **before** `/api/*` or it never matches. And **caching is
disabled on every `/api/*` answer on purpose** — a cached `GET /api/me` would hand one person another
person's answer.

**And one that catches everybody.** **CloudFront publishes its metrics only to `us-east-1`**, whatever
Region everything else is in. An alarm on those metrics created in the wrong Region deploys with no
error and **never fires**. That is why zamphora has one small extra stack in `us-east-1` holding two
alarms and nothing else.

**How else it is done.** Cloudflare, Fastly and Akamai are the alternatives. **Edge functions** —
CloudFront Functions, Cloudflare Workers — run small pieces of code at the edge; zamphora uses one for
a URL rewrite, and it has its own free allowance of 2,000,000 invocations a month.

**The trap.** Caching something personal. The rule is that anything varying per user is `no-store`
unless you have thought hard about `Vary`.

## 51. DNS

**What it is.** The system that turns a name into an address. A browser asking for `example.com` gets
back an IP address, and it caches that answer for as long as the record's **TTL** says.

**The records worth knowing:**

| Record | Does |
| --- | --- |
| `A` / `AAAA` | Name to an IPv4 / IPv6 address |
| `CNAME` | Name to another name |
| `MX` | Where email for this domain goes |
| `TXT` | Free text, used to prove you own the domain |

**The one property that causes real incidents: TTL.** If a record has a 24-hour TTL and you change it,
some users keep the old answer for a day. **Lowering the TTL is something you do the day before a
migration, not during it.**

**In zamphora.** **There is no domain and no DNS at all**, and that is a deliberate cost decision. The
host is CloudFront's own name, something like `d111111abcdef8.cloudfront.net`. A bought domain needs a
**Route 53 hosted zone at $0.50 every month**, which at this size would have been **the largest AWS
line in the whole product** — bigger than the compute, the storage and the gateway together. The
`__Host-` cookie prefix works fine on an ugly name, because it cares about "exactly one host" and not
about the name being pretty.

**The trap.** Assuming a DNS change is instant. It is instant at the authority and slow everywhere
else, and something is always still using the old answer.

## 52. Deploy strategies

**What it is.** Four ways to replace running code with new code, from the riskiest to the safest.

| Strategy | How | Cost |
| --- | --- | --- |
| **Recreate** | Stop the old, start the new | Downtime. Honest and cheap |
| **Rolling** | Replace copies a few at a time | **Two versions run at once** — everything must be compatible both ways |
| **Blue/green** | Build the whole new version beside the old, then switch traffic | Double the resources for a few minutes. Instant rollback |
| **Canary** | Send 1% of traffic to the new version, watch, then increase | Safest. Needs good metrics to be worth anything |

**The rule that applies to three of the four:** **during the deploy, old and new code are both running
and both talking to the same database.** That is why entry 18's expand-migrate-contract exists, and it
is the single most common cause of a "deploy broke production" incident.

**In zamphora.** Deploying is not automatic, and that is a decision (gate 48): merging to `main` builds
and tests only, and **a person starts the deploy** as a separate workflow. The reason is the account —
a bad deploy can spend credit, and this account closes rather than billing, so a person is in the loop
every time.

**How else it is done.** AWS CodeDeploy can shift Lambda alias traffic gradually, which is canary for
serverless. Kubernetes does rolling deploys by default. **Feature flags** (entry 67) make the deploy
and the release separate events, which is the most useful idea in this whole list.

**The trap.** A rolling deploy plus a database change in the same release. Half the copies are running
code that does not understand the new shape, and it looks like a random intermittent bug.

## 53. Rollback

**What it is.** Going back to the version that worked. **The only measure that matters is how long it
takes**, and the only way to know is to have done it.

**The levels, cheapest first**, which is how zamphora writes it:

| Level | Action | Time |
| --- | --- | --- |
| **1 — stop the bleeding** | Flip a flag or a kill-switch. No deploy | Under a minute |
| **2 — put the old code back** | Point the alias at the previous version | About a minute |
| **3 — put everything back** | Redeploy every stack from a known good commit | One deploy |

**In zamphora.** All three exist and are written down in `01-iac-plan.md` §9. Level 1 is the
kill-switch, which is one row edit and takes effect within 60 seconds. Level 3 is
`gh workflow run rollback.yml -f sha=<the good commit>`.

**The sentence in that document worth carrying to any project:** *a rollback nobody has run is a plan,
not a rollback.* It is now item 10 of the pre-deploy checklist for exactly that reason.

**What cannot be rolled back** is the part people forget, and the design says it plainly: **data**.
Point-in-time recovery is off, so **a bad deploy that writes wrong rows cannot be undone**. Code goes
back; the rows it wrote stay. That is written down rather than implied.

**The trap.** A rollback that needs the thing that is broken. A rollback script that runs in the CI
system that is down, or that needs the database you just corrupted, is not a rollback.

## 54. Environments

**What it is.** Separate copies of the system for different purposes, so nobody tests on the thing real
people are using.

**The usual three, and the real question is what differs between them:**

| Environment | For | The honest risk |
| --- | --- | --- |
| **local** | One developer, no cloud | Fake versions behave differently from real ones |
| **preview / staging** | Testing a change before merging | Drifts from production until it proves nothing |
| **prod** | Real people | — |

**The rule that makes them useful: as much as possible must be identical, and what differs must be
written down in one list.** Otherwise "it worked in staging" is meaningless.

**In zamphora.** Three environments, and the list of what changes is short and explicit
(`00-environments.md` §4): resource names, the host, log retention, DynamoDB capacity, the
concurrency numbers, **and which `LlmProvider` is used — a stub everywhere except `prod`**.

**What must never change is the more interesting list**, because it is where bugs would hide: Node 24
everywhere, the Cognito tier, the 180-day lifecycle rule, and **every cookie attribute**. A preview
bucket carries the same lifecycle rule, so the test that checks it is checking the code that ships.

**Two details that only come up on a free account.** The preview environment needed its own DynamoDB
table, and **the free allowance of 25 capacity units is per Region and shared by every table** — so
`prod` was dropped to 20 and `preview` given 5, rather than both getting 25. And local development
uses **DynamoDB Local and MinIO** in Docker, so no test run touches the real account.

**The trap.** A preview environment that points at the production database. It always starts as
"just for reading".

## 55. Observability

**What it is.** A backend buzzword, and close to a non-functional requirement: **can you tell what the
running system is doing, without attaching a debugger to it?** You cannot debug a Lambda function that
ran once at 3 a.m. for somebody else. Observability is what replaces that.

**It is three things, and an interview question expects all three:**

| Part | The question it answers | The AWS tool |
| --- | --- | --- |
| **Logs** | **What happened in this one request?** In detail: which route, which user, that it ended in a `400` or a `409`, and why | **CloudWatch Logs** |
| **Metrics** | **How many, how often, how fast?** How many requests, how many succeeded, how long the slowest 5% took | **CloudWatch Metrics** |
| **Traces** | **Which services did this one request pass through, and where did the time go?** | **AWS X-Ray** |

**The difference that decides where something belongs:** a **log line is per event and costs money per
gigabyte**. A **metric is a number aggregated over time and is cheap to keep for a year**. So "how many
requests failed today" must be a metric — counting it by reading a year of logs is slow and expensive.

**Why traces became necessary.** In one program, a stack trace shows the path. Once a request crosses
four services, no single machine has seen the whole thing. A trace gives the request an id that travels
with it, and each service reports its own piece against that id. **It is the only one of the three that
answers "which step was slow".**

**In zamphora.** All three, and the numbers are small on purpose:

- **Logs** — one structured line per request with the route, the outcome and a failure code. There is
  an explicit list of what must **never** be logged: the photo bytes, the pot name, the model's text, a
  cookie, a token.
- **Metrics** — AWS's own are free, plus **six custom ones**, including `ModelCalls` and
  `CostMicroUsd`. **CloudWatch's free allowance is ten custom metrics**, so a seventh is a decision.
- **Traces** — X-Ray across `api` → Step Functions → `assess` → Anthropic, which only became worth
  having when the work stopped being one function.

**How else it is done.** **OpenTelemetry** is the vendor-neutral standard for all three and is the one
worth learning, because it works with Datadog, Grafana, Honeycomb and CloudWatch alike. The
ELK stack (Elasticsearch, Logstash, Kibana) is the classic self-hosted answer for logs. Prometheus
plus Grafana is the classic one for metrics.

**A fourth word is appearing and is worth knowing:** **continuous profiling**, which answers "which
line of code is using the CPU", and it sits under traces in the same way traces sit under metrics.

**The trap.** **Logging what should be a metric**, then paying for it forever and querying it slowly.
And the opposite: an alarm on a metric with no log line that explains it, so you know something broke
and not what.

## 56. Alerting

**What it is.** Turning a measurement into somebody being told. **An alarm is a decision, not an
addition** — every one of them is a promise that a human will do something when it fires.

**The one rule that decides whether alerting works at all:** **every alarm must be actionable.** If the
answer to "what do I do about this?" is "nothing, it happens sometimes", it is not an alarm. It is
noise, and noise is what makes a real alarm get ignored. That is called **alert fatigue** and it is the
normal failure mode.

**In zamphora.** Twelve alarms, and **the free allowance is ten**, which is written down honestly: two
are charged, at cents a month, and the document says so rather than claiming $0. **The rule from there
on is stated as a sentence:** whoever adds the thirteenth has to say which one it replaces.

**Four of the twelve are the ones this project actually needs**, and they are the ones about money
rather than about errors: more than 30 model calls in an hour when expected use is 30 a **month**; more
than $0.10 of spend in an hour; the circuit breaker opening; and a flood at CloudFront.

**One of them changed shape and the change is worth understanding.** The breaker alarm used to **be**
the circuit breaker: it counted failures and asked a person to flip the kill-switch. Now the breaker is
automatic, so **by the time the email arrives the spending has already stopped**. The alarm became a
message rather than a request for help, which is a better shape, because the fix no longer depends on
anybody being awake.

**How else it is done.** PagerDuty and Opsgenie route alarms to whoever is on call, escalate, and
record who acknowledged what. **zamphora has none of that, because there is one person and no on-call
rota**, and the alarms go to one email address subscribed by hand.

**The trap.** Alarming on a **cause** instead of a **symptom**. "CPU is at 80%" may be fine. "The
slowest 5% of requests take 9 seconds" is always worth knowing. The second one is what a user feels.

## 57. SLI, SLO, SLA and the error budget

**What it is.** Four words for turning "it should be reliable" into a number, from the inside out.

| Word | Full name | What it is |
| --- | --- | --- |
| **SLI** | Service level **indicator** | The **measurement**. "The share of requests answered under 300 ms" |
| **SLO** | Service level **objective** | The **target you set yourself**. "99.5% of them, over 30 days" |
| **SLA** | Service level **agreement** | The **promise to a customer**, with money attached when it is broken |
| **Error budget** | — | What is left over. 99.5% allows **3.6 hours of failure a month** |

**The error budget is the useful idea.** It turns reliability from an argument into arithmetic: if the
budget is unspent, ship faster and take more risk. If it is gone, stop shipping features and fix
things. Nobody has to win a debate about whether the system is "reliable enough".

**In zamphora.** **There is no availability target, and that is written down as a position rather than
left as a gap** (gate 31). The reasoning is recorded in full so nobody has to rebuild it: one user, no
second copy of anything, nobody on call, a model balance topped up by hand, and an AWS account that
closes on 2026-12-31 by design. **A promise like "up 99% of the month" would be untestable and
unkeepable, and writing one down would make the next role build alarms against a fiction.**

**The trigger to set a number is written as a condition:** the day the app is offered to a second
person. That is the same trigger as the EU AI Act position and the admin route, and the note says all
three should be answered in one sitting, because all three are consequences of having exactly one user.

**How else it is done.** Google's SRE book is where these words come from and is still the best source.
The usual starting point is three SLIs: availability, latency, and error rate.

**The trap.** An SLA promised to a customer that is stricter than the SLO the team measures. And 100%
as a target, which is unreachable and means the error budget is always spent.

## 58. NFRs and ADRs

**What it is.** Two different kinds of written decision that are constantly confused, and they belong
in different files.

| | **NFR** — non-functional requirement | **ADR** — architecture decision record |
| --- | --- | --- |
| Says | **How well** it must work. A number | **What was chosen**, and why |
| Example | "The 95th slowest request is under 300 ms" | "We use DynamoDB, not PostgreSQL" |
| Changes when | The target changes | Never. A new record supersedes it |
| Tested by | A test that can fail | Nothing. It is a record |

**Functional** requirements say what it does — "a user can photograph a plant". **Non-functional**
requirements say how well — fast, cheap, private, available. **The non-functional ones are what get
skipped, and they are what make a system usable or not.**

**A number only counts if it has three links**, which is the rule worth memorising:

```
a written number  ->  an automatic test that checks it  ->  that test blocks a release
```

Miss any one and the number is a wish. A target with no test is a hope; a test that does not block is a
report nobody reads.

**In zamphora.** Every NFR row carries four things: the number, the window it is measured over, how it
is tested, and **the name of the CI job that runs the test**. A row missing any of the four is
explicitly "not a requirement, it is a wish". **Two of the budgets are the ones that can kill the
project** rather than slow it down: what the model costs, and how often the answer is right.

**Every ADR ends with an "Agent-Readable Summary"** — a plain instruction containing an explicit *do
not*. That exists because a reader can agree with a whole record and still write the opposite, if
nobody ever said what to actually do. *"All model calls go through `LlmProvider`. Do not import the
Anthropic SDK outside its adapter."*

**Two things about ADRs that are easy to get wrong.** **An accepted record is not edited to reflect a
change of mind** — a new one supersedes it, and both stay, so the history of the reasoning survives.
**Correcting one in place is only for when it was simply wrong and nothing was built on it.**

**The trap.** An NFR nobody can measure, which is an opinion with a number in it. And an ADR written
after the code, which is a description rather than a decision.

## 59. Cost as a correctness property

**What it is.** On most projects, spending too much is a finance problem that arrives as an invoice
next month. **On some, it is an availability problem that arrives now.** When that is true, cost has to
be designed like a security control, not reviewed like a budget.

**The two shapes of cost failure, and they are not the same:**

| | Runaway spend | Balance runs out |
| --- | --- | --- |
| What happens | Usage grows without limit | A prepaid amount hits zero |
| The damage | A bill, or an account closed | The feature stops |
| The fix | A cap, a limit, a breaker | Somebody pays |

**In zamphora both exist, on two different accounts, and that is why the design is shaped as it is.**
The AWS side **closes the account** rather than billing, taking the table, the bucket and the user pool
with it. The Anthropic side is a prepaid balance of about **$5** that simply stops working at zero.

**Three consequences that would be over-engineering on a normal project and are correct here:**

- **A runaway retry loop is an availability incident, not an accounting one.** It is treated with the
  same seriousness as a missing auth check.
- **The cost of every model call is read from the `usage` block the API returns, never estimated**, and
  stored in **millionths of a dollar as a whole number** — because adding floating-point numbers into
  one counter loses precision.
- **There is no total spend cap, and that is a decision, not a gap.** The balance reaching zero is the
  stop. A cap was rejected because it is a second number to pick, enforce and keep correct, and it
  would only ever fire before the thing that already stops the calls.

**The free-tier traps worth knowing, because each is a default somewhere:**

| Trap | Cost |
| --- | --- |
| DynamoDB **on-demand** is the CDK default | The free allowance covers **provisioned** capacity only |
| A **NAT gateway** | About **$33 a month at zero traffic** |
| **Secrets Manager**, per secret | Parameter Store SecureString is free |
| A **customer-managed KMS key** | **$1 a month forever.** AWS-managed keys are free |
| An **idle SQS queue** a Lambda polls | Still spends receive requests, forever |
| API Gateway with **no throttle** | Inherits a 10,000 requests a second default |

**The trap.** Assuming the free tier is one thing. AWS has two kinds of free: **Always Free**, which
never expires, and a **12-month trial**, which is switched off entirely on the free account plan. Half
the "this is free" advice on the internet means the second one.

---

# F — How the code is arranged

## 60. Clean architecture, ports and adapters

**What it is.** A way of arranging code so that **the rules of the business do not know what database
or framework they are running on**. Also called hexagonal architecture, or ports and adapters.

**Four layers, and one rule about which way they may point:**

| Layer | Holds | May import |
| --- | --- | --- |
| **Domain** | The types and rules. Plain objects | Nothing |
| **Application** | The use cases: "assess a plant" | Domain |
| **Infrastructure** | The database, HTTP clients, the model SDK | Domain, application |
| **Interface** | Controllers, routes, request handling | All of them |

**The rule is: imports point inwards only.** The domain never imports the database. That is what the
whole idea is.

**A port is an interface the inside defines. An adapter is the outside implementing it.** The
application says "I need something that can `assess(photo)`". It does not know or care that the
implementation calls Anthropic.

**In zamphora.** `packages/llm` is exactly one port, `LlmProvider`, with two adapters: the real
Anthropic one and a stub. **`CLAUDE.md` makes it a hard rule** — every model call goes through the
port, and no SDK import is allowed outside its adapter.

**Three things that buys, and the third is the one nobody plans for:**

- Changing provider is one new adapter, not a search across the codebase.
- **Every test runs without the internet and without spending money**, because the stub is the default
  everywhere except production. That alone justifies it on a project with a $5 balance.
- When the model call later moved into its own Lambda, **`packages/llm` moved with it and nothing
  else changed**. The border was already there.

**How else it is done.** A **repository** is the same idea for data access. **Dependency inversion**,
the "D" in SOLID, is the general principle behind it.

**The trap.** The layers becoming folders with no rule enforcing them. Without a test or a lint rule
that fails on a wrong import, they are a naming convention and they drift in a month.

## 61. Dependency injection

**What it is.** Instead of a class creating the things it needs, they are **handed to it**. That is the
whole idea. A **DI container** is a thing that knows how to build everything and wires it up for you.

```
Without:  class AssessService { private db = new DynamoClient(...) }
          -> to test it, you must have DynamoDB

With:     class AssessService { constructor(private db: Store) {} }
          -> to test it, hand it a fake Store
```

**Why it matters is testing, first and mostly.** Everything else — swapping implementations, one place
to configure — follows from the same property.

**In zamphora.** Nest.js is built around it, and **that is one of the reasons Nest was chosen over
Express.** Express gives no structure, so every project invents its own; Nest brings modules, a
container and guards, which is the ground the owner wanted to learn.

**One practical consequence is a real trap in this project.** Nest works out what to inject by reading
**decorator metadata** that TypeScript writes into the compiled output. **esbuild cannot emit that
metadata**, and CDK bundles with esbuild. Pointing it at the TypeScript source gives a function that
builds cleanly, deploys cleanly, and throws `Nest can't resolve dependencies` on its first request. The
fix is two build steps: `nest build` first, then bundle the compiled JavaScript.

**How else it is done.** Spring in Java, and `.NET`'s built-in container. In plain TypeScript, passing
arguments into a function is dependency injection, and for a small application it is enough.

**The trap.** A container so clever nobody can tell what is injected where. The benefit is testability;
anything beyond that is cost.

## 62. Monolith, modular monolith, microservices

**What it is.** Three ways to divide a system into deployable pieces.

| | **Monolith** | **Modular monolith** | **Microservices** |
| --- | --- | --- | --- |
| Deploy | One thing | One thing | Many things |
| Borders | Whatever grew | Enforced inside one build | Network calls |
| A call between modules | A function call | A function call, across a checked border | HTTP or a queue, which can fail |
| Needs | Nothing | Discipline | Service discovery, tracing, versioning, a team per service |

**The honest current advice, and it reversed over about ten years:** **start with a modular monolith.**
Get the borders right inside one deployable unit, where a wrong border costs a refactor rather than a
migration. Split out a service when there is a reason — a different scaling need, a different language,
a different team.

**The cost of splitting is usually underestimated in one specific way:** a function call that could not
fail becomes a network call that can. Every entry in part C — timeouts, retries, idempotency, circuit
breakers — is the price of one border.

**In zamphora.** A monolith, and the reasoning is written down: one **Lambdalith** holding every route.
**The split that happened was by job rather than by service** — `assess` for the paid call, `watch` for
the stream — and each one got a smaller permission set than it left behind, which was the point.

**Splitting the API itself into a pots service, a tasks service and an auth service was considered and
rejected in one paragraph:** the session check would exist three times, the three services would share
one table anyway, and the plant list would pay three cold starts. **The trigger to revisit is written
as a condition**: a second person owning one side, a service in another language, or CI passing 15
minutes.

**How else it is done.** The **strangler fig** pattern is how a monolith is split in practice: put a
router in front, move one route at a time to a new service, and let the old one shrink.

**The trap.** Microservices for a team of one. Every border is a thing to deploy, version, monitor and
debug, and a single developer pays all of that cost with none of the organisational benefit it exists
to buy.

## 63. Monorepo and polyrepo

**What it is.** One repository holding several projects, or one repository each.

| | **Monorepo** | **Polyrepo** |
| --- | --- | --- |
| A change crossing two projects | One commit, one pull request | Several, in order, coordinated |
| Shared code | An import | Publish a package, bump a version |
| Seeing who uses your code | Search the repo | You cannot |
| CI | Must be filtered by path, or it runs everything | Naturally small |
| Access control | All or nothing | Per repository |

**One argument is new and it is the one that decided this project:** **every coding agent indexes one
repository.** A border blocks the agent from seeing who uses the code it is changing, needs several
pull requests for one change, and resets its context between them. Nx sells an enterprise product whose
only job is to hide that from agents.

**In zamphora.** **Two repositories, split by what can be reused, not by front end and back end.** The
`ai-factory` line is a reusable tool and is its own repository. `zamphora` holds the whole product —
web, API, contracts, infra, specs. **The owner asked three times for separate front-end and back-end
repositories, and the answer stayed no**, because the border would be exactly where the shared Zod
contracts live. Separate CI and separate deploys do not need separate repositories: path-filtered
workflows and one CDK stack per service give both.

**The measured cost of the rejected option is the useful number:** **four to six pull requests per
change that crosses the wire.** Cloudflare published four per change before they automated it down to
one.

**Six rules keep a later split cheap**, and they cost nothing while no code exists: no relative import
crosses an app border; `packages/contracts` is imported by package name only; each app owns its
`package.json`; each app builds from its own folder; each service gets its own CDK stack; CI is
path-filtered from the first workflow file. **Rule two is the one that decides whether the split is
cheap or expensive.**

**How else it is done.** Google, Meta and Uber run enormous monorepos with custom tooling. Nx,
Turborepo, Bazel and Rush are the off-the-shelf task runners. **A shared package can be published to
npm from inside a monorepo**, so a second repository is not needed to make `packages/contracts`
consumable by an outsider.

**The trap.** A monorepo with no path filtering, so every change runs every test and CI takes twenty
minutes. That is the thing people blame the monorepo for, and it is one configuration file.

## 64. CI and CD

**What it is.** Three phrases, and the third is two different things sharing initials.

| | What it means |
| --- | --- |
| **Continuous integration** | Every push is built and tested automatically, on a machine that is not yours |
| **Continuous delivery** | Every change that passes is **ready** to deploy. A person presses the button |
| **Continuous deployment** | Every change that passes **is** deployed. No button |

**What CI is actually for** is not finding bugs — tests do that. It is that the build happens somewhere
that is not one person's machine, so "it works here" stops being a thing anybody can say.

**In zamphora.** Continuous **delivery**, deliberately not deployment: merging to `main` builds and
tests, and a person starts the deploy (gate 48), because a bad deploy on this account spends credit and
the account closes rather than billing.

**Three details from that pipeline that are general lessons:**

- **How CI signs in to AWS with no password.** **OpenID Connect**: GitHub signs a short-lived token
  saying which repository and which branch is running, and AWS is configured to trust it. **No
  long-lived key exists to leak.** The protection is the trust policy's `sub` condition, which names
  the branch — `repo:owner/name:*` would be satisfied by any branch in the repository.
- **Every action is pinned to a full commit SHA, not a tag.** The owner of an action can move `v7` to
  different code at any time, and it then runs next to those AWS credentials. A tag is a moving
  pointer; a SHA is not.
- **One required check, not eleven.** The repository requires a single job, `ci-ok`, which waits for
  the others and asserts each result. **The aggregate is better than a list**, because a renamed job
  silently stops being required if the list names it directly.

**The trap.** A CI job that reports and does not block. Calling a check critical and leaving it
advisory is the same as not writing it. **zamphora found this as a real finding:** one required check
meant four NFRs were measured and enforced nothing, because `ci-ok` can only require jobs in its own
workflow file.

## 65. Trunk-based development

**What it is.** Everybody works on short-lived branches off one main branch and merges within a day or
two. The alternative is long-lived branches — `develop`, `release/*` — living for weeks.

**Why short branches win, in one sentence:** **merge pain grows faster than branch age.** A branch open
for three weeks is not three times harder to merge than one open for one week.

**Branch protection** is what makes it safe: `main` cannot be pushed to directly, a pull request is
required, CI must pass, and force-push is off.

**In zamphora.** Branch protection with one required check, `ci-ok`. **Two settings exist because the
repository is public**, and both are worth knowing:

- **Anyone can open a pull request, and a pull request runs CI.** GitHub's default only holds a
  *first-time* contributor; after one merge they run without asking. The setting is *"Require approval
  for all external contributors"*, and it is set.
- **An actions allow-list.** Only GitHub's own actions plus one named exception,
  `aws-actions/configure-aws-credentials`, may run. Not "all verified creators" — a real list of what is
  trusted.

**And the correction in that document is worth repeating, because the wrong idea is easy to hold:**
**there is no setting that turns off pull requests from forks on a public repository.** Branch
protection stops a pull request being *merged*. Nothing stops one being *opened*.

**How else it is done.** **Git flow** is the long-lived-branch model and it made sense for shipping
versioned desktop software. **GitHub flow** is trunk-based with pull requests, which is what most teams
do now.

**The trap.** Trunk-based development with no feature flags, so an unfinished feature must either be
hidden by a long branch or shipped half-done. The two ideas go together — entry 67.

## 66. The testing pyramid

**What it is.** A picture of how many tests of each kind to write, and the ratios matter more than the
names.

```
        /\        End-to-end   few     slow, real browser, real deploy, flaky
       /  \       Integration  some    real database, no browser
      /____\      Unit         many    fast, in memory, no I/O
```

| Kind | Speed | What it proves | What it misses |
| --- | --- | --- | --- |
| **Unit** | Milliseconds | One function does what it says | That the pieces fit together |
| **Integration** | Seconds | Two real things work together | The user's experience |
| **End-to-end** | Minutes | The whole thing works for a person | Which part broke, when it fails |
| **Contract** | Fast | Two services still agree on the shape | Behaviour |

**The rule: push each test as far down as it can go.** An end-to-end test that checks a validation
message is a slow, flaky way to test something a unit test does in 2 ms.

**In zamphora.** Vitest for all three packages, one runner. Playwright for end-to-end against a real
preview deploy. **The AI-specific parts are what a normal project does not have** (entry 71).

**Two rules from `CLAUDE.md` worth stealing.** **Tests ship with the change** — CI blocks a pull
request that deletes a test file unless the commit message says `DELETE_TESTS: <reason>`. And **at
least five negative tests are forced**, because "write tests for this" produces tests that pass, which
is what the words ask for. The useful half is the failures.

**How else it is done.** The **testing trophy** argues for more integration tests and fewer unit tests,
because integration tests catch what actually breaks. Both shapes agree on the important part: very few
end-to-end tests.

**The trap.** An **ice cream cone** — mostly end-to-end tests. They are slow, they fail for reasons
unrelated to the change, and a suite people re-run until it passes is a suite that tests nothing.

## 67. Feature flags and kill switches

**What it is.** A value read at run time that changes what the code does, without deploying. **The
whole idea is to separate deploying from releasing.**

**Four different things share the name and they have different lifetimes:**

| Kind | Life | Example |
| --- | --- | --- |
| **Release flag** | Weeks. Then delete it | Ship code turned off, turn it on later |
| **Experiment flag** | The length of a test | Half of users see the new screen |
| **Permission flag** | Forever | This feature is for paying accounts |
| **Kill switch** | Forever | Turn a thing off immediately when it misbehaves |

**A kill switch has three properties that make it real**, and each one is a question worth asking of
any switch:

1. **A named, reachable person** who can flip it. Not a team, a person.
2. **Independent of the thing it kills.** If it needs the broken component, it is not a switch.
3. **A test date.** A switch nobody has ever flipped is a paragraph.

**In zamphora.** The kill switch is one row in DynamoDB, cached for 30 seconds, promising effect within
60. **The design deliberately does not let the application write it** — only a person, in the AWS
console — so a machine can never undo a human's decision.

**The three properties were then checked honestly, and only one and a half passed.** It is independent
of the code and of a deploy, which is what the story asked for. **It is not independent of DynamoDB**,
because the switch is a row in the same table the API reads on every request — so a table that cannot
be read is a switch that cannot be flipped, while the model calls continue. And there was **no test
date**, so one was added to the pre-deploy checklist: flip it once on purpose, time it, write the
number down.

**Because of that gap, two backup switches are written into the runbook**, and both are outside the
table entirely: set the `assess` function's reserved concurrency to 0, which stops every paid call
including queued ones; or disable the CloudFront distribution, which is the outermost stop.

**How else it is done.** LaunchDarkly, Unleash and Flagsmith are the products. A row in your own
database is enough for a long time, which is what this project does.

**The trap.** Flags that are never deleted. Ten flags is 1,024 possible combinations, and nobody has
tested more than three of them. A release flag should have a removal date from the day it is added.

---

# G — AI inside a backend

## 68. What a model call actually is

**What it is.** From the backend's point of view, a language model call is **one HTTP request to
somebody else's API that is slow, priced per word, and may return something different every time.**

**Everything unusual about it follows from those three properties:**

| Property | What it forces |
| --- | --- |
| **Slow** — seconds, not milliseconds | It cannot sit inside a request the user is waiting on. Entry 4 |
| **Priced per token** | Rate limiting is protecting money, not capacity. Entry 72 |
| **Not deterministic** | You cannot test it by comparing to an expected string. Entry 71 |

**A fourth property is the one people forget: the answer is untrusted input.** It is text from outside
your system, so it goes through the same rules as anything a user typed.

**In zamphora.** One call per assessment in the normal case. It goes through a port, so the SDK exists
in exactly one file. `01-threats.md` states the property that makes everything else safer: **the model
has no tools, makes one call, and its answer is constrained to a closed shape whose fields are mostly
closed lists.** So a successful attack on the model cannot make it *do* anything. It can only change
the words that come back.

**The trap.** Treating it as a normal function call. It is a network call to a slow, paid, unreliable
third party, and every entry in part C applies to it.

## 69. Structured output

**What it is.** Making the model return data in a shape your code can read, instead of a sentence you
have to parse.

**Three ways, from worst to best:**

1. **Ask nicely in the prompt** — "reply with JSON". It works most of the time, and most of the time is
   not a contract.
2. **Tool calling** with a strict schema — the model must fill in named fields.
3. **A response format schema** — the provider guarantees the output matches your schema.

**The rule: make a broken answer nearly impossible first, and handle it second.** Handling it well is
the backstop, not the plan.

**In zamphora.** The call uses structured output with the response schema, and `ModelAnswer` is the
only way a reply becomes a value. **Three details are worth carrying to any project:**

- **Check `stop_reason` before reading the content, always.** Three of its values are not an answer and
  they are not the same as each other. `refusal` means a safety classifier declined, and **retrying it
  is pointless**. `max_tokens` means the answer was cut off, and retrying without more room fails
  identically. Only a genuine schema failure is worth one retry.
- **Never match on the raw text of the answer.** Parse it. A model may escape characters differently
  between versions, so string matching breaks silently on an upgrade.
- **An answer the app cannot read is a failure, not a verdict.** It is never `cannot-tell`, because
  that means *"I looked and could not tell"*, and a broken answer means nothing was assessed at all.
  Mixing them would tell the user to retake a photo that was fine.

**The last one is the general lesson:** keep "the model said it does not know" and "the call went
wrong" as different outcomes, because the user can act on the first and not on the second.

**The trap.** A schema so large the model fills it badly, and a `max_tokens` set tight to save money.
**You are billed for tokens generated, not for the ceiling**, so a tight ceiling saves nothing and
causes truncation.

## 70. Prompt injection

**What it is.** Text that reaches the model containing instructions, which the model follows. **It is
not a bug that can be patched**, because a language model cannot reliably tell the difference between
"content to read" and "instructions to obey" — they arrive as the same thing.

**Two kinds:** **direct**, where the user types the instruction; and **indirect**, where it arrives in
something the model reads — a web page, a document, **or a photograph of a printed sheet of paper**.

**The defence is not prompt engineering. It is architecture.** "Ignore any instructions in the user's
text" is a suggestion, not a control. What actually limits the damage:

| Control | Effect |
| --- | --- |
| **No tools** | A hijacked model cannot *do* anything |
| **Structured output with closed lists** | It can only return values you already allow |
| **Never put user text in the system prompt** | The instruction and the data stay separate |
| **Treat the output as untrusted** | It cannot become HTML, a query, a path or a command |

**The lethal trifecta** is the shape to watch for: **private data + untrusted content + a way to send
data out.** Any two together are usually safe. All three at once is when injection turns into
exfiltration.

**In zamphora.** Two user-supplied values reach the model: the plant nickname, and the photo, which can
contain text. **The system prompt is a module-level constant and no user value is ever joined into
it.** The blast radius is one wrong verdict for one person, because there is no tool, no second call
and no action the model can take. The care-task date it chooses is bounded to 1–30 days by a check in
our own code.

**One thing worth noticing:** the trifecta test was also applied to **the AI agents that wrote these
documents**, and it fired — they held the whole repository, fetched outside pages, and a fetched URL is
a way to send data out. **It was written down rather than ignored**, which is the correct handling of a
risk you have decided to accept.

**The trap.** Testing with polite attacks. The real test set includes a photo with an instruction
printed beside the plant, because that is the one nobody thinks of.

## 71. Evals and the golden set

**What it is.** How you test something that has no single correct answer. A normal test asserts
`output === expected`. A model's output changes between runs, so the question becomes **"is it right
often enough?"** — which needs a measurement, not an assertion.

**A golden set** is a fixed collection of real inputs where **a human wrote down the right answer
first**. You run the model over it and count agreement.

**Three rules that make it honest:**

- **The human answers come first**, before anyone sees what the model said. Otherwise you are marking
  your own homework.
- **The pass bar is a number chosen in advance** — "agrees 8 times in 10" — not a feeling afterwards.
- **If a model grades the answers, check the grader.** Score a sample by hand and write down how often
  the two agree. Skip that and the pass bar is measuring the grader.

**In zamphora.** A 40-photo golden set, a bar of 8 in 10, and a **ceiling** as well as a floor: no more
than 3 in 10 answers may come back "cannot tell", **because a model hiding behind a refusal fails too,
just quietly.** That second number is the part most people leave out.

**The confidence design is the wider lesson.** If you ask a model how sure it is, it writes a number —
and that number is the model talking about itself, not a measurement. A wrong answer said at 95% looks
exactly like a right one. **So no percentage is ever shown.** The model returns one of three bands —
`likely`, `unsure`, `cannot-tell` — and a band can be tested, because it is a claim about the world a
person can check.

**And the eval job does not run automatically**, for a reason that is pure arithmetic: 40 photos at
$0.0040 is $0.16 a run, so nightly would be about $4.80 a month against a $5 balance. **A test that
empties the balance it is testing is not a test.**

**The trap.** No golden set, and "it looked good when I tried it". That is the state most AI features
ship in, and it is why nobody can tell whether a prompt change made things better or worse.

## 72. Tokens, cost and denial of wallet

**What it is.** Models are billed per **token** — roughly ¾ of a word — with **input tokens cheaper
than output tokens**. An image costs tokens too, based on its size.

**Denial of wallet** is denial of service with the bill as the weapon: call the paid endpoint faster
than a person could, until the money is gone. **It breaks nothing. It just spends.**

**Four controls, and they are not interchangeable:**

| Control | Stops |
| --- | --- |
| **Authentication on the paid route** | Anonymous scripts. The cheapest control there is |
| **A per-account limit** | One account, honest or not, spending everything |
| **A per-call cost ceiling** | One request being unexpectedly enormous |
| **A total budget or a prepaid balance** | Everything, eventually |

**In zamphora.** All four, and the numbers are concrete. Sign-in is required, so there is no anonymous
model call at all. Ten assessments per account per day. **The image is capped at 1000 px on its longer
side, and that is a cost decision as much as a quality one** — it keeps one photo at 1296 visual
tokens instead of about three times that. The balance itself is the total cap.

**The arithmetic is done rather than assumed**, and it is the habit worth copying: one call is about
$0.0035, a photo may take three, so the ceiling is $0.012 per photo and $0.12 for a person's whole day.
**$5 is about 1,250 assessments on Haiku 4.5, 625 on Sonnet 5, or 250 on Opus 5** — which is the same
call five times more expensive, and that ratio is the real reason to measure before choosing.

**One rule from that document is a general one:** **a price is what calls would cost. It is not a
bill.** No document may describe a sum larger than the balance as money the owner can lose, because
the API stops at zero. Getting that distinction wrong makes a risk register wrong in both directions.

**The trap.** Estimating cost from a token count instead of reading the `usage` block the API returns.
The estimate is always wrong, and it is wrong in whichever direction nobody checked.

## 73. RAG, embeddings and vector stores

**What it is.** **RAG** — retrieval-augmented generation — is the standard way to make a model answer
about information it was never trained on: **find the relevant documents first, put them in the prompt,
then ask the question.**

**The three pieces:**

| Piece | What it is |
| --- | --- |
| **Embedding** | A list of numbers representing the meaning of a piece of text. Similar meanings give similar numbers |
| **Vector store** | A database that finds the nearest vectors quickly. pgvector, Pinecone, OpenSearch |
| **Retrieval** | Embed the question, find the nearest chunks, put them in the prompt |

**In zamphora there is none of this, and the reason is the useful part.** The model is asked to look at
a photograph and say what is wrong. **There is no corpus of documents it needs.** Adding a vector store
would add a service, a chunking strategy, an embedding cost per document and a retrieval step, to
answer a question nothing asked.

**Where it would go if it were ever added** is written down anyway: a plant-care reference so advice
could cite a source. `monorepo-architecture.md` §13 says it would live behind the same port, as a step
before the model call, so nothing else in the system would change.

**The security note attached to that decision.** `01-threats.md` lists two OWASP LLM entries as **not
applicable** — data poisoning and vector weaknesses — and says explicitly that **both come back the day
a vector store or any retrieval step is added.** Writing down why something does not apply is what makes
it possible to notice when it starts to.

**The trap.** Reaching for RAG when the answer is a database query. If the question is "what did this
user do last week", that is a `SELECT`, and a vector search over it will be slower, more expensive and
less correct.

## 74. One call, a chain, or an agent

**What it is.** Four shapes for using a model, in order of power and of how hard they are to control.
**The rule is to stop at the first one that does the job.**

| Shape | What it is | Cost and risk |
| --- | --- | --- |
| **Plain code** | No model at all. An `if`, a lookup table | Free, testable, boring, and often correct |
| **One call** | One prompt, one answer | Predictable cost, easy to test, easy to cap |
| **A fixed chain** | Call A, then call B with A's answer. The steps are decided by you | Cost multiplies by a known number |
| **An agent** | The model decides which tools to call and how many times | **Unbounded cost, unpredictable path, hardest to test** |

**In zamphora: one call**, and the decision is recorded with the ladder above beside it. **Reaching for
an agent by default is the most common mistake in this area right now.**

**Two things follow from stopping at one call, and both are why the security section is short.** The
cost of an assessment is knowable in advance, so a limit can be a real number. And the model has no
tools, so a successful prompt injection can change the words that come back and nothing else.

**Two checks run before the model call, because they are free and the model is not:** the file must be
an image the app accepts, and the user must have named the plant. **Neither needs a model call to
fail** — which is the general habit: do every cheap check first.

**How else it is done.** A chain is right when one step genuinely needs the output of the last — extract
then summarise, translate then classify. An agent is right when the number of steps genuinely cannot be
known in advance, and then it needs a hard cap on steps, a cap on spend, and a way to stop it.

**The trap.** An agent with no step limit. It is the same failure as an unbounded retry loop, with a
bill attached and a more interesting log.

---

## Where the rest is

| Question | File |
| --- | --- |
| How the specifications got written, and what a factory run is | `ai-native-delivery.md` |
| How this repository is arranged, and why pnpm and Turborepo | `monorepo-architecture.md` |
| How the running system fits together on AWS, with diagrams | `aws-and-the-pipeline.md` |
| Why a specific choice was made here | `../ADR/`, one record per decision |
| What could go wrong and what is done about it | `../900-security/` |
