+++
title = 'TCP'
date = '2025-09-06T22:59:20-04:00'
weight = 10
draft = false
+++

TCP provides built-in handshaking, error detection, and reconnection features.

## Simple TCP server

To test TCP programs, you need a TCP server. Netcat is a simple command line utility that accepts simple test messages on the specified port and writes them to the console.

Run this command in a terminal to start a TCP server that listens (`-l`) continuously (`-k`) on port 1902:

```bash
nc -lk 1902
```

## Network logging

The 12-factor app paradigm explains that you should treat logs as event streams. You can connect to a remote port that is designated for network logging and write logs there.

The following example is simple, but it demonstrates how to connect to a server, flush the network buffer when the connection closes, and create a network logger:
1. Establish a TCP connection on the listening port.
2. Close the connection. If a panic occurs, the network buffer is flushed to the destination so you don't lose important messages.
3. Define the log options.
4. Create the logger. The `New` function takes a `Writer`, prefix, and log flags.
5. Log a regular message.
6. Log a panic. Always use `Panicln` rather than `log.Fatal`, because the `Fatal` functions do not call the deferred functions---they immediately return with `os.Exit`. This means that the network buffer is never properly flushed. 

```go
func main() {
	conn, err := net.Dial("tcp", "localhost:1902")                  // 1
	if err != nil {
		panic(errors.New("Failed to connect to localhost:1902"))
	}
	defer conn.Close()                                              // 2

	flags := log.Ldate | log.Lshortfile                             // 3
	logger := log.New(conn, "[example]", flags)                     // 4
	logger.Println("This is a regular message")                     // 5
	logger.Panicln("This is a panic.")                              // 6
}
```