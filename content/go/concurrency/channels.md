+++
title = 'Channels'
date = '2025-08-30T12:08:59-04:00'
weight = 20
draft = false
+++

Channels let you send data as messages from one goroutine to another. They are often described as sockets between goroutines in a single application, or pipes that share information asynchronously. Channels have the following properties:
- Typed and can send structured data
- Bidirectional or unidirectional
- Short-lived or long-lived
- Can use multiple channels per app, with each channel working with a different data type

## Channels basics

There are many ways to create and use channels:

### Creating a channel

Initialize a channel with `make`:

```go
var ch chan int
ch = make(chan int)
chTwo := make(chan []byte)
```

### Arrow operator

By default, channels are bidirectional, which means it can both send and receive data. To create a unidirectional channel---one that either sends or receives---use the arrow operator. This table summarizes the arrow placement:

| Channel type | Example |
| :----------- | :------ |
| send         | `ch <-` |
| receive      | `<-ch`  |



### Send channels

A send channel "sends" a value into the channel. This might seem backwards at first---a "sending" channel sounds like it should send data from the channel. However, think about it in terms of "the program sends data _into_ a send channel".

Send channels behave differently whether they are buffered or unbuffered. 

By default, channels are unbuffered. An unbuffered channel blocks until another goroutine is ready to receive the value. When you are sending data into a channel, you need to run it in a separate goroutine so it does not block execution. For example, this code sends data to `sending` in the `main` goroutine. `main` cannot execute past `ch <- 100` because it blocks, resulting in a deadlock:

```go
func main() {
	ch := make(chan int)
	ch <- 100              // blocks until deadlock

	receiving := <-ch
}
```

To fix this, put `ch` in a goroutine:

```go
func main() {

	ch := make(chan int)
	go func() {
		ch <- 100
	}()

	val := <-ch
}
```



### Receive channels

A receiving channel receives data that your program sent from another goroutine. A receiving channel blocks until a value is sent, but that is usually the behavior that you want---the receiving channel is waiting for a signal that a task or other work is complete.

You can assign the value from a receiving channel, or you can discard it. To assign the value, place the receiving channel syntax (`<-ch`) on the right of an assignment expression. To discard it, just write the receiving channel syntax.

You want to assign the receiving channel when you need to perform additional work with its value. For example, this code assigns the value from an int channel and converts it to a string:
1. Create the sending channel.
2. Send data into the sending channel.
3. Receive the data from the sending channel and assign it to `done`
4. Convert the `int` to a `string`.

```go
func main() {
	ch := make(chan int)        // 1
	go func() {                 // 2
		ch <- 1
	}()

	done := <-ch                // 3
	str := strconv.Itoa(done)   // 4
	fmt.Printf("Type: %T, Val: %s\n", str, str)
}
```

{{< admonition "Remember the arrow" tip >}}
When you assign a value from a channel, remember to use the arrow on the receiving channel: `val := <-ch`. If you omit the arrow (`val := chan`), you are only assigning channel itself, which is a virtual memory address.
{{< /admonition >}}


To discard the value, end the program without assigning it to a variable. Use this pattern when the receiving channel does not need to preform any work with the channel value. For example, if the channel sends a signal that the program should exit, you do not need to store the value:

```go
func main() {

	ch := make(chan os.Signal)
	go func() {
		ch <- os.Kill
	}()
	<-ch
}
```

To see what `ch` receives, you can print it to the console:

```go
func main() {

	ch := make(chan os.Signal)
	go func() {
		ch <- os.Kill
	}()
	fmt.Println(<-ch)           // prints: "killed"
}
```

### Unbuffered channels

### Buffered channels

### Function arguments

When you pass a channel to a function, a best practice is to indicate whether the function sends or receives data on the channel. For example, this function sends data to the `out` channel:

```go
func readStdin(out chan<- []byte) {
	for {
		data := make([]byte, 1024)
		l, _ := os.Stdin.Read(data)
		if l > 0 {
			out <- data
		}
	}
}
```

## select

The `select` statement watches zero or more channels for an event. It behaves similarly to a `switch` statement for channels---it tests all cases simultaneously to see if any of them are ready to accept the task passed to the `select` statement:
- If one case can execute, `select` executes that case.
- If more than one case can execute, `select` randomly picks a case. It repeats this until there are no cases to execute.
- If no cases execute, `select` executes a `default` statement, if provided.

A `select` statement is a control flow mechanism, because it blocks if none of the statements can execute.

#### Example

Here is a basic example that uses a select statement to echo console input back to the console. The `readStdin` function uses multiple channels to send and receive data:
1. The function accepts the `out` channel as an argument. `out` is a send-only channel---the program sends bytes into this channel.
2. There is an infinite `for` loop so we can read as long as needed.
3. The `data` channel is slice of bytes that can hold up to 1KB (1024 bytes).
4. `os.Stdin.Read` can read up to `len(data)` (1KB). It reads data from its file (`Stdin`) and stores it in the `data` channel. It returns the number of bytes read and an error. We discard the error.
5. When `l` is greater than `0` (any input was written to `Stdin`), the program sends the bytes stored in `data` to the `out` channel.

```go
func readStdin(out chan<- []byte) {     // 1
	for {                               // 2
		data := make([]byte, 1024)      // 3
		l, _ := os.Stdin.Read(data)     // 4
		if l > 0 {                      // 5
			out <- data
		}
	}
}
```

The main function uses a select statement to handle the channels:
1. The `echo` channel is bidirectional--it can send or receive a slice of bytes.
2. Pass `echo` to `readStdin`, and run it in a goroutine. This means that the program sends data from Stdin to `echo`. Now, the program needs another in `main` to receive the data.
3. Create a `select` statement in an infinite `for` loop. `select` will listen for an event on each of its `case` expressions until a case causes the loop to exit.
4. The first case creates a `buf` of type `[]byte` to receive data from `echo`. When `readStdin` writes data to `echo`, this case writes the contents of `echo` to `buf`. When this occurs, the `select` statement picks this case and writes the contents of `buf` to `Stdout`.
5. The second case calls `time.After` to send a timeout signal after 10 seconds. `time.After` waits for the specified time to elapse then returns a receive-only channel that contains the current time. We have no need for the current time, so we discard it. Even though we discard the value, the expression is treated as a truthy Boolean, which causes select to pick this case and return from the infinite loop.
   
   For additional details about `time.After`, see the [Go docs](https://pkg.go.dev/time#After).

```go
func main() {
	echo := make(chan []byte)                   // 1
	go readStdin(echo)                          // 2
	for {                                       // 3
		select {
		case buf := <-echo:                     // 4
			os.Stdout.Write(buf)
		case <-time.After(10 * time.Second):    // 5
			return
		}
	}
}
```

To make the `time.After` behavior more clear, the following `main` method is equivalent to the previous example:
1. Create a receive-only channel `sleepChannel`.
2. Use `sleepChannel` in the `select` case.
```go
func main() {

	sleepChannel := time.After(10 * time.Second)

	echo := make(chan []byte)
	go readStdin(echo)
	for {
		select {
		case buf := <-echo:
			os.Stdout.Write(buf)
		case <-sleepChannel:
			fmt.Println("Called sleepChannel")
			return
		}
	}
}
```

## Ranging over channels

## Closing channels