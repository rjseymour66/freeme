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

## The HTTP server and handlers

### Configuring the server

`run` builds an `http.Server` directly rather than calling `http.ListenAndServe`. This matters because it lets you set timeouts.

```go
srv := &http.Server{
    Handler:     traceid.Middleware(loggerMiddleware(mux)),
    Addr:        cfg.http.addr,
    ReadTimeout: cfg.http.timeouts.read,
    IdleTimeout: cfg.http.timeouts.idle,
}
```

Without `ReadTimeout`, a slow or malicious client can hold a connection open indefinitely. Without `IdleTimeout`, keep-alive connections linger. Both timeouts default to zero in Go, which means no limit—always set them.

`ListenAndServe` returns `http.ErrServerClosed` on a graceful shutdown. The code checks for that explicitly:

```go
if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
    return fmt.Errorf("server closed unexpectedly: %w", err)
}
```

This lets you distinguish a clean stop from an actual failure.

### Registering routes

Go 1.22 added method+path patterns to `http.ServeMux`. You can match on HTTP method and capture path segments without a third-party router:

```go
mux.Handle("POST /shorten", rest.Shorten(lg, shortener))
mux.Handle("GET /r/{key}",  rest.Resolve(lg, shortener))
mux.HandleFunc("/health",   rest.Health)
```

`{key}` is a named path segment. Handlers retrieve it with `r.PathValue("key")`. For most CRUD APIs, the standard library router is sufficient.

`/health` omits a method prefix, so it matches any method. That's intentional—health checks should respond to whatever the load balancer sends.

### Handler constructors

Handlers in `rest` are constructor functions, not plain `http.HandlerFunc` values. Each constructor accepts its dependencies and returns an `http.Handler`:

```go
func Shorten(lg *slog.Logger, links Shortener) http.Handler {
    with := newResponder(lg)
    return hio.Handler(func(w http.ResponseWriter, r *http.Request) hio.Handler {
        // ...
    })
}
```

This pattern keeps handlers testable. You call `rest.Shorten(lg, fakeStore)` in a test with whatever dependencies you need. No global state, no `init` functions.

Notice that `Shortener` is an interface defined inside the `rest` package—not the concrete `*sqlite.Shortener` type. This is the key decision: the handler depends on the behavior it needs, not on where the data comes from. You can swap SQLite for Postgres, or a real database for a test fake, without touching handler code.

### The `hio.Handler` type

The most distinctive pattern in this codebase is the `hio.Handler` type:

```go
type Handler func(w http.ResponseWriter, r *http.Request) Handler

func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    next := h(w, r)
    if next != nil {
        next.ServeHTTP(w, r)
    }
}
```

A `Handler` is a function that returns a `Handler`. When `ServeHTTP` is called, it runs the function, gets back the next step, and calls that step too.

This makes response dispatch explicit. Instead of writing to `w` and returning, a handler returns a `Handler` that describes what should happen next:

```go
return hio.Handler(func(w http.ResponseWriter, r *http.Request) hio.Handler {
    var lnk link.Link
    err := hio.DecodeJSON(r.Body, &lnk)
    if err != nil {
        return with.Error("decoding: %w: %w", err, link.ErrBadRequest)
    }
    key, err := links.Shorten(r.Context(), lnk)
    if err != nil {
        return with.Error("shortening: %w", err)
    }
    return with.JSON(http.StatusCreated, map[string]link.Key{"key": key})
})
```

Each early return hands off to a specific response handler rather than writing directly to `w`. This separates the decision ("what should happen") from the execution ("write the bytes"). It also ensures only one path writes a response—no accidental double-writes.

### The `Responder` type

`hio.Responder` centralizes response formatting:

```go
type Responder struct {
    err func(error) Handler
}
```

The error handler is injected at construction time. This lets the caller decide how errors map to HTTP responses without baking that logic into the response utilities. In `rest`, `newResponder` supplies an error function that calls `httpError`, which maps domain errors to status codes:

```go
func httpError(w http.ResponseWriter, r *http.Request, lg *slog.Logger, err error) {
    code := http.StatusInternalServerError
    switch {
    case errors.Is(err, link.ErrBadRequest): code = http.StatusBadRequest
    case errors.Is(err, link.ErrConflict):   code = http.StatusConflict
    case errors.Is(err, link.ErrNotFound):   code = http.StatusNotFound
    }
    if code == http.StatusInternalServerError {
        lg.ErrorContext(r.Context(), "internal", "error", err)
        err = link.ErrInternal  // hide internal details from the client
    }
    http.Error(w, err.Error(), code)
}
```

All error translation lives here. When you add a new domain error, you add one `case`. Handlers never inspect error types themselves.

### Middleware

Middleware in `hlog` follows the standard Go pattern: a function that wraps an `http.Handler` and returns an `http.Handler`.

```go
type MiddlewareFunc func(http.Handler) http.Handler
```

Using a named type makes the intent explicit and prevents accidentally passing any `func(http.Handler) http.Handler` where only logging middleware belongs.

The middleware stack wraps from outside in:

```go
srv := &http.Server{
    Handler: traceid.Middleware(loggerMiddleware(mux)),
}
```

A request flows through `traceid.Middleware` first, then `loggerMiddleware`, then into the mux. The outermost middleware runs first on the way in and last on the way out. Order matters: the trace ID must be in context before the logger reads it.

`hlog.Middleware` uses `RecordResponse` to capture the status code and duration before logging:

```go
func Middleware(lg *slog.Logger) MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            rr := RecordResponse(next, w, r)
            lg.LogAttrs(r.Context(), slog.LevelInfo, "request",
                slog.Any("path", r.URL),
                slog.String("method", r.Method),
                slog.Duration("duration", rr.Duration),
                slog.Int("status", rr.StatusCode))
        })
    }
}
```

The logger logs after the handler completes, so it can include both duration and status code in a single log line. This is more useful than logging on arrival.

### Capturing the status code

`http.ResponseWriter` has no method to read the status code after it's written. `hlog` solves this with an interceptor:

```go
type Interceptor struct {
    http.ResponseWriter
    OnWriteHeader func(code int)
}

func (ic *Interceptor) WriteHeader(code int) {
    if ic.OnWriteHeader != nil {
        ic.OnWriteHeader(code)
    }
    ic.ResponseWriter.WriteHeader(code)
}
```

The interceptor embeds `http.ResponseWriter` so it satisfies the interface. It overrides only `WriteHeader`, storing the code via a callback before delegating. The handler under test never knows the interceptor is there.

This pattern—embed the interface, override the methods you need—is a standard Go technique for wrapping types you don't own.

### Trace IDs in context

`traceid.Middleware` attaches a unique ID to each request's context before any handler sees it:

```go
func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if _, ok := FromContext(r.Context()); !ok {
            ctx := WithContext(r.Context(), New())
            r = r.WithContext(ctx)
        }
        next.ServeHTTP(w, r)
    })
}
```

The check prevents overwriting an ID that's already present—useful in tests where you supply a known ID. The ID propagates automatically to all log calls that pass `r.Context()`, since `traceid.NewLogHandler` injects it into every `slog` record.

This is idiomatic context use: attach request-scoped values at the boundary, read them deeper in the stack, never pass them as function arguments.

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