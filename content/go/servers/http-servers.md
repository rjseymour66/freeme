+++
title = 'HTTP Servers'
date = '2025-08-20T16:15:43-04:00'
weight = 20
draft = false
+++

## Web server vs web service

A _web application_ is a computer program that responds to an HTTP request by a client and sends back HTML to the client over HTTP. The web application is also called a _web server_, and the client is usually a browser. A web application generally consists of these three parts:
- Multiplexer: A router that matches the request URI to a handler function according to a URL route.
- Handlers: Functions that takes in a request, processes data from the request, and returns a response.
- Template engine: Engine that combines one or more templates with data and renders a response. This can be HTML, XML, plain text, or binary data like PDFs or images.

A _web service_ is a computer program that responds to an HTTP request by a client that is not a browser or human, but another computer program. Web services usually respond in JSON, but they also respond in binary formats.

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

### Middleware (!)

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
4. Use `signal.Notify` to listen specifically for interrupt and kill signals. This function lets you listen for one or more OS signals with a channel. When the program receives a signal, it sends it to the given channel.
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

### Suggested routers

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

### Path matching

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

| Method        | Accepts             | Description                                                                                                                                                                                                                                                                                                               |
| :------------ | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Handle`      | Path and a Handler  | Handler is any type with a `ServeHTTP` method.                                                                                                                                                                                                                                                                            |
| `HandlerFunc` | Function            | An adaptor type that implements the `Handler` interface. You can use this to cast a function with the same signature as `ServeHTTP`. When you cast the function, the function gets access to the `ServeHTTP` method on the `HandlerFunc`. Useful when you need to wrap a handler in another function, such as middleware. |
| `HandleFunc`  | Path and a function | This is a convenience method that lets you directly register a function as a handler. The handler must have the same signature as `ServeHTTP`. Under the hood, Go casts the function with `HandlerFunc`.                                                                                                                  |

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

{{< admonition "Best Practice" tip >}}
This method is the simplest way to register a handler.
{{< /admonition >}}

`http.HandleFunc` accepts a path and a function. The function must have the `func handlerName(res http.ResponseWriter, req *http.Request)` method signature:

```go
func helloWorldHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Hello, my name is Superman")
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

## Handling HTTP requests

Extract information from a request with `http.Request`, and send responses with the `http.ResponseWriter`.

## Reading requests

An `http.Request` is a Reader with many methods to help you extract information from the HTTP request. Some useful properties include the following:
- `URL`
- `Header`
- `Host`
- `Method`
- `Body`
- `Form`, `PostForm`, `MultiPartForm`


```go
// Method : GET, Host : localhost:8000Path : /hello/world, Query : map[name:[ricky]]
func hello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Method : %s, Host : %s", r.Method, r.Host)
	fmt.Fprintf(w, "Path : %s, Query : %s\n", r.URL.Path, r.URL.Query())
}

func main() {
	http.HandleFunc("/hello/world", hello)
	http.ListenAndServe(":800", nil)
}
```

### Query string parameters

`GET` and `DELETE` requests use query parameters to send additional information in a request. The additional information is often used to refine the values returned in the response. The most common use cases include the following:
- Filtering or searching information
- Pagination
- Sorting or ordering
- Optional values


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

Beginning with Go 1.22, you can extract path parameters with the `PathValue`. To define a path with a path parameter, enclose the parameter variable in curly braces (`{}`). The following example has a handler that retrieves the value for the `id` parameter and registers it to a path that includes the variable:
1. Get the path parameter value.
2. Register the path with the variable in curly braces.

```go
func getComment(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.Atoi(r.PathValue("id")) 			// 1
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if commentID == 0 || len(comments) < commentID {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	fmt.Fprintf(w, "Comment %d: %s",
		commentID, comments[commentID-1].text)
}

func main() {
	http.HandleFunc("GET /comments/{id}", getComment)			// 2
	if err := http.ListenAndServe(":8000", nil); err != nil {
		panic("could not start server")
	}
}
```
{{< admonition "Path matching" note >}}
Go normally routes to the longest matching path. However, it matches the most specific path when you use path variables.
{{< /admonition >}}

### Headers

The `Header` field of an `http.Request` is a map of all HTTP headers sent in the request. The keys are the header names, and the values are slices of strings in case the header appears more than once.

To get all `Headers`, use a `for...range` loop:

```go
func headers(w http.ResponseWriter, r *http.Request) {
	for k, v := range r.Header {
		fmt.Fprintf(w, "%s: %s\n", k, v)
	}
}
```

You can also use the `Get` method to retrieve a header by name:

```go
func handler(w http.ResponseWriter, r *http.Request) {
    userAgent := r.Header.Get("User-Agent")
    fmt.Fprintln(w, "User-Agent:", userAgent)
}
```

### Forms

When you submit a form in HTML, the browser encodes the submitted fields and sends them in the request body. These fields are specified with the `name` attribute. For example, the `username` and `password` fields are submitted from this form:

```html
<form action="/signup" method="POST">
  <input type="text" name="username">
  <input type="password" name="password">
  <button type="submit">Sign Up</button>
</form>
```

Form data is encoded in one of the following formats:
- `application/x-www-form-urlencoded`: Encoded like query parameters. For example, `username=john&password=secret`.
- `multipart/form-data`: Forms that send files or binary data.

#### Parsing forms

The `Request` type has a `Form`

When you receive POST form data, you need to parse the form and then extract values. The request method that parses the form depends on the encoding format:

| Format                              | Function             |
| :---------------------------------- | :------------------- |
| `application/x-www-form-urlencoded` | `ParseForm`          |
| `multipart/form-data`               | `ParseMultipartForm` |


These methods populate the `r.Form` and `r.PostForm` fields on the request object. The method you choose depends on how you want to handle the response. The following table describes how each method handles request data:

| Field        | Contents                                            |
| ------------ | --------------------------------------------------- |
| `r.Form`     | Query params and form values from the request body. |
| `r.PostForm` | Only form values from the request body.             |


In general, you can use `r.Form` unless you need to handle the query parameter values separate from the request body.

After you parse the form, you should always check for a parsing error:

```go
func formHandler(w http.ResponseWriter, r *http.Request) {
    if err := r.ParseForm(); err != nil {
        http.Error(w, "Parse error", http.StatusBadRequest)
        return
    }
	// logic
}
```

This handler processes form data for a commenting application:
1. Parse the form.
2. Check for parsing errors.
3. Get named form data from the `r.Form` field.
4. Create a comment in memory.
5. Redirect the user with the POST/Redirect/GET pattern. This pattern redirects the browser to a web page instead of showing a blank response. This is a pattern to prevent duplicate submissions. When the user submits a form with POST, the server processes the request then redirects the user to a GET page. Here, they are redirected to `/comments`, which displays a list of comments.

```go
func postHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() 												// 1
	if err := r.ParseForm(); err != nil {						// 2
		http.Error(w, "Parse error", http.StatusBadRequest)
		return
    }

	username := r.Form.Get("username") 							// 3
	commentText := r.Form.Get("comment")
	comments = append(comments, 								// 4
		comment{
			username:   username,
			text:       commentText,
			dateString: time.Now().Format(time.RFC3339),
		})

	http.Redirect(w, r, "/comments", http.StatusFound) 			// 5
}
```

#### Multipart Form Data

Multipart form data is an encoding that web browsers and HTTP clients use to send mixed data types, such as binary file data and text from fields. For example,you might have a form that uploads a file:

```html
<form enctype="multipart/form-data" method="post" action="/upload">
  <input type="file" name="uploadfile" />
  <input type="submit" value="Upload" />
</form>
```

To parse this data, use the request object's `ParseMultipartForm` method. This handler uploads a form and copies it to the `/tmp` directory on the server:
1. Parse the form with `ParseMultipartForm`. Pass this function the max amount of memory to allocate for the file upload operation. `10 << 20` is 10MB---it is a bitwise left shift operation that shifts the bits of the number 10 to the left by 20 places.
2. Retrieve the file with `FormFile`. This method returns the following:
   - A file that you read with any `Reader`.
   - Metadata about the uploaded file.
   - An error.
3. Close the file.
4. Print file metadata.
5. Create a file in `/tmp`. Use the file metadata to name the file.
6. Handle any errors.
7. Close the new file.
8. Copy the contents of the uploaded file into the newly created local file.

```go
func fileUploadHandler(w http.ResponseWriter, r *http.Request) {
    r.ParseMultipartForm(10 << 20) 											// 1

    file, handler, err := r.FormFile("uploadfile") 							// 2
    if err != nil {
        http.Error(w, "Error retrieving file", http.StatusBadRequest)
        return
    }
    defer file.Close() 														// 3

    fmt.Fprintf(w, "Uploaded File: %+v\n", handler.Filename) 				// 4
    fmt.Fprintf(w, "File Size: %+v\n", handler.Size)
    fmt.Fprintf(w, "MIME Header: %+v\n", handler.Header)

    // You can now save the file, read its contents, etc.
    // Example: save it to local disk
    dst, err := os.Create("/tmp/" + handler.Filename) 						// 5
    if err != nil {															// 6
        http.Error(w, "Unable to create file", http.StatusInternalServerError)
        return
    }
    defer dst.Close() 														// 7
    io.Copy(dst, file) 														// 8
}
```

### Body (raw bytes)

The `Body` field is an `io.ReaderCloser` that contains the requet body. A request body is available only if it is a request that includes one, such as a POST request.

You can read the entire body with `io.ReadAll`. This reads data until an EOF or an error. Make sure you cast the response as a string, or you receive the UTF-8 bytes:

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

### Cookies

You can read cookies with the request's `Cookie` method:
1. Create an empty string.
2. Check if there is a `username` cookie.
3. If the cookie is present, set `username` to the cookie value.

```go
func commentHandler(w http.ResponseWriter, r *http.Request) {

	username := ""
	usernameCookie, err := r.Cookie("username")
	if err == nil {
		username = usernameCookie.Value
	}

	// business logic
}
```

## Writing a response

There are multiple ways to write to a ResponseWriter, depending on the data that your handler returns.

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

### JSON services

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
#### URL parameters

When you need to respond with a specific resource, you can retrieve it with a URL parameter:

1. `init` reads raw JSON from a file and unmarshals it into memory.
2. `main` creates a router with the [Chi framework](https://github.com/go-chi/chi).
3. This registers a GET route with the `{id}` URL parameter, where `id` specifies the resource to return.

```go
func init() { 								// 1
	file, _ := os.Open("people.json")
	defer file.Close()
	data, _ := io.ReadAll(file)
	json.Unmarshal(data, &list)
}

func main() { 								// 2
	mux := chi.NewRouter()
	mux.Get("/people/{id}", people) 		// 3
	http.ListenAndServe(":8000", mux)
}
```

The `people` handler extracts the resource ID from the request URL, retrieves the resource, then sends a JSON response:
1. Set the Content-Type to JSON so the client knows what to expect.
2. Get the `id` from the URL path parameter.
3. If `id` is not a number, return an error.
4. Check if `id` is out of range. If it is less than 0 or greater than or equal to the length of the list, return an error.
5. Encode the list as JSON in the response. `NewEncoder` is a wrapper around a Writer, so pass it `ResponseWriter`. Encoder's have an `Encode` method that writes the JSON format of the given value to the stream (Writer) that `NewEncoder` wraps.

```go
func people(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json") 		// 1
	idstr := chi.URLParam(r, "id") 							// 2
	id, err := strconv.Atoi(idstr) 							// 3
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if id < 0 || id >= len(list) { 							// 4
		w.WriteHeader(http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(list[id]) 					// 5
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

#### HTTP status constants

HTTP status codes are grouped in classes that are identified by their range:

- **1xx (100–199)**: Informational. The request was received and processing continues.                              
- **2xx (200–299)**: Success.The request was successfully received, understood, and accepted.                
- **3xx (300–399)**: Redirection. Further action is needed by the client to complete the request.                 
- **4xx (400–499)**: Client Error. There’s a problem with the client’s request (e.g., bad syntax, not authorized). 
- **5xx (500–599)**: Server Error. The server understands the request but fails to fulfill it.                     

The following table describes the most common HTTP status codes and provides their Go constants:

| Status Code | Go Constant                      | Description                              |
| :---------- | :------------------------------- | :--------------------------------------- |
| 100         | `http.StatusContinue`            | Request received; client should continue |
| 200         | `http.StatusOK`                  | Request succeeded                        |
| 201         | `http.StatusCreated`             | Resource successfully created            |
| 202         | `http.StatusAccepted`            | Request accepted for processing          |
| 204         | `http.StatusNoContent`           | Success with no response body            |
| 301         | `http.StatusMovedPermanently`    | Resource permanently moved               |
| 302         | `http.StatusFound`               | Resource temporarily moved               |
| 304         | `http.StatusNotModified`         | Cached version is still valid            |
| 400         | `http.StatusBadRequest`          | Invalid request from client              |
| 401         | `http.StatusUnauthorized`        | Authentication required or failed        |
| 403         | `http.StatusForbidden`           | Client not allowed to access resource    |
| 404         | `http.StatusNotFound`            | Resource not found                       |
| 405         | `http.StatusMethodNotAllowed`    | HTTP method not allowed                  |
| 409         | `http.StatusConflict`            | Request conflicts with current state     |
| 422         | `http.StatusUnprocessableEntity` | Valid request but semantic error         |
| 429         | `http.StatusTooManyRequests`     | Client is rate limited                   |
| 500         | `http.StatusInternalServerError` | Generic server error                     |
| 502         | `http.StatusBadGateway`          | Invalid response from upstream server    |
| 503         | `http.StatusServiceUnavailable`  | Server temporarily unavailable           |
| 504         | ``http.StatusGatewayTimeout`     | Upstream server timeout                  |



### Cookies

Because HTTP is a stateless protocol, we use cookies to maintain state across requests. Cookies are ephemeral and easily re-created.

This handler reads comments from a form and sets a `username` cookie if it is not present in the request:
1. Parse the form.
2. Get the username value from the form.
3. Check if there is a `username` cookie.
4. If the cookie is present, override the form value with the value stored in the cookie.
5. Get the comment data from the form and create a comment object.
6. Set a cookie named `username` with the value either parsed from the form or stored in the active cookie. Set it to expire in 24 hours.

```go
func cookiePostHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() 											// 1

	username := r.Form.Get("username") 						// 2
	usernameCookie, err := r.Cookie("username") 			// 3
	if err == nil { 										// 4
		username = usernameCookie.Value
	}

	commentText := r.Form.Get("comment") 					// 5
	comments = append(comments, comment{
		username:   username,
		text:       commentText,
		dateString: time.Now().Format(time.RFC3339)},
	)

	http.SetCookie(w, &http.Cookie{ 						// 6
		Name:    "username",
		Value:   username,
		Expires: time.Now().Add(24 * time.Hour)},
	)
}
```

### 404 errors

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