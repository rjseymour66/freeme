+++
title = 'CLI tools'
date = '2026-02-17T23:08:26-05:00'
weight = 50
draft = false
+++

When you test a CLI tool, you test that the flags accept the correct values.

## Production environment

The following example tests a CLI tool that uses an `env` struct to inject dependencies to a `run` function, which is then passed to `main`. Here is the dependency struct:

```go
type env struct {
    args   []string
	stdout io.Writer
	stderr io.Writer
	dryRun bool
}
```

## Test environment

The tests need to pass test `args`, and then capture the output of both `stdout` and `stderr`. To capture the output, you can create a `testenv` struct that uses `strings.Builder` for `stdout` and `stderr`.

`strings.Builder` satisfies the `io.Writer` interface, and it has a `String()` method that lets us read what is written to its buffer.

```go
type testEnv struct {
	stdout strings.Builder
	stderr strings.Builder
}
```
## Helper function

Next, create a helper function that accepts a variable number of arguments, initializes the remaining `env` fields, and returns a `testEnv`:
1. Accept variadic string input so you can pass test flags and arguments.
2. Call `run`, which takes a pointer to an `env` struct. Initialize the `env` fields with `testEnv` values
3. `args` takes a slice of strings, and the first index in the slice is set to `hit`. The remaining value is the variadic `args` passed to `testRun`.
4. Inject the `string.Builder` Writers in `testEnv` into the `stdout` and `stderr` fields.
5. Set `dryRun` to true to prevent live HTTP calls.
6. Return `testEnv` so you can inspect the values in your tests.

```go
func testRun(args ...string) (*testEnv, error) {        // 1
	var tenv testEnv
	err := run(&env{                                    // 2
		args:   append([]string{"hit"}, args...),       // 3
		stdout: &tenv.stdout,                           // 4
		stderr: &tenv.stderr,
		dryRun: true,                                   // 5
	})
	return &tenv, err                                   // 6
}
```

## CLI tool tests

Run your tests. The first test ensures that the tool processes valid input correctly:
1. Get the `testEnv` values. This line is appends the URL to the `env.args`.
2. Assert that something was written to `stdout`.
3. Assert that nothing was written to `stderr`.

```go
func TestRunValidInput(t *testing.T) {
	t.Parallel()

	tenv, err := testRun("https://github.com/username")         // 1
	if err != nil {
		t.Fatalf("got %q;\nwant nil err", err)
	}
	if n := tenv.stdout.Len(); n == 0 {                         // 2
		t.Errorf("stdout = 0 bytes; want > 0")
	}
	if n := tenv.stderr.Len(); n != 0 {                         // 3
		t.Errorf(
			"stderr = %d bytes; want 0; stderr:\n%s",
			n, tenv.stderr.String(),
		)
	}
}
```
Next, test that the tool returns an error with invalid input:
1. Get the `testEnv` values. This line is appends invalid arguments to `env.args`.
2. When `testRun` calls `run`, it should return an error. This checks that an error was returned.
3. There should be output in `testEnv.stderr`.

```go
func TestRunInvalidInput(t *testing.T) {
	t.Parallel()

	tenv, err := testRun("-c=2", "-n=1", "invalid-url")     // 1

	if err == nil {                                         // 2
		t.Fatalf("got nil; want err")
	}
	if n := tenv.stderr.Len(); n == 0 {                     // 3
		t.Error("stderr = 0 bytes; want > 0")
	}
}
```