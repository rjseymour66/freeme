+++
title = 'Fundamentals'
date = '2025-11-16T09:57:24-05:00'
weight = 10
draft = false
+++

Go includes built-in testing tools for functional and performance testing.

Unit testing
: Checks code in individual functions or modules.

Integration testing
: Verifies that different modules work well together.

Functional testing
: Verifies the correctness of the program output.

Test suite
: Collection of test cases. If you use testing resources, set up the resources at the start of the test suite, then tear them down at the end.

## Naming conventions

All test files must end in `_test.go`, which lets the Go test tool identify them. Place test files in the same package as the code that they test.
```bash
project-root
├── go.mod
├── main.go
└── packagename
    ├── functional.go         # source code
    └── testing_test.go       # test file
```

For external (integration) tests, use the original package name followed by `_test`. For example:

```go
package original_test
```
This package format requires that you import the source into the test file.

Each test function must start with `TestXxx`, with the remainder of the name in camel case. The function takes a single argument, a pointer to `testing.T`. `T` is a struct that manages test state and can log test results.

## Commands

1. Verbose output.
2. Add the `-shuffle=on` flag to execute tests in a random order.
3. Stops tests in a single package if there is a failing test. This is helpful if you want to work on the first failing test.
4. Run a specific test.
5. Run a specific subtest.
6. You can use globbing syntax. This test runs a specific subtest that begins with `with_port`.
7. Use the short flag to skip long-running tests, like integration tests. The test function must use the `testing.Short()` function, and optionally use `t.Skip` to provide context for skipping the test.

```go
go test -v                              // 1
go test -v -shuffle=on                  // 2
go test -v -failfast                    // 3
go test -v -run=TestName                // 4
go test -v -run=TestName/with_port      // 5
go test -v -run=TestName/^with_port     // 6
go test -v -short ./...                 // 7
```

## Writing a test

Each test contain three main sections:

Arrange
: Set up the test inputs and expected values.

Act
: Execute the portion of code that you are testing.

Assert
: Verify that the code returned the correct values. You can use the `got`/`want` or `got`/`expected` formatting.

### Arrange

A common way to arrange a test is to use table tests. Table tests are a way to provide multiple test cases that you loop over and test during the `Act` stage. To set up a table test, complete the following:
1. Create a `testCase` struct that models the inputs and expected outputs of the test:
   ```go
   type testCase struct {
	   a        int
	   b        int
	   expected int
   }
   ```
2. Use a map literal with a `string` key and `testCase` value. The `string` key is the name of the test, and `testCase` is the test values:
   ```go
   tt := map[string]testCase{   // tt for table tests
        "test one": {
            a:        4,
            b:        5,
            expected: 9,
        },
        "test two": {
            a:        -4,
            b:        15,
            expected: 11,
        },
        "test three": {
            a:        5,
            b:        1,
            expected: 6,
        },
   }
   ```
### Act

Within the same `TestAdd()` function, write a `for range` loop. This is where you execute each test case with the code that you are testing. Use the `t.Run()` subtest method in the `for range` loop to run each individual test case with a name. `t.Run()` accepts two parameters: the name of the test, and an unnamed test function:

```go
for name, tc := range tt {
	t.Run(name, func(t *testing.T) {
		// act
		got := add(tc.a, tc.b)
		...
	})
}
```
In the previous example, `name` is the key in the `tt` map, and `tc` is the `testCase` struct in the `tt` map.

### Assert

In the assert step, you compare the actual values (what you got in the Act step) with the expected value, which is usually a field in the `testCase` struct. Asserts are generally `if` statements that return a formatted error with `t.Errorf` when the `got` and `expected` values do not match:

```go
for name, tc := range tt {
	t.Run(name, func(t *testing.T) {
        ...
		// assert
		if got != tc.expected {
			t.Errorf("expected %d, got %d", tc.expected, got)
		}
	})
}
```
#### Assert helper

Writing assert logic can get tedious, so you should extract it into a helper function. Add the following code to `/internal/assert/assert.go`:

```go
package assert

import (
    "testing"
)

func Equal[T comparable](t *testing.T, got, expected T) {
    t.Helper()

    if got != expected {
        t.Errorf("got: %v; want: %v", got, expected)
    }
}
```

The preceding example uses [generics](https://go.dev/doc/tutorial/generics).

Now, you can use this helper function to verify test output during the assert stage:

```go
for name, tc := range tt {
	t.Run(name, func(t *testing.T) {
        ...
		// assert
		assert.Equal(t, got, tc.expected)
	})
}
```

## Log, Error, Fatal

t.Log
: You want to debug or show output but do not want to fail the test.

t.Error
: Something is wrong but the test can still keep running to collect more failures.

t.Fatal
: There’s no point continuing the test. For example, bad input, required init failed.

| Function    | Description                                                  | Use Case                                                                   |
| ----------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `t.Log`     | Prints debugging or informational output.                    | Show internal state or progress without failing the test.                  |
| `t.Logf`    | Prints formatted log output.                                 | Outputs formatted debugging output.                                        |
| `t.Error`   | Logs an error and marks the test as failed.                  | Something is wrong but the test can continue running.                      |
| `t.Errorf`  | Logs a formatted error message and marks the test as failed. | Need a detailed or formatted error message.                                |
| `t.Fail`    | Marks the test as failed without printing a message.         | Use in helper functions to mark failure without logging.                   |
| `t.FailNow` | Marks test as failed and immediately stops execution.        | When continuing the test is pointless (e.g., missing required test setup). |
| `t.Fatal`   | Logs a fatal error and stops the test immediately.           | When a critical issue prevents further execution.                          |
| `t.Fatalf`  | Same as `t.Fatal` but with formatting support.               | Outputs formatted fatal error messages.                                    |
