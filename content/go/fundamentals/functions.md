+++
title = 'Functions'
date = '2025-08-30T10:07:00-04:00'
weight = 30
draft = false
+++


## Immediately invoked function literals (IIFL)

An IIFL is an anonymous function that you call at the end of the closing bracket. Goroutines are commonly executed as IIFLs:

```go
for _, file := range os.Args[1:] {
    wg.Add(1)
    go func(filename string) {
        compress(filename)
        wg.Done()
    }(file)
}
```

Here, we run a goroutine in an IIFL and pass the `file` value from the outer `for range` loop. Using separate variables (`file` and `filename`) ensures that each goroutine operates on a different file, one for each iteration.

If the goroutine closure captured `file`, all goroutines would share that same variable. This variable changes with each iteration, and it might be the same value by the time they execute. In other words, every goroutine might try to compress the last file passed to the `for range` loop.

Passing `file` as an argument to the IIFL means that it is evaluated immediately, and each goroutine gets its a unique copy of the `file` variable in each iteration.