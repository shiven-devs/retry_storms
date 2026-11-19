# ADR-0004: Build the protection layer as an in-process library first

- Status: Accepted
- Date: 2026-11-19

## Context

The protection logic (retry budget, backoff, claim/unclaim, correlator) must sit somewhere in the request path. The brief allows either a library or a sidecar proxy. The sidecar is listed as a stretch goal.

## Options considered

1. **In-process library**: services import it as inbound middleware plus an outbound client wrapper. The inbound and outbound request context is in the same process, so correlation is direct. It is simpler to build and debug. The cost is that services need code changes to adopt it.
2. **Sidecar proxy**: a separate proxy runs next to each service and all traffic passes through it. Services get protection with no code changes, which is closer to a real service mesh. The costs are an extra container per node, writing a proxy, and correlation that depends on the service forwarding a request ID.

## Decision

Use an **in-process library first** (author's choice). The sidecar stays a stretch goal, to be decided later.

## Consequences

- Services must call the library explicitly (middleware and a client wrapper).
- Inbound/outbound correlation can use in-process request context.
- If we build a sidecar later, it can wrap the same library logic, so the library work is not wasted.
