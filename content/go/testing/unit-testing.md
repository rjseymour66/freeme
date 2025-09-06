+++
title = 'Unit Testing'
date = '2025-09-05T08:42:58-04:00'
weight = 10
draft = false
+++

A _unit test_ verifies the behavior of a single package. It tests simple code in isolation, such as functions and methods.


## Table-driven tests

Table tests use a slice of inputs and conditions that you feed a looping function to evalute their outputs.

Here is a simple example to illustrate. This tests a function named `addOne(a int) int`, which takes an integer as an argument and returns that argument plus 1. So, `addOne(3)` returns `4`:
1. Create a slice of anonymous structs
2. A name for each subtest
3. Inputs for the `addOne` function
4. Expected return value for each `addOne` test
5. The slice of test cases.
6. `for range` to iterate over the test cases. `tt` is short for "table test".
7. `t.Run` runs each test as a subtest. Subtests run in isolation, so you can use `t.Fatalf()` and stop only that test case. This also lets you run tests in parallel.
8. Get the return value of the function you are testing, passing in the table test input.
9. Get the expected value.
10. This is an idiomatic Go assertion test.

```go
func TestAddOne(t *testing.T) {
	tests := []struct {                             // 1
		name     string                             // 2
		a        int                                // 3
		expected int                                // 4
	}{                                              // 5
		{"add 1 to positive", 3, 4},
		{"add 1 to negative", -3, -2},
	}

	for _, tt := range tests {                      // 6
		t.Run(tt.name, func(t *testing.T) {         // 7
			got := addOne(tt.a)                     // 8
			want := tt.expected                     // 9

			if got != want {                        // 10
				t.Errorf("got %d, want %d", got, want)
			}
		})
	}
}
```

## Fuzz tests (todo)

A fuzz test uses a fuzzer to feed the test a large amount of random input so you can test for unexpected edge cases.

Fuzz tests must start with "Fuzz", as in `FuzzAddOne`. They accept the `*testing.F` parameter instead of `*testing.T`.

## Test coverage

Go can generate a test report that details how much of your code is tested. Use the `-cover` option to view your code coverage:

```bash
go test -cover                          # basic coverage for one package
go test -coverprofile=cover.out         # write coverage data to a file
go tool cover -html=cover.out           # view coverage data in browser
go tool cover -html cover.out           # view coverage data in browser
```

## Benchmarking (todo)

