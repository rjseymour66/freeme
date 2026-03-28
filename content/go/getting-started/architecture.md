+++
title = 'Architecture'
date = '2026-03-22T22:51:14-04:00'
weight = 40
draft = false
+++

![architecture](/images/architecture.svg)


## Claude

**Domain layer** (`link.go`, `shortener.go`, `error.go`): Core types (`Link`, `Key`), key generation via SHA256 (first 6 bytes → base64url = ~8 char key), validation, and the `Shortener` interface. The in-memory implementation in `shortener.go` is for testing/reference; the real one is in `sqlite/`.

**REST layer** (`rest/`): HTTP handlers for `POST /shorten`, `GET /r/{key}`, and `GET /health`. Uses the `rest.Shortener` and `rest.Resolver` interfaces to decouple from storage.

**Storage layer** (`sqlite/`): SQLite-backed `Shortener` implementation. URLs are stored base64-encoded. Schema is in `sqlite/schema.sql`. Tests use `DialTestDB()` for in-memory SQLite.

**Kit** (`kit/`): Reusable utilities — `hio` provides a composable handler chain pattern and JSON/response helpers; `hlog` provides request logging middleware; `traceid` provides trace ID generation and propagation through context and `slog`.

**Entry point** (`cmd/linkd/linkd.go`): Wires dependencies, configures routes and middleware, starts the HTTP server. CLI flags: `-http.addr`, `-http.timeouts.read`, `-http.timeouts.idle`, `-db.dsn`.

The custom `hio.Handler` type enables functional middleware composition — handlers wrap each other rather than using a mux-based middleware stack.

## Robot

This project is a small URL shortener service built with clear package boundaries. It follows a layered style:

- Composition root in `cmd/linkd`
- Domain model and business rules in `link`
- HTTP delivery in `rest`
- Persistence adapter in `sqlite`
- Cross-cutting utilities in `kit/*`

The structure is designed to keep business rules independent from HTTP and storage details.

## Package map and responsibilities

### `cmd/linkd`

- Starts the process, reads flags, configures logger, and creates dependencies.
- Wires routes and middleware.
- Starts the HTTP server.

Why it is separated:

- Keeps startup and wiring logic in one place.
- Prevents business packages from importing runtime concerns such as flags and server setup.

### `link`

- Defines core types (`Link`, `Key`).
- Implements key generation and validation (`Shorten`, `Validate`).
- Defines sentinel errors (`ErrBadRequest`, `ErrConflict`, `ErrNotFound`, `ErrInternal`).
- Includes an in-memory shortener implementation (`shortener.go`).

Why it is separated:

- Centralizes business rules so all adapters behave consistently.
- Makes rules testable without HTTP or database dependencies.

Tradeoff:

- The package mixes pure domain code and an in-memory adapter. This is simple and practical, but not as strict as a separate `memory` package.

### `rest`

- Implements HTTP endpoints:
  - `POST /shorten`
  - `GET /r/{key}`
  - `/health`
- Defines small interfaces used by handlers (`Shortener`, `Resolver`).
- Maps domain errors to HTTP status codes in one place.

Why it is separated:

- Keeps transport concerns (JSON, redirects, status codes) out of domain and storage packages.
- Uses interface-based injection so handlers depend on behavior, not concrete types.

### `sqlite`

- Opens the database and applies schema (`Dial`).
- Provides a test DB helper (`DialTestDB`).
- Implements storage behavior (`Shorten`, `Resolve`) against SQL.
- Translates DB errors (for example, primary key violations) into domain-level errors.

Why it is separated:

- Isolates SQL and driver details from the rest of the program.
- Allows swapping storage implementation without changing handlers.

### `kit/hio`

- Provides small HTTP helpers:
  - Handler chaining pattern
  - JSON decode helper
  - generic responder helpers for JSON, text, redirect, and error flow

Why it is separated:

- Avoids repeating common HTTP response and decode code in every handler.

### `kit/hlog`

- Logs HTTP request method, path, duration, and status.
- Wraps handlers to capture response metadata.

Why it is separated:

- Keeps logging concerns out of handler business logic.

### `kit/traceid`

- Generates and stores request trace IDs in context.
- Injects trace IDs through middleware.
- Adds trace IDs to `slog` records with a custom handler wrapper.

Why it is separated:

- Gives end-to-end request correlation without coupling to application logic.

## How the program works at runtime

1. `main` parses configuration flags and creates a base logger.
2. `run` opens SQLite (`sqlite.Dial`) and applies the schema.
3. `run` creates a storage adapter (`sqlite.NewShortener`).
4. `run` builds the route table in `http.ServeMux`.
5. Middleware stack wraps the mux:
   - Request logging (`hlog.Middleware`)
   - Trace ID injection (`traceid.Middleware`)
6. Server starts with timeouts configured.

Request flow for `POST /shorten`:

1. REST handler decodes request JSON into `link.Link`.
2. Handler calls `Shorten(ctx, link.Link)` on the injected dependency.
3. Storage adapter calls domain `link.Shorten` to generate/validate key.
4. Adapter persists data and translates DB errors to domain errors.
5. Handler maps domain errors to HTTP status or returns success JSON.

Request flow for `GET /r/{key}`:

1. REST handler reads `{key}` and calls `Resolve(ctx, key)`.
2. Adapter validates key and loads destination URL.
3. Handler returns HTTP redirect when found.

## Why these architectural decisions were likely made

### Keep domain rules in one place

Using `link.Shorten` and validation in one package ensures both in-memory and SQLite paths enforce the same rules. This reduces behavioral drift between adapters.

### Depend on small interfaces at the edge

`rest` defines tiny interfaces instead of importing storage types directly. This makes delivery code easier to test and replace.

### Use sentinel errors plus wrapping

The code wraps low-level errors and preserves typed sentinel errors. This allows one centralized HTTP mapping while still retaining context in logs.

### Isolate cross-cutting concerns

Trace IDs and request logs are middleware/utilities, not mixed into handlers. This keeps handlers focused on request-to-use-case logic.

### Provide two adapters early

Having both in-memory and SQLite implementations encourages boundary clarity and makes local testing easier.

## Practical tradeoffs in this design

- Simple package count and low ceremony, good for small services.
- Domain plus in-memory adapter in one package improves speed of development but weakens strict layer purity.
- Custom helper abstractions (`hio.Handler`, responder) reduce boilerplate but may add learning overhead for new contributors.
- Error taxonomy is effective, but requires discipline to wrap errors consistently.

## Current gaps to address if you reuse this model

- In `rest.Resolve`, the error handler is built but not returned when resolve fails.
- In `rest.Shorten`, request size limiting is called after decode, so it is not enforcing limits during read.
- REST tests are minimal compared to adapter tests.

Treat these as implementation fixes, not architecture flaws.

## How to use this as a model for future projects

### Recommended template

- `cmd/<app>`: composition root only.
- `<domain>` package: entities, rules, validation, domain errors.
- `rest` or `httpapi`: transport handlers and error mapping.
- `<adapter>` packages (`sqlite`, `postgres`, `memory`): storage integrations.
- `kit/*`: reusable middleware and infrastructure helpers.

### Dependency direction

Use this dependency flow:

- `cmd` -> `rest`, `adapter`, `kit`, `domain`
- `rest` -> `domain` (and local interfaces)
- `adapter` -> `domain`
- `domain` -> standard library only

Avoid reverse dependencies (for example, do not import `rest` from `domain`).

### Test strategy

- Domain tests: pure unit tests for rules and validation.
- Adapter tests: behavior tests against a real test DB.
- REST tests: request/response and error mapping via `httptest`.
- End-to-end smoke tests: optional for route wiring and middleware.

### Operational defaults

- Centralized structured logging.
- Request trace IDs in context and logs.
- Timeouts at the server level.
- Consistent error mapping at transport boundary.

## When to choose a different architecture

Use a heavier architecture only when needed, for example:

- Multiple domains with complex orchestration.
- Several external systems and asynchronous workflows.
- Strict plugin or module boundaries.

For small to medium APIs, this project’s style is a good default because it is easy to understand, test, and evolve.


## Implementation checklist

Use this checklist when starting a new project with this architecture.

- [ ] Define the core domain model, invariants, and validation rules.
- [ ] Create a domain error taxonomy (for example bad request, conflict, not found, internal).
- [ ] Implement domain logic without transport or storage dependencies.
- [ ] Create the composition root in `cmd/<app>` for config, wiring, and startup.
- [ ] Define transport-layer interfaces that describe required behavior, not concrete storage types.
- [ ] Implement HTTP handlers that decode input, call interfaces, and map domain errors to HTTP status codes.
- [ ] Add health and readiness endpoints for operations.
- [ ] Implement at least one persistent adapter (for example SQL) that translates backend errors to domain errors.
- [ ] Add an in-memory adapter or fake implementation for local development and tests.
- [ ] Keep cross-cutting concerns in separate packages (logging, tracing, request/response helpers, middleware).
- [ ] Apply middleware in one place in the composition root.
- [ ] Configure server timeouts and context-aware operations.
- [ ] Add schema creation and migration strategy for persistent stores.
- [ ] Write tests by layer: domain unit tests, adapter behavior tests, handler tests, and optional end-to-end smoke tests.
- [ ] Add basic observability: structured logs, request correlation IDs, and key metrics.
- [ ] Verify dependency direction stays one-way (entrypoint -> transport/adapters -> domain).
- [ ] Document package responsibilities and extension points for future contributors.

## MVP checklist

Use this shorter checklist when you want the smallest production-ready slice.

- [ ] Define one core domain type, validation rules, and 2-4 domain errors.
- [ ] Implement domain logic in a package with no transport or storage imports.
- [ ] Create `cmd/<app>` that loads config, wires dependencies, and starts `http.Server`.
- [ ] Add one transport package with one write endpoint, one read endpoint, and one health endpoint.
- [ ] Define small transport interfaces and inject an adapter implementation.
- [ ] Implement one persistent adapter (for example SQLite or Postgres) and map backend errors to domain errors.
- [ ] Add one in-memory or fake adapter for fast local tests.
- [ ] Add middleware for structured request logs and request correlation ID.
- [ ] Configure server timeouts and use context-aware operations (`*Context` methods).
- [ ] Write minimum tests: domain validation, one adapter behavior test, and one HTTP handler test per endpoint.