# ADR-0007: Inject latency with timers, not CPU busy loops

- Status: Accepted
- Date: 2026-11-19

## Context

Failure injection needs a "this service is slow by X ms" mode. Node runs JavaScript on a single thread (the event loop).

## Options considered

1. **Timers (`await sleep(ms)`)**: only the affected request waits. Other requests on the same service keep being served.
2. **CPU busy loop**: looks like a CPU-overloaded service, but it blocks the whole event loop, so every in-flight request on that service stalls. Results would then reflect Node's threading model instead of our retry logic.

## Decision

Use **timer-based latency** (author's choice).

## Consequences

- Injected latency affects only the targeted request, which makes experiments predictable.
- Timer latency and a fixed error rate are **load-independent**: extra retry traffic does not make the failing service any worse. Real retry storms hurt because extra load causes overload, which causes more errors. Modelling that feedback loop (for example, a capacity or concurrency limit per service) is a separate open decision.
