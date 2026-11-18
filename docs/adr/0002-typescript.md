# ADR-0002: Use TypeScript (strict mode)

- Status: Accepted
- Date: 2026-11-18

## Context

The core of the protection layer is a small state machine: an error is *claimed*, *unclaimed*, or its claim is *missing*. On top of that sit header names, retry-flag semantics, and a typed topology config. Typos and mismatched states in this logic are the most likely class of bug, and in plain JS they only appear at runtime, often only under failure injection.

## Options considered

1. **Plain JavaScript**: no setup, but type errors are found only at runtime.
2. **TypeScript**: types are checked at compile time and it is an industry standard. The cost is a build step and one more thing to learn.
3. **JavaScript + JSDoc + `// @ts-check`**: type checking without a build step, but with verbose syntax and a weaker resume signal.

## Decision

Use **TypeScript** with `strict: true`.
- In development, run the code with `tsx`, so there is no separate compile step in the edit-and-run loop.
- In CI and Docker builds, compile with `tsc`.

## Consequences

- Claim states, header names and config shapes become types. Invalid combinations fail at compile time.
- The author learns Node and TypeScript together. This adds some ramp-up, which they have accepted.
- CI gets a `tsc --noEmit` type-check step.
