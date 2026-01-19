+++
title = 'Tooling'
date = '2025-08-12T23:44:57-04:00'
weight = 20
draft = false
+++

Alex Edwards [An Overview of Go's tooling](https://www.alexedwards.net/blog/an-overview-of-go-tooling).

## Dependencies and maintenance

Go Modules enable reproducible builds by leveraging a module cache and a defined set of dependencies. It tackles the following problems common in software release:
- **Reliable versioning**: Uses semantic versioning, which lets you know the kind of changes that an update contains Semantic Versioning (SemVer) is a version numbering system that communicates compatibility. The version number tells consumers what kind of changes were made and what risk an upgrade carries.
  
  Semantic verisoning uses the following format: `MAJOR.MINOR.PATCH`:
  - `MAJOR`: When this increments, it means there are breaking changes that require code modification. Read the changelog.
  - `MINOR`: Backward-compatibile features. Can add new APIs without breaking existing ones.
  - `PATCH`: Backward-compatibile bug fixes.
- **Reproducible builds**: The Go Module proxy is a service that sits between Go and source control to download, cache, and serve Go modules. Your Go code doesn't talk directly to GitHub, it talks to the Module proxy. Dependencies are cached within the project to guarantee your code always builds.
- **Dependency bloat**: You never have unused dependencies in your project.

### go.mod and go.sum

These files help the Minimal Version Selection (MVS) algorithm manage your project dependencies:
- `go.mod`: Contains the version requirements and direct dependencies for your module. MVS selects the highest required version for each module in this file and downloads it.
- `go.sum`: Contains the checksums for the content of the specific module versions used in your project.


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
1. Upgrade to latest minor version or patch.
2. Upgrade to specific version.
3. Remove unused package (same as 'go mod tidy -v')

```bash
go get github.com/entire/module/path
go get -u github.com/entire/module/path         # 1
go get -u github.com/entire/module/path@v2.0.0  # 2
go get github.com/entire/module/path@none       # 3
```

### go list

To view the current module and all its dependencies, use `go list`:

```bash
go list -m all
telemetry
github.com/alecthomas/kingpin/v2 v2.4.0
github.com/alecthomas/units v0.0.0-20211218093645-b94a6e3cc137
github.com/beorn7/perks v1.0.1
...
```

### Finding versions

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
gofmt -w <file>.go      # formats <file>.go
gofmt -l dirname/*.go   # lists files in dir that do not conform to go formatting 
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

Run Go code without explicitly compiling the code into a binary. Behind the scenes, `go run` compiles the application into a temp directory and executes it immediately. After the program runs, the file is cleaned up:

```bash
go run .                    # runs binary in cwd
go run <binary-name>
go run ./cmd/web            # runs proj-root/cmd/web/main.go
```

### go build

Compiles Go code into an executable binary that you can run.

```bash
go build                    # uses module name for binary name
go build -o <binary-name>   # provide binary name
```

### Cross-platform compilation

You can compile for any operating system or chip architecture with the `GOOS` and `GOARCH` environment variables. Set the variables in a `go run` or `go build` command:

```bash
GOOS=linux GOARCH=amd64 go build -o app
GOOS=windows GOARCH=amd64 go build -o app.exe
GOOS=darwin GOARCH=amd64 go run
```

This table lists the accepted values:

| GOOS        | Description                             |
| ----------- | --------------------------------------- |
| `aix`       | IBM AIX                                 |
| `android`   | Android                                 |
| `darwin`    | macOS, iOS, iPadOS (Apple platforms)    |
| `dragonfly` | DragonFly BSD                           |
| `freebsd`   | FreeBSD                                 |
| `illumos`   | Illumos/Solaris derivatives             |
| `ios`       | iOS (device & simulator)                |
| `js`        | WebAssembly JavaScript host environment |
| `linux`     | Linux                                   |
| `netbsd`    | NetBSD                                  |
| `openbsd`   | OpenBSD                                 |
| `plan9`     | Plan 9                                  |
| `solaris`   | Oracle Solaris                          |
| `wasip1`    | WASI Preview 1                          |
| `windows`   | Windows                                 |


| GOARCH     | Description                                                                  |
| ---------- | ---------------------------------------------------------------------------- |
| `386`      | 32-bit x86                                                                   |
| `amd64`    | 64-bit x86                                                                   |
| `amd64p32` | 64-bit x86 with 32-bit pointers (old, only for nacl; effectively deprecated) |
| `arm`      | ARM 32-bit                                                                   |
| `arm64`    | ARM 64-bit                                                                   |
| `loong64`  | LoongArch 64                                                                 |
| `mips`     | MIPS (big-endian), 32-bit                                                    |
| `mips64`   | MIPS64 (big-endian)                                                          |
| `mipsle`   | MIPS (little-endian), 32-bit                                                 |
| `mips64le` | MIPS64 (little-endian)                                                       |
| `ppc64`    | POWERPC 64-bit (big-endian)                                                  |
| `ppc64le`  | POWERPC 64-bit (little-endian)                                               |
| `riscv64`  | RISC-V 64                                                                    |
| `s390x`    | IBM Z / s390x                                                                |
| `wasm`     | WebAssembly                                                                  |


## Testing

### go test

```bash
go test -v                  # verbose output
go test -v ./<dirname>/     # run tests in a specific directory
go test -v ./cmd/
```

### go test -cover

```bash
go test -cover
```

