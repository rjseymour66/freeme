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

### go get

Downloads package dependencies into your project. If you already have a package in your project but want to upgrade versions, use the `-u <path>` option.

After you run `go get`, you should always run `go mod tidy` to update your project's dependency graph:

```bash
go get github.com/entire/module/path
go get -u github.com/entire/module/path         # upgrade to latest minor version or patch
go get -u github.com/entire/module/path@v2.0.0  # upgrade to specific version
go get github.com/entire/module/path@none       # remove unused package (same as 'go mod tidy -v')
```

### Finding available versions

Use `git ls-remote` to retrieve the versions or branches of a repo:
1. `-t` returns the repo tags, or versions.
2. `-h` returns the heads, which are the tips of branches:.

```bash
git ls-remote -t https://github.com/gorilla/mux.git                             # 1
0eeaf8392f5b04950925b8a69fe70f110fa7cbfc	refs/tags/v1.1
b12896167c61cb7a17ee5f15c2ba0729d78793db	refs/tags/v1.2.0
392c28fe23e1c45ddba891b0320b3b5df220beea	refs/tags/v1.3.0
...

git ls-remote -h https://github.com/gorilla/mux.git                             # 2
d033abe4a66f2728c35886278148b0e38e7dbe4f	refs/heads/coreydaley-patch-1
ac856fa44dac3d5bdac2160d53f6bbec042fa3a3	refs/heads/coreydaley-patch-2
db9d1d0073d27a0a2d9a8c1bc52aa0af4374d265	refs/heads/main
b4617d0b9670ad14039b2739167fd35a60f557c5	refs/heads/release-1.8
```

### go mod tidy

Run `go mod tidy` if you change any project dependencies listed in `go.mod`, such as the Go target version or a package. This command will clean up the dependency tree and the `go.mod` file.

```bash
go mod tidy
```

### go fmt

Formats your source files with Go's built-in style rules:

```bash
gofmt -w <file>.go    // formats <file>.go
gofmt -l dirname/*.go // lists files in dir that do not conform to go formatting 
```

### goimports

Formats and manages dependency tree. It is an advanced version of `go fmt` that adds or removes dependencies to your project. VSCode uses `goimports` when you enable **format-on-save**.

```bash
goimports
```

### go vet

Analyzes your code to find mistakes or inefficiencies. This might return false positives, so it is not necessary to run in every commit:

```bash
go vet program.go
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

