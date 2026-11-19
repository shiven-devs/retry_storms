# ADR-0005: Repo layout as an npm workspaces monorepo

- Status: Accepted
- Date: 2026-11-19

## Context

The repo holds the protection library, the generic service, topology files, the benchmark and infra config. The library should have a clear boundary from the code that uses it.

## Options considered

1. **Single package with folders**: the simplest setup. Code is imported by relative paths, so there is no enforced boundary between the library and the service.
2. **npm workspaces monorepo**: one repo containing separate packages (`packages/retry-guard`, `services/node`), each with its own `package.json`. The service imports the library by package name. This gives a clean boundary, at the cost of more setup (workspaces and TypeScript resolution).
3. **Two separate repos**: the library is fully independent, but every change needs cross-repo syncing and two CI pipelines.

## Decision

Use an **npm workspaces monorepo** (author's choice).

Draft layout (folder names can change during M1):

```
packages/retry-guard/   protection library
services/node/          generic configurable service
topologies/             graph definitions (YAML)
bench/                  load generator and results
infra/                  docker-compose, Prometheus, Grafana
docs/
```

## Consequences

- The service can only use what the library exports, so the public API stays deliberate.
- We must set up TypeScript so that `services/node` resolves `retry-guard` correctly, both in development and in Docker builds.
- One `npm install` at the root installs everything, and one CI pipeline covers everything.
