# ADR-0008: Express for the HTTP server, axios for outbound calls

- Status: Accepted
- Date: 2026-11-19

## Context

The generic service needs an HTTP server for inbound requests and an HTTP client for calls to downstream services.

## Options considered

**Server**
- **Express**: the author already knows it and the middleware pattern is simple. It is older and slower than the alternatives.
- **Fastify**: modern and has good TypeScript support, but it is a new API to learn.
- **Node's built-in `http`**: no dependencies, but routing and JSON parsing would have to be written by hand.

**Client**
- **Native `fetch`**: built in, no install. Timeouts need an `AbortController`.
- **axios**: familiar and easy, with a built-in timeout option. It is an extra dependency with slightly more overhead.
- **undici**: more control over the connection pool, but a less familiar API.

## Decision

Use **Express** and **axios** (author's choices).

## Consequences

- We use Express 5, the current major version. It forwards errors from async handlers to error middleware, which Express 4 did not.
- axios has no built-in retries. That is what we want, because we write the retry loop ourselves. We must not add `axios-retry`.
- The library's inbound hooks will be Express middleware, and its outbound hooks will wrap or intercept axios. Supporting other frameworks is out of scope.
- Raw throughput is not a goal (see ADR-0001), so the framework overhead does not affect our ratio-based results.
