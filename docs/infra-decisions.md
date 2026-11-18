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

---

## Proposed by Claude, NOT yet discussed

Claude wrote these into an earlier version of this file as if they were decided. They were not. Each needs a proper options/trade-off discussion before it moves to "Agreed".

| # | Proposal | Claude's reasoning (to be challenged) |
|---|---|---|
| P1 | Repo layout: npm workspaces monorepo (`packages/`, `services/`, `topologies/`, `bench/`, `infra/`) | Keeps the library as its own package with a clean boundary |
| P2 | Integration style: in-process library first, sidecar later | Simpler to build, test and debug; a sidecar could reuse the library |
| P3 | Load generator runs as a separate process | If it shared Node's single event loop with a service, measurements would be skewed |
| P4 | Latency injection uses timers, not CPU loops | A CPU loop blocks the whole event loop, not just one request |
| P5 | Work split for M1: author writes the service core and retry loop; Claude writes the boilerplate | Follows the working agreement, but the exact boundary is not confirmed |

## Open decisions (not yet raised)

- Express vs Fastify for the HTTP server.
- Topology YAML schema (fields and validation).
- HTTP client for outbound calls (native `fetch` vs `undici`).
- Load generator tool (custom script vs autocannon vs k6).
- Circuit breaker: build our own or use a library.
- Sidecar proxy and Kubernetes (stretch).
