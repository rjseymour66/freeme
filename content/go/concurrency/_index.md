+++
title = 'Concurrency'
date = '2025-08-29T08:27:17-04:00'
weight = 40
draft = false
+++


Go's uses event-style _goroutines_ and _channels_ to provide an efficient concurrency model:

goroutine
: A function that runs independently of the function that started it. It shares the same thread, but has its own function stack.

channel
: A pipeline for sending and receiving data, much like a socket that runs inside your program and sends and accepts signals. Channels provide a way for goroutines to send data to their caller and one another.

## Goroutines

A goroutine is a function that is invoked after the keyword `go`. It runs separate alongside other code, has its own call stack that is a few KB, and is managed by the Go runtime scheduler. The scheduler distributes the goroutines over multiple operating system threads that run on one or more processors.

The `main` method is a goroutine---the main goroutine that comprises the lifetime of the application. To demonstrate, the `countToTen` function in the following example counts from 1 to 10 and logs the current number to the console each second. The main function calls `countToTen` as a goroutine, then sleeps for seven seconds. `countToTen` runs concurrently to the main method, logging numbers to the console, while the main method sleeps. After seven seconds, the main method resumes execution and exits. This means that `countToTen` does not have enough time to complete its loop before the program ends:

```go
func main() {
	fmt.Println("Count to 10 if you can!")
	go countToTen()
	time.Sleep(7 * time.Second)
	fmt.Println("Out of time!")
	os.Exit(0)

}

func countToTen() {
	for i := 1; i <= 10; i++ {
		time.Sleep(1 * time.Second)
		fmt.Println(i)
	}
}
```

### WaitGroups

You can prevent the program from exiting before the goroutines complete their work with `sync.WaitGroup`.

A wait group is a message-passing facility that signals to a waiting goroutine when it is safe to proceed execution. The wait group doesn't need to know about what kind of work it is facilitating, only the number of goroutines that it needs to wait for. Think of it as a counter in the outer process (waiting goroutine) that keeps track of the number of concurrent tasks in process. You increment the counter for each concurrent task, perform the task, then decrement the counter when the work completes. The outer process blocks until the counter returns to 0. The general process is as follows:
1. Create a wait group.
2. Use the `.Add(int)` function to increment the number of goroutines to wait for.
3. Perform a task with the goroutine.
4. Call `.Done()` to signal to the wait group that the task is complete. This decrements the tasks registered with `.Add(int)` are complete.
5. In the outer goroutine, call `.Wait()`. The outer goroutine blocks until all goroutines in the wait group call `.Done()`.

#### Example

The following example illustrates this process. It calls a `compress` function on the files passed on the command line:
1. Creates a wait group named `wg`.
2. Loops through the files passed on the command line.
3. For each file argument, we increment the number of tasks.
4. Launch a goroutine that performs a task.
5. When the task is complete, send a signal to the wait group to decrement the counter.
6. The outer process blocks until the wait group counter is 0, then proceeds execution.

```go
func main() {
	var wg sync.WaitGroup                   // 1
	for _, file := range os.Args[1:] {      // 2
		wg.Add(1)                           // 3
		go func(filename string) {          // 4
			compress(filename)
			wg.Done()                       // 5
		}(file)
	}
	wg.Wait()                               // 6
	fmt.Printf("Compressed %d files\n", len(os.Args[1:]))
}

func compress(filename string) error {
	in, err := os.Open(filename)
	if err != nil {
		return err
	}

	defer in.Close()

	out, err := os.Create(filename + ".gz")
	if err != nil {
		return err
	}
	defer out.Close()

	gzout := gzip.NewWriter(out)
	_, err = io.Copy(gzout, in)
	gzout.Close()
	return err
}
```