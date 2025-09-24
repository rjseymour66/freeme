+++
title = 'Static files'
date = '2025-09-22T23:11:44-04:00'
weight = 30
draft = false
+++

Go's standard library can serve static files the same as a standalone web server like Apache or nginx.


## Serving files

### All files in a directory

You can use the `FileServer` function as the handler in `ListenAndServe` to serve files from a directory. It returns a `If-Modified-Since` HTTP header and `304 Not Modified` response if the file is already cached on the user's machine:

1. `http.Dir` implements the `FileSystem` interface. This means that the path you pass the function is treated like the root directory on disk that the program serves files from.  
   In this example, the app serves files from the `file/` directory. You do not need to specify a file because it serves all in that directory. If you were to go to `localhost:8080`, you would see a list of links to the files in the directory. When you clicked the link, you are sent to `localhost:8080/<filename>.html`.
2. Use `FileServer` as the server's handler.
```go
func main() {
	dir := http.Dir("./files")                                                      // 1
	if err := http.ListenAndServe(":8080", http.FileServer(dir)); err != nil {      // 2
		panic(err)
	}
}
```

### Specific file with handler

You can use `ServeFile` to serve a specific file with a handler. This example registers a handler with the `DefaultMux` server. The handler uses `ServeFile` to serve a file named `hello.html` at the web root path (`/`):
1. ``ServeFile` takes the response, request, and a file or directory string as its arguments.

```go
func main() {
	http.HandleFunc("/", hello)
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}

func hello(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./files/hello.html") 
}
```

### Subdirectories


1. Defines a root directory on your app's filesystem. This root directory is where you store static files to serve.
2. This line contains a few components:
   - `http.FileServer` returns a handler that serves files from the given directory (`./files/`).
   - `StripPrefix` returns a handler that removes the given string from the path before it serves HTTP requests. Here, it removes `/static/` from the path. It also accepts a handler, which is the `FileServer(dir)` handler.
      
      For example, if you are serving CSS from `/static/style.css`, `StripPrefix` changes the path from `/static/style.css` to `/style.css`, and then `FileServer` looks for the file in `./files/style.css`. So, if you go to `http://localhost:8080/static/style.css`, the server serves `./files/style.css` but still displays `http://localhost:8080/static/style.css` in the address bar.
3. Register the `/static/` path with the handler that serves the static files.
```go
func main() {
	dir := http.Dir("./files/")                                         // 1
	handler := http.StripPrefix("/static/", http.FileServer(dir))       // 2
	http.Handle("/static/", handler)                                    // 3
	http.HandleFunc("/", hello)
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}

func hello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Hello, World!")
}
```


## Embedding files in a binary

