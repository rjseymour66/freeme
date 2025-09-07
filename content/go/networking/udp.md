+++
title = 'UDP'
date = '2025-09-06T22:59:25-04:00'
weight = 20
draft = false
+++

UDP clients do not require `ACK` messages from the server to continue sending data. This reduces overhead and alleviates common network issues like backpressure.

## Caveats

UDP has the following disadvantages:
- Messages can get lost---UDP does not acknowledge each message and require retransmission.
- Messages can be received out of order.
- Sending many UDP messages can overwhelm a server if it cannot handle all the requests.

## Simple UDP server

To test UDP programs, you need a UDP server. Netcat is a simple command line utility that accepts simple test messages on the specified port and writes them to the console.

Run this command in a terminal to start a UDP (`-u`) server that listens (`-l`) continuously (`-k`) on port 1902:

```bash
nc -luk 1902
```

## Network logging

The 12-factor app paradigm explains that you should treat logs as event streams. You can connect to a remote port that is designated for network logging and write logs there.

The following example is simple, but it demonstrates how to connect to a server with a timeout, flush the network buffer when the connection closes, and create a network logger:
1. Define a timeout. In UDP, you add the timeout to account for how long it takes to send the message. UDP reads can block forever, so adding a timeout ensures the connection eventually closes.
2. Establish a UDP connection with a timeout on a listening port.
3. Close the connection. If a panic occurs, the network buffer is flushed to the destination so you don’t lose important messages.
4. Define the log options.
5. Create the logger. The `New` function takes a `Writer`, prefix, and log flags.
6. Log a regular message.
7. Log a panic. Always use `Panicln` rather than `log.Fatal`, because the `Fatal` functions do not call the deferred functions—they immediately return with `os.Exit`. This means that the network buffer is never properly flushed.

```go
func main() {
	timeout := 30 * time.Second                                         // 1
	conn, err := net.DialTimeout("udp", "localhost:1902", timeout)      // 2
	if err != nil {
		panic(errors.New("Failed to connect to localhost:1902"))
	}
	defer conn.Close()                                                  // 3

	flags := log.Ldate | log.Lshortfile                                 // 4
	logger := log.New(conn, "[example]", flags)                         // 5
	logger.Println("This is a regular message")                         // 6
	logger.Panicln("This is a panic.")                                  // 7
}
```