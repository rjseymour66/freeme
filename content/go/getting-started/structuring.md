+++
title = 'Structuring packages and services'
date = '2026-03-03T21:31:48-05:00'
weight = 30
draft = false
+++

For a good overview, read [Organizing a Go module](https://go.dev/doc/modules/layout).

Good packages should be viewed as domain experts that export specialized services. Organize packages as layers, where higher-level packages can import those below them:
- Lower-level packages are general.
- Higher-level packages are more specialized.

This structure prevents import cycles, where two packages import each other.

## Steps

1. Declare common errors
2. Declare core types

## internal/

`internal/` is a special directory that restricts package imports. In the following package structure, any package below `core` can import packages from `internal` because they share the same root directory (`core`). For example, `cmd/cored` can import `internal/rest`. `stats` cannot import anything from `internal` because it does not share the same parent directory.

```bash
svc
├── core
│   ├── cmd
│   │   └── cored
│   └── internal
│       ├── rest
│       └── sqlite
└── stats
```

This enforces encapsulation because it makes clear that certain packages aren't part of a module's API, so there is less risk that changes within `internal` can introduce breaking changes.