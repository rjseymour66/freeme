+++
title = 'Traces'
date = '2026-01-16T16:30:20-05:00'
weight = 20
draft = false
+++

Tracing allows you to observe the behavior of your program during execution. It offers invaluable insights into performance bottlenecks and bugs. Go provides the [runtime/trace](https://pkg.go.dev/runtime/trace) package to collect event data on your goroutines, heap allocation, etc.
















```go
func main() {
	// Create a file to store the trace
	f, err := os.Create("trace.out")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	// Start tracing
	if err := trace.Start(f); err != nil {
		panic(err)
	}
	defer trace.Stop()

	ctx := context.Background()

	// Create a top-level trace region
	ctx, task := trace.NewTask(ctx, "main-task")
	defer task.End()

	var wg sync.WaitGroup

	wg.Add(2)

	go worker(ctx, &wg, "worker-1", 100*time.Millisecond)
	go worker(ctx, &wg, "worker-2", 200*time.Millisecond)

	wg.Wait()

	fmt.Println("Program complete")
}

func worker(ctx context.Context, wg *sync.WaitGroup, name string, delay time.Duration) {
	defer wg.Done()

	// Mark a region of work in the trace
	trace.WithRegion(ctx, name, func() {
		fmt.Println(name, "starting")

		// Simulate blocking work
		time.Sleep(delay)

		// Simulate CPU work
		busyWork()

		fmt.Println(name, "finished")
	})
}

func busyWork() {
	start := time.Now()
	for time.Since(start) < 50*time.Millisecond {
		// Burn CPU
	}
}
```

## HTTP servers

```go

```