+++
title = 'Setting up a production-ready Go application'
linkTitle = 'Project setup'
date = '2026-03-28T00:00:00-04:00'
weight = 35
draft = false
+++

Before you write your first line of Go, you need to understand the problem you're solving. Production-ready applications start with a clear problem statement, a domain model that captures the rules of that problem, and the observability infrastructure to understand what the system is doing at runtime.

This page walks through those steps using [link](https://github.com/example/link), a URL shortener service, as a concrete example.

## Define the requirements

Requirements answer three questions: what does the system do, what are the rules, and what does failure look like?

For the link service, requirements break into three areas:

**Operations**
- A client submits a long URL and receives a short key.
- A client submits a key and is redirected to the original URL.
- The system exposes a health check endpoint.

**Rules**
- Keys must not exceed 16 characters.
- A URL must have a valid scheme (`http` or `https`) and a non-empty host.
- If the client does not supply a key, the system generates one from the URL.
- Duplicate keys must be rejected.

**Failure modes**
- Invalid input → return a bad request error.
- Duplicate key → return a conflict error.
- Missing key → return a not found error.
- Unexpected error → log the full error, return a generic message to the client.

Writing these down before you write any code keeps your domain model honest. Each rule becomes a validation. Each failure mode becomes a sentinel error.

## Plan the package structure

Once you've written your requirements, identify your packages before you write any code. A package is a unit of responsibility—each package should do one thing, and nothing outside that package should need to know how it does it.

Use your requirements to answer four questions:

1. **What are the core entities and rules?** These belong in your domain package.
2. **How do clients interact with the system?** These are your transport packages.
3. **Where does data live?** These are your storage adapter packages.
4. **What cuts across all requests?** These are your utility packages.

For the link service, the answers look like this:

| Question | Answer | Package |
|---|---|---|
| Core entities and rules | `Link`, `Key`, key generation, validation, errors | `link` |
| Client interaction | HTTP: shorten, resolve, health | `rest` |
| Data storage | SQLite | `sqlite` |
| Cross-cutting concerns | Request logging, trace IDs, HTTP helpers | `kit/*` |
| Startup and wiring | Config, dependency setup, server start | `cmd/linkd` |

Once you have this table, draw the dependency arrows. Each package should depend only on packages below it:

```
cmd/linkd → rest, sqlite, kit/*
rest      → link (domain)
sqlite    → link (domain)
link      → standard library only
kit/*     → standard library only
```

This direction is not optional—it's what keeps your business rules free of infrastructure. If you find yourself importing `rest` from `sqlite`, you've created a cycle. Go will refuse to compile it.

### Define interfaces at package boundaries

Interfaces belong in the package that consumes them, not the package that implements them. Your `rest` package doesn't import `sqlite`—it defines its own small interfaces that describe the behavior it needs:

```go
// rest/shortener.go

type Shortener interface {
    Shorten(context.Context, link.Link) (link.Key, error)
}

type Resolver interface {
    Resolve(context.Context, link.Key) (link.Link, error)
}
```

`*sqlite.Shortener` satisfies both interfaces without knowing they exist. This is Go's implicit interface satisfaction: you wire them together in `cmd/linkd`, where both sides are visible.

Define interfaces this way: one method or two, focused on what the consumer needs. Avoid large interfaces—they're hard to implement in tests and couple packages too tightly.

## Choose your implementation order

Build in this order: domain first, then adapters, then transport, then wiring. Each layer depends only on what came before it.

**1. Domain layer**

Write types, validation, and errors. This layer has no imports outside the standard library, so you can test it immediately with no setup.

**2. Storage adapter**

Implement the persistence layer against your domain types. Use `DialTestDB` or an equivalent to run adapter tests against a real database—not mocks.

**3. Transport layer**

Write HTTP handlers that call the interfaces you defined. Test them with `net/http/httptest` against fake implementations of those interfaces.

**4. Composition root**

Wire dependencies together in `cmd/<app>`. This is the only place that imports from all layers. If your wiring code grows large, that's a signal that dependencies are too tangled—not that `main` needs more functions.

This order is not arbitrary. Starting with the domain means you validate your data model before you've committed to any infrastructure. If validation turns out to need more fields or different constraints, you change one package—not three.

## Model the domain

The domain layer defines your core types, validates the rules you identified, and declares your error taxonomy. It has no dependencies on HTTP, databases, or any other infrastructure.

### Define core types

Start with the entities your system works with. In the link service, there are two: a URL and its short key.

```go
// link.go

type Link struct {
    URL string
    Key Key
}

type Key string
```

Keep types small. A `Key` is not just a `string`—it has its own validation rules and deserves its own type.

### Implement validation

Each type validates itself. Attach a `Validate` method that enforces the rules you defined in your requirements.

```go
func (k Key) Validate() error {
    if len(k) > 16 { // 1
        return errors.New("key exceeds 16 characters")
    }
    return nil
}

func (lnk Link) Validate() error {
    if err := lnk.Key.Validate(); err != nil { // 2
        return fmt.Errorf("key: %w", err)
    }
    u, err := url.ParseRequestURI(lnk.URL)
    if err != nil {
        return err
    }
    if u.Host == "" {
        return errors.New("empty host")
    }
    if u.Scheme != "http" && u.Scheme != "https" {
        return errors.New("scheme must be http or https")
    }
    return nil
}
```

1. The `Key` type enforces its own constraint, independent of `Link`.
2. `Link.Validate` delegates to `Key.Validate`, then checks its own fields. Errors are wrapped with context so callers can tell which field failed.

### Declare sentinel errors

Define your failure modes as package-level error values. Other packages use `errors.Is` to check for them, and your transport layer maps them to HTTP status codes.

```go
// error.go

var (
    ErrBadRequest = errors.New("bad request")
    ErrConflict   = errors.New("conflict")
    ErrNotFound   = errors.New("not found")
    ErrInternal   = errors.New("internal error")
)
```

Keeping these in the domain package means both your storage adapters and your HTTP handlers share the same error vocabulary. The storage layer wraps them with context; the transport layer unwraps them with `errors.Is`.

### Implement domain logic

If the client doesn't supply a key, generate one. The link service hashes the URL with SHA256, takes the first six bytes, and encodes them as base64url—producing a deterministic, ~8-character key.

```go
func Shorten(lnk Link) (Link, error) {
    if lnk.Key.Empty() {
        h := sha256.Sum256([]byte(lnk.URL))
        lnk.Key = Key(base64.URLEncoding.EncodeToString(h[:6]))
    }
    if err := lnk.Validate(); err != nil {
        return Link{}, err
    }
    return lnk, nil
}
```

This function lives in the domain package. It doesn't know whether the caller is an HTTP handler or a CLI tool—it just applies the rule.

## Set up structured logging

Use `log/slog` (available since Go 1.21) for structured, leveled logging. Structured logs emit key-value pairs instead of unformatted text, which makes them searchable and parseable by log aggregation tools.

### Create a logger in main

Initialize the logger in your entry point and pass it as a dependency—never use a global logger.

```go
// cmd/linkd/linkd.go

lg := slog.New(slog.NewTextHandler(os.Stderr, nil)).With("app", "linkd") // 1
lg.Info("starting", "addr", cfg.http.addr)
```

1. `.With("app", "linkd")` attaches a static field to every log record produced by this logger. Use this for fields that never change across the lifetime of the process—application name, version, environment.

For production, swap `NewTextHandler` for `NewJSONHandler` to emit machine-readable JSON.

### Inject the logger

Pass the logger to any component that needs it. Don't embed it in structs unless necessary—for HTTP handlers, a closure over the logger is enough.

```go
mux.Handle("POST /shorten", rest.Shorten(lg, shortener))
mux.Handle("GET /r/{key}", rest.Resolve(lg, shortener))
```

Each handler logs errors through its own `lg`. Because the logger was created with `.With("app", "linkd")`, every log record from every handler carries that field automatically.

### Use context in log calls

Prefer `LogAttrs` with `r.Context()` over `Info` when you're inside an HTTP handler. This becomes important once you add context-aware log enrichment.

```go
lg.LogAttrs(r.Context(), slog.LevelError, "internal error", slog.Any("error", err))
```

The context argument lets the logger pull request-scoped values—like a trace ID—and add them to the record automatically.

## Propagate context

Context carries request-scoped values—trace IDs, auth principals, deadlines—across package boundaries without changing function signatures. Every function that does I/O should accept a `context.Context` as its first argument.

### Store values in context

Use an unexported struct type as the context key. This prevents key collisions with other packages.

```go
// kit/traceid/traceid.go

type traceIDContextKey struct{} // 1

func WithContext(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, traceIDContextKey{}, id)
}

func FromContext(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(traceIDContextKey{}).(string)
    return id, ok
}
```

1. The unexported struct type is the key. Other packages cannot construct this key, so they cannot accidentally overwrite or read the value.

### Inject values with middleware

Inject the trace ID at the edge of your system—in HTTP middleware—so it's available for the full lifetime of the request.

```go
// kit/traceid/http.go

func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if _, ok := FromContext(r.Context()); !ok {
            ctx := WithContext(r.Context(), New()) // 1
            r = r.WithContext(ctx)                 // 2
        }
        next.ServeHTTP(w, r)
    })
}
```

1. Generate a new ID only if one isn't already present. This lets upstream proxies inject their own IDs.
2. Replace the request's context with one that carries the trace ID. All downstream handlers receive this context when they call `r.Context()`.

### Enrich logs automatically

Write a custom `slog.Handler` that reads the trace ID from context and adds it to every log record. Wrap your base handler with it when you set up the logger in `main`.

```go
// kit/traceid/slog.go

type LogHandler struct {
    slog.Handler
}

func (h *LogHandler) Handle(ctx context.Context, r slog.Record) error {
    if id, ok := FromContext(ctx); ok {
        r = r.Clone()
        r.AddAttrs(slog.String("trace_id", id)) // 1
    }
    return h.Handler.Handle(ctx, r)
}
```

1. Clone the record before modifying it—`slog.Record` values are not safe to modify in place.

Apply it in the composition root:

```go
// cmd/linkd/linkd.go

lg := slog.New(traceid.NewLogHandler(cfg.lg.Handler())) // 1
srv.Handler = traceid.Middleware(hlog.Middleware(lg)(mux)) // 2
```

1. Wrap the base handler with the trace ID handler. Every `lg.LogAttrs(ctx, ...)` call that passes a context with a trace ID will now include `trace_id` in the output—with no changes to the individual call sites.
2. Apply `traceid.Middleware` outermost so the trace ID is in context before the logger middleware runs.

### Pass context through the call stack

Every function that performs I/O should accept and forward the context.

```go
func (s *Shortener) Shorten(ctx context.Context, lnk link.Link) (link.Key, error) {
    lnk, err := link.Shorten(lnk)
    if err != nil {
        return "", fmt.Errorf("%w: %w", err, link.ErrBadRequest)
    }
    _, err = s.db.ExecContext(ctx, insertLink, lnk.Key, base64String(lnk.URL)) // 1
    if isPrimaryKeyViolation(err) {
        return "", fmt.Errorf("saving: %w", link.ErrConflict)
    }
    if err != nil {
        return "", fmt.Errorf("saving: %w: %w", err, link.ErrInternal)
    }
    return lnk.Key, nil
}
```

1. `ExecContext` accepts the context. If the request is cancelled or times out, the database call returns immediately instead of blocking.

The context flows from the HTTP request through the handler, into the storage layer, and down to the database driver—propagating the trace ID and respecting cancellation at every level.
