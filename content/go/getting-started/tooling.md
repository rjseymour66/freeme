+++
title = 'Tooling'
date = '2025-08-12T23:44:57-04:00'
weight = 20
draft = false
+++

Alex Edwards [An Overview of Go's tooling](https://www.alexedwards.net/blog/an-overview-of-go-tooling).

## Dependencies and maintenance

### go mod

Go modules (`go mod`) is a built-in package and dependency manager. This makes Go's dependency management and compiler very efficient.

Start projects with `go mod init`. If you have `$GOPATH` set, you have two options:
- Create a project in your `$GOPATH/src` directory.
- Create a project in any directory by providing a module path. The module path is usually the URL to a GitHub repo, but you can provide any path for local-only work.

```bash
go mod init [module/path]
go mod init github.com/username/repo-name   # GH repo
go mod init my-project name                 # local-only
```

This creates the `go.mod` file at your project root. `go.mod` includes the module name, Go version used to write the project, and third-party dependencies that you can fetch with `go get`.

### go mod tidy

Run `go mod tidy` if you change any project dependencies listed in `go.mod`, such as the Go target version or a package. This command will clean up the dependency tree and the `go.mod` file.

```bash
go mod tidy
```

### go get

```bash
go get github.com/entire/module/path
go get -u github.com/entire/module/path         # upgrade to latest minor version or patch
go get -u github.com/entire/module/path@v2.0.0  # upgrade to specific version
go get github.com/entire/module/path@none       # remove unused package (same as 'go mod tidy -v')
```
### go fmt

```bash
gofmt -w <file>.go    // formats <file>.go
gofmt -l dirname/*.go // lists files in dir that do not conform to go formatting 
```

### goimports

Formats and manages dependency tree:

```bash
goimports
```
## Executables

### go run

`go run` compiles the application into a temp directory and executes it immediately. After the program runs, the file is cleaned up:

```bash
go run .                    // runs binary in cwd
go run <binary-name>
go run ./cmd/web            // runs proj-root/cmd/web/main.go
```

### go build

```bash
go build                    // uses module name for binary name
go build -o <binary-name>   // provide binary name
```

## Testing

### go test

```bash
go test -v                  // verbose output
go test -v ./<dirname>/     // run tests in a specific directory
go test -v ./cmd/
```

### go test -cover

```bash
go test -cover
```

