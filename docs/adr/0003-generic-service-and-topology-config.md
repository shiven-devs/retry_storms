# ADR-0003: One generic service configured by a topology file

- Status: Accepted
- Date: 2026-11-18

## Context

The test bed needs 5-7 services in a call graph whose depth, fan-out, failure injection (error rate, latency, a service down), retry settings and fail-open/fail-close edges can change. The benchmark must compare several graph shapes (for example, chains of depth 3, 5 and 7) reproducibly.

The real product of this project is the protection library. The services exist only to exercise it.

## Options considered

1. **Hand-written services**: one codebase per service, with hardcoded downstreams. This looks realistic, but every graph change needs code changes, and the graph lives in many files.
2. **One generic service plus a topology file**: a single service codebase reads its role (downstreams, error rate, latency, retries, edge type) from a YAML topology, and Docker Compose runs it once per node. Changing the graph only means editing config.
3. **Option 2 with named wrappers**: the same as option 2, plus realistic service names for demos. This is extra work that can be added later.

## Decision

Use **option 2**. Build a single generic service that reads its role from `topologies/*.yaml`.

The repo layout (Claude proposed an npm workspaces monorepo) is **not decided here**. See proposal P1 in `docs/infra-decisions.md`.

## Consequences

- Graph shapes become data. Benchmarks can run the same experiment across topologies by changing only the topology file.
- The topology schema becomes an important, typed interface and needs validation at startup.
- The services look less like a real product. A real product would usually be an independent set of services, not one engine. We can add named wrappers later if the README needs them.
