+++
title = 'SQL'
date = '2026-03-20T21:47:23-04:00'
weight = 10
draft = false
+++



## SQL databases 

Go has two packages to interact with a SQL db:
- `database/sql`: API to interact with a various dbs
- `database/sql/driver`: Defines behaviors that db drivers must implement


## Registering a driver

### Download the driver

```bash
go get modernc.org/sqlite@latest        # most recent stable release
go get modernc.org/sqlite@v1.38.0       # specific version
go get github.com/mattn/go-sqlite3      # requires C bindings (CGO_ENABLED=1 go build)
```

### Import the driver

Use the blank import to tell the compiler that you won't use the driver package name `sqlite` in this file:

```go
// project/sqlite/sqlite.go
package sqlite

import (
	_ "modernc.org/sqlite"
)
```

If you don't use the blank import, you get an "imported and not used" error. This is because Go executes any `init` function in the package upon import, and all drivers have an `init` function.

After you import the driver, `go.mod` lists the driver dependency as an indirect dependency. Clean up the dependency tree:

```go
go mod tidy
```


### Open a connection pool

```go
func Dial(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening: %w", err)
	}
	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("pinging: %w", err)
	}
	return db, nil
}
```

`Open` returns a `*sql.DB` handle to interact with the database. It takes the following arguments:
- Driver name
- Driver-specific connection string

```go
db, err := sql.Open("sqlite", "file:links.db")
db, err := sql.Open("postgres", "dbname=links sslmode=disable")
```

The `*DB` returned manages a connection pool, including connecting, reconnecting, closing connections, etc.


#### Optimizing the connection pool

- `SetMaxOpenConns`: Maximum number of active connections.
- `SetMaxIdleConns`: Maximum number of dile connections.
- `SetConnMaxLifetime`: 
- `SetConnMaxIdleTime`: 


## File embedding

File embedding lets you include the file's content in a variable and the final compiled binary:
1. Import the `embed` package with a blank import
2. Add the embed directive to tell the compiler to embed the `schema.sql` file in the `schema` variable.
3. Create the schema on the database with `DB.ExecContext`. This function grabs a connection from the pool, executes the query, then returns the connection to the pool.

```go
import (
	_ "embed"                                                           // 1
    ...
	_ "modernc.org/sqlite"
)

//go:embed schema.sql                                                   // 2
var schema string

func Dial(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening: %w", err)
	}
	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("pinging: %w", err)
	}
	if _, err := db.ExecContext(ctx, schema); err != nil {              // 3
		return nil, fmt.Errorf("applying schema: %w", err)
	}
	return db, nil
}
```


### Migrations

File embedding runs the schema when we connect to the database. To run the schema once, use a migration.

## Service connection

This service connects to the database and calls a link shortening package to save the `link` type to the database:
- `ExecContext` inserts a link into the database

```go
type Shortener struct {
	db *sql.DB
}

func NewShortener(db *sql.DB) *Shortener {
	return &Shortener{db: db}
}

func (s *Shortener) Shorten(ctx context.Context, lnk link.Link) (link.Key, error) {
	var err error
	if lnk.Key, err = link.Shorten(lnk); err != nil {
		return "", fmt.Errorf("%w: %w", err, link.ErrBadRequest)
	}

	// Persist the link in the db
	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO links (short_key, uri) VALUES ($1, $2)`,
		lnk.Key, lnk.URL,
	)
	if isPrimaryKeyViolation(err) {
		return "", fmt.Errorf("saving: %w", link.ErrConflict)
	}
	if err != nil {
		return "", fmt.Errorf("saving: %w: %w", err, link.ErrInternal)
	}
	return lnk.Key, nil
}
```

This uses a helper function in `sqlite/sqlite.go` to test that the primary key is valid by identifying duplicate keys or other conflicts:

```go
func isPrimaryKeyViolation(err error) bool {
	var serr *sqlite.Error
	if errors.As(err, &serr) {
		return serr.Code() == 1555
	}
	return false
}
```

## Test database

This tests that you are correctly connecting to the database. It creates a unique database for each test:

```go
func DialTestDB(tb testing.TB) *sql.DB {
	tb.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", tb.Name())
	db, err := Dial(tb.Context(), dsn)
	if err != nil {
		tb.Fatalf("DialTestDB: %v", err)
	}
	tb.Cleanup(func() {
		if err := db.Close(); err != nil {
			tb.Logf("DialTestDB: closing: %v", err)
		}
	})

	return db
}
```

### Integration testing

This tests whether the `Shotener` function properly calls the `link` package to shorten and persist a link:

```go
func TestShortenerShorten(t *testing.T) {
	t.Parallel()

	lnk := link.Link{
		Key: "foo",
		URL: "https://new.link",
	}

	shortener := NewShortener(DialTestDB(t))

	// Shortens a link
	key, err := shortener.Shorten(t.Context(), lnk)
	if err != nil {
		t.Fatalf("got err = %v, want nil", err)
	}
	if key != "foo" {
		t.Errorf(`got key %q, want "foo"`, key)
	}

	// Disallows shortening a link with a duplicate key
	_, err = shortener.Shorten(t.Context(), lnk)
	if !errors.Is(err, link.ErrConflict) {
		t.Fatalf("\ngot err = %v\nwant ErrConflict for duplicate key", err)
	}
}
```

## Retrieve a single row

This function checks whether the shortened keyis valid and then queries the `links` table for a key to get the original URL.
- Use QueryRowContext and Scan to fetch a value from the database

```go
func (s *Shortener) Resolve(ctx context.Context, key link.Key) (link.Link, error) {
	if key.Empty() {
		return link.Link{}, fmt.Errorf("validating: empty key: %w", link.ErrBadRequest)
	}
	if err := key.Validate(); err != nil {
		return link.Link{}, fmt.Errorf("validating: %w: %w", err, link.ErrBadRequest)
	}

	// Retrieve the link from the db
	var uri string
	err := s.db.QueryRowContext(ctx, `SELECT uri FROM links WHERE short_key = $1`, key).Scan(&uri)

	if errors.Is(err, sql.ErrNoRows) {
		return link.Link{}, link.ErrNotFound
	}

	if err != nil {
		return link.Link{}, fmt.Errorf("retrieving: %w: %w", err, link.ErrInternal)
	}

	return link.Link{Key: key, URL: uri}, err
}
```


## Valuer and Scanner

These interfaces enable database-specific features without breaking the abstraction provided by the `sql` package.

- `Valuer` can transform values before sending them to a db
- `Scanner` can transform values retrieved from a db

For example, Postgres has an array type that stores an array as binary data in a single db column. Go's `sql` package doesn't natively support that, so the `pql` driver implements `Value` and `Scanner` in its `pq.Array` type.

For example:

```go
var scores []int
db.QueryRowContext(..., `SELECT ARRAY[42, 84]`).Scan(pq.Array(&scores))

_, err := db.ExecContext(..., `INSERT INTO results(scores) VALUES($1)`, pq.Array(scores))
```

This example uses the `Valuer` and `Scanner` interfaces to endcode URLs in Base64 before saving, and then decode them after retrieving.
- Declare a new type that satisfies `Valuer` and `Scanner`

```go
type base64String string

func (bs base64String) Value() (driver.Value, error) {
	return base64.StdEncoding.EncodeToString([]byte(bs)), nil
}

func (bs *base64String) Scan(src any) error {
	ss, ok := src.(string)
	if !ok {
		return fmt.Errorf("decoding: %q is %T, not string", ss, src)
	}
	dst, err := base64.StdEncoding.DecodeString(ss)
	if err != nil {
		return fmt.Errorf("decoding %q: %w", ss, err)
	}
	*bs = base64String(dst)
	return nil
}

func (bs base64String) String() string {
	return string(bs)
}
```

Integrate this into your database service methods when you insert and retrieve values:

```go
func (s *Shortener) Shorten(ctx context.Context, lnk link.Link) (link.Key, error) {
	//...
	
	// Persist the link in the db
	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO links (short_key, uri) VALUES ($1, $2)`,
		lnk.Key, base64String(lnk.URL),
	)
	
	//..
	
	return lnk.Key, nil
}
```

This declares the `uri` type as the `base64String` type, and uses its `String` method in the return statement:

```go
func (s *Shortener) Resolve(ctx context.Context, key link.Key) (link.Link, error) {
	//.. 

	// Retrieve the link from the db
	var uri base64String
	err := s.db.QueryRowContext(ctx, `SELECT uri FROM links WHERE short_key = $1`, key).Scan(&uri)
	
	//...
	
	return link.Link{
		Key: key,
		URL: uri.String(),
	}, err
}
```

## Service interface

```go
type Shortener interface {
	Shorten(context.Context, link.Link) (link.Key, error)
}

// Shorten handles HTTP requests to create a shortened link.
func Shorten(lg *slog.Logger, links Shortener) http.Handler {
	with := newResponder(lg)

	return hio.Handler(func(w http.ResponseWriter, r *http.Request) hio.Handler {
		var lnk link.Link
		err := hio.DecodeJSON(r.Body, &lnk)
		hio.MaxBytesReader(w, r.Body, 4_096)
		if err != nil {
			return with.Error("decoding: %w: %w", err, link.ErrBadRequest)
		}
		key, err := links.Shorten(r.Context(), lnk)
		if err != nil {
			return with.Error("shortening: %w ", err)
		}

		return with.JSON(http.StatusCreated, map[string]link.Key{
			"key": key,
		})
	})
}

type Resolver interface {
	Resolve(context.Context, link.Key) (link.Link, error)
}

// Resolve handles HTTP requests to redirect from a key to its full URL.
func Resolve(lg *slog.Logger, links Resolver) http.Handler {
	with := newResponder(lg)

	return hio.Handler(func(w http.ResponseWriter, r *http.Request) hio.Handler {
		lnk, err := links.Resolve(r.Context(), link.Key(r.PathValue("key")))
		if err != nil {
			with.Error("resloving: %w", err)
		}
		return with.Redirect(http.StatusFound, lnk.URL)
	})
}
```

## Wire the db into main

```go
// config holds application configuration and logger dependencies.
type config struct {
	http struct {
		addr     string
		timeouts struct{ read, idle time.Duration }
	}
	lg *slog.Logger
	db struct{ dsn string }
}
```

```go
func main() {
	var cfg config

	// ...

	flag.StringVar(&cfg.db.dsn, "db.dsn", "file:linksdb?mode=rwc", "database DSN")

	// ...
}

// run configures and starts the HTTP server using the provided configuration.
func run(ctx context.Context, cfg config) error {
	db, err := sqlite.Dial(ctx, cfg.db.dsn)
	if err != nil {
		return fmt.Errorf("dialing database: %w", err)
	}
	shortener := sqlite.NewShortener(db)

	lg := slog.New(traceid.NewLogHandler(cfg.lg.Handler()))

	// ...
}
```