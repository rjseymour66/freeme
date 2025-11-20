+++
title = 'Benchmarking'
date = '2025-11-19T21:48:20-05:00'
weight = 50
draft = false
+++


Benchmark tests are nonfunctional tests---they do test whether the software performs its intended purpose. They test how well the software performs in terms of stability, speed, and scalability.


## Basic benchmarking

Benchmark functions are similar to regular testing functions. They use the `BenchmarkXxx(b *testing.B)`, and you place them in `<name>_test.go` file along with other test functions.

To demonstrate, here is a simple function that adds two integers and returns the answer:

```go
func Add(a, b int) int {
	return a + b
}
```

1. Pass the function a pointer to `testing.B`. `B` is a struct that manages benchmark timing and specifies how many iterations to run.
2. A C-style `for` loop that repeats `b.N` times.
3. The function you want to benchmark.

```go
func BenchmarkAdd(b *testing.B) {       // 1
	for i := 0; i < b.N; i++ {          // 2
		Add(1, 2)                       // 3
	}
}
```

To run the performance test, use the `-bench` flag. This command runs all benchmark functions in the package:
1. Command to run the tests.
2. Operating system.
3. Chip architecture.
4. Package name.
5. Details about the CPU.
6. Number of cores used in the test | Number of iterations | Time it took to run the benchmark
   
```bash
go test -bench=.                                            # 1
goos: linux                                                 # 2
goarch: amd64                                               # 3
pkg: testdir                                                # 4
cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz               # 5
BenchmarkAdd-12    	1000000000	         0.2460 ns/op       # 6
PASS
ok  	testdir	0.275s
```

### count flag

Use the `count` flag if you want to run the same performance test a specified number of times. This makes sure that the timing is not a one-off. Pass `count` the number of tests that you want to run:

```bash
go test -bench=. -count=5
goos: linux
goarch: amd64
pkg: testdir
cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
BenchmarkAdd-12    	1000000000	         0.2404 ns/op
BenchmarkAdd-12    	1000000000	         0.2397 ns/op
BenchmarkAdd-12    	1000000000	         0.2387 ns/op
BenchmarkAdd-12    	1000000000	         0.2408 ns/op
BenchmarkAdd-12    	1000000000	         0.2440 ns/op
PASS
ok  	testdir	1.338s
```

## Run only performance tests

Benchmark tests share `x_test.go` files alongside regular test functions. To execute only the benchmark functions, use the `run` flag.

`run` takes a regular expression. Go runs only functions that match that regular expression. To run only benchmark tests, pass `run` a regular expression that matches no test functions.

The `^$` regex matches the beginning and end of a string, which matches an empty string. You could also pass something random that you know won't match your function names, such as `-run=XXX`:

```bash
go test -v -bench=. -run=^$
goos: linux
goarch: amd64
pkg: testdir
cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
BenchmarkAdd
BenchmarkAdd-12    	1000000000	         0.2447 ns/op
PASS
ok  	testdir	0.274s
```

## Avoiding test fixtures

A test fixture is any data or setup that you need to perform within your tests. To avoid testing test fixtures, use these benchmarking functions:

- `b.StartTimer`: Start the benchmark timer.
- `b.StopTimer`: Stop the benchmark timer.
- `b.RestartTimer`: Restart the benchmark timer.

For example, here is a function that flips an image:

```go
func flip(grid [][]color.Color) {
	for x := 0; x < len(grid); x++ {
		col := grid[x]
		for y := 0; y < len(col)/2; y++ {
			k := len(col) - y - 1
			col[y], col[k] = col[k], col[y]
		}
	}
}
```

### Reset

The benchmark test needs to load the image first, so you need to reset the benchmark timer:
1. Load the resource.
2. Reset the benchmark timer.
```go
func BenchmarkFlip(b *testing.B) {
	grid := load("image.png")           // 1
	b.ResetTimer()                      // 2
	for i := 0; i < b.N; i++ {
		flip(grid)
	}
}
```

### Stop and Start

If you need to perform the task during every iteration of the loop, you can start and stop the timer:
1. Create the loop.
2. Stop the timer before you set up the resources.
3. Start the timer after the setup and before the function you want to benchmark.

```go
func BenchmarkFlip(b *testing.B) {
	for i := 0; i < b.N; i++ {          // 1
		b.StopTimer()                   // 2
		grid := load("image.png")
		b.StartTimer()                  // 3
		flip(grid)
	}
}
```

## Specific duration or iterations

Use the `-benchtime` flag to control the minimum duration that the benchmark tests run or increase the number of iterations.


## Sub-benchmarks

Sub-benchmark tests let you run table-driven performance tests:

```go
func BenchmarkURLString(b *testing.B) {
    var benchmarks = []*URL{
        {Scheme: "https"},
        {Scheme: "https", Host: "foo.com"},
        {Scheme: "https", Host: "foo.com", Path: "go"},
    }
    for _, u := range benchmarks {
        b.Run(u.String(), func(b *testing.B) {
            for i := 0; i < b.N; i++ {
                u.String()
            }
        })
    }
}
```

To run this test:

```bash
go test -run=XXX -bench=BenchmarkURLString
```

## Comparing test results

Use `benchstat` to compare results from performance tests before and after you make code changes.

1. Install `benchstat`:
   ```bash
   go install golang.org/x/perf/cmd/benchstat@latest
   ```
2. Benchmark your code, and redirect the output to a file:
   ```bash
   go test -bench=BenchmarkFlip -run=XXX -count=10 > old-flip.txt
   ```
3. Refactor.
4. Run the benchmarks again, redirecting the output to a different file:
   ```bash
   go test -bench=BenchmarkFlip -run=XXX -count=10 > new-flip.txt
   ```
5. Compare the benchmark tests with `benchstat`:
   ```bash
   benchstat old-flip.txt new-flip.txt
   ```

## Profiling a program

Use `pprof` to profile how your program uses system resources.

A _profile_ is a collection of stack traces that show the sequence of certain events like CPU use, memory allocation, etc. Profiling has two parts:
- Creating the profile and saving it to a file.
- Running `pprof` to analyze the profile.

The CPU profile helps you understand how much time is spent processing specific parts of your code. When you profile your CPU, the runtime interrupts itself every 10ms and records the stack trace. The amount of time the code appears in the profile indicates how much time is spent in that particular line of code.

1. When you have the code that you want to profile, run this command. It creates a binary file named `cpu.prof` that you can analyze with `pprof`:

```bash
go test -cpuprofile cpu.prof -bench=Resize -run=XXX
goos: linux
goarch: amd64
pkg: testdir
cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
BenchmarkResize-12    	       3	 335413698 ns/op
PASS
ok  	testdir	2.227s
```

2. Next, you need to analyze `cpu.prof`. The easiest way is in the web interface, which requires Graphviz. To install this on Linux:
   ```bash
   sudo apt install graphviz
   ```
3. Start the web interface with `go tool`:
   ```bash
   go tool pprof -http localhost:8080 cpu.prof
   ```