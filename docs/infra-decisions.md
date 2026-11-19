# Infra Decisions Log

One place to see every decision taken so far, with its reason.
The full write-ups (context, options, consequences) live in [`docs/adr/`](adr/). This file is the summary index.

Last updated: 2026-11-19 (Phase 0)

---

## Given constraints (from the project brief, not debated)

| Constraint | Reason |
|---|---|
| Test bed of 5-7 services in a configurable call graph | A retry storm only appears in multi-hop chains. We need depth and fan-out to reproduce R^depth amplification. |
| Docker Compose to run the test bed | Anyone can bring up the whole graph with one command, so results are reproducible. |
| Prometheus + Grafana for observability | Industry-standard metrics stack. Amplification factor and max retry storm radius must be visible as graphs, not just logs. |
| Benchmark: none vs retry budget vs error ownership (vs circuit breaker) | The project's claim, "ownership beats budgets", must be backed by measured numbers. |
| Never invent numbers | Resume bullets and the README come only from runs we actually measured. |

---

## Agreed decisions

### D1. Runtime: Node.js 22 LTS ([ADR-0001](adr/0001-runtime-nodejs.md))

- **Options:** Go, C++ sidecar with Python services, Python/FastAPI, Node.js.
- **Chosen:** Node.js 22. It is already installed locally.
- **Why:**
  1. The author does not know Go and does not want to stretch the project timeline.
  2. The author wants to learn Node.js properly.
  3. Node is built for async I/O, and this project is almost entirely network calls.
- **Why not C++:** HTTP and async plumbing (Boost.Asio/Beast, CMake, memory bugs) would eat the time meant for the retry logic. C++ also only makes sense with a sidecar-first design.
- **Accepted trade-offs:** a single-threaded event loop and lower raw throughput than Go or C++. This is acceptable because it is an intermediate project.
- **Why the trade-offs do not hurt results:** we measure *ratios* (amplification factor, storm radius, success rate), not raw RPS. A ratio like 8× load is the same in any language.

### D2. Language: TypeScript, strict mode ([ADR-0002](adr/0002-typescript.md))

- **Options:** plain JS, TypeScript, JS + JSDoc `@ts-check`.
- **Chosen:** TypeScript with `strict: true`.
- **Why:** the core logic is a state machine (claimed / unclaimed / missing claim). Typos in states, header names or config shapes are the most likely bugs, and TypeScript catches them at compile time instead of during a failure-injection run. It is also an industry standard at product companies.
- **Accepted trade-off:** learning Node and TypeScript together means a bit more ramp-up.
- **Open detail:** how to run it (Claude suggested `tsx` in dev and `tsc` in CI/Docker). This is not yet discussed.

### D3. Test-bed design: one generic service + YAML topology ([ADR-0003](adr/0003-generic-service-and-topology-config.md))

- **Options:** hand-written services, one generic service + config, generic service + named wrappers.
- **Chosen:** one generic service codebase. A YAML file (`topologies/*.yaml`) tells each instance its role (downstreams, error rate, latency, retries). Docker Compose runs the same image once per node.
- **Why:** the real product is the library. The services are only a lab for testing it. Changing depth or fan-out becomes a config edit, so the benchmark can compare depth 3 / 5 / 7 without new code.
- **Analogy:** a brake-testing track with adjustable slope and wetness, instead of building 7 separate roads.
- **Accepted trade-off:** it looks less like a real product.

### D4. First milestone: measure the baseline storm before building any protection

- **Options:** (1) baseline storm first, (2) jump straight into a retry budget.
- **Chosen:** option 1. Chain A→B→C→D→E, naive retries (2 per hop), failure injected at E, per-service request counters.
- **Why (author's words):** a better choice, because it lets us show the problem and the solution together. The baseline numbers become the reference point for every later approach.

### D5. Integration style: in-process library first ([ADR-0004](adr/0004-library-first.md))

- **Options:** in-process library vs sidecar proxy from day one.
- **Chosen:** library first (author's choice). The sidecar stays a stretch goal.
- **Trade-offs:** the library is simpler to build and debug, and correlation is in-process. Services need code changes to adopt it. A later sidecar can reuse the same logic.

### D6. Repo layout: npm workspaces monorepo ([ADR-0005](adr/0005-npm-workspaces-monorepo.md))

- **Options:** single package with folders, npm workspaces monorepo, two separate repos.
- **Chosen:** npm workspaces monorepo (author's choice).
- **Trade-offs:** a clean library boundary (the service imports `retry-guard` by name), one install and one CI. The cost is extra setup for workspaces and TypeScript resolution.

### D7. Load generator runs as its own Compose container ([ADR-0006](adr/0006-load-generator-container.md))

- **Options:** a loop inside service A, a separate host process, a separate Compose container.
- **Chosen:** a separate Compose container (author's choice).
- **Trade-offs:** the same environment on every run, so results are reproducible. Containers still share host CPU, so we repeat runs and report the spread.

### D8. Latency injection uses timers ([ADR-0007](adr/0007-timer-based-latency-injection.md))

- **Options:** `setTimeout`-style sleep vs CPU busy loop.
- **Chosen:** timers (author's choice).
- **Trade-offs:** only the targeted request is delayed, so experiments are predictable. Injected faults are load-independent, so overload feedback must be modelled separately (see open decisions).

### D9. Express + axios ([ADR-0008](adr/0008-express-and-axios.md))

- **Chosen:** Express (5.x) for the server and axios for outbound calls (author's choices).
- **Why:** both are familiar, so there is less ramp-up and we can start building sooner. axios has no built-in retry, which suits us because we write the retry loop ourselves.

### D10. Milestone 1 work split

- **Claude:** root workspace `package.json` and `tsconfig.base.json`, the service's `package.json` and `tsconfig.json`, the topology YAML loader and validation, docker-compose, and the load generator.
- **Author (with guidance):** the Express server, downstream calls with axios, the retry loop, failure injection, request counters, and the Dockerfile.

---

## Proposed by Claude, NOT yet discussed

Claude wrote these into an earlier version of this file as if they were decided. They were not. Each needs a proper options/trade-off discussion before it moves to "Agreed".

| # | Proposal | Claude's reasoning (to be challenged) |
|---|---|---|

## Open decisions (not yet raised)

- Topology YAML schema (fields and validation).
- Load generator tool (custom script vs autocannon vs k6).
- Circuit breaker: build our own or use a library.
- Overload model: should a service get worse (more errors or latency) as its load rises, so that retry storms cause real cascading harm?
- Sidecar proxy and Kubernetes (stretch).
