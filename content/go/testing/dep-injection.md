+++
title = 'Dependency injection'
date = '2026-02-16T22:54:21-05:00'
weight = 20
draft = false
+++

Testing `main` is difficult because you have to isolate global dependencies and use the ones we can control directly during tests.

Go doesn't use frameworks for dependency injection, it uses the following:
- Interfaces
- Structs 
- Explicit parameters

To do this, you need to place the core logic of `main` into another function, and store all of its dependencies into a environment struct. This lets you inject real dependencies during production and fake dependencies during testing.

## Decoupling main

The following steps decouple `main` from global dependencies:
1. Declare a `run` function next to `main`.
2. Move the core logic of `main` into `run`. You will call `run` from `main`.
3. Create an `env` struct to store the global dependencies.
4. Pass the `env` struct to `run`.
5. For CLI tools: the flag parser should use the injected dependencies.

This pattern eliminates side effects because only `main` interacts with outside resources. Side effects include the following:
- Reading global variables
- Writing to global variables
- Printing directly to stdout
- Calling os.Exit
- Reading environment variables
- Touching filesystem directly

### Before

This example tightly couples `main` and global dependencies:
1. `parseArgs` reads from `os.Args`
2. `os.Exit` terminates the program
3. `Printf` writes CLI tool output to stdout.

```go
func main() {
	c := config{
		n: 100,
		c: 1,
	}

	if err := parseArgs(&c, os.Args[1:]); err != nil {
		os.Exit(1)
	}

	fmt.Printf(
		"%s\n\nSending %d requests to %q (concurrency: %d)\n",
		logo, c.n, c.url, c.c)
}
```

### After


First, create an `env` struct to store the global dependencies:
1. `stdout` is used to print the usage message to the console.
2. `stderr` is used for error messages so you can capture them during testing.
3. `args` reads command line arguments from a slice, rather than `os.Args`.

```go
type env struct {
	stdout io.Writer    // 1
	stderr io.Writer    // 2
	args   []string     // 3
	dryRun bool         
}
```

Next, move the logic from `main` to `run`:
1. `run` accepts a pointer to an `env` struct. It returns an error instead of calling `os.Exit`.
   
```go
func run(e *env) error {
	c := config{
		n: 100,
		c: 1,
	}

	if err := parseArgs(&c,
		e.args[1:],
		e.stderr,
	); err != nil {
		return err
	}

	fmt.Fprintf(
		e.stdout,
		"%s\n\nSending %d requests to %q (concurrency: %d)\n",
		logo, c.n, c.url, c.c,
	)
	return nil
}
```

```go
func main() {
	if err := run(&env{
		stdout: os.Stdout,
		stderr: os.Stderr,
		args:   os.Args,
	}); err != nil {
		os.Exit(1)
	}
}
```

The `parseArgs` function sets the FlagSet output to `env.stderr`:

```go
func parseArgs(c *config, args []string, stderr io.Writer) error {
	fs := flag.NewFlagSet("hit", flag.ContinueOnError)
	fs.SetOutput(stderr)        // change to env.stderr
	fs.Usage = func() {
		fmt.Fprintf(fs.Output(), "usage: %s [options] url\n", fs.Name())
		fs.PrintDefaults()
	}
    // ...
}
```

### Testing

Now, you can test run like this:

```go
var out bytes.Buffer
var errOut bytes.Buffer

e := &env{
	stdout: &out,
	stderr: &errOut,
	args:   []string{"cmd", "-n", "10", "https://example.com"},
}

err := run(e)
```