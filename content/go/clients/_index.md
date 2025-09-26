+++
title = 'Clients'
date = '2025-09-25T08:28:12-04:00'
weight = 39
draft = false
+++

Go's HTTP client can perform almost any HTTP request, and it is highly customizable.

## Basic client

A simple GO client performs a a helper function. Helper functions are a wrapper around a request a `Request` object and HTTP client. Other common helper functions include the following:
-`http.Get`
- `http.Head`
- `http.Post`
- `http.PostForm`

This example demonstrates a GET request:
1. Makes a GET request to the given URL. This function returns an `http.Response` and an `error`, which you ignore.
2. `ReadAll` accepts a Reader and returns a byte slice and an `error`. 
3. Handle the error.
4. Closes the network connection. When you make a GET request, Go opens a TCP connection to the web server. This prevents memory leaks that result from open connection, and it lets the client reuse the TCP keep-alive connection.
5. Prints the contents of the body to the console.

```go
func main() {
	res, _ := http.Get("https://www.manning.com/")  // 1
	b, err := io.ReadAll(res.Body)                  // 2
	if err != nil {                                 // 3
		panic(err)
	}
	defer res.Body.Close()                          // 4
	fmt.Printf("%s", b)                             // 5
}
```

## Default HTTP client

Go's `http.DefaultClient` is a pointer to an `http.Client` struct with default settings:

```go
var DefaultClient = &Client{}
```

Use `DefaultClient` when you need a quick and convenient HTTP client where the following default settings are suitable:
- Timeout: `0` (hang forever)
- Redirects: Up to 10
- Transport: See [http.DefaultTransport](https://pkg.go.dev/net/http#DefaultTransport)


In its most basic form, making a request with the `DefaultClient` requires that you create two objects: a `Request` object and a client that makes the request:
1. Create a new `Request` object. `NewRequest` takes a method, URL, and request body. Because this is a DELETE request, the body is `nil`.
2. Handle any errors.
3. `DefaultClient` sends the request with its `Do` method. The `Do` method is how the HTTP client sends a request. It accepts a `Request` object, passes it to the client's Transport layer, opens a connection, sends the request, then waits for the response.
4. Handle any errors.
5. Print the response status code to the console.

```go
func main() {
	req, err := http.NewRequest("DELETE", "https://jsonplaceholder.typicode.com/posts/1", nil)      // 1
	if err != nil {                             // 2
		panic(err)
	}

	res, err := http.DefaultClient.Do(req)      // 3
	if err != nil {                             // 4
		panic(err)
	}
	fmt.Printf("%s\n", res.Status)              // 5
}
```

## Custom client

Go's `http.Client` lets you create a client with custom properties, like redirects and timeouts. This example creates a client with a custom `Timeout` value:
1. Create a custom client with a 1 second `Timeout`.
2. Send a request with its `Get` method.

```go
func main() {
	client := &http.Client{Timeout: time.Second}            // 1
	res, err := client.Get("https://www.manning.com/")      // 2
	if err != nil {
		panic(err)
	}

	b, err := io.ReadAll(res.Body)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	fmt.Printf("%s", b)
}
```

## Transport layer (TODO)