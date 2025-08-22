+++
title = 'Web Servers'
date = '2025-08-20T16:15:43-04:00'
weight = 10
draft = false
+++

## systemd configuration

You should start and stop your servers with your operating system's initialization daemon, such as Ubuntu's systemd. Do not run your application as a daemon---use an initialization daemon to manage the execution of the application, including rules for service health and restarts.

Here is an example unit file for systemd:

```ini
[Unit]
Description=My Test Service         # Human-readable name for service
After=network.target                # Start only after system networking is up

[Service]
ExecStart=/usr/local/bin/myapp      # Command to start service

Restart=on-failure                  # systemd restarts service on failure
RestartSec=5

Environment=PORT=4002               # Environment variable
Environment=APP_ENV=production

User=myuser                         # Linux user acct that runs the app (instead of root)
Group=myuser                        # Linux group acct that runs the app

WorkingDirectory=/home/myuser/app   # Process cwd that might store config files or write logs to

StandardOutput=journal              # Set stdout to system journal
StandardError=journal               # Set stderr to system journal

[Install]
WantedBy=multi-user.target          # Start service when system is in multi-user mode (normal startup)
```

These commands manage the service with `systemctl`

```bash
systemctl reload myapp  # activate new configs without bringing service down
systemctl enable myapp  # start service when server boots
systemctl start myapp   # start the unit
systemctl stop myapp    # stop the unit
systemctl status myapp  # check unit status
```

### Creating a systemd service

Configure a Linux server to manage an application with systemd:

1. Copy your Go binary to a directory in your `$PATH`:
   ```bash
   cp app /usr/local/bin/
   chmod +x /usr/local/bin/app
   ```
1. Create a user for the service. Creating a dedicated user for a service ensures that the user can access only the files you grant to them and isolates the service from others in case it is compromised.
   
   This account creates a system account (`-r`) named `serviceuser` without shell access (`-s /bin/false`):
   ```bash
   useradd -r -s /bin/false serviceuser
   ```
2. Create a working directory for the app. This is where you can store configuration files or write logs, and it ensures filesystem saftey:
   ```bash
   mkdir -p /home/username/app
   chown -R username:username /home/username/app
   ```
3. Create a unit file for your service and store it in `/etc/systemd/system/app.service`:
   ```bash
   vim /etc/systemd/system/app.service
   # add file contents
   ```
4. Run the following `systemctl` commands so systemd loads the new service unit file, manages the service at boot, and starts the service:
   ```bash
   systemctl daemon-reload  # load new unit file
   systemctl enable app     # enable app at boot
   systemctl start app      # start service
   systemctl status app     # verify that the service started
   ```
5. Lastly, verify that the service is logging messages to the journal:
   ```bash
   journalctl -u app -f
   ```

## Router suggestions

Routing means that your server receives a request and maps it to an internal function that can return a result to a client. In other words, the function _handles_ the request, which is also why the functions are called _request handlers_ or just _handlers_.

Web servers route incoming requests to the handler with a matching path and request method combination (`GET`, `POST`, `DELETE`, etc.).

Go's `http` package has basic multiplexing and routing. Implementing advanced routing and pattern matching is complex and difficult to acheive good performance, so many applications use these packages:
- [httprouter](https://github.com/julienschmidt/httprouter): Julien Schmidt's fast routing package
- [Gorilla Mux](https://github.com/gorilla/mux): This was previously deprecated but is now in active development.
- [Gin](https://github.com/gin-gonic/gin): Says its 40x faster than httprouter.

## Handling requests

"Registering a handler" means matching a path to a request handler function. There are multiple ways you can do this with Go.

### HandleFunc

`http.HandleFunc` is the simplest way to register a handler. It accepts a path and a function. The function must have the `func handlerName(res http.ResponseWriter, req *http.Request)` method signature:

```go
func main() {
	http.HandleFunc("/hello", helloWorldHandler)

	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}

func helloWorldHandler(res http.ResponseWriter, req *http.Request) {
	fmt.Fprint(res, "Hello, my name is Superman")
}
```

### Query string parameters

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


You can find an in depth discussion about this technique in the Go article [Writing Web Applications](https://go.dev/doc/articles/wiki/).

### Path matching with routers

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