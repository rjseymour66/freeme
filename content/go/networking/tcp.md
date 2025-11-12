+++
title = 'TCP'
date = '2025-09-06T22:59:20-04:00'
weight = 10
draft = false
+++

TCP provides built-in handshaking, error detection, and reconnection features.

## Netcat TCP server

To test TCP programs, you need a TCP server. Netcat is a simple command line utility that accepts simple test messages on the specified port and writes them to the console.

Run this command in a terminal to start a TCP server that listens (`-l`) continuously (`-k`) on port 1902:

```bash
nc -lk 1902
```

## TCP server

TCP ensures a reliable and ordered delivery of birectional data with messag acknowledgements and sequences of data packets. A simple TCP server has the following parts:
- Listen for incoming connections.
- Accept the connection.
- Read and optionally write data to the connection.

### Simple server

A socket is a combination of the protocol, IP address or hostname, and port number. The following simple TCP server reads from an infinite loop and handles each connection in a separate goroutine:
1. `net.Listen` returns a generic network listener for stream-oriented protocols. It accepts two arguments: the protocol, and an address to listen on in _`host:port`_ format. If there is no hostname or IP address provided, it will listen on any interface for IPv4 or IPv6. If you provide the host, it listens only for IPv4. If you set the port to `0`, then a random port is chosen and you have to retrieve it with `net.Addr`.
2. Handle any errors.
3. Close the listener.
4. Listen for connections in an infinite `for` loop.
5. `Accept` is a method on the `Listener` interface. It blocks until a new connection arrives, and then returns a `Conn` struct that represents the next connection.
6. Handle any errors for `Accept`.
7. Handle each connection in a separate goroutine so the main thread can continue accepting connections. This IIFL accepts a `Conn` object named `c`. This ensures that each goroutine operates on a different connection variable. Passing `conn` directly to the closure would overwrite the connection in each goroutine.
8. Create a buffer to store connection data.
9. `Read` reads data from the connection into `buf`.
10. Handle errors for `Read`.
11. Log the contents of `buf` to the console. It is stored as a slice of bytes, so make sure you caste it as a string.
12. `Write` writes a slice of bytes to the connection.
13. Close the connection.
14. Pass to the IIFL the `conn` value returned from `Accept`.
   

```go
func main() {
	listener, err := net.Listen("tcp", "localhost:9000") 	// 1
	if err != nil { 										// 2
		log.Fatal(err)
	}
	defer listener.Close() 									// 3

	for { 													// 4
		conn, err := listener.Accept() 						// 5
		if err != nil { 									// 6
			log.Fatal(err)
		}

		go func(c net.Conn) { 								// 7
			buf := make([]byte, 1024) 						// 8
			_, err := c.Read(buf) 							// 9
			if err != nil { 								// 10
				log.Fatal(err)
			}
			log.Print(string(buf)) 							// 11
			c.Write([]byte("Hello from TCP server\n")) 		// 12
			c.Close() 										// 13
		}(conn) 											// 14
	}
}
```


### Production server

Here is a more complicated TCP server:

```go

func handleConn(c net.Conn) {
	defer c.Close()

	// Optional: set a read deadline
	_ = c.SetReadDeadline(time.Now().Add(30 * time.Second))

	// Use a buffered reader and read a line (or change to protocol you need)
	r := bufio.NewReader(c)
	line, err := r.ReadString('\n')
	if err != nil {
		if err != io.EOF {
			log.Printf("read error: %v", err)
		}
		return
	}

	log.Printf("received: %q", line)

	// Write a response and check error
	if _, err := c.Write([]byte("Hello from TCP server\n")); err != nil {
		log.Printf("write error: %v", err)
	}
}

func main() {
	listener, err := net.Listen("tcp", ":9000") // listen on all interfaces
	if err != nil {
		log.Fatal(err)
	}
	defer listener.Close()

	// graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	var wg sync.WaitGroup
	go func() {
		<-quit
		log.Println("shutting down listener")
		listener.Close() // will break Accept loop
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			// Accept returns error when listener closed; exit gracefully
			if opErr, ok := err.(*net.OpError); ok && opErr.Op == "accept" {
				break
			}
			log.Printf("accept error: %v", err)
			continue
		}

		wg.Add(1)
		go func(c net.Conn) {
			defer wg.Done()
			handleConn(c)
		}(conn)
	}

	// wait for active handlers to finish
	wg.Wait()
	log.Println("server stopped")
}
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