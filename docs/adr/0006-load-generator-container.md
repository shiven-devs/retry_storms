# ADR-0006: Run the load generator as its own Docker Compose container

- Status: Accepted
- Date: 2026-11-19

## Context

Benchmarks send N requests to the entry service (A) and then read per-service counters. The results must be reproducible by anyone, including CI.

## Options considered

1. **A loop inside service A**: minimal setup, but load generation and request handling share A's single event loop, which skews A's numbers.
2. **A separate Node process on the host**: easy to run, but the host environment adds noise and differs between machines.
3. **A separate container in Docker Compose**: the same environment on every run, and it can be started by the same compose command as the services.

## Decision

Use a **separate container in Docker Compose** (author's choice).

## Consequences

- The compose file grows by one service, and the load generator reaches A over the compose network.
- Containers still share the host's CPU (on Windows, the Docker Desktop VM). We should run each experiment several times and report the spread, not one run.
- The load generator tool is still open (custom script vs autocannon vs k6).
