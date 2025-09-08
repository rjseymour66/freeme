+++
title = 'HTTP Servers'
date = '2025-08-20T16:15:43-04:00'
weight = 20
draft = false
+++

## Routing

Routing means that your server receives a request and maps it to an internal function that can return a result to a client. In other words, the function _handles_ the request, which is also why the functions are called _request handlers_ or just _handlers_.

Web servers route incoming requests to the handler with a matching path (route) and request type (HTTP verb) combination (`GET`, `POST`, `DELETE`, etc.). A single path can map to multiple handlers if they share the same path but use different HTTP verbs. For example, the `/comments` path needs a separate handler for a GET and POST request. 

### Router suggestions

Go's `http` package has basic multiplexing and routing. Implementing advanced routing and pattern matching is complex and difficult to acheive good performance, so many applications use these packages:
- [httprouter](https://github.com/julienschmidt/httprouter): Julien Schmidt's fast routing package
- [Gorilla Mux](https://github.com/gorilla/mux): This was previously deprecated but is now in active development.
- [Gin](https://github.com/gin-gonic/gin): Says its 40x faster than httprouter.

## Handlers

A handler is any type or function that can respond to an HTTP request.

### Handler interface

To handle an HTTP request, a type or function must implement the `Handler` interface:

```go
type Handler interface {
	ServeHTTP(w http.ResponseWriter, r *http.Request)
}
```

So if you have a type `customHandler` with the `ServeHTTP` method, it is an `http.Handler`:

```go
type customHandler struct {}

func (c *customHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// logic
}
```
Notice that the `ServeHTTP` method does not return anything---it only writes to the writer, or reads the request object.

## Registering a Handler

"Registering a handler" means matching a path to a request handler function. Go provides multiple functions to register handlers. The names are similar, so they can be confusing. Here is a summary:
- `Handle`: Accepts a path and a Handler. The Handler is any type with a `ServeHTTP` method.
- `HandlerFunc`: An adaptor type that implements the `Handler` interface. You can use this to cast a function with the same signature as `ServeHTTP`. When you cast the function, the function gets access to the `ServeHTTP` method on the `HandlerFunc`.
- `HandleFunc`: A convenience method that lets you directly register a function as a handler. The handler must have the same signature as `ServeHTTP`. Under the hood, Go casts the function with `HandlerFunc`.

### Handle

You can register a Handler with the `Handle` method. This method accepts a path and Handler. The following example defines a custom type `homeHandler` that satisfies the `ServeHTTP` interface and registers that handler to the server's home (`/`) path:

```go
type homeHandler struct{}

func (c *homeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "My custom handler")
}

func main() {
	http.Handle("/", &homeHandler{})
	http.Handle("/", new(homeHandler)) 	// alternate syntax
	http.ListenAndServe(":8080", nil)
}
```

### HandlerFunc

The `HandlerFunc` is an adaptor that lets you register a regular function as a request handler. The regular function must have the same signature as the `ServeHTTP` method in the `Handler` interface:

```go
func homeHandler (w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "My custom handler")
}

func main() {
	http.Handle("/", http.HandlerFunc(homeHandler))
	http.ListenAndServe(":8080", nil)
}
```

The `HandlerFunc` type does implement the `Handler` interface, so when you cast your function into a `HandlerFunc`, your function can call its `ServeHTTP` method. 

### HandleFunc

`http.HandleFunc` is the simplest way to register a handler. It accepts a path and a function. The function must have the `func handlerName(res http.ResponseWriter, req *http.Request)` method signature:

```go
func helloWorldHandler(res http.ResponseWriter, req *http.Request) {
	fmt.Fprint(res, "Hello, my name is Superman")
}

func main() {
	http.HandleFunc("/hello", helloWorldHandler)
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
```

Under the hood, it wraps your function in `HandlerFunc`, so it is equivalent to the following:

```go
func main() {
	http.HandleFunc("/hello", HandlerFunc(helloWorldHandler))
	...
}
```

### Multiple handlers

Simple applications can define a handler for each path. The issue with this technique is that you have to register a handler for all possible paths you expect.

This example registers the handlers to the DefaultServerMux:

```go
func main() {
	http.HandleFunc("/hello", helloHandler)
	http.HandleFunc("/goodbye", goodbyeHandler)
	http.HandleFunc("/", homePageHandler)

	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}

func helloHandler(res http.ResponseWriter, req *http.Request) {
	// logic
}

func goodbyeHandler(res http.ResponseWriter, req *http.Request) {
	// logic
}

func homePageHandler(res http.ResponseWriter, req *http.Request) {
	// logic
}
```

## Query string parameters

You can extract values from a `URL`'s query string with the `Query()` method. It returns either the value or an empty string if there is no value for the specified key:

```go
func helloHandler(res http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	name := query.Get("name")
	if name == "" {
		name = "Superman"
	}
	fmt.Fprint(res, "Hello, my name is ", name)
}
```

## 404 errors

The `http` package provides a basic method for handling HTTP 404 errors. It returns `404 page not found` if the request does not match a path registered with the server:

```go
func homePageHandler(res http.ResponseWriter, req *http.Request) {
	if req.URL.Path != "/" {
		http.NotFound(res, req)
		return
	}
	fmt.Fprint(res, "The homepage")
}
```


You can find an in depth discussion about this technique in the Go article [Writing Web Applications](https://go.dev/doc/articles/wiki/).

## Path matching with routers

This example builds a router that uses path matching to map URL paths and HTTP methods to a handler:

```go
func main() {

	mux := http.NewServeMux()

	mux.HandleFunc("/hello", helloHandler)
	mux.HandleFunc("GET /goodbye/", goodbyeHandler)
	mux.HandleFunc("GET /goodbye/{name}", goodbyeHandler)

	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}

func helloHandler(res http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	name := query.Get("name")
	if name == "" {
		name = "Superman"
	}
	fmt.Fprint(res, "Hello, my name is ", name)
}

func goodbyeHandler(res http.ResponseWriter, req *http.Request) {
	path := req.URL.Path
	parts := strings.Split(path, "/")
	name := parts[2]
	if name == "" {
		name = "Superman"
	}
	fmt.Fprint(res, "Goodbye, ", name)
}
```


## Graceful shutdowns

All services should implement a _graceful shutdown_. A graceful shutdown handles all connections running when the server gets an interrupt of kill signal:
- Server stops receiving new requests
- Saves in-memory data to disk
- Ends and exits existing connections cleanly

Create a `handler` struct that implements `ServeHTTP`. In this example, `ServeHTTP` parses the URL for the `name` query string parameter, then writes either the parameter's value or `Superman`:

```go
type handler struct{}

func newHandler() *handler {
	return &handler{}
}

func (h *handler) ServeHTTP(res http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	name := query.Get("name")
	if name == "" {
		name = "Superman"
	}
	fmt.Fprint(res, "Hello, my name is ", name)
}
```

The `main` function contains the server and graceful shutdown logic:
1. Create a new `handler` with the constructor method.
2. Create a server with the handler.
3. Create a buffered channel that accepts OS signals.
4. Listen specifically for interrupt and kill signals.
5. Run the server in a separate go routine
6. Wait for a signal in the `stop` channel. This blocks the main thread from executing the remainder of the code until the channel receives a message.
7. Create a context that gives processes 5 seconds to complete their work before shut down.
8. `server.Shutdown(ctx)` waits until either all requests complete or the context expires.

```go
func main() {

	handleFunc := newHandler()                              // 1
	server := &http.Server{                                 // 2
		Addr:    ":8080",
		Handler: handleFunc,
	}

	stop := make(chan os.Signal, 1)                         // 3
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)    // 4

	go func() {                                             // 5
		fmt.Println("Starting server on ", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Server error: %v\n", err)
		}
	}()

	<-stop                                                  // 6
	fmt.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)     // 7
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {                                // 8
		fmt.Printf("Shutdown error: %v\n", err)
	} else {
		fmt.Println("Server stopped cleanly")
	}
}
```