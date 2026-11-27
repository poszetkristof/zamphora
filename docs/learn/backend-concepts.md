# Backend and infrastructure concepts, in plain words

## How every entry is written

Every entry has the same five parts. An entry skips a part it does not need.

| Part | What it gives you |
| --- | --- |
| **What it is** | One or two plain sentences: the thing, and the problem it solves |
| **The parts** | If it has pieces, each piece with **the question it answers** and **the real tool** |
| **In zamphora** | Where it is in this project, with a real file or a real value |
| **How else it is done** | The other ways, named, and when each one is better |
| **The trap** | The mistake people make |

**This file is a dictionary.** You can read it in order, but the normal use is to look up one word.
**Nothing here is only about AWS unless it says so.** The ideas are the same on Google Cloud, on
Azure and on a rented server.

### Start with these 20 entries

If you have little time, read these first. They are the ideas zamphora uses most.

- The shape of a backend: **3** stateless, **4** synchronous and asynchronous, **7** contracts
- Data: **9** access patterns, **10** partition key and sort key, **14** race conditions
- Other systems: **20** timeouts, **21** retries, **22** idempotency, **23** circuit breaker
- Security: **32** authentication and authorization, **34** sessions and JWTs, **39** least
  privilege, **41** threat modelling
- Running it: **45** infrastructure as code, **46** servers and serverless, **55** observability
- AI: **68** what a model call is, **70** prompt injection, **71** evals

---

## How to read the diagrams in these notes

These notes use **five kinds of diagram**. Each kind answers a different question. All of them are
written in **Mermaid**, a plain-text way to describe a diagram. GitHub draws it, and you can also read
the source in the file.

| Kind | Answers | How to recognise it | How to read it |
| --- | --- | --- | --- |
| **Flowchart** | What connects to what | `flowchart TD` at the top. Boxes and arrows | Follow an arrow from one box to the next. **The arrow labels are the important part** |
| **Sequence** | What happens, in what order | `sequenceDiagram`. Names across the top, lines going down | Read **from top to bottom**. Each arrow across is one message. Time goes down |
| **State** | Which states a thing can be in, and what moves it | `stateDiagram-v2`. Rounded boxes, `[*]` for start and end | Pick one box and look at the arrows that leave it. **The arrow label is the event that causes the move** |
| **C4 container** | The pieces of one system and their jobs | `C4Container`. Boxes with a description inside | Read each box's description first, then the arrows. **Each arrow says what crosses it, and how** |
| **Layered flowchart** | What stops what, in order | A flowchart where each box is a defence | Read from top to bottom. At each step, ask **what gets through** and what is refused |

**Four habits that help with any diagram:**

- **Read the arrow labels, not only the boxes.** A box says that a thing exists. An arrow label says
  what crosses between two things, and that is where the design is.
- **Look for a box with no arrow going in.** It is either the start, or something nobody uses.
- **In a C4 diagram, a missing arrow is a finding.** In this project, a review found a box whose
  text described a connection that the diagram never drew. The missing arrow was hiding a question
  nobody had decided.
- **A diagram that does not match the code is worse than no diagram**, because people trust it.

**The C4 model.** It is a way to draw software at four zoom levels: **context** (this system and what
it talks to), **container** (the pieces you deploy), **component** (the inside of one piece) and
**code**. **zamphora draws only the first two.** The lower two go out of date as soon as someone
changes the code.

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

**What it is.** A **backend** is a program on a computer you control. It waits for requests and
answers them. It exists because **some things must never happen on the user's device**: holding the
database password, deciding its own permissions, or saying who the user is.

**Almost every request goes through the same four steps:**

| Step | What happens | What goes wrong |
| --- | --- | --- |
| **Route** | The URL and the method choose a handler | Two routes match, or none does |
| **Guard** | Who is this, and may they do this? | One route is missing the check |
| **Work** | Read or write data, call another service | This is the slow part. Part C is about it |
| **Answer** | Turn the result into a status code and a body | Internal details leak into the error message |

**In zamphora.** `apps/api` is a Nest.js app. A guard runs before every controller. It refuses any
route that does not say who may call it. The work is DynamoDB and S3. The answer is a body checked by
Zod, or a standard error document (RFC 9457, "problem+json").

**How else it is done.** A **monolith on a rented server** runs the same four steps in a process that
never stops. A **serverless function** runs them in a process that starts on a request and is thrown
away later. A **BFF** (backend for frontend) is a backend that serves only one front end. zamphora has
a BFF. The four steps are the same in all of them.

**The trap.** Putting the guard inside each handler instead of in front of all of them. It works
until someone adds route number fourteen and forgets the check.

## 2. The browser is never trusted

**What it is.** Anything the browser sends can be false. A person can open the developer tools, or
skip the browser and send the request with `curl`. So **every check that matters runs again on the
server**, even if the browser already did it.

**The sentence to remember:** *a check that runs only in the browser is not a check. It is a
convenience.*

**In zamphora.** The browser checks the photo format and makes the photo smaller before the upload.
This gives the person a fast answer and a smaller upload. Then the API checks the format again, and
it **decodes and re-encodes the image**. This proves the bytes really are an image. The web app holds
no credentials at all.

**How else it is done.** Some systems send a signed value from the server and check the signature
when it comes back. That works for data the server created. It does not help with data the user
created, which must still be checked.

**The trap.** Hiding a button and calling it a permission. If the route still answers, there is no
permission.

## 3. Stateless and stateful

**What it is.** A server is **stateless** when it keeps nothing in its own memory between requests.
Everything it needs comes in the request, or is read from a shared store. A **stateful** server
remembers things in its memory: a signed-in session, an upload in progress, a counter.

**Why it matters.** You can copy a stateless server. Ten copies behave the same, so any copy can
answer any request, and you can add a copy when traffic grows. You cannot do this with a stateful
server, unless you move the state to a shared place.

| | Stateless | Stateful |
| --- | --- | --- |
| Where the session lives | A shared store | The server's own memory |
| Adding a second copy | Just works | Breaks, unless each user always goes to the same copy |
| A copy dies | Nothing is lost | What it held is lost |

**In zamphora.** Lambda functions are stateless by design, because AWS can destroy a copy at any
moment. The session is a row in DynamoDB, not memory. **One value is kept in memory on purpose:** the
kill-switch value, cached for 30 seconds. ADR-0009 says what happens while that cached value is old.

**How else it is done.** **Sticky sessions** send one user always to the same server. That is the old
answer, and it makes every deploy painful. **Redis** or **Memcached** as a shared session store is
the usual answer for servers and containers.

**The trap.** A cache in memory that is right on one copy and wrong across ten. Each copy has its
own idea of the truth.

## 4. Synchronous and asynchronous

**What it is.** **Synchronous** means the caller waits, with the connection open, until the answer
is ready. **Asynchronous** means the caller gets "I have it" at once, and the answer arrives later in
another way.

**One question decides which one you need:** is the work always faster than the shortest timeout
between the user and the code? If not, it must be asynchronous.

| | Synchronous | Asynchronous |
| --- | --- | --- |
| The answer code | `200 OK` with the result | `202 Accepted` with an id |
| Whose timeouts limit the work | Every layer between: browser, CDN, gateway, function | Only the worker's |
| Can it retry? | Rarely. A retry uses the same time | Yes. The worker has its own time |
| Cost | Simple, few pieces | A queue or a workflow, a way to report back, more ways to fail |

**In zamphora.** At first, the phone waited while the model answered. Four timeouts sat on top of the
model call and left it about 16 seconds. Then it became asynchronous: the API answers `202` in about
one second, a Step Functions workflow makes the call, and the phone gets the result over an open
stream. **A retry became possible only because of this change.**

**How else it is done.** A **queue plus a worker** is the classic shape: the API writes a message to
SQS or RabbitMQ, and a separate process reads it. A **background job library**, such as BullMQ,
Sidekiq or Celery, does the same inside one app. A **cron job** runs work that nobody waits for.

**The trap.** Going asynchronous and forgetting that the user still needs the answer. The hard part is
not the queue. It is telling the phone that the result is ready (entry 30).

## 5. API styles: REST, RPC, GraphQL, gRPC

**What it is.** Four common ways to shape the calls between a client and a server. They differ in
what the URL means, and in who decides the shape of the answer.

| Style | The idea | Good at | Weak at |
| --- | --- | --- | --- |
| **REST** | URLs are **things**, HTTP methods are the verbs: `GET /pots/42` | Public APIs, caching, being easy to understand | A screen that needs five things makes five calls |
| **RPC** | URLs are **actions**: `POST /assessPlant` | Internal calls that really are function calls | Caching |
| **GraphQL** | One URL. The client asks for exactly the fields it wants | Many different screens over one set of data | Caching, and one bad query can be very expensive |
| **gRPC** | Binary messages, defined in a `.proto` file, over HTTP/2 | Service to service, high volume, strict types | Browsers cannot call it without a proxy |

**In zamphora.** REST: thirteen routes such as `GET /api/pots` and `POST /api/assessments`, with ids
in the path. With one user and seven screens, REST's "five calls per screen" weakness never matters.

**How else it is done.** **tRPC** is worth knowing for TypeScript projects. The client calls what
looks like a normal function, and the types come straight from the server. It only works when both
sides are TypeScript in one repository. It lost here because the shared Zod contracts already give
most of the same benefit, without tying the API to one language.

**The trap.** Long arguments about the "right" REST URL. `POST /assessments` or `POST /assess`
changes nothing important. Checking the response shape on both sides changes a lot.

## 6. The status codes that carry meaning

**What it is.** The three-digit number in every HTTP answer. **About twelve codes are a design
decision**, because the client must behave differently for each one.

| Code | Means | What the client should do |
| --- | --- | --- |
| `200` | Here is the answer | Use it |
| `201` | Created, and here is where it is | Follow the `Location` header |
| `202` | **Accepted, not finished** | Wait for the result somewhere else |
| `204` | Done, nothing to send back | Nothing |
| `400` | Your request is wrong | Fix it. Sending the same request fails the same way |
| `401` | I do not know who you are | Sign in |
| `403` | I know who you are, and the answer is no | Stop. Signing in again will not help |
| `404` | It does not exist, **or you may not know that it exists** | Stop |
| `409` | It conflicts with the current state | Sometimes retry, sometimes not |
| `429` | Too many requests | Wait, then retry. Read `Retry-After` |
| `500` | The server broke | Retry carefully |
| `503` | The server cannot answer right now | Retry, and wait longer each time |

**In zamphora.** `202` is the whole asynchronous design in one code. **`404` is used where many
systems would use `403`.** If you ask for another person's row, you get the same answer as for a row
that does not exist. So nobody can find out which ids are real.

**How else it is done.** Some APIs always answer `200` and put `{"error": ...}` in the body. This
breaks every tool that reads status codes: client retries, alarms and CDN caching rules.

**The trap.** Answering `403` where `404` would be safer. A `403` tells an attacker that the row
exists.

## 7. Contract-first, and validating at the edge

**What it is.** A **contract** is the agreed shape of the data that goes between two programs.
**Contract-first** means this shape is written in one place, and both sides import it. Otherwise each
side describes it separately, and the two descriptions slowly stop matching.

**Validating at the edge** is the matching rule: **check data you do not trust once, where it enters.
Inside, the data is typed and trusted.**

**In zamphora.** Every type that crosses the network is a **Zod** schema in `packages/contracts`. The
web app and the API both import it. `CLAUDE.md` bans writing `type PlantResponse = {...}` inside an
app.

- Requests use `z.strictObject`, so a field the server does not expect is refused.
- Responses use `z.object`, so a new field in the answer does not break an older client.

**How else it is done.** **OpenAPI** is a YAML file that describes the API, and clients are generated
from it. It is the right answer when the two sides use different languages. **Protobuf** does the
same for gRPC. zamphora uses Zod because both sides are TypeScript, so one schema is both the check
and the type.

**The trap.** Trusting a TypeScript type. Types disappear when the code is compiled, so they check
nothing while the program runs. Only the schema runs.

---

# B — Data

## 8. SQL and NoSQL

**What it is.** Two families of database. One question separates them: **does the database know the
shape of your data, or do you?**

| | **Relational (SQL)** | **Key-value or document (NoSQL)** |
| --- | --- | --- |
| Examples | PostgreSQL, MySQL, SQLite, Aurora | DynamoDB, MongoDB, Redis, Cassandra |
| The shape | Tables and columns. The database enforces them | Whatever you write. The database does not check |
| Asking a new question | Write a new `SELECT`. It works | Often impossible without a new index or reading everything |
| Joining two things | Built in | You do it yourself, or you store the things together |
| Growing very large | Hard past one machine | Designed for it |
| The bill | Usually per hour, used or not | Often per request, or per reserved capacity |

**The real difference is when you must plan.** With SQL, you design the data in a simple way, and you
optimise later when a query is slow. With NoSQL, you must plan **first**, because you cannot ask a
question you did not plan for.

**In zamphora.** DynamoDB, one table. **The reason is not scale. It is the bill.** On this AWS plan, a
relational database either has no free offer, or its trial is switched off. And all eleven questions
zamphora asks of its data are "give me this one item" or "give me the items of this one owner". That
is exactly what key-value is good at. A relational database would not be wrong here. It is just not
needed and not affordable.

**How else it is done.** **SQLite** is a very good choice for a one-user project: one file, no server,
no hourly cost. **Redis** is key-value kept in memory. It is very fast, and it loses data on a restart
unless you configure it not to. **Cassandra** is for a scale this project will never reach.

**The trap.** Choosing NoSQL "for scale" with one user. Six months later, someone wants a report, and
the key design cannot answer the query.

## 9. Access patterns first

**What it is.** The design rule for any key-value store, and a good habit in SQL too: **write down
every question the data must answer before you decide where the data goes.** The key design then
comes from that list.

**A well-written question** is not "we store pots". It is *"which pots does this user own, and how
often is that asked?"* It has a thing, an owner and a frequency.

**In zamphora.** `docs/400-architecture/00-options.md` §1 lists eleven questions, Q-1 to Q-11, before
it names any technology. **The list is short, and ten of the eleven questions are about one user or
one day.** Only Q-11, "which accounts have not signed in for 11 or 12 months", looks across all
accounts. It runs once a month.

**How else it is done.** In SQL the same habit is called **query-driven design**. It is optional
there, because a missing query is just a new `SELECT`. **Event sourcing** works the other way round:
you store every change that ever happened, and you build any view you need later. That gives you the
full history, and it costs a lot of extra machinery.

**The trap.** Designing the entities first, like a class diagram (Pot, Assessment, User), and only
then asking what gets read. In a key-value store, that design answers the easy questions and none of
the real ones.

## 10. Partition key and sort key

**What it is.** This is how DynamoDB and similar databases find data fast.

| | What it does | What it costs |
| --- | --- | --- |
| **Partition key** | Decides **which machine** the item lives on. You must give the exact value, never a range | Items with different partition keys cannot be read in one query |
| **Sort key** | Decides **the order of items inside one partition**. Supports "starts with" and "between" | Only works inside one partition |

**Single-table design** comes from this. You put different kinds of items in the same table, and you
tell them apart with a readable prefix in the sort key. Then one query returns a user's profile, pots
and assessments together.

**In zamphora.** The partition key is `USER#<sub>`, the owner's id, for almost everything. The sort
key is `PROFILE`, `POT#<id>`, `ASSESS#<potId>#<timestamp>`, `TASK#<due>#<id>` or `QUOTA#<date>`.

**The security result is the important part.** The owner id is the partition key, and it comes only
from the session. So no code can build a key that points to another person's row. **Ownership is not
a check that someone can forget. It is the address.**

**How else it is done.** In SQL, the same protection is `WHERE user_id = ?` on every query. That is a
check, so one query can miss it. **Row-level security** in PostgreSQL moves this check into the
database, which is closer to the DynamoDB result.

**The trap.** A **hot partition**: a key that sends most traffic to one machine, such as today's
date. And a **scan**, which reads the whole table, because the key design cannot answer the question.

## 11. Indexes

**What it is.** An **index** is a second copy of some of your data, sorted in a different order. A
question that would read everything can then read only a little.

**The cost is the same in every database:** each write now updates the table **and** every index on
it, and each index takes storage. So an index makes reads faster, and writes slower and more
expensive.

| | SQL | DynamoDB |
| --- | --- | --- |
| Name | `CREATE INDEX` | **GSI** (global secondary index): a different partition key. **LSI** (local secondary index): same partition key, different sort key |
| Without an index | Reading the whole table. Slow, but it works | Often no way to ask the question at all |
| Added later | Yes | Yes for a GSI. It fills itself from the existing data |

**In zamphora.** **There is no index in run 1**, and that is a decision. The first one comes in run 3,
for "which care tasks are due today". That is the first question that looks across all accounts.
**This index is the first place where the ownership protection from entry 10 can break**, because a
GSI uses a different partition key, so the address is no longer the owner.

**How else it is done.** A **materialised view** in SQL is the same idea at a bigger size. A search
engine such as OpenSearch or Elasticsearch is for "find anything that contains this word", which a
normal index does badly.

**The trap.** Adding an index to fix a slow query without asking what it costs on each write. On
DynamoDB there is a second trap: a GSI has its own capacity, so it can be throttled while the table
is fine.

## 12. ACID and transactions

**What it is.** A **transaction** is several changes that must all happen, or none of them. **ACID**
is the four promises a relational database makes about transactions.

| Letter | Promise |
| --- | --- |
| **A**tomic | All of the changes, or none. Never half |
| **C**onsistent | The database's own rules, such as keys and constraints, are never broken |
| **I**solated | Two transactions at the same time do not see each other half-finished |
| **D**urable | Once the database says "saved", a power cut does not lose it |

**The classic example:** moving money. Take 100 from A, add 100 to B. If the second step fails and
the first one does not, money disappears.

**In zamphora.** **There is no transaction across several items, on purpose.** Every write that must
not race is **one atomic operation on one item**. One item is always all-or-nothing, so this is
simpler and safer. The daily limit is one `UpdateItem` with a condition. The idempotency claim is one
conditional `PutItem`.

**How else it is done.** DynamoDB does have `TransactWriteItems` for up to 100 items, and it costs
double the capacity. Across several services, the usual answer is a **saga**: a list of steps where
each step has an "undo" step, because a real transaction across services does not exist. zamphora's
`Refund` step is such an undo step: it gives the attempt back when the run is refused after the
count.

**The trap.** Reading a value, changing it in code, and writing it back. That is not atomic. Entry 14
shows what goes wrong.

## 13. Strong and eventual consistency

**What it is.** After a write succeeds, does the next read see it?

- **Strong consistency:** yes, always. Every read sees the newest write.
- **Eventual consistency:** not always. A read may return a slightly older value. It catches up within
  milliseconds.

**Why anyone accepts the weaker one:** it is cheaper and faster, because any copy of the data can
answer. On DynamoDB, an eventually consistent read costs **half** of a strongly consistent one.

**In zamphora.** Reads that decide something are **strongly consistent**, and the free-tier numbers
assume that: 20 read units give about 20 strongly consistent reads a second. The kill-switch is
different on purpose. It is cached for 30 seconds, so it may be old for that time. The promise to the
owner is 60 seconds, so the old window fits inside it.

**How else it is done.** A read copy (a "replica") of a SQL database is eventually consistent, for the
same reason. **CAP** is the name of the rule underneath: when the network between two parts breaks,
a system can stay consistent or stay available, not both.

**The trap.** Writing an item, reading it back at once with a cheap read, and reporting a bug that the
data "did not save". It did.

## 14. Race conditions and atomic writes

**What it is.** A **race condition** is when two things happen at the same time, and the result
depends on which one wins. In a backend, it is almost always **read, decide, write**, where someone
else wrote in between.

**One example shows the whole problem.** The daily limit is ten. Ten requests arrive together:

```
Wrong:  each reads "9 used"  ->  each decides "9 < 10, allowed"  ->  each writes 10
        Result: ten calls made, counter says 10. Nine too many.

Right:  each sends one operation: "add 1, but only if the value is under 10"
        The database runs them one by one. Exactly one hits the limit and is refused.
```

**In zamphora.** The daily limit is one `UpdateItem` with `ADD attempts :one` and the condition
`attempts < :limit`. ADR-0008 says it plainly: ten requests at the same moment must give exactly the
allowed number of successes. The idempotency row uses the same shape: a conditional `PutItem` that
only succeeds if nothing is there yet.

**How else it is done.** In SQL, it is one statement: `UPDATE quota SET used = used + 1 WHERE used <
10`. Or `SELECT ... FOR UPDATE`, which locks the row. In Redis, `INCR` is atomic for the same reason.

**The trap.** Thinking the race is unlikely because it needs perfect timing. An attacker sends the ten
requests **on purpose**, at the same moment, in a loop.

## 15. Optimistic and pessimistic locking

**What it is.** Two ways to stop two people from overwriting each other's change to the same thing.

| | **Pessimistic** | **Optimistic** |
| --- | --- | --- |
| The idea | Lock it before you touch it. Everyone else waits | Do not lock. When you save, check that nothing changed |
| How | `SELECT ... FOR UPDATE` | A `version` number: "write only if the version is still 7" |
| Good when | Conflicts are common | Conflicts are rare, which is almost always |
| The cost | Locks, waiting, deadlocks | The loser must be told, and must try again |

**In zamphora.** Every item has a `version` field. This is optimistic locking. The conditional writes
in entry 14 are the same family: "write only if the data still looks like this".

**How else it is done.** HTTP has this built in: an `ETag` header on the response and `If-Match` on
the update. If someone else changed the thing first, the server answers `412 Precondition Failed`.
Very few APIs use it.

**The trap.** Using neither, because "two people never edit at the same time". Then one person with
two browser tabs does exactly that.

## 16. Normalised and denormalised

**What it is.** **Normalised** means each fact is stored once, and everything else points to it.
**Denormalised** means a fact is copied into the places that need it.

| | Normalised | Denormalised |
| --- | --- | --- |
| A user renames their pot | One row changes | Every copy must be found and changed |
| Reading a screen | Several joins | One read |
| Risk | Slow reads | Copies that do not match |

**In zamphora.** A care task stores the ids of its pot and of its assessment. It also stores a copy of
the **action text** from the model's answer. This copy is on purpose: the task must still make sense
if the assessment is deleted later.

**How else it is done.** Key-value stores push you to denormalise, because there are no joins. The
usual shape is to store the data ready to read, and accept the update cost. **CQRS** is the formal
name for using one model to write and another model to read.

**The trap.** Copying a value that changes, without deciding what happens when it changes. Copying a
value that is a snapshot, such as a price at the time of sale, is correct. Write a comment, so nobody
"fixes" it.

## 17. The N+1 query

**What it is.** The most common slow-database bug. You fetch a list of N things. Then you loop over
the list and fetch one more thing for each item. One query becomes N+1 queries.

```
Slow:  SELECT * FROM pots WHERE user_id = 7         -> 20 pots
       for each pot: SELECT * FROM assessments ...  -> 20 more queries
       21 round trips.

Fast:  SELECT * FROM assessments WHERE pot_id IN (...)   -> 1 query
       or a join, or DynamoDB BatchGetItem
```

**Why you do not see it at first.** On your laptop with 3 rows, it is instant. With 500 rows and
2 ms of network each, it is a full second of waiting.

**In zamphora.** The key design avoids it. One `Query` on `PK = USER#<sub>` returns the profile, the
pots and the assessments together, because they share one partition. This is the main practical
benefit of single-table design.

**How else it is done.** An ORM such as Prisma or TypeORM causes most real cases, and each ORM has a
fix: `include`, or eager loading. **GraphQL makes it worse by default**, because each field can fire
its own query. That is why the `DataLoader` library exists.

**The trap.** Not looking for it. The fix is always easy. Finding it needs a query log or a trace
(entry 55).

## 18. Migrations

**What it is.** A **migration** is a recorded, repeatable change to the shape of stored data: add a
column, rename a field, fill in a value. It is in git, it runs in order, and every environment runs
the same migrations.

**The rule that makes migrations safe: expand, migrate, contract.** Three deploys, never one.

1. **Expand:** add the new field. Write both the old and the new field. Nothing reads the new one yet.
2. **Migrate:** fill in the old rows. Start reading the new field.
3. **Contract:** stop writing the old field, then delete it.

**Why three deploys.** During a deploy, old code and new code run at the same time. If one deploy
renames a column, every request served by an old copy breaks.

**In zamphora.** DynamoDB has no schema to migrate. **But the shape of the data still changes, so the
problem still exists.** The answer is the version field `v` on every item, plus the rule that a
reader must handle older versions. The contracts have the matching rule: adding an optional field is
safe, and removing a field or making one required is not.

**How else it is done.** Prisma Migrate and Knex in Node, Flyway and Liquibase in Java, Alembic in
Python. They all do the same job: a folder of ordered files, and a table that records which ones have
run.

**The trap.** Thinking a database without a schema removes the problem. It removes `ALTER TABLE`. It
does not remove two versions of the code reading the same item.

## 19. Backups, RPO and RTO

**What it is.** Two numbers that turn "we have backups" into something you can test.

| | Full name | The question | Example |
| --- | --- | --- | --- |
| **RPO** | Recovery point objective | **How much data may be lost?** | "At most one hour of writes" |
| **RTO** | Recovery time objective | **How long may the system be down?** | "Back within four hours" |

**You choose both numbers.** RPO decides how often backups run. RTO decides how they are stored and
practised.

**In zamphora.** **There is no backup, and that is a decision.** DynamoDB point-in-time recovery is
charged per gigabyte, with no free amount, so it is off. The infra plan says plainly that a bad deploy
which writes wrong rows cannot be undone. **Instead, the owner exports the data by hand before
2026-12-31.** This is acceptable with one user and test data. It stops being acceptable on the day
that is no longer true.

**How else it is done.** Point-in-time recovery on DynamoDB or RDS gives an RPO of about five minutes.
A nightly `pg_dump` to S3 gives an RPO of one day and costs almost nothing. **A replica is not a
backup:** it also copies the `DELETE`.

**The trap.** A backup nobody has ever restored. Until someone restores it once, it is only a plan.

---

# C — Talking to other systems

**This whole part is about one situation: your code calls something that can be slow, wrong, or
gone.** Each entry is a named answer to that situation. A real system uses most of them together.

## 20. Timeouts and deadlines

**What it is.** A **timeout** is the longest one call may take. A **deadline** is the longest the
whole request may take. It is set once, when the request arrives, and every step inside shares it.

**Why the difference matters.** Five steps with a 10-second timeout each can take 50 seconds in
total, and nobody added that up. A deadline prevents this: every step asks "how much time is left?"

**The rule that is easy to get wrong:** **every timeout in the chain must be shorter than the one
outside it.** Then your code fails first, with a message you wrote. If the outer timeout fires first,
the user gets a `504` from a gateway, and your app never knows.

**In zamphora.** At first, four timeouts sat on top of each other: the app at 20 s, the function at
22 s, CloudFront at 25 s, and API Gateway at 30 s. The model call got what was left, about 16
seconds. **These timeouts are the reason the architecture changed.** Now the paid call has no
platform timeout above it. The model call stops at 18 s, the workflow step at 25 s, and the function
at 30 s. There is **no timeout on the whole workflow**, on purpose, because that timeout would skip
every error handler and leave a row stuck.

**How else it is done.** Go passes a `context.Context` with a deadline through every call. It is the
cleanest version of this idea in any language. gRPC sends the remaining time with each call, so the
server knows how long the caller will still wait.

**The trap.** A long timeout per step and no total. Also, a timeout longer than the caller's: the work
goes on after nobody is listening. On a paid call, that is money spent on an answer nobody receives.

## 21. Retries, backoff and jitter

**What it is.** Trying again after a failure. Three words go with it:

| Word | What it means |
| --- | --- |
| **Retry** | Send the request again |
| **Backoff** | Wait longer each time, such as 1 s, 2 s, 4 s, 8 s, so a service in trouble is not hit harder |
| **Jitter** | Add a random amount to the wait, so a thousand clients do not all retry at the same moment |

**The main rule: retry only what a retry can fix.** A timeout, a `429` and a `503` are worth a retry.
A `400`, a `403` and "your balance is empty" are not. They fail the same way again, and the retry only
costs time and money.

**The second rule: a retry needs idempotency** (entry 22). Otherwise a retry after a slow success does
the work twice.

**In zamphora.** This rule was decided three times, and the order is the lesson.

1. First: **two attempts.**
2. Then: **no retry at all.** While the phone waited, two calls cost more than the price limit, and
   there was no time left for a second call.
3. Now: **at most two extra tries.** This became possible only when the work moved into the
   background and stopped using the user's waiting time.

The call itself never changed. **Whether a retry is safe depends on the shape around the call.** The
limit is written in one place, `MaxAttempts: 2` in the workflow. The Anthropic client has
`maxRetries: 0`, so the SDK does not retry underneath.

**An AWS trap to know by name.** CDK's `LambdaInvoke` step adds a **hidden retry of up to six
attempts** on Lambda service errors, unless you set `retryOnServiceExceptions: false`. Without that
setting, one photo could become many paid calls, and nothing in the code would show it.

**How else it is done.** Libraries: `p-retry` in Node, Polly in .NET, resilience4j in Java. The AWS
SDK retries three times by default. That is usually right, and it is wrong on a paid call.

**The trap.** **Retry storms.** Each layer retries three times, so three layers give 27 calls for one
request. Retry at **one** layer only, and let the others fail fast.

## 22. Idempotency

**What it is.** An operation is **idempotent** when doing it twice gives the same result as doing it
once. It matters because networks repeat things: a phone loses its signal, a person taps again, a
queue delivers a message twice.

**How it is done.** The **caller** creates an **idempotency key**, usually a UUID, and sends it with
the request. The server records the key the first time. The second time, it returns the first result
or refuses.

**HTTP already has a rule for this:** `GET`, `PUT` and `DELETE` should be idempotent, and `POST` is
not. That is why `POST` endpoints are the ones that need a key.

**In zamphora.** **The browser creates one UUID when the person chooses the photo**, not when the
request starts. So a resend carries the same UUID. The API claims it with a conditional `PutItem` on
`SK = IDEM#<requestId>`. It writes the assessment id onto that row **before** it answers `202`, so a
resend gets the same run back. Without this, one tap on a weak signal could cost two paid model calls.

**How else it is done.** **Stripe** takes an `Idempotency-Key` header and stores the whole response
for 24 hours, so a repeat gets exactly the same body. A queue reader usually stores the ids of the
messages it already processed. It is the same idea, done by the reader.

**The trap.** Creating the key on the server, or creating a new key for each attempt. Both break the
idea completely. **The retry must carry the same key as the first request.**

## 23. The circuit breaker

**What it is.** A switch that **stops calling a service that is already failing.** You stop wasting
time and money on calls that will fail anyway, and the service gets a chance to recover.

**It has three states:**

| State | What happens |
| --- | --- |
| **Closed** | Normal. Calls go through. Failures are counted |
| **Open** | After N failures in a row, every call is refused at once, without trying |
| **Half-open** | After a wait, **exactly one** call goes through as a test. Success closes the breaker. Failure opens it again |

**In zamphora.** Five failed model calls in a row open it. Then it lets one test call through every
ten minutes. It is a row in DynamoDB, `PK = CONFIG, SK = BREAKER`, written by the `assess` function.
The test is always exactly one call, because `assess` can only run one copy at a time.

**The design point to keep.** The breaker **does not share a row with the kill-switch**. The
kill-switch is a person's decision. The breaker is the machine's. If they shared a row, the machine
could undo the person's decision.

**How else it is done.** Netflix's Hystrix made the pattern famous, and it is no longer maintained.
resilience4j and Polly are the current libraries. A service mesh such as Istio can do it outside the
app.

**The trap.** A breaker without the half-open state. It stays open until someone notices. Also, a
breaker that counts every kind of error, so one bad request opens it for everyone.

## 24. Bulkheads and backpressure

**What it is.** Two ways to stop one slow thing from bringing down everything else.

- **Bulkhead:** give each kind of work its own fixed share of the resources. One kind can use up its
  share without touching the others.
- **Backpressure:** when you cannot keep up, **say so**, and refuse new work. Do not accept work you
  will never finish. A fast refusal is a feature.

**In zamphora.** The bulkhead is **reserved concurrency**: `api` may run 10 copies at once, `assess`
exactly 1, and `watch` 5. A flood of photo requests cannot take every copy and block the plant list.
The backpressure is the daily limit and the API Gateway rate limit: the eleventh request is refused
in milliseconds, and it costs nothing.

**How else it is done.** A separate thread pool per dependency is the classic Java version. A queue
with a maximum size is backpressure in its simplest form: when it is full, new work is refused.

**The trap.** A queue with **no** maximum size. It looks fine until the memory runs out. By then, the
oldest item in it is too old to be useful.

## 25. Rate limiting and throttling

**What it is.** A limit on how many requests are allowed in a period of time. **Rate limiting**
usually means per user or per key. **Throttling** usually means the whole endpoint. They protect
against different things.

| Layer | Protects against | Tool |
| --- | --- | --- |
| Per account, per day or minute | One user using more than their share | Your own code and a counter |
| Per endpoint, per second | A flood from anywhere | API Gateway, nginx, a load balancer |
| Per IP address | Simple, and easy to get around with many addresses | A WAF or CDN rule |

**Two algorithms to know.** A **fixed window** counts per clock period, such as per minute. It is
simple, but it allows a double burst at the edge between two periods. A **token bucket** refills at a
steady rate and allows a controlled burst. Most real limiters use it.

**In zamphora.** Three layers. Each stops something the others cannot:

- **10 assessments per account per day**, as one atomic conditional write in the app. This one
  protects the **money**, because no AWS setting can see a model call.
- **100 requests a second at API Gateway**, with a burst of 50. The AWS default is 10,000 a second.
  A flood at that rate would cost about **$36 an hour**.
- **Reserved concurrency of 10** on the function. It limits the work even if requests get through.

**How else it is done.** Redis is the usual shared counter when several servers must agree on one
limit. The correct answer is `429` with a `Retry-After` header. It tells the client when to come back.

**The trap.** A limit that costs more to check than the work it protects. For example, a
read-then-write counter, which is slow and can be raced (entry 14).

## 26. Queues, topics and fan-out

**What it is.** Three different shapes of "send a message instead of calling directly". People often
mix up the words.

| Shape | Who reads each message | Example |
| --- | --- | --- |
| **Queue** | **One** reader gets each message | SQS, RabbitMQ |
| **Topic (pub/sub)** | **Every** subscriber gets a copy | SNS, Google Pub/Sub |
| **Stream or log** | Readers read at their own speed, and can read old messages again | Kafka, Kinesis, DynamoDB Streams |

**Fan-out** means one event causes several things to happen. It is usually a topic with several
subscribers.

**A queue gives you three things at once:** the caller stops waiting, a burst of work is stored
instead of dropped, and the work survives when the worker restarts.

**In zamphora.** **There is no queue on the main path, because of money.** A Lambda that reads from
an SQS queue keeps asking the queue for messages, and each ask is a paid request, even when the queue
is empty. So zamphora uses Step Functions, which sends work to the next step instead. **One queue
exists:** a dead letter queue that nothing reads automatically (entry 27).

**How else it is done.** **Kafka** is a good contrast. Messages are not deleted when they are read,
so a new reader can start from the beginning and build its own view. That is why Kafka is a different
tool, not a bigger SQS.

**The trap.** A queue without a dead letter queue. A message that always fails is retried forever and
blocks everything behind it. Also: most queues do **not** keep messages in order, unless you ask and
pay for it.

## 27. The dead letter queue

**What it is.** A **dead letter queue** (DLQ) is where a message goes after it has failed too many
times. The bad message stops blocking the main queue, and a person can look at it later.

**The idea in one sentence:** *a failure nobody can see is a failure nobody fixes.*

**In zamphora.** One SQS queue, attached to the EventBridge rule that marks a run as failed.
**Nothing reads it automatically**, because reading it would cost requests. Instead, an alarm fires
when the queue is not empty, and the owner looks at it by hand.

**How else it is done.** Lambda has a DLQ for asynchronous calls. SQS calls it a redrive policy, and
it has a button that sends the messages back to the main queue after you fix the bug.

**The trap.** A DLQ without an alarm. It fills up quietly, and nobody knows anything was lost.

## 28. At-least-once, at-most-once, exactly-once

**What it is.** The three possible delivery promises for a message. They are the reason idempotency
matters so much.

| Promise | Means | Cost |
| --- | --- | --- |
| **At-most-once** | Send and forget. It may be lost | Simple, and it loses messages |
| **At-least-once** | Retry until the reader confirms. **It may arrive twice** | The normal choice. The reader must handle duplicates |
| **Exactly-once** | Arrives once and only once | **Not really possible across a network** |

**Why exactly-once is not real.** The sender cannot tell "the message was lost" from "the reply was
lost". So it must either risk losing the message or risk sending it twice. Systems that promise
exactly-once really do at-least-once delivery, and then remove the duplicates at the reader.

**In zamphora.** The design expects duplicates everywhere and makes them harmless. **Step Functions
Standard helps here:** if you start a run with a name that already exists, it returns the existing
run instead of starting a second one. Each run is named with the assessment id, so a duplicate start
costs nothing. Step Functions **Express** works the other way: it may run a step more than once. That
is one reason it was not chosen.

**The trap.** Reading "at-least-once" and building as if it said "once". The duplicate always comes,
usually on the busiest day.

## 29. Orchestration and choreography

**What it is.** Two ways to make several services do one job in order.

| | **Orchestration** | **Choreography** |
| --- | --- | --- |
| The idea | One coordinator calls each step in order | Each service publishes an event, and others react |
| Where the order is written | In one place, and you can read it | Nowhere. It comes from everyone's reactions |
| Finding out what happened | Look at the run | Rebuild it from the logs of several services |
| Adding a step | Change the coordinator | Add a subscriber. Change nothing else |
| Tools | Step Functions, Temporal, Airflow | EventBridge, Kafka, SNS |

**In zamphora.** **Orchestration.** Step Functions runs `ClaimRun → Assess → Persist → Rollup`, and
the retries and the error handling are **configuration, not code**. The choreography version was also
designed: every write would become an event that other functions react to. It lost, because nothing
planned needs it.

**The most useful point from that comparison:** with orchestration, the retry rule is one line, and a
test can read it from the deployed workflow. With choreography, retries happen in thirteen places,
each with its own default.

**How else it is done.** **Temporal** is worth knowing if Step Functions is ever too limited. You
write the workflow as normal code that can wait for days. It is nicer for developers, and you must run
a server for it.

**The trap.** Choosing choreography because it feels loose and flexible. Then nobody can answer "why
did this order not ship?" without reading four services' logs. The cost of orchestration is the
opposite: everything depends on the coordinator.

## 30. Getting an answer back later

**What it is.** When work is asynchronous (entry 4), the client still needs the result. There are five
ways to deliver it.

| Way | How it works | Cost |
| --- | --- | --- |
| **Polling** | The client asks "ready?" every few seconds | Wasted requests, and a delay of up to one interval |
| **Long polling** | The server keeps the request open until there is news | Holds a connection. Simple, and works everywhere |
| **Server-sent events (SSE)** | One long HTTP response that the server writes lines into. **One direction only** | Built into browsers as `EventSource`, and it reconnects by itself |
| **WebSocket** | A connection in both directions that stays open | A different protocol, with its own sign-in and its own infrastructure |
| **Webhook or push** | The server calls the client later | The client must be reachable. This is Web Push, or a callback URL between servers |

**In zamphora.** **SSE.** The other options lost for clear reasons:

- **Polling** wastes requests and adds up to two seconds of delay.
- A **WebSocket** on AWS would need a **second host name**. Then the session cookie would not reach
  it, and a second sign-in path would be needed.
- **Web Push** needs a permission prompt and a service worker before it can show anything. It is
  right for reminders in a later run, and wrong for the first minute of first use.

**Two details that are true in any project.** SSE runs over normal HTTP, so cookies and proxies work
without extra setup. And a long response needs a **heartbeat**: zamphora sends an empty comment line
every 5 seconds. The timeouts in between count the gap between packets, not the total length.

**How else it is done.** Slack and older chat systems used long polling for years. It still works
everywhere. GraphQL subscriptions usually use WebSockets underneath.

**The trap.** Choosing WebSockets out of habit for updates that go in one direction. It is twice the
machinery for a feature you do not use. Few developers know SSE, and it is often the better choice.

## 31. Caching

**What it is.** Keeping a copy of an answer, so the expensive work is not done again. **There are
only two hard questions: where does the copy live, and when is it wrong?**

**Where it can live**, from closest to the user to furthest:

| Layer | Example | Typical life |
| --- | --- | --- |
| The browser | `Cache-Control` on a response | Minutes to a year |
| The CDN | CloudFront, at the edge | Minutes to forever, for static files |
| The app's memory | A variable in the process | Seconds. **Different in each copy** |
| A shared cache | Redis, Memcached | Minutes. Every copy agrees |
| The database's own cache | Almost always already on | Automatic |

**A cached value stops being wrong in one of three ways:** a **time to live** (it expires by itself),
**invalidation** (the writer deletes the cached copy), or **versioning** (the key contains a version,
so a new value has a new key).

**In zamphora.** Almost nothing is cached, and that is a decision.

- **ElastiCache and DAX were rejected.** They are charged by the hour and would save about 24 ms for
  one user.
- The static web files are cached at CloudFront, because they are built ahead of time.
- **Every `/api/*` answer has caching switched off.** A cached `GET /api/me` would give one person
  another person's answer.
- **The one cache in memory is the kill-switch, for 30 seconds.** The design names that window and
  fits it inside the 60-second promise.

**How else it is done.** **Cache-aside** is the common pattern: look in the cache; if the value is not
there, read the database and put the value in the cache. **Write-through** updates the cache on every
write, so the cache is never old, and every write is slower.

**The trap.** A **cache stampede**: a popular key expires, a thousand requests miss at the same time,
and all of them hit the database together. The fix is a short lock, or refreshing the value just
before it expires. The older trap: caching something personal in a place that all users share.

---

# D — Security

## 32. Authentication and authorization

**What it is.** Two different questions. People mix them up because both words start with "auth".

| | Question | Where the answer lives | HTTP code when it fails |
| --- | --- | --- | --- |
| **Authentication** (authn) | **Who are you?** | A session or a token | `401` |
| **Authorization** (authz) | **May you do this?** | Roles, permissions, ownership | `403` |

**A third question hides behind the second one, and it is the one that leaks data:** *is this row
yours?* That is not a role check. A `USER` may read pots, but only their own. This is called
**object-level authorization**. It is the most common serious hole in real APIs, and it is first on
the OWASP API list.

**In zamphora.** Three different mechanisms answer the three questions:

- **Who are you?** A random session id in a cookie, looked up in the table.
- **May you call this route?** A global Nest.js guard reads a decorator on each route. **A route with
  no decorator runs for nobody.** A test checks every route on every build.
- **Is this row yours?** **Not a check at all.** The owner id is the partition key, and it comes only
  from the session (entry 10).

**The idea to take to any project:** turn an ownership check into the address of the data. Then no
query can forget it.

**How else it is done.** **RBAC** (role-based access control) gives permissions to roles, like `USER`
and `ADMIN` here. **ABAC** (attribute-based access control) writes rules over attributes, such as "the
owner, or a manager in the same department". ABAC is more powerful and much harder to understand.

**The trap.** Reading the role from the request or from a token the user can influence, instead of
from the server's own store.

## 33. OAuth 2.0, OpenID Connect and tokens

**What it is.** Two standards that people mix up. The difference is one sentence:

- **OAuth 2.0 is about access.** It lets an app do something on your behalf. It never says who you
  are.
- **OpenID Connect (OIDC) is OAuth 2.0 plus identity.** It adds an **ID token**: a signed statement
  that says *this is who signed in*.

**The flow that matters is the authorization code flow.** It keeps the password and the final tokens
out of the browser's address bar:

```
1. The app sends the browser to the identity provider
2. The person signs in there. The app never sees the password
3. The provider sends the browser back with a short-lived CODE in the URL
4. The app's SERVER swaps that code for tokens, directly with the provider
5. The app checks the ID token's signature, issuer, audience and nonce
```

**Three values protect this flow:**

| Value | Stops |
| --- | --- |
| **`state`** | An attacker putting **their** code into your flow, so you end up signed into their account |
| **PKCE** (a one-time secret) | An attacker who steals the code in step 3 and uses it |
| **`nonce`** | A token from a different sign-in being reused in this one |

**In zamphora.** Cognito is the provider, and the person signs in on Cognito's own pages. The API is a
**confidential client**: it holds a client secret, so it can prove it is the real app. The security
review found one missing step: the design never said that the `state` in the URL must be
**compared** with the `state` in the cookie, and refused if they differ. Nothing was wrong in the
code. A step was simply not written down, and a step that is not written down gets missed.

**How else it is done.** SAML is the older standard for companies, with XML instead of JSON. "Sign
in with Google" is OIDC. **Auth0, Clerk, Okta, Keycloak and Supabase Auth** are the usual alternatives
to Cognito, and they all use the same flow.

**The trap.** The **implicit flow**, where tokens come back in the URL. It is deprecated, so never use
it in new work. Also: accepting a token without checking its `aud` (audience) claim. Then a token made
for a different app is accepted by yours.

## 34. Sessions, JWTs and the BFF

**What it is.** Two ways to remember that someone is signed in. They fail in opposite ways.

| | **Server session** | **JWT** |
| --- | --- | --- |
| What the client holds | A random id that means nothing | The facts themselves, signed |
| Where the truth is | Your database | Inside the token |
| Checking it | One read per request | Check a signature. No read |
| **Signing out** | Delete the row. Instant | **Not possible.** It is valid until it expires |
| Changing a role | The next request sees it | Not until the token expires |
| Scaling | Needs a shared store | Nothing shared is needed |

**In short:** a JWT gives up the ability to sign someone out, to save one database read. Most
projects do not need to save that read, and most projects do want to sign people out.

**The BFF pattern** (backend for frontend) is the third option, and current guidance recommends it for
browser apps: **the tokens never reach the browser.** The server keeps them, the browser gets a normal
session cookie, and the server adds the real credentials when it calls other services.

**In zamphora.** The BFF. The IETF guidance for browser apps became a standard, **RFC 10017**, in
August 2026. It strongly recommends this design for apps that handle personal data, and photos of the
inside of a home are personal data. **No token ever reaches the browser.** Cognito's tokens are used
once and thrown away. Signing out deletes the session row. A session lasts 30 days.

**How else it is done.** A short-lived access token plus a **refresh token** is the usual JWT answer
to the sign-out problem. It only half works: the access token stays valid until it expires. Some
systems keep a list of cancelled token ids, and then they are back to one read per request.

**The trap.** A JWT in `localStorage`. Any script on the page can read it, so every XSS bug becomes a
full account takeover. JavaScript cannot read a cookie marked `HttpOnly` at all.

## 35. Cookies

**What it is.** A small value that the browser stores and sends back by itself on every request to
the same site. **The attributes matter more than the value.** Five are worth knowing exactly:

| Attribute | What it does | Why |
| --- | --- | --- |
| **`HttpOnly`** | JavaScript cannot read it | An XSS bug cannot steal the session |
| **`Secure`** | Sent only over HTTPS | Nobody on the network can read it |
| **`SameSite=Strict`** | Not sent when another site links or posts to yours | This is the CSRF defence (entry 36) |
| **`Path=/`, no `Domain`** | Sent only to this exact host | A neighbouring subdomain cannot read or change it |
| **`__Host-` prefix** | The browser **refuses** the cookie unless `Secure`, `Path=/` and no `Domain` are all set | The browser enforces the rules, so nobody has to remember them |

**Few people know `__Host-`, and it is free.** If you name the cookie `__Host-session`, the browser
itself rejects any later change that makes it weaker.

**In zamphora.** Two cookies. `__Host-session` holds a random id and nothing else. It lasts 30 days
and uses `SameSite=Strict`. `__Host-oauth` holds the sign-in flow's temporary values, and it is
cleared afterwards, whether the sign-in worked or not. The prefix works on the CloudFront host name,
because it only needs one exact host.

**How else it is done.** `SameSite=Lax` is now the browser default. It sends the cookie when the user
follows a link to your site. You need it if the sign-in redirect must land the user already signed
in. zamphora can use `Strict`, because the callback itself creates the session.

**The trap.** Changing `Strict` to `Lax` later to fix a redirect, and not noticing that it was the
only CSRF defence in the system.

## 36. CSRF

**What it is.** **Cross-site request forgery.** An attacker's page makes the victim's browser send a
request to your site. The browser attaches the victim's cookie by itself, so the request is signed
in. The attacker never sees the response. They only need the effect.

```
evil.example.com contains:
  <form action="https://yourbank.example/transfer" method="POST" hidden>
    <input name="to" value="attacker"><input name="amount" value="1000">
  </form>
  <script>document.forms[0].submit()</script>
```

**Three defences. Today, the first one is usually enough:**

| Defence | How it works |
| --- | --- |
| **`SameSite=Strict` or `Lax`** | The browser does not attach the cookie to a request from another site |
| **A CSRF token** | A random value in the page and in the request. The attacker's page cannot read it |
| **Checking `Origin`** | Refuse a request whose `Origin` header is not your site |

**In zamphora.** `SameSite=Strict`, everything on one origin, and no CORS configuration. The threat
model says the real risk is not an attack. **It is a later change to `Lax` that opens the hole
without anyone noticing.**

**The trap.** Thinking an API is safe because it uses JSON. It is safe only if it **refuses**
`Content-Type: application/x-www-form-urlencoded`, because a plain HTML form can send that from
another site with no CORS check.

## 37. XSS and the Content Security Policy

**What it is.** **Cross-site scripting** means someone else's JavaScript runs on your page. Once it
runs, it can do anything the user can do.

**Three kinds:** **stored** (the script is saved in your database and shown to everyone), **reflected**
(it comes back from a URL), and **DOM-based** (your own JavaScript takes something from the URL and
writes it into the page).

**The first defence is not a library.** It is: **never build HTML by joining strings.** React, Vue and
every modern framework escape text by default. The holes are the ways around that default:
`dangerouslySetInnerHTML`, `v-html`, `innerHTML`. Each one is a place to check.

**A Content Security Policy (CSP)** is the second wall. It is a header that tells the browser which
sources of code and images it may use. `script-src 'self'` means inline scripts do not run, so an
injected `<script>` does nothing even if it reaches the page.

**In zamphora.** **The CSP was hard to build.** Next.js with `output: 'export'` writes inline
`<script>` tags into the HTML. The usual answer is a new random value (a **nonce**) per request, but
that needs a server, and a static site has none. So the policy lists **SHA-256 hashes** of the inline
scripts, calculated after the build. The rule: **never put `'unsafe-inline'` in `script-src`**, because
that one word removes most of the protection.

Two more lines in that policy: `form-action 'self'` stops an injected form from sending data to
another site, and `img-src` must name the photo bucket, or no photo is shown.

**How else it is done.** A nonce per request is the normal answer when a server renders the HTML.
**Trusted Types** is a newer browser feature that makes `innerHTML` refuse unsafe values.

**The trap.** Model output. **`nextAction` is free text that a language model wrote**, and it is
stored and shown on a screen. The rule: never render it as HTML, and never use any text the model
wrote to build a query, a path, a command or a URL. That is entry 70, appearing as an XSS problem.

## 38. CORS

**What it is.** **Cross-origin resource sharing.** A browser rule: JavaScript on `a.example` may not
read a response from `b.example`, unless `b.example` sends a header that allows it.

**What it is not.** CORS does **not** protect your server. It protects **the user's browser** from
reading your data on another site's page. It does not stop `curl`, and it does not stop a server from
calling you.

**The part that confuses everyone:** for most requests, the browser first sends an `OPTIONS` request
(a **preflight**) and waits for permission. A "CORS error" in the console almost always means the
preflight was refused. The fix is on the server.

**In zamphora.** **There is no CORS configuration at all**, and that shows the design is right: the
web app and the API are on **one origin**, behind one CloudFront distribution. If a change ever needs
`Access-Control-Allow-Origin`, something has gone wrong. One origin is also what makes the `__Host-`
cookie and `SameSite=Strict` work.

**The trap.** `Access-Control-Allow-Origin: *` together with credentials, which browsers refuse
anyway. Or sending back whatever `Origin` arrives, which allows everyone while looking careful.

## 39. Least privilege and IAM

**What it is.** **Least privilege** is one sentence: **every part of the system gets the smallest set
of permissions it needs for its job, and nothing more.** The goal is this: when an attacker takes
over one part, they get only that part's permissions.

**IAM** (identity and access management) is how a cloud expresses this. Four words:

| Word | Meaning |
| --- | --- |
| **Principal** | Who is asking. A user, or a running function |
| **Role** | A set of permissions that something can **assume**. It has no password |
| **Policy** | The document that lists the allowed actions on the allowed resources |
| **Trust policy** | Who is allowed to assume this role |

**In zamphora.** Splitting the functions helped most here. At first, one function had one role with
the whole table, the whole bucket, the Cognito client secret **and the Anthropic key**. A hole in the
image decoder would have given an attacker all of it. Now:

| Function | What its role can reach |
| --- | --- |
| `api` | The table, the bucket, Cognito, and starting one workflow. **Not the model key** |
| `assess` | The model key, two config rows, the breaker row, the photo. **Nothing else** |
| `watch` | Reading the session row and the assessment row. Read only |
| `mark-failed` | Writing `failed` on one row |

The gap that remains is written down: `api` still has one role for every route, including
`GET /api/health`. One function cannot have a role per route.

**How else it is done.** Kubernetes has service accounts and RBAC. On a plain server, it is the Unix
user that runs the process. The idea is the same everywhere.

**The trap.** `"Action": "*"` during development, and never coming back to fix it. Also, a trust
policy with `repo:owner/name:*`, which lets **any branch** of the repository assume the role.

## 40. Secrets

**What it is.** A **secret** is a value that gives access: a database password, an API key, a signing
key. The rules are short, and most of them say where a secret must **not** be.

**Four rules, starting with the one people break most:**

1. **Never in the repository.** Not in code, not in a config file, not in a commit you later removed.
   Git history keeps it, and bots search public repositories within minutes.
2. **Added when the code runs**, from a secret store, or from an environment variable set by the
   platform.
3. **Can be replaced** ("rotated"), and is rotated when someone leaves or something leaks.
4. **Least privilege applies to secrets too.** One key that can do everything is worse than three
   keys that each do one thing.

**In zamphora.** Two secrets live in **AWS Parameter Store as `SecureString`**. CDK knows the name of
the parameter, but never the value. **Parameter Store, not Secrets Manager**, because Secrets Manager
charges per secret per month, and Parameter Store's standard tier is free.

- **The Anthropic admin key never goes on a server or into CI.** It is the strongest key in the
  project, so it stays on the owner's own machine.
- **The alarm email address is not in the repository.** The owner subscribes it by hand once. The
  repository is public, and a personal address there helps nobody.

**How else it is done.** HashiCorp Vault is the big tool, and it can create short-lived database
passwords. Doppler and 1Password Secrets are for small teams. Kubernetes Secrets are only base64
encoded, **not encrypted**, which surprises many people.

**The trap.** Removing a leaked secret before replacing it. **A secret pushed to a public repository
is public from that second**, and rewriting git history does not change that. The order is: **rotate
first, remove second.**

## 41. Trust boundaries and threat modelling

**What it is.** A **trust boundary** is a line where data moves between two things with different
levels of trust, or where one side has a permission the other does not. **Threat modelling** means
walking along every one of those lines and asking what could go wrong.

**STRIDE** is the checklist. It is six words:

| Letter | Threat | Plain question |
| --- | --- | --- |
| **S**poofing | Pretending to be someone else | Can they claim to be another user? |
| **T**ampering | Changing something | Can they change data on the way, or where it is stored? |
| **R**epudiation | Denying you did it | Is there a record of who did what? |
| **I**nformation disclosure | Seeing what you should not | Can they read another person's data? |
| **D**enial of service | Stopping it from working | Can they make it unavailable, or expensive? |
| **E**levation of privilege | Getting a permission you should not have | Can a user become an admin? |

**Scoring** turns the list into a plan: **likelihood × impact**. Every risk above a line gets three
fixes: **preventive** (stops it), **detective** (tells you it happened) and **responsive** (what a
person does first). A risk with only one control has a single point of failure.

**In zamphora.** Nineteen trust boundaries are listed in `docs/900-security/00-assets.md`, each with
what crosses it, and each has at least one scored threat. **The impact scale uses this project's real
numbers**, not a general scale: a 5 means the AWS account closes, and a 4 means the $5 Anthropic
balance is gone. That makes the scores something you can argue about.

Two boundaries teach something general:

- **The browser** is drawn as untrusted, even though we wrote the web app. Someone can always send
  requests without our page.
- **The AWS console** goes around the product completely. There is no admin route to attack, because
  there is no admin route. The cost: nothing in the app records when someone flips the kill-switch.

**How else it is done.** **PASTA** and **LINDDUN** are other named methods. LINDDUN is about privacy.
**Attack trees** start from an attacker's goal and work backwards. STRIDE is the one to remember,
because six words are easy to keep in your head.

**The trap.** Threat modelling a diagram that does not match what is built. And scoring everything
High, which is the same as scoring nothing.

## 42. OWASP

**What it is.** The **Open Worldwide Application Security Project** is a non-profit that publishes
free security lists. **The Top 10 is the famous one**: a list of the most common serious weaknesses in
web apps, updated every few years.

**Three lists are worth knowing now**, because the old one does not cover newer kinds of systems:

| List | Covers | Example from it |
| --- | --- | --- |
| **Top 10** | Web apps | Broken access control, injection, wrong configuration |
| **API Top 10** | APIs | Object-level authorization (entry 32's third question) |
| **LLM Top 10** | Apps that call a language model | Prompt injection, unlimited use, unsafe handling of the output |

**In zamphora.** Two full reviews were done. The **LLM Top 10** covers the product, because it sends a
photo and free text to a model. The **Agentic Top 10** covers **the factory itself**: the eight AI
roles that wrote these documents, which have tools, web access and permission to write files. That is
a different system with its own risks. The review found real ones. One example is **memory
poisoning**: a wrong "decision already made" in `.claude/memory/` is never asked again, by design.

Two of the ten LLM risks do not apply yet, and this is written down. There is no vector store and no
training. Both risks come back on the day either one is added.

**The trap.** Treating the Top 10 as a certificate. It is a list of common mistakes, not a definition
of "secure". You can pass all ten, have no rate limit, and still get a bill nobody can pay.

## 43. Defence in depth

**What it is.** **Assume every control will fail one day, and put another control behind it.** Not
because any one control is bad, but because the one that fails is never the one you expected.

**In zamphora.** The money path is the clearest example. Each layer stops something the others
cannot:

```
A flood arrives
  -> CloudFront          no automatic limit. An alarm fires, a person switches it off
  -> API Gateway         100 requests a second, burst 50. Refused cheaply
  -> Lambda concurrency  10 copies at once. Throttled, an alarm fires
  -> DynamoDB            fixed capacity. Refused, an alarm fires
  -> Daily limit         the 11th assessment, refused before any money is spent
  -> Circuit breaker     5 failures in a row, stops calling
  -> The model call
```

The first line is written down as it is: there is no automatic defence at CloudFront on this account,
only an alarm and a person. Writing that down matters, because otherwise someone would assume that
layer is covered.

**A second example from the same repository.** The public repository has **two walls** against a
stranger's pull request reaching AWS: GitHub never gives a fork an AWS token, **and** every outside
contributor's run needs the owner's approval. Neither replaces the other.

**The trap.** Counting one layer twice. Two checks that fail for the same reason, such as both reading
the same table, are really one layer. zamphora has an example: the kill-switch does not depend on the
code or on a deploy, but it **does** depend on DynamoDB, because the switch is a row in the same
table. So the backup switches are outside the table: set the `assess` function's reserved
concurrency to 0, or switch off the CloudFront distribution.

## 44. Personal data, GDPR and retention

**What it is.** **Personal data** is anything that identifies a living person, directly or with a
little work. It is wider than most people think: an IP address, a device id and **a photo of the
inside of a home** all count.

**Four ideas from GDPR change how you build a system:**

| Idea | What it means in code |
| --- | --- |
| **Purpose limitation** | Collect data for a stated reason. Do not use it for another reason |
| **Data minimisation** | Do not collect or send what you do not need |
| **Storage limitation** | **Every piece of personal data needs an end**: a date, or an event |
| **The rights** | A person can ask for a copy, a correction or deletion, and you must be able to do it |

**GDPR names no retention period.** It requires you to **choose** one, explain why, and really delete
the data when the time is up. "Forever" is not a choice.

**In zamphora.** Every stored thing has an end:

- **The photo: 180 days.** An S3 lifecycle rule deletes it, not app code, so it works even when the
  app is broken.
- **The assessment text: as long as the pot exists.** Its purpose is the history of the plant. A fixed
  date would delete the early history, which is the most useful part.
- **An account nobody uses: 12 months, with a warning at 11.** This is the backstop for the rule above.
  Otherwise "as long as the pot exists" would mean forever for someone who signs up once.
- **The GPS position inside the photo: zero seconds.** A phone photo of a plant on a windowsill holds
  the GPS position of that window, which is a home address. The re-encode removes it before the photo
  is stored or sent anywhere.

**Two open positions are written down.** The 12-month deletion **has no mechanism yet**. It ships in
run 3, so today the app makes a promise nothing keeps. And the photo leaves the EU on every
assessment, because the model runs outside the EU. This is accepted for run 1, because there is one
account and it is the owner's. GDPR does not apply to a purely personal or household activity. **This
must be decided again on the day a second person's photo arrives.**

**How else it is done.** Bigger products build a map of all their data, a retention period per field,
and a "delete my account" job. **The AWS Region is part of this:** zamphora uses `eu-central-1`, so
the stored copy never leaves the EU.

**The trap.** Marking a row as deleted and calling it deletion. A row with `deleted = true` is still
personal data. It is still in the backups, and someone can still find it.

---

# E — Running it

## 45. Infrastructure as code

**What it is.** You describe every cloud resource (the database, the bucket, the network, the
permissions) as **files in git**. A tool creates the resources from those files. Nobody clicks in a
console.

**What it gives you. The last point is the real reason:**

- You can build the same environment twice, and the two are identical.
- You review a change as a diff before it happens.
- The console is no longer the place where the truth lives.
- **A destroyed account comes back with one command**, because the description was never inside the
  account.

**In zamphora.** **AWS CDK** in TypeScript, nine stacks, in `infra/`. The last point is real here:
the AWS free plan **closes the account** instead of sending a bill, so losing everything can happen.
Because everything is in CDK and git from the first resource, a lost account is a redeploy, not a
disaster.

**What is not in CDK, on purpose, and why the list matters:**

- The OIDC roles that CI uses, because CI cannot create the role it needs to sign in.
- The secret values.
- The alarm email subscription, because AWS sends a link that a person must click.
- The three config rows, because they are data.

Writing this list down stops anyone from thinking that a fresh deploy is a working system.

**How else it is done.** **Terraform** is the biggest tool. It works across clouds and has its own
language. **CloudFormation** is the AWS YAML that CDK turns into. **Pulumi** is like CDK, for any
cloud. **The difference to know:** CDK and Pulumi use real programming languages, so you get loops,
types and tests. Terraform is declarative, so it is harder to make a mess.

**The trap.** **Drift.** Someone fixes something in the console at 2 a.m. The next deploy either
undoes the fix or fails. The rule: fix it in code and deploy. If you must use the console, write down
what you did.

## 46. Servers, containers, serverless

**What it is.** Three ways to run code. They differ mostly in **what you must look after** and **what
you pay when nobody uses it**.

| | **A server** | **Containers** | **Serverless** |
| --- | --- | --- | --- |
| Example | EC2, a rented machine | ECS, Kubernetes | Lambda, Cloud Functions |
| You look after | The OS, updates, the process | The image and the orchestrator | Nothing |
| Cost when idle | Full price | Full price for the cluster | **Zero** |
| Scaling | You add machines | The orchestrator adds copies | Automatic, per request |
| Start-up time | None, it is already running | Seconds | **Cold start** (entry 47) |
| Long jobs | Fine | Fine | A hard limit: 15 minutes on Lambda |
| A WebSocket, a background thread | Easy | Easy | Hard or impossible |

**In zamphora.** **Serverless, only because of the cost when idle.** The app is used a few times a
week, on an account that closes when the credit runs out. It cannot pay by the hour. The same product
as containers behind a load balancer would cost about **$150 a month with nobody using it**.
`aws-and-the-pipeline.md` §7 draws that version.

zamphora uses a **Lambdalith**: **one** function holds every route, instead of one function per route.
That means fewer cold starts, one deploy and one set of permissions to understand. The cost: every
route shares the same permissions. Two more functions were split off **by job, not by route**:
`assess` makes the paid call and `watch` streams the result. Each one has a smaller role.

**How else it is done.** **Fargate** runs containers without you managing machines. It is the middle
option. **Cloudflare Workers** and **Deno Deploy** are serverless with almost no cold start, because
they run V8 isolates instead of containers.

**The trap.** Choosing serverless and then fighting it: a long-running job, a WebSocket server, a
connection pool to a relational database. Each one is a sign that the shape is wrong, not the
platform.

## 47. Cold starts

**What it is.** The first request to a serverless function must wait while the platform creates a new
copy. It downloads the code, starts the runtime, runs everything at the top of the file, and **only
then** runs the handler. A **warm** copy skips all of that.

**What takes the time. You control the third one:**

1. The platform starts a container. You cannot change this.
2. The runtime starts. Node and Python are fast. Java is slow.
3. **Your code's start-up work:** every `import`, every client you create, every file you read at
   start-up.

**In zamphora.** The budget is **2,000 ms at p95** (95 out of 100 cold starts are faster). It was 800
ms at first, taken from articles that measured a plain Node.js handler. But zamphora is not a plain
handler. It loads Nest.js, Express, multer, Zod and the AWS SDK clients before the handler runs. A
published number for a bundled Nest.js Lambda is about 905 ms when the app is almost empty. So the
budget became 2,000 ms.

- **No CI job can check this number**, because a cold start depends on the platform on that day. It
  is written down so that a regular miss is noticed as a change, not as bad luck.
- **AWS has no `InitDuration` metric.** The cold-start time is only in the logs, so you read it with
  a Logs Insights query.
- Since the model call moved into the background, the cold start sits before the `202`, not before
  the answer. So it no longer competes with the model call for time.

**How else it is done.** **Provisioned concurrency** keeps copies warm, and it is charged by the hour,
so it is wrong on this account. **SnapStart** saves a snapshot after start-up. Smaller bundles and
lazy imports are free and always help.

**The trap.** Creating database clients inside the handler instead of at the top of the file, so every
request pays for them. Or the opposite: slow start-up work that most requests do not need.

## 48. Scaling up and scaling out

**What it is.** Two ways to handle more traffic.

| | **Vertical: scaling up** | **Horizontal: scaling out** |
| --- | --- | --- |
| What you do | Use a bigger machine | Use more machines |
| Limit | The biggest machine that exists | Almost none |
| Needs | Nothing | **A stateless app** (entry 3) |
| Cost | Gets expensive fast at the top | Grows evenly |
| When one fails | Everything is down | The others keep working |

**In real life, you usually scale up first, because it is no work, and scale out when you must.** One
bigger database server solves more problems than most teams expect.

**In zamphora.** Lambda scales out by itself, because it just runs more copies. **zamphora's problem
is the opposite: it must stop scaling.** Reserved concurrency of 10 **limits** the copies, because an
account that closes when the credit runs out cannot afford unlimited scaling. **The one vertical
setting is memory.** Lambda gives more CPU with more memory, so 1024 MB is also a CPU choice. It is a
starting value, to be measured after the first deploy.

**How else it is done.** Databases are the hard part. **Read replicas** scale reads. **Sharding**
splits the data across machines by a key. DynamoDB does this for you with the partition key.
**Auto-scaling groups** add and remove machines based on a metric.

**The trap.** Thinking more copies help when the bottleneck is one shared database. Ten copies of a
web server waiting on the same table is ten times the waiting, not ten times the speed.

## 49. Load balancing

**What it is.** One address in front of several copies. It spreads requests between them and skips
the broken ones.

**It has two jobs. People forget the second one:**

- **Spread the work:** in turn (round robin), to the copy with the fewest connections, or by a value
  in the request.
- **Health checks:** the balancer asks each copy "are you alive?" and stops sending traffic to a copy
  that does not answer. **This turns a crash into a short slow moment instead of an outage.**

**In zamphora.** There is no load balancer, because of cost. An Application Load Balancer costs about
$16 to $18 a month with no traffic at all. **Lambda does the same job inside the platform:** AWS
sends each request to a copy and creates one if needed. CloudFront is the one public address in front
of everything.

**How else it is done.** A **layer 4** balancer works on TCP. It is fast and does not read the
request. A **layer 7** balancer reads HTTP, so it can send `/api/*` to one place and everything else
to another. That is exactly what CloudFront's behaviours do in zamphora. nginx, HAProxy and Envoy are
software balancers.

**The trap.** A health check that only checks that the process is alive. A copy with a broken database
connection passes that check and fails every real request.

## 50. The CDN and the edge

**What it is.** A **content delivery network** (CDN) is a set of servers around the world that keep
copies of your files close to your users. **The edge** means those locations.

**It does three jobs. Only the first is famous:**

| Job | What it means |
| --- | --- |
| **Cache static files near the user** | A file comes from Frankfurt instead of Virginia |
| **Start the HTTPS connection close to the user** | Most of the speed gain comes from this |
| **Be the one public front door** | Everything behind it can be private |

**In zamphora, the third job matters most.** CloudFront gives the whole product **one host name**, and
that makes other decisions work:

- The `__Host-` cookie needs exactly one host.
- **No CORS configuration is needed**, because nothing is cross-origin.
- The S3 buckets are fully private. Only CloudFront can reach the web bucket, through **origin access
  control**. There is no public bucket.

Two CloudFront details are explained in `aws-and-the-pipeline.md` §3: the rules are matched **in
order**, and **caching is off for every `/api/*` answer**. And one detail surprises everyone:
**CloudFront sends its metrics only to us-east-1.** An alarm in another Region deploys without an
error and never fires.

**How else it is done.** Cloudflare, Fastly and Akamai are other CDNs. **Edge functions**, such as
CloudFront Functions or Cloudflare Workers, run small pieces of code at the edge. zamphora uses one to
fix a URL path.

**The trap.** Caching something personal. Anything that is different per user should be `no-store`,
unless you have thought carefully about the `Vary` header.

## 51. DNS

**What it is.** The system that turns a name into an address. A browser asks for `example.com` and
gets back an IP address. It keeps that answer for as long as the record's **TTL** (time to live)
says.

**Records to know:**

| Record | What it does |
| --- | --- |
| `A` / `AAAA` | A name to an IPv4 or IPv6 address |
| `CNAME` | A name to another name |
| `MX` | Where email for this domain goes |
| `TXT` | Free text, often used to prove you own the domain |

**The setting that causes real incidents: TTL.** If a record has a 24-hour TTL and you change it, some
users keep the old answer for a day. **Lower the TTL the day before a migration, not during it.**

**In zamphora.** **There is no domain and no DNS**, because of cost. The host is CloudFront's own name,
such as `d111111abcdef8.cloudfront.net`. A bought domain needs a **Route 53 hosted zone at $0.50 a
month**. At this size, that would be the biggest AWS cost in the product.

**The trap.** Thinking a DNS change is instant. It is instant at the source and slow everywhere else.
Something always still uses the old answer.

## 52. Deploy strategies

**What it is.** Four ways to replace running code with new code, from the most risky to the safest.

| Strategy | How | Cost |
| --- | --- | --- |
| **Recreate** | Stop the old version, start the new one | Downtime. Simple and cheap |
| **Rolling** | Replace a few copies at a time | **Two versions run at the same time**, so both must work together |
| **Blue/green** | Build the whole new version next to the old one, then switch the traffic | Double resources for a few minutes. Instant rollback |
| **Canary** | Send 1% of traffic to the new version, watch, then increase | Safest. Needs good metrics to be useful |

**One rule applies to three of the four:** **during the deploy, old code and new code both run, and
both use the same database.** This is why expand, migrate, contract exists (entry 18). It is the most
common reason a deploy breaks production.

**In zamphora.** Deploys are not automatic, on purpose. Merging to `main` only builds and tests. **A
person starts the deploy** as a separate workflow. A bad deploy can spend credit, and this account
closes instead of sending a bill, so a person decides every time.

**How else it is done.** AWS CodeDeploy can move Lambda traffic to a new version step by step, which
is a canary for serverless. Kubernetes uses rolling deploys by default. **Feature flags** (entry 67)
make deploying and releasing two separate events.

**The trap.** A rolling deploy and a database change in the same release. Half the copies run code
that does not understand the new shape, and it looks like a random bug that comes and goes.

## 53. Rollback

**What it is.** Going back to the version that worked. **The only thing that matters is how long it
takes**, and the only way to know is to have done it once.

**The levels, cheapest first:**

| Level | Action | Time |
| --- | --- | --- |
| **1 — stop the damage** | Flip a flag or the kill-switch. No deploy | Under a minute |
| **2 — put the old code back** | Point the alias at the previous version | About a minute |
| **3 — put everything back** | Redeploy every stack from a known good commit | One deploy |

**In zamphora.** All three levels are written down in `docs/800-infra/01-iac-plan.md` §9. Level 1 is
the kill-switch: one row edit, which works within 60 seconds. Level 3 is
`gh workflow run rollback.yml -f sha=<the good commit>`.

- **A rollback nobody has run is a plan, not a rollback.** So one practice rollback is on the
  checklist before the first deploy.
- **Data cannot be rolled back.** Point-in-time recovery is off, so a bad deploy that writes wrong
  rows cannot be undone. The code goes back. The rows it wrote stay.

**The trap.** A rollback that needs the thing that is broken. A rollback script that runs in the CI
system that is down, or that needs the database you just damaged, is not a rollback.

## 54. Environments

**What it is.** Separate copies of the system for different purposes, so nobody tests on the system
real people use.

| Environment | For | The risk |
| --- | --- | --- |
| **local** | One developer, no cloud | Fake services behave differently from real ones |
| **preview or staging** | Testing a change before the merge | Slowly becomes different from production, until it proves nothing |
| **prod** | Real people | — |

**The rule that makes environments useful: keep as much as possible identical, and write the
differences down in one list.** Otherwise "it worked in staging" means nothing.

**In zamphora.** Three environments: `local` on your machine, and two on AWS that always exist, `dev`
and `prod`. The end-to-end tests run against `dev` before a merge.

- **What differs** is a short list: resource names, the host, how long logs are kept, DynamoDB
  capacity, the concurrency numbers, **and the model: a fake (a "stub") everywhere except `prod`**.
- **What must never differ** is the more important list, because bugs hide there: Node 24 everywhere,
  the Cognito tier, the 180-day photo rule, and **every cookie attribute**.
- On the free plan, the 25 free DynamoDB units are shared by all tables, so `prod` has 20 and `dev`
  has 5.
- `local` uses **DynamoDB Local and MinIO** in Docker, so no local test touches the real account.

**The trap.** A test environment that points at the production database. It always starts as "only
for reading".

## 55. Observability

**What it is.** A common backend topic, and close to a non-functional requirement. It asks: **can you
tell what the running system is doing, without a debugger?** You cannot debug a Lambda that ran once
at 3 a.m. for someone else. Observability is what you have instead.

**It has three parts, and an interview question expects all three:**

| Part | The question it answers | The AWS tool |
| --- | --- | --- |
| **Logs** | **What happened in this one request?** Which route, which user, why it ended in a `400` or a `409` | **CloudWatch Logs** |
| **Metrics** | **How many, how often, how fast?** How many requests, how many worked, how slow the slowest 5% were | **CloudWatch Metrics** |
| **Traces** | **Which services did this one request pass through, and where did the time go?** | **AWS X-Ray** |

- **A log line is about one event, and you pay per gigabyte. A metric is a number over time, and it
  is cheap to keep for a year.** So "how many requests failed today" must be a metric.
- **Traces matter when a request crosses several services.** In one program, a stack trace shows the
  path. Across four services, no single machine sees the whole path. A trace gives the request an id
  that travels with it. **Only a trace answers "which step was slow?"**

**In zamphora.**

- **Logs:** one structured line per request, with the route, the result and an error code. A list says
  what must **never** be logged: the photo bytes, the pot name, the model's text, a cookie, a token.
- **Metrics:** AWS's own metrics are free. There are **six custom ones**, including `ModelCalls` and
  `CostMicroUsd`. CloudWatch gives ten custom metrics for free, so adding a seventh is a decision.
- **Traces:** X-Ray across `api` → Step Functions → `assess` → Anthropic.

**How else it is done.** **OpenTelemetry** is the open standard for all three parts, and it is the one
to learn, because it works with Datadog, Grafana, Honeycomb and CloudWatch. The **ELK stack**
(Elasticsearch, Logstash, Kibana) is the classic self-hosted tool for logs. **Prometheus with
Grafana** is the classic one for metrics.

**The trap.** **Logging what should be a metric.** You pay for it forever, and searching it is slow.
And the opposite: an alarm on a metric with no log line that explains it. You know something broke,
but not what.

## 56. Alerting

**What it is.** Turning a measurement into a message to a person. **Every alarm is a promise that a
person will do something when it fires.**

**The one rule that decides whether alerting works: every alarm must lead to an action.** If the
answer to "what do I do about this?" is "nothing, it happens sometimes", it is not an alarm. It is
noise. Too much noise makes people ignore the real alarms. This is called **alert fatigue**, and it is
the normal way alerting fails.

**In zamphora.** Twelve alarms. CloudWatch gives ten for free, so two cost a few cents a month. The
rule from now on: whoever adds a thirteenth alarm must say which one it replaces.

**Four of the twelve are the ones this project really needs**, and they are about money, not errors:
more than 30 model calls in an hour (normal use is 30 a **month**), more than $0.10 spent in an hour,
the circuit breaker opening, and a flood at CloudFront.

The breaker alarm is a message, not a call for help. The breaker stops the calls by itself, so **by
the time the email arrives, the spending has already stopped.** The fix does not depend on anyone
being awake.

**How else it is done.** PagerDuty and Opsgenie send alarms to whoever is on call, escalate them, and
record who answered. zamphora has none of that, because there is one person and no on-call schedule.
The alarms go to one email address.

**The trap.** Alarming on a **cause** instead of a **symptom**. "CPU is at 80%" may be fine. "The
slowest 5% of requests take 9 seconds" is always worth knowing, because that is what a user feels.

## 57. SLI, SLO, SLA and the error budget

**What it is.** Four words that turn "it should be reliable" into a number.

| Word | Full name | What it is |
| --- | --- | --- |
| **SLI** | Service level **indicator** | The **measurement**. "The share of requests answered in under 300 ms" |
| **SLO** | Service level **objective** | The **target you set yourself**. "99.5% of them, over 30 days" |
| **SLA** | Service level **agreement** | The **promise to a customer**, with money paid back if it is broken |
| **Error budget** | — | What is left over. 99.5% allows **3.6 hours of failure a month** |

**The error budget is the useful idea.** It turns reliability from an argument into a calculation. If
budget is left, you can ship faster and take more risk. If it is used up, you stop shipping features
and fix things.

**In zamphora.** **There is no availability target, and that is a written decision.** There is one
user, no second copy of anything, nobody on call, a model balance topped up by hand, and an AWS free
plan that ends on 2026-12-31. A promise like "up 99% of the month" could not be tested or kept.

**The day to set a number is written down:** the day the app is offered to a second person. Several
other open decisions have the same trigger, and they should all be answered at the same time.

**How else it is done.** These words come from Google's SRE book, which is still the best source. The
usual start is three SLIs: availability, latency and error rate.

**The trap.** An SLA for a customer that is stricter than the SLO the team measures. And 100% as a
target: it is impossible, so the error budget is always used up.

## 58. NFRs and ADRs

**What it is.** Two kinds of written decision that people mix up. They belong in different files.

| | **NFR**: non-functional requirement | **ADR**: architecture decision record |
| --- | --- | --- |
| Says | **How well** it must work. A number | **What was chosen**, and why |
| Example | "The 95th slowest request takes under 300 ms" | "We use DynamoDB, not PostgreSQL" |
| Changes when | The target changes | Never. A new ADR replaces it |
| Tested by | A test that can fail | Nothing. It is a record |

**Functional** requirements say what the system does: "a user can photograph a plant".
**Non-functional** requirements say how well: fast, cheap, private, available. Teams often skip the
non-functional ones, and they decide whether a system is usable.

**A number only counts when it has three links. This is the rule to remember:**

```
a written number  ->  an automatic test that checks it  ->  that test blocks a release
```

If one link is missing, the number is only a wish.

**In zamphora.** Every NFR row has four things: the number, the time window it is measured over, how
it is tested, and **the name of the CI job that runs the test**. A row without all four is "a wish,
not a requirement". **Two budgets could end the project**, not only slow it down: what the model costs,
and how often its answer is right.

**Every ADR ends with an "Agent-Readable Summary"**: a plain instruction with an explicit *do not*. A
reader can agree with a whole ADR and still write the opposite, if nobody said what to do. For
example: *"All model calls go through `LlmProvider`. Do not import the Anthropic SDK outside its
adapter."*

**An accepted ADR is not edited when you change your mind.** A new ADR replaces it, and both stay, so
the history of the reasoning survives. You correct an ADR in place only if it was simply wrong and
nothing was built on it.

**The trap.** An NFR nobody can measure: an opinion with a number in it. And an ADR written after the
code: a description, not a decision.

## 59. Cost as a correctness property

**What it is.** On most projects, spending too much is a money problem that arrives as a bill next
month. **On some projects, it is an availability problem that arrives now.** Then you must design cost
like a security control, not check it like a budget.

**Two kinds of cost failure:**

| | Runaway spend | The balance runs out |
| --- | --- | --- |
| What happens | Use grows without a limit | A prepaid amount reaches zero |
| The damage | A bill, or a closed account | The feature stops |
| The fix | A cap, a limit, a breaker | Someone pays |

**zamphora has both, on two different accounts.** The AWS account **closes** instead of sending a
bill, and the table, the bucket and the user pool go with it. The Anthropic account is a prepaid
balance of about **$5**, and it simply stops working at zero.

**Three results that would be too much on a normal project, and are right here:**

- **A runaway retry loop is an availability incident**, treated as seriously as a missing auth check.
- **The cost of every model call is read from the `usage` block that the API returns, never
  estimated.** It is stored as a whole number of millionths of a dollar, because adding
  floating-point numbers loses precision.
- **There is no total spending cap, on purpose.** The balance reaching zero already stops the calls.
  A cap would be one more number to choose and keep correct.

**Free-tier traps. Each one is a default somewhere:**

| Trap | Cost |
| --- | --- |
| DynamoDB **on demand**, the CDK default | The free amount covers only **provisioned** capacity |
| A **NAT Gateway** | About **$32 a month with no traffic** |
| **Secrets Manager** | Charged per secret. Parameter Store SecureString is free |
| A **KMS key you create yourself** | **$1 a month, forever.** AWS-managed keys are free |
| An **empty SQS queue** that a Lambda reads | Still costs requests, forever |
| API Gateway **without a rate limit** | Uses the default of 10,000 requests a second |

**The trap.** Thinking "free tier" is one thing. AWS has two: **Always Free**, which never ends, and a
**12-month trial**, which is switched off on the free account plan. Much "this is free" advice on the
internet means the second one.

---

# F — How the code is arranged

## 60. Clean architecture, ports and adapters

**What it is.** A way to arrange code so that **the business rules do not know which database or
framework they run on**. It is also called hexagonal architecture, or ports and adapters.

**Four layers, and one rule about which way imports may go:**

| Layer | Holds | May import |
| --- | --- | --- |
| **Domain** | The types and the rules. Plain objects | Nothing |
| **Application** | The use cases, such as "assess a plant" | Domain |
| **Infrastructure** | The database, HTTP clients, the model SDK | Domain, application |
| **Interface** | Controllers, routes, request handling | All of them |

**The rule: imports point inwards only.** The domain never imports the database. That is the whole
idea.

**A port is an interface that the inside defines. An adapter is the outside code that implements it.**
The application says "I need something that can `assess(photo)`". It does not know that the real
implementation calls Anthropic. It is like a React component that takes an `onSave` prop: the
component does not know what `onSave` does.

**In zamphora.** `packages/llm` is one port, `LlmProvider`, with two adapters: the real Anthropic one
and a stub. `CLAUDE.md` makes it a hard rule: every model call goes through the port, and no SDK import
is allowed outside its adapter.

**What this gives you:**

- Changing the provider means writing one new adapter, not searching the whole codebase.
- **Every test runs without the internet and without spending money**, because the stub is the
  default everywhere except production. With a $5 balance, that alone is enough reason.
- When the model call moved into its own Lambda, **`packages/llm` moved with it, and nothing else
  changed.** The border was already there.

**How else it is done.** A **repository** is the same idea for data access. **Dependency inversion**,
the "D" in SOLID, is the general principle behind it.

**The trap.** Layers that are only folders, with no rule to enforce them. Without a test or a lint
rule that fails on a wrong import, the layers are just names, and they break within a month.

## 61. Dependency injection

**What it is.** A class does not create the things it needs. They are **given to it**. That is the
whole idea. A **DI container** is a tool that knows how to build everything and connects it for you.

```
Without:  class AssessService { private db = new DynamoClient(...) }
          -> to test it, you need DynamoDB

With:     class AssessService { constructor(private db: Store) {} }
          -> to test it, give it a fake Store
```

**The main reason is testing.** The other benefits, such as swapping implementations or configuring
everything in one place, come from the same property. For a React developer: it is close to passing
dependencies through props or context instead of importing them directly.

**In zamphora.** Nest.js is built around dependency injection. **This is one reason Nest was chosen
over Express.** Express gives no structure, so every project invents its own. Nest brings modules, a
container and guards.

**One trap in this project comes from it.** Nest finds what to inject by reading **decorator
metadata**, which TypeScript writes into the compiled code. **esbuild cannot write this metadata**, and
CDK bundles with esbuild. The fix is two build steps: `nest build` first, then bundle the compiled
JavaScript. `aws-and-the-pipeline.md` §7 has the details.

**How else it is done.** Spring in Java, and the built-in container in .NET. In plain TypeScript,
passing arguments into a function is already dependency injection, and for a small app that is enough.

**The trap.** A container so clever that nobody can tell what is injected where. The benefit is
testing. Everything beyond that is cost.

## 62. Monolith, modular monolith, microservices

**What it is.** Three ways to divide a system into pieces you deploy.

| | **Monolith** | **Modular monolith** | **Microservices** |
| --- | --- | --- | --- |
| Deploy | One thing | One thing | Many things |
| Borders | Whatever grew | Checked inside one build | Network calls |
| A call between modules | A function call | A function call, across a checked border | HTTP or a queue, which can fail |
| Needs | Nothing | Discipline | Service discovery, tracing, versioning, a team per service |

**The current advice, after about ten years of the opposite:** **start with a modular monolith.** Get
the borders right inside one deployable unit, where a wrong border costs a refactor, not a migration.
Split out a service when there is a reason: a different scaling need, a different language, a
different team.

**People underestimate one cost of splitting:** a function call that could not fail becomes a network
call that can. Every entry in part C (timeouts, retries, idempotency, circuit breakers) is the price
of one border.

**In zamphora.** A monolith: one Lambdalith holds every route. **The split that happened was by job,
not by service:** `assess` for the paid call, `watch` for the stream. Each got smaller permissions.

Splitting the API into a pots service, a tasks service and an auth service was considered and
rejected. The session check would exist three times, the three services would share one table anyway,
and the plant list would pay three cold starts. **The conditions to look again are written down:** a
second person who owns one part, a service in another language, or CI taking more than 15 minutes.

**How else it is done.** The **strangler fig** pattern is how teams split a monolith in practice: put a
router in front, move one route at a time to a new service, and let the old one shrink.

**The trap.** Microservices for a team of one. Every border is one more thing to deploy, version,
monitor and debug. One developer pays all of that cost and gets none of the team benefits.

## 63. Monorepo and polyrepo

**What it is.** One repository that holds several projects (**monorepo**), or one repository per
project (**polyrepo**).

| | **Monorepo** | **Polyrepo** |
| --- | --- | --- |
| A change across two projects | One commit, one pull request | Several, in order |
| Shared code | An import | Publish a package, update a version |
| Seeing who uses your code | Search the repository | You cannot |
| CI | Must be filtered by path, or it runs everything | Small by nature |
| Access control | All or nothing | Per repository |

**One newer argument decided this project: every coding agent indexes one repository.** A border
between repositories stops the agent from seeing who uses the code it changes. It needs several pull
requests for one change, and it loses its context between them.

**In zamphora.** **Two repositories, split by what can be reused, not by front end and back end.** The
`ai-factory` line is a reusable tool, so it has its own repository. `zamphora` holds the whole product:
web, API, contracts, infra and specs. **A front-end and back-end split was asked for three times, and
the answer stayed no**, because the border would cut through the shared Zod contracts. Separate CI and
separate deploys do not need separate repositories: path-filtered workflows and one CDK stack per
service give both.

**The cost of the rejected option:** four to six pull requests for every change that crosses the
network. Cloudflare published four per change before they automated it down to one.

**Six rules keep a later split cheap**, and they cost nothing now:

1. No relative import crosses an app border.
2. `packages/contracts` is imported by package name only.
3. Each app has its own `package.json`.
4. Each app builds from its own folder.
5. Each service has its own CDK stack.
6. CI is filtered by path from the first workflow file.

**Rule 2 decides whether a split is cheap or expensive.**

**How else it is done.** Google, Meta and Uber run huge monorepos with their own tools. Nx, Turborepo,
Bazel and Rush are ready-made task runners. A package can be published to npm from inside a monorepo,
so you do not need a second repository to share `packages/contracts`.

**The trap.** A monorepo without path filtering, so every change runs every test and CI takes twenty
minutes. People blame the monorepo for this, and it is one configuration file.

## 64. CI and CD

**What it is.** Three terms. The last two share the letters "CD" and mean different things.

| | What it means |
| --- | --- |
| **Continuous integration** | Every push is built and tested automatically, on a machine that is not yours |
| **Continuous delivery** | Every change that passes is **ready** to deploy. A person presses the button |
| **Continuous deployment** | Every change that passes **is** deployed. No button |

**What CI is really for** is not finding bugs. Tests do that. CI makes the build happen on a machine
that is not one person's laptop, so "it works on my machine" is no longer an answer.

**In zamphora.** Continuous **delivery**, not deployment. Merging to `main` builds and tests, and a
person starts the deploy, because one bad deploy can close this account.

**Three details from this pipeline that apply to any project** (`aws-and-the-pipeline.md` Part B
explains them with diagrams):

- **CI signs in to AWS with no password, through OpenID Connect.** GitHub signs a short-lived token
  that says which repository and which branch is running, and AWS trusts it. No long-lived key exists.
  The protection is the trust policy's `sub` condition, which names the branch.
- **Every action is pinned to a full commit SHA, not a tag.** The owner of an action can move the tag
  `v7` to different code at any time. A SHA cannot change.
- **One summary check per workflow, not a list of eleven.** `ci-ok` waits for the other jobs and checks
  each result. If the settings listed jobs by name, a renamed job would quietly stop being required.

**The trap.** A CI job that reports a problem but does not block the merge. Calling a check important
and leaving it optional is the same as not having it. zamphora found this itself: four NFRs were
measured but blocked nothing, until a second required summary check, `dev-ok`, was added.

## 65. Trunk-based development

**What it is.** Everyone works on short branches off one main branch, and merges within a day or two.
The other way is long-lived branches, such as `develop` and `release/*`, that live for weeks.

**Why short branches are better:** **the pain of merging grows faster than the age of the branch.** A
branch open for three weeks is much more than three times harder to merge than a branch open for one
week.

**Branch protection** makes it safe: nobody can push to `main` directly, a pull request is required,
CI must pass, and force-push is off.

**In zamphora.** Branch protection with required summary checks. **Two settings exist because the
repository is public:**

- **Anyone can open a pull request, and a pull request runs CI.** By default, GitHub only asks for
  approval for a *first-time* contributor. The setting *"Require approval for all external
  contributors"* asks every time, and it is on.
- **An allow-list of actions.** Only GitHub's own actions may run, plus named exceptions. The AWS
  sign-in action, `aws-actions/configure-aws-credentials`, must be added to the list before the first
  deploy.

**A wrong idea that is easy to hold:** there is no setting that turns off pull requests from forks on
a public repository. Branch protection stops a pull request from being *merged*. Nothing stops one
from being *opened*.

**How else it is done.** **Git flow** is the long-lived-branch model. It made sense for desktop
software with versions. **GitHub flow** is trunk-based with pull requests, which most teams use now.

**The trap.** Trunk-based development without feature flags. Then an unfinished feature must either
hide on a long branch or ship half-done. The two ideas go together (entry 67).

## 66. The testing pyramid

**What it is.** A picture of how many tests of each kind to write. The ratios matter more than the
names.

```
        /\        End-to-end   few     slow, real browser, real deploy, flaky
       /  \       Integration  some    real database, no browser
      /____\      Unit         many    fast, in memory, no I/O
```

| Kind | Speed | What it proves | What it misses |
| --- | --- | --- | --- |
| **Unit** | Milliseconds | One function does what it says | That the pieces fit together |
| **Integration** | Seconds | Two real things work together | What the user experiences |
| **End-to-end** | Minutes | The whole thing works for a person | Which part broke, when it fails |
| **Contract** | Fast | Two services still agree on the shape | Behaviour |

**The rule: test each thing at the lowest level that can test it.** An end-to-end test that checks a
validation message is a slow, flaky way to test something a unit test checks in 2 ms.

**In zamphora.** Vitest for every package, one test runner. Playwright for end-to-end tests against the
`dev` environment. The AI parts need their own kind of test (entry 71).

**Two rules from `CLAUDE.md` worth copying to any project:**

- **Tests ship with the change.** CI blocks a pull request that deletes a test file, unless the commit
  message says `DELETE_TESTS: <reason>`.
- **At least five negative tests are required.** If you only ask for "tests for this", you get tests
  that pass. The useful tests are the ones that check failures.

**How else it is done.** The **testing trophy** suggests more integration tests and fewer unit tests,
because integration tests catch what really breaks. Both shapes agree on the most important point:
very few end-to-end tests.

**The trap.** An **ice cream cone**: mostly end-to-end tests. They are slow, they fail for reasons
that have nothing to do with the change, and a test suite people re-run until it passes tests nothing.

## 67. Feature flags and kill switches

**What it is.** A value read while the code runs, which changes what the code does, without a deploy.
**The idea is to separate deploying from releasing.**

**Four different things share the name, and they live for different times:**

| Kind | Lives for | Example |
| --- | --- | --- |
| **Release flag** | Weeks. Then delete it | Ship the code switched off, switch it on later |
| **Experiment flag** | The length of a test | Half of the users see the new screen |
| **Permission flag** | Forever | This feature is only for paying accounts |
| **Kill switch** | Forever | Switch something off at once when it misbehaves |

**A kill switch is real only if it has three things.** Ask these three questions about any switch:

1. **A named person who can flip it.** Not a team. One person.
2. **It does not depend on the thing it switches off.** If it needs the broken part, it is not a
   switch.
3. **It has been tested.** A switch nobody has ever flipped is just a paragraph in a document.

**In zamphora.** The kill switch is one row in DynamoDB, cached for 30 seconds, and it works within 60
seconds. **The app is never allowed to write it.** Only a person can, in the AWS console, so a machine
can never undo a person's decision.

When the three questions were checked, the answer was not a full yes:

- It does not depend on the code or on a deploy. Good.
- **It does depend on DynamoDB**, because the switch is a row in the same table the API reads. If the
  table cannot be read, the switch cannot be flipped.
- **It had never been tested.** So a test was added to the checklist before the first deploy: flip it
  once on purpose, time it, and write the number down.

Because of the DynamoDB gap, the runbook has **two backup switches outside the table**: set the
`assess` function's reserved concurrency to 0, which stops every paid call, or switch off the
CloudFront distribution, which stops everything.

**How else it is done.** LaunchDarkly, Unleash and Flagsmith are flag products. A row in your own
database is enough for a long time, and that is what zamphora does.

**The trap.** Flags that are never deleted. Ten flags give 1,024 possible combinations, and nobody has
tested more than three of them. Give a release flag a removal date on the day you add it.

---

# G — AI inside a backend

## 68. What a model call actually is

**What it is.** For the backend, a language model call is **one HTTP request to someone else's API
that is slow, paid per word, and may return something different every time.**

**Everything unusual about it comes from these three properties:**

| Property | What it forces |
| --- | --- |
| **Slow**: seconds, not milliseconds | It cannot sit inside a request the user is waiting on (entry 4) |
| **Paid per token** | Rate limiting protects money, not capacity (entry 72) |
| **Not the same every time** | You cannot test it by comparing it with an expected string (entry 71) |

**People forget a fourth property: the answer is input you cannot trust.** It is text from outside
your system, so the same rules apply as for anything a user typed.

**In zamphora.** Normally one call per assessment. It goes through a port, so the SDK exists in
exactly one file. **The model has no tools, makes one call, and its answer must fit a fixed shape,
where most fields are fixed lists of allowed values.** So even a successful attack on the model cannot
make it *do* anything. It can only change the words that come back.

**The trap.** Treating it like a normal function call. It is a network call to a slow, paid and
unreliable third party, and every entry in part C applies to it.

## 69. Structured output

**What it is.** Making the model return data in a shape your code can read, instead of a sentence you
must parse.

**Three ways, from worst to best:**

1. **Ask in the prompt:** "reply with JSON". It works most of the time, and "most of the time" is not a
   contract.
2. **Tool calling** with a strict schema: the model must fill in named fields.
3. **A response format schema:** the provider guarantees that the output matches your schema.

**The rule: first make a broken answer almost impossible, then handle it anyway.** Good handling is the
safety net, not the plan.

**In zamphora.** The call uses a response schema, and `ModelAnswer` is the only way a reply becomes a
value in the code. Three details apply to any project:

- **Always check `stop_reason` before you read the content.** Some values are not an answer. `refusal`
  means a safety check declined, and **a retry is pointless**. `max_tokens` means the answer was cut
  off, and a retry with the same limit fails the same way. Only a real schema failure is worth one
  retry.
- **Never match on the raw text of the answer.** Parse it. A new model version may write characters
  differently, and string matching then breaks without an error.
- **An answer the app cannot read is a failure, not a verdict.** It is never shown as `cannot-tell`.
  `cannot-tell` means *"I looked and could not tell"*. A broken answer means nothing was assessed. If
  you mix them up, you tell the user to take a new photo when the photo was fine.

**The general lesson:** keep "the model says it does not know" and "the call went wrong" as two
different results. The user can act on the first one, and not on the second.

**The trap.** Setting `max_tokens` very low to save money. **You pay for the tokens the model writes,
not for the limit**, so a low limit saves nothing and cuts answers off.

## 70. Prompt injection

**What it is.** Text that reaches the model contains instructions, and the model follows them. **It is
not a bug that can be fixed with a patch**, because a language model cannot reliably tell "content to
read" from "instructions to follow". Both arrive as text.

**Two kinds:** **direct**, where the user types the instruction; and **indirect**, where it arrives
inside something the model reads: a web page, a document, **or a photo of a printed sheet of paper**.

**The defence is not a clever prompt. It is architecture.** "Ignore any instructions in the user's
text" is a request, not a control. These things really limit the damage:

| Control | Effect |
| --- | --- |
| **No tools** | A hijacked model cannot *do* anything |
| **Structured output with fixed lists** | It can only return values you already allow |
| **Never put user text in the system prompt** | Instructions and data stay separate |
| **Treat the output as untrusted** | It cannot become HTML, a query, a path or a command |

**The lethal trifecta** is the combination to watch for: **private data + untrusted content + a way to
send data out.** Any two together are usually safe. All three together turn prompt injection into data
theft.

**In zamphora.** Two values from the user reach the model: the plant's nickname and the photo, which
can contain text. **The system prompt is a constant in the code, and no user value is ever added to
it.** The worst result is one wrong verdict for one person, because there is no tool, no second call
and no action the model can take. The date the model picks for a care task is limited to 1–30 days by
a check in our own code.

The same trifecta test was applied to **the AI roles that wrote these documents**, and all three parts
were there: they could read the whole repository, they fetched outside web pages, and a fetched URL can
send data out. This risk was accepted and written down.

**The trap.** Testing only with polite attacks. The real test set includes a photo with an instruction
printed next to the plant, because nobody thinks of that one.

## 71. Evals and the golden set

**What it is.** How you test something that has no single correct answer. A normal test checks
`output === expected`. A model's output changes between runs, so the question becomes **"is it right
often enough?"** That needs a measurement, not an assertion.

A **golden set** is a fixed set of real inputs, where **a person wrote down the right answer first**.
You run the model over the set and count how often it agrees.

**Three rules keep it honest:**

- **The person's answers come first**, before anyone sees what the model said. Otherwise you are
  grading your own work.
- **The pass bar is a number you choose in advance**, such as "agrees 8 times out of 10". Not a feeling
  afterwards.
- **If a model grades the answers, check the grader.** Grade a sample by hand, and write down how
  often you and the grader agree. Otherwise the pass bar measures the grader, not the model.

**In zamphora.** A golden set of 40 photos, with a pass bar of 8 out of 10. There is also an **upper
limit**: no more than 3 out of 10 answers may be "cannot tell". **A model that hides behind "I don't
know" also fails, only quietly.** Most people forget this second number.

**The confidence design is the wider lesson.** If you ask a model how sure it is, it writes a number.
But that number is the model talking about itself, not a measurement. A wrong answer at "95%" looks
exactly like a right one. **So the app never shows a percentage.** The model returns one of three
levels: `likely`, `unsure` or `cannot-tell`. A person can check a level against the real plant, so a
level can be tested.

**The eval job does not run automatically, because of simple arithmetic.** 40 photos at $0.0040 is
$0.16 per run. Every night, that would be about $4.80 a month, against a $5 balance. **A test that
uses up the balance it is testing is not a test.**

**The trap.** No golden set, only "it looked good when I tried it". Most AI features ship like this,
and so nobody can say whether a prompt change made things better or worse.

## 72. Tokens, cost and denial of wallet

**What it is.** Models are billed per **token**, which is about ¾ of a word. **Input tokens are
cheaper than output tokens.** An image costs tokens too, depending on its size.

**Denial of wallet** is denial of service with the bill as the weapon: someone calls the paid endpoint
faster than a person could, until the money is gone. **Nothing breaks. The money is simply spent.**

**Four controls, and you cannot swap one for another:**

| Control | Stops |
| --- | --- |
| **Sign-in required on the paid route** | Anonymous scripts. The cheapest control |
| **A limit per account** | One account, honest or not, spending everything |
| **A cost limit per call** | One unexpectedly huge request |
| **A total budget or a prepaid balance** | Everything, in the end |

**In zamphora.** All four:

- Sign-in is required, so there is no anonymous model call.
- Ten assessments per account per day.
- **The photo is at most 1000 px on its longer side.** That is a cost decision as much as a quality
  one: it keeps one photo at 1,296 image tokens instead of about three times more.
- The $5 balance is the total limit.

**Do the arithmetic instead of guessing.** One call costs about $0.0035. A photo may need three calls,
so the most one photo can cost is about $0.012, and one person's whole day is about $0.12. **$5 buys
about 1,250 assessments on Haiku 4.5, 625 on Sonnet 5, or 250 on Opus 5.** It is the same call, five
times more expensive at the top, so measure before you choose a model.

**One general rule:** a price is what the calls *would* cost. It is not a bill. The API stops at zero,
so no document may describe a sum bigger than the balance as money the owner could lose.

**The trap.** Estimating cost from a token count instead of reading the `usage` block that the API
returns. The estimate is always wrong, in the direction nobody checked.

## 73. RAG, embeddings and vector stores

**What it is.** **RAG** (retrieval-augmented generation) is the standard way to make a model answer
about information it was never trained on: **find the relevant documents first, put them into the
prompt, then ask the question.**

**The three pieces:**

| Piece | What it is |
| --- | --- |
| **Embedding** | A list of numbers that represents the meaning of a text. Similar meanings give similar numbers |
| **Vector store** | A database that quickly finds the closest lists of numbers. pgvector, Pinecone, OpenSearch |
| **Retrieval** | Turn the question into an embedding, find the closest pieces of text, put them in the prompt |

**In zamphora there is no RAG, and the reason is the useful part.** The model looks at a photo and says
what is wrong. **There is no set of documents it needs.** A vector store would add a service, a way to
cut documents into pieces, an embedding cost per document and a search step, to answer a question
nobody asked.

**Where it would go, if it is ever added:** a plant-care reference, so the advice could name a source.
`monorepo-architecture.md` §13 says it would sit behind the same port, as a step before the model call,
so nothing else in the system would change.

**A security note.** Two OWASP LLM risks, data poisoning and vector store weaknesses, are marked **not
applicable**. Both come back on the day a vector store or any search step is added. Writing down why
something does not apply makes it possible to notice when it starts to.

**The trap.** Using RAG when the answer is a database query. "What did this user do last week?" is a
`SELECT`. A vector search for it is slower, more expensive and less correct.

## 74. One call, a chain, or an agent

**What it is.** Four ways to use a model, ordered by power and by how hard they are to control. **The
rule: stop at the first one that does the job.**

| Shape | What it is | Cost and risk |
| --- | --- | --- |
| **Plain code** | No model at all. An `if`, a lookup table | Free, testable, boring, and often correct |
| **One call** | One prompt, one answer | Cost you can predict. Easy to test and to limit |
| **A fixed chain** | Call A, then call B with A's answer. You decide the steps | The cost grows by a number you know |
| **An agent** | The model decides which tools to call, and how many times | **No cost limit, a path you cannot predict, hardest to test** |

**In zamphora: one call.** **Reaching for an agent by default is the most common mistake in this area
today.**

Stopping at one call has two results, and they are why the security section is short:

- The cost of one assessment is known in advance, so the limit can be a real number.
- The model has no tools, so a successful prompt injection can only change the words that come back.

**Two checks run before the model call, because they are free and the model is not:** the file must be
an image the app accepts, and the user must have named the plant. **Do every cheap check first.**

**How else it is done.** A chain is right when one step really needs the result of the step before it,
such as extract and then summarise. An agent is right when nobody can know the number of steps in
advance. Then it needs a hard limit on steps, a limit on spending, and a way to stop it.

**The trap.** An agent with no step limit. It is the same failure as a retry loop with no limit, with a
bill attached.

---

## Where the rest is

| Question | File |
| --- | --- |
| How the specs were written, and what a factory run is | `ai-native-delivery.md` |
| How this repository is arranged, and why pnpm and Turborepo | `monorepo-architecture.md` |
| How the running system fits together on AWS, with diagrams | `aws-and-the-pipeline.md` |
| Why a specific choice was made | `../ADR/`, one record per decision |
| What could go wrong, and what is done about it | `../900-security/` |
