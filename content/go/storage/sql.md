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
	if err != nil {
		return "", fmt.Errorf("saving: %w: %w", err, link.ErrInternal)
	}
	return lnk.Key, nil
}
```

## Test database




















### `Open`

`Open` returns a `*sql.DB` handle to interact with the database. It takes the following arguments:
- Driver name
- Driver-specific connection string

```go
db, err := sql.Open("sqlite", "file:links.db")
db, err := sql.Open("postgres", "dbname=links sslmode=disable")
```

The `*DB` returned manages a connection pool, including connecting, reconnecting, closing connections, etc.


