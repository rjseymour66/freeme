+++
title = 'HTTP Servers'
date = '2025-08-20T16:15:43-04:00'
weight = 20
draft = false
+++


## Custom server

By default, Go uses the `DefaultServeMux` for the server. If you want a server with custom behavior, create a [Server struct](https://pkg.go.dev/net/http#Server). Here are its properties:

```go
type Server struct {
	Addr              string
	Handler           Handler
	TLSConfig         *tls.Config
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxHeaderBytes    int
	TLSNextProto      map[string]func(*Server, *tls.Conn, Handler)
	ConnState         func(net.Conn, ConnState)
	ErrorLog          *log.Logger
	BaseContext       func(net.Listener) context.Context
	ConnContext       func(ctx context.Context, c net.Conn) context.Context
}
```

### Timeouts

The following example creates a server with different timeout values:
1. Create a multiplex server.
2. Register the `timeoutHandler` to the `/timeout` path.
3. Create a custom server struct that runs on port 8000.
4. `IdleTimeout` closes all keep-alive connections after one minute. A keep-alive is HTTP connection reuse, where a single TCP connection is used to send and receive multiple HTTP requests and responses rather than opening a new connection.
   
   {{< admonition "Required" tip >}}
   Always set an `IdleTimout` for the server.
   {{< /admonition >}}
5. `ReadTimeout` sets the amount of time allowed to read the entire request body after the request is first accepted. If the read operation exceeds the setting, the connection is closed. By default, `IdleTimeout` uses the same setting as `ReadTimout` if it is not explicitly set.
6. `WriteTimeout` closes the connection if the server tries to write to the connection after the specified duration. It does not impact long-running handlers, it only impacts how long the handler can write from its buffer to the connection when it returns.
   The protocol determines when the timeout deadline occurs:
   - HTTP: 1 second after the request header is read.
   - HTTPS: 2 seconds after the request is accepted.
7. `TimeoutHandler` is a wrapper that returns a 503 error for any request that exceeds the timeout deadline.

```go
func main() {
	muxer := http.NewServeMux() 								// 1
	muxer.HandleFunc("GET /timeout", timeoutHandler) 			// 2

	server := http.Server{ 
		Addr:         ":8000",									// 3
		IdleTimeout:  time.Minute, 								// 4
		ReadTimeout:  1 * time.Second, 							// 5
		WriteTimeout: 2 * time.Second, 							// 6
		Handler: http.TimeoutHandler( 							// 7
			muxer, 2*time.Second, "request took too long"),
	}
	if err := server.ListenAndServe(); err != nil {
		panic(fmt.Sprintf("could not start server: %s", err.Error()))
	}
}
```

### Middleware

```go
var validAgent = regexp.MustCompile(`(?i)(chrome|firefox)`)

func uaMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userAgent := r.UserAgent()
		if !validAgent.MatchString(userAgent) {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		ctx := context.WithValue(r.Context(), "agent", userAgent)
		r = r.WithContext(ctx)
		next(w, r)
	}
}

func uaStatusHandler(w http.ResponseWriter, r *http.Request) {
	ua := r.Context().Value("agent").(string)
	fmt.Fprint(w, fmt.Sprintf("congratulations, you are using: %s", ua))
}

func main() {
	http.HandleFunc("GET /withcontext", uaMiddleware(uaStatusHandler))
	if err := http.ListenAndServe(":8000", nil); err != nil {
		panic("could not start server")
	}
}
```


### Graceful shutdown

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

## Routing

Routing means that your server receives a request and maps it to an internal function that can return a result to a client. In other words, the function _handles_ the request, which is also why the functions are called _request handlers_ or just _handlers_.

Web servers route incoming requests to the handler with a matching path (route) and request type (HTTP verb) combination (`GET`, `POST`, `DELETE`, etc.). A single path can map to multiple handlers if they share the same path but use different HTTP verbs. For example, the `/comments` path needs a separate handler for a GET and POST request. 

### Router suggestions

Go's `http` package has basic multiplexing and routing. Implementing advanced routing and pattern matching is complex and difficult to acheive good performance, so many applications use these packages:
- [httprouter](https://github.com/julienschmidt/httprouter): Julien Schmidt's fast routing package
- [Gorilla Mux](https://github.com/gorilla/mux): This was previously deprecated but is now in active development.
- [Gin](https://github.com/gin-gonic/gin): Says its 40x faster than httprouter.

### Built-in method routing

Built-in method routing was introduced in Go 1.22. It lets you specify the HTTP verb in the path definition in the server. For example, here is how you register a GET path:

```go
func main() {
	http.HandleFunc("GET /comments", getComments)
	if err := http.ListenAndServe(":8004", nil); err != nil {
		panic(err)
	}
}
```

Go's `ServeMux` parses the string to get the HTTP verb and path and store them in its routing table.

Here is a more complex example of an in memory comment API that registers a GET and POST route:
1. The `getComments` handler writes to the `w` response writer.
2. The `postComments` handler reads info from the `r` request.

```go
var comments []comment

func getComments(w http.ResponseWriter, r *http.Request) {
	commentBody := ""
	for i := range comments {
		commentBody += fmt.Sprintf("%s (%s)\n", comments[i].text, comments[i].dateString)
	}
	fmt.Fprintf(w, "Comments:\n%s", commentBody) 				// 1
}

func postComments(w http.ResponseWriter, r *http.Request) {
	commentText, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	comments = append(comments, comment{
		text: string(commentText), 
		dateString: time.Now().Format(time.RFC3339)
	})
	w.WriteHeader(http.StatusOK) 								// 2
}

func main() {
	http.HandleFunc("GET /comments", getComments)
	http.HandleFunc("POST /comments", postComments)
	if err := http.ListenAndServe(":8004", nil); err != nil {
		panic(err)
	}
}
```

To test the program, start the server, go to `localhost:8004/comments`, and run the following cURL command to create a comment:

```bash
curl -X POST http://localhost:8004/comments -d "This is a new comment"
```

{{< admonition "" note >}}
You only register GET and POST routes, so if you make a request with another verb you get a "Method Not Allowed" response.
{{< /admonition >}}

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

### Registering a Handler

"Registering a handler" means matching a path to a request handler function. Go provides multiple functions to register handlers. The names are similar, so they can be confusing. Here is a summary:

| Method        | Accepts             | Description                                                                                                                                                                                                                               |
| :------------ | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Handle`      | path and a Handler  | Handler is any type with a `ServeHTTP` method.                                                                                                                                                                                            |
| `HandlerFunc` | function            | An adaptor type that implements the `Handler` interface. You can use this to cast a function with the same signature as `ServeHTTP`. When you cast the function, the function gets access to the `ServeHTTP` method on the `HandlerFunc`. |
| `HandleFunc`  | path and a function | This is a convenience method that lets you directly register a function as a handler. The handler must have the same signature as `ServeHTTP`. Under the hood, Go casts the function with `HandlerFunc`.                                  |

#### Handle

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

#### HandlerFunc

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

#### HandleFunc

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

## Writing to a writer

There are multiple ways to write to a Writer, depending on the data that your handler returns.

### Raw bytes

Writing raw bytes to a handler is the lowest-level data you can write to a Writer. You might write bytes in the following scenarios:
- Sending a PDF or zip file
- Implementing streaming APIs
- Serving an image

```go
func rawWriteHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Raw write: Hello, world!"))
}
```

### Formatted text

Write formatted text when you need to send plain text or HTML responses. Use an `Fprint[f|ln]` function to write a formatted string:

```go
func fmtWriteHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Formatted write: Hello, %s!\n", "Ryan")
}
```

### JSON

Many APIs communicate with JSON messages:

```go
func jsonHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	data := map[string]any{
		"message": "Hello, JSON world!",
		"status":  "success",
	}
	json.NewEncoder(w).Encode(data)
}
```

### File server

```go
func fileHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "example.txt") // put a file named example.txt in the same directory
}

```

### Stream with io.Copy


```go
func streamHandler(w http.ResponseWriter, r *http.Request) {
	file, err := os.Open("example.txt")
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()
	io.Copy(w, file)
}
```

### Set a status code

```go
func statusHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated) // 201 Created
	fmt.Fprintln(w, "Resource created successfully!")
}

```

## Reading from a Reader

### Query string parameters

You can extract values from a `URL`'s query string with the `Query()` method. It returns either the value or an empty string if there is no value for the specified key:

```go
func helloHandler(res http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	name := query.Get("name")
	// Alternate:
	// name := req.URL.Query().Get("name")

	if name == "" {
		name = "Superman"
	}
	fmt.Fprint(res, "Hello, my name is ", name)
}
```

### Path parameters


{{< admonition "Third-party routers" tip >}}
Go can extract path parameters, but you might want to consider a router framework depending on the complexity and your needs:
- [Chi](https://github.com/go-chi/chi)
- [httprouter](https://github.com/julienschmidt/httprouter)
- [Gin](https://github.com/gin-gonic/gin)
{{< /admonition >}}

Beginning with Go 1.22, you can extract path parameters with the `PathValue`:

```go
var comments []comment

func getComments(w http.ResponseWriter, r *http.Request) {
	commentBody := ""
	for i := range comments {
		commentBody += fmt.Sprintf("%s (%s)\n", comments[i].text, comments[i].dateString)
	}
	fmt.Fprintf(w, "Comments:\n%s", commentBody) // 1
}

func getComment(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if commentID == 0 || len(comments) < commentID {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	fmt.Fprintf(w, "Comment %d: %s", commentID, comments[commentID-1].text)
}

func postComments(w http.ResponseWriter, r *http.Request) {
	commentText, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	comments = append(comments, comment{
		text:       string(commentText),
		dateString: time.Now().Format(time.RFC3339)})
	w.WriteHeader(http.StatusOK)
}

func main() {
	http.HandleFunc("GET /comments", getComments)
	http.HandleFunc("GET /comments/{id}", getComment)
	http.HandleFunc("POST /comments", postComments)
	if err := http.ListenAndServe(":8000", nil); err != nil {
		panic("could not start server")
	}
}
```

This requires a third-party router like Chi or Gorilla Mux:

```go
id := chi.URLParam(r, "id") // /users/123
```

### Headers

```go
func handler(w http.ResponseWriter, r *http.Request) {
    userAgent := r.Header.Get("User-Agent")
    fmt.Fprintln(w, "User-Agent:", userAgent)
}
```

### Forms

```go
func handler(w http.ResponseWriter, r *http.Request) {
    r.ParseForm() // required
    name := r.FormValue("name")
    fmt.Fprintln(w, "Form value:", name)
}
```

### Multipart Form Data

```go
func handler(w http.ResponseWriter, r *http.Request) {
    r.ParseMultipartForm(10 << 20) // 10 MB limit
    file, header, err := r.FormFile("upload")
    if err != nil {
        http.Error(w, "File error", http.StatusBadRequest)
        return
    }
    defer file.Close()
    fmt.Fprintf(w, "Uploaded file: %s\n", header.Filename)
}
```

### Body (raw bytes)

```go
func rawBytes(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Fprintln(w, "Raw body:", string(body))
}
```

### Decode JSON

```go
func decodeJSON(w http.ResponseWriter, r *http.Request) {
	var data map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Fprintln(w, "JSON data:", data)
}
```

### Stream request body

```go
func decodeJSON(w http.ResponseWriter, r *http.Request) {
	scanner := bufio.NewScanner(r.Body)
	for scanner.Scan() {
		fmt.Println("Line:", scanner.Text())
	}
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


