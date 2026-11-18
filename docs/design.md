# Retry Storm Protection: Design Doc

- Status: Draft (Phase 0)
- Based on: [How Uber Protects Against Retry Storms](https://www.uber.com/us/en/blog/protecting-against-retry-storms/)

## 1. Problem (in my own words)

> TODO (author): explain in 4-6 lines what a retry storm is, why load grows as R^depth, and the difference between an error that is a *symptom* and one that is a *cause*.

## 2. Goals

> TODO (author): 3-5 bullets. Example shape: "Reduce amplification at the failing service from X to near 1 while keeping availability within Y".

## 3. Non-goals

- A production-grade service mesh.
- Raw throughput comparisons between languages (see ADR-0001: we measure ratios, not RPS).
- (author: add more)

## 4. Key decisions so far

The full log with reasons is in [infra-decisions.md](infra-decisions.md).

| ADR | Decision |
|---|---|
| [0001](adr/0001-runtime-nodejs.md) | Node.js 22 for services and the library |
| [0002](adr/0002-typescript.md) | TypeScript, strict mode |
| [0003](adr/0003-generic-service-and-topology-config.md) | One generic service plus YAML topology |

Repo layout, library vs sidecar, load-generator placement and the M1 work split are still **proposals** (P1-P5 in infra-decisions.md).

## 5. Architecture (high level)

```
 load generator ──► [A] ──► [B] ──► [C] ──► [D] ──► [E]   (each box = same generic service,
                     │       │       │       │       │      role read from topologies/*.yaml)
                     └───────┴───────┴───────┴───────┘
                          retry-guard library (in-process):
                          inbound middleware + outbound client wrapper
```

Planned library components (not built yet):
- Retry policy: max attempts, exponential backoff with jitter.
- Retry budget: token bucket.
- Request-context propagation using AsyncLocalStorage.
- Error claim/unclaim header.
- Inbound/outbound failure correlator (the SDA-like component).
- At-least-once retry flag.

## 6. Milestones

| # | Milestone | Ends with (runnable and measured) |
|---|---|---|
| M1 | **Baseline storm**: generic service, chain A→E, naive retries, failure injection, simple per-service request counters | Measured amplification at each hop with no protection |
| M2 | Retry budget (token bucket) + backoff with jitter | Same experiment, compared with M1 |
| M3 | Error ownership: claim/unclaim header, context propagation, correlator | Same experiment, compared with M1 and M2 |
| M4 | Edge cases as tests: coincidental errors, context drop, services with no retries, at-least-once flag | Passing tests that reproduce each case |
| M5 | Observability: Prometheus and Grafana, amplification per service, max retry storm radius | Dashboard screenshots from a real run |
| M6 | Benchmark suite: none vs budget vs ownership vs circuit breaker, across topologies | Results table built only from measured numbers |
| M7 | Hygiene: CI, chaos tests, README with diagram and results | Green CI and a finished README |
| Stretch | Sidecar proxy, Kubernetes | To be decided later |

## 7. Milestone 1 detail

**Work split**
- Author: the generic service core (read topology, handle request, call downstreams, retry loop).
- Claude: workspace setup, tsconfig, Dockerfile, docker-compose, load script.

**Experiment**
- Chain A→B→C→D→E. Every hop makes 2 retries (3 attempts).
- Fault: E fails a share of requests (rates to be set below).
- Send N requests to A, then read the per-service request counts.

**Prediction (author, before running)**
> TODO

**Result**
> To be filled with measured numbers only.
