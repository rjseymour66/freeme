+++
title = 'Concurrent pipeline'
date = '2026-02-22T13:33:26-05:00'
weight = 30
draft = false
+++

A concurrent pipeline consists of several stages that work concurrently and are connected by channels. It is similar to a UNIX pipeline command, where the first stage produces a value, the next stages perform an operation on a value, and the last stage delivers the result to output. For example, this command has three stages, each connected by a pipe (`|`):
1. Stage 1: `echo` prints its arguments to STDOUT.
2. Stage 2: `tr` translates the output from stage 1, deleting the whitespace.
3. Stage 3: `wc` counts the characters in the output.

```bash
echo 'this is a test' | tr -d ' ' | wc -c
```

## Building a pipeline

In Go, a concurrent pipeline consists of any of the following components:
- Producer: Produces messages and sends them to the next stage.
- Throttler: Slows the passage of messages between producer and consumer.
- Dispatcher: Specialized goroutine that manages a worker pool of goroutines.

### Producer

```go
func produce(n int, req *http.Request) <-chan *http.Request {
	out := make(chan *http.Request)

	go func() {
		defer close(out)
		for range n {
			out <- req
		}
	}()
	return out
}
```

### Throttler

```go
func throttle(in <-chan *http.Request, delay time.Duration) <-chan *http.Request {
	out := make(chan *http.Request)

	go func() {
		defer close(out)
		t := time.NewTicker(delay)
		for r := range in {
			<-t.C
			out <- r
		}
	}()
	return out
}
```

### Dispatcher

```go
func dispatch(in <-chan *http.Request, concurrency int, send SendFunc) <-chan Result {
	out := make(chan Result)
	var wg sync.WaitGroup
	wg.Add(concurrency)

	for range concurrency {
		go func() {
			defer wg.Done()
			for req := range in {
				out <- send(req)
			}
		}()
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}
```

### Running the pipeline

```go
func runPipeline(n int, req *http.Request, opts Options) <-chan Result {
	requests := produce(n, req)
	if opts.RPS > 0 {
		requests = throttle(
			requests, time.Second/time.Duration(opts.RPS),
		)
	}
	return dispatch(requests, opts.Concurrency, opts.Send)
}
```

The caller would assign the output of `runPipeline` to a receive channel (a channel you read data from). For example, this function assigns `runPipeline` to `results`, and then uses `results` as the values in an iterator that reads from the channel until it is empty:

```go
func SendN(n int, req *http.Request, opts Options) (Results, error) {
	opts = withDefaults(opts)
	if n <= 0 {
		return nil, fmt.Errorf("n must be positive: got %d,", n)
	}

	results := runPipeline(n, req, opts)            // assignment
	return func(yield func(Result) bool) {          // iterator yield function
		for result := range results {
			if !yield(result) {
				return
			}
		}
	}, nil
}
```