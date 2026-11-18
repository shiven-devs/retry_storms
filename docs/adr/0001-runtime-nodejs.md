# ADR-0001: Use Node.js as the runtime for services and the protection layer

- Status: Accepted
- Date: 2026-11-18

## Context

We need one runtime for the test-bed services (5-7 services in a configurable call graph) and for the retry/ownership layer (retry budget, backoff with jitter, error claim/unclaim, context propagation, failure correlator).

The project should be finished in a reasonable time and should also help the author learn the runtime more deeply.

## Options considered

1. **Go** is the standard language for infra tooling, has built-in `net/http` and a reverse proxy, and gives a strong resume signal. The author does not know Go, so it would add weeks of ramp-up.
2. **C++ sidecar with Python services** is the most impressive option for systems depth (an Envoy-style L7 proxy). It also has the highest risk: CMake/dependency setup, async networking with Boost.Asio/Beast, and memory bugs. The project could stall in proxy plumbing before reaching the retry logic.
3. **Python/FastAPI** is familiar and fast to build, but is a weaker fit for the later sidecar stretch.
4. **Node.js** is familiar but not yet deeply known. It is built for async I/O, and Express middleware fits the inbound/outbound interception pattern well.

## Decision

Use **Node.js (v22 LTS)** for all services and the protection layer.

Whether the protection layer is an in-process library or a sidecar is not decided here (see proposal P2 in `docs/infra-decisions.md`).

The author's reasons:
- They do not know Go and do not want to stretch the project timeline.
- They want to learn Node.js properly, and this project forces them to learn its internals (event loop, AsyncLocalStorage, middleware, HTTP clients).
- They accept the runtime trade-offs, because this is an intermediate-level project.

## Consequences

- **Accepted trade-offs:**
  - Node has a single-threaded event loop and lower raw throughput than Go or C++.
  - CPU-heavy code would block a service. Latency injection must use timers, not busy loops.
- **Why the trade-offs do not hurt the results:** the benchmark measures *ratios* (amplification factor per service, max retry storm radius, success rate), not absolute RPS. These ratios do not depend on the language.
- Likely implications, not yet discussed (see proposals P3 and P4 in `docs/infra-decisions.md`): the load generator should run as a separate process, and latency injection should use timers instead of CPU loops.
- Request-context propagation will likely use `AsyncLocalStorage`. This is to be decided in M3.
- JavaScript vs TypeScript is decided in ADR-0002.
