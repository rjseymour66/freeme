+++
title = 'HTTP client'
date = '2025-09-25T08:29:56-04:00'
weight = 10
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

## Timeouts

Timeout errors occur when the client waits too long for a response from a server and terminates the operation or connection. This might happen whether or not you explicitly set a timeout. You can detect a timeout error and retry the operation. The server might respond, or you might be routed to another running instance.

### Detecting error types

Each error type in the `net` package has a `Timeout()` method that returns `true` when there is a timeout. When an error is returned from the `net` package, you can check it against known cases that show a timeout error. This table describes some common error types and their triggers:

| Error Type     | Source                                          | Example Trigger                                    |
| -------------- | ----------------------------------------------- | -------------------------------------------------- |
| `*url.Error`   | `http.Client` methods (`http.Get`, `Do`, etc.)  | Invalid domain or bad URL                          |
| `*net.OpError` | Low-level networking (`net.Dial`, `net.Listen`) | Connection refused, DNS failure, read/write errors |
| `net.Error`    | Interface implemented by many network errors    | Timeout or temporary error                         |

Here is an example of how to check for these error types with a `switch` statement:

```go
func hasTimedOut(err error) bool {
	switch err := err.(type) {
	case *url.Error:
		if err, ok := err.Err.(net.Error); ok && err.Timeout() {
			return true
		}
	case net.Error:
		if err.Timeout() {
			return true
		}
	case *net.OpError:
		if err.Timeout() {
			return true
		}
	}

	errTxt := "use of closed network connection"
	if err != nil && strings.Contains(err.Error(), errTxt) {
		return true
	}
	return false
}
```

The following example is how you can use `hasTimedOut`:

```go
func main() {
	client := &http.Client{Timeout: time.Second}
	res, err := client.Get("https://www.manning.com/")
	if hasTimedOut(err) {
		panic("request has timed out")
	}
	if err != nil {
		panic("not a timeout error")
	}

	// read res.Body
}
```

### Resuming after timeout

In some circumstances, a timeout occurs when you download a large resource, and you do not want to restart the download from the beginning.

If a server that range requests, it sends the `Accept-Ranges: bytes` server response header. It either supports `bytes` or `none`.

The `download` function accepts the following arguments:
- `location`: URL for the resource` (a URL), 
- `file`: pointer to an open file where the data is written
- `retries`: number of times to retry on timeout errors

This funciton uses the `hasTimedOut` function described in [Detecting error types](#detecting-error-types):
1. Create a new GET request with the `location` argument.
2. Get details about the opened file you are writing to. `Stat` returns a [`FileInfo`](https://pkg.go.dev/io/fs#FileInfo).
3. If the opened file has any `Size()`, then you are resuming an interrupted download. `start` is a size in bytes, so you get the `string` representation of that value with `FormatInt` so you can pass it to the `Range` header.
   
   The `Range` header accepts the range of bytes that you want to retrieve in the format `Range: bytes=<start>-<end>`. Because we want to resume the download, we only specify the `start` value when we set the `Range` header in our request. For more information about `Range`, see the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Range#syntax).
4. Create a custom client with a 5 minute timeout.
5. Send the request.
6. If the request returns a timeout error and there are retries remaining, call `download` to resume the download. Decrement the `retries` argument when you call `download`.
7. If there was an error that was not a timeout error, return the error.
8. Verify that the server responded with a 2xx success code.
9. Check if the server supports range requests. If not, set `retries` to `0` because you cannot resume a download.
10. Write the response into the local file with `Copy`.
11. If there is an error during a `Copy` operation, check if it is a timeout error. If it is a timeout error and retries remain, resume the download. Otherwise, return the error.

```go
func download(location string, file *os.File, retries int64) error {
	req, err := http.NewRequest("GET", location, nil)           // 1
	if err != nil {
		return err
	}

	fi, err := file.Stat()                                      // 2
	if err != nil {
		return err
	}

	current := fi.Size()                                        // 3
	if current > 0 {
		start := strconv.FormatInt(current, 10)
		req.Header.Set("Range", "bytes="+start+"-")
	}

	cc := &http.Client{Timeout: 5 * time.Minute}                // 4
	res, err := cc.Do(req)                                      // 5
	
    if err != nil && hasTimedOut(err) {                         // 6
		if retries > 0 {
			return download(location, file, retries-1)
		}
		return err
	} else if err != nil {                                      // 7
		return err
	}

	if res.StatusCode < 200 || res.StatusCode > 300 {           // 8
		errFmt := "Unsuccessful HTTP request. Status: %s" 
		return fmt.Errorf(errFmt, res.Status)
	}

	if res.Header.Get("Accept-Ranges") != "bytes" {             // 9
		retries = 0
	}

	_, err = io.Copy(file, res.Body)                            // 10
	if err != nil && hasTimedOut(err) {                         // 11
		if retries > 0 {
			return download(location, file, retries-1)
		}
		return err
	} else if err != nil {
		return err
	}
	return nil
}
```

{{< admonition "Improvement" tip >}}
You can improve this by adding a function that checks the file hash to confirm the integrity of the downloaded file.
{{< /admonition >}}

Here is the code that calls `download` and writes to a local file:
1. Create the file.
2. Invoke `download` with 100 retries.
3. Get file metadata so you can log the number of bytes downloaded.
4. Log the number of bytes downloaded.

```go
func main() {
	file, err := os.Create("file.zip")                          // 1
	if err != nil {
		fmt.Println(err)
		return
	}
	defer file.Close()
	location := "https://example.com/file.zip"
	err = download(location, file, 100)                         // 2
	if err != nil {
		fmt.Println(err)
		return
	}

	fi, err := file.Stat()                                      // 3
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Printf("got it with %v bytes downloaded", fi.Size())    // 4
}
```

## Errors

A client can read error messages and codes from the response. This snippet prints the value of each:
1. `Status` provides a text message for the response status. For example, `200 OK` or `404 Not Found`.
2. `StatusCode` provides the status code as an integer.

```go
func main() {
	res, _ := http.Get("http://example.com")
	fmt.Println(res.Status)                     // 1
	fmt.Println(res.StatusCode)                 // 2
}
```
### Check successful request

Here is a quick `if` clause to check whether a request returned a successful 2xx success code. If the status code is below 200 or greater than 300, it returns a formatted error with the HTTP status:

```go
if res.StatusCode < 200 || res.StatusCode > 300 {
    errFmt := "Unsuccessful HTTP request. Status: %s"
    return fmt.Errorf(errFmt, res.Status)
}
```

### Creating custom errors

Custom errors give you more control over how you communicate your error codes. Your frontend application needs to consume the errors and present them within your application, and an API server needs to make errors that are consumable to HTTP clients. Standard HTTP plaintext errors are insufficient in both scenarios.

The `Error` function in the `http` package is plaintext only and sets `X-Content-Type-Options: nosniff` as a header, which means clients cannot try to guess the content type of the response.

Create custom errors as structs. Because HTTP is often parsed as JSON, include struct tags to control what is returned:
1. HTTP status code. For example, `404` or `500`. `json:"-"` means that this value is not included in the JSON response---it is used only in server logic. For example, the JSON consumed by the application does not need this value, but the API client can read it in the response on the protocol level.
2. This returns application-specific code, such as `1001` for invalid input. `omitempty` means that if this value is `0`, it is not marshalled into JSON.
3. Human readable string that is always returned in the JSON message.
   
```go
type Error struct {
	HTTPCode int    `json:"-"`                  // 1
	Code     int    `json:"code,omitempty"`     // 2
	Message  string `json:"message"`            // 3
}
```

This outputs an error in the following format:
```json
{
    "error": {
        "code": 123,
        "message": "An Error Occurred"
    }
}
```

1. Create an anonymous struct that contains your custom error type. The struct tag wraps the custom error in another struct under the key `error`. This essentially renames the object from `Err` to `error` in the JSON output. For example, if you do not wrap the error in `error`, it outputs like this:
   
   ```json
   {
      "Err": {
         "code": 123,
         "message": "An Error Occurred"
      }
   }
   ```
   Wrapping the error makes the output clear, and also lets you extend the response. For example, you might want to return additional information at the same level as `error`, such as a `data` object or metadata like a `trace-id`.
2. Marshal the struct into memory in JSON format.
3. If the marshalling fails, return an HTTP 500 error.
4. Set the response header to notify the client the response includes data in JSON format.
5. Write the status code with the custom error.
6. Write the marshalled JSON to the `Response`.

```go
func JSONError(w http.ResponseWriter, e Error) {
	data := struct {                                        // 1
		Err Error `json:"error"`
	}{e}
	b, err := json.Marshal(data)                            // 2
	if err != nil {                                         // 3
		http.Error(w, "Internal Server Error", 500) 
		return
	}
	w.Header().Set("Content-Type", "application/json")      // 4
	w.WriteHeader(e.HTTPCode)                               // 5
	fmt.Fprint(w, string(b))                                // 6
}
```

You can use `JSONError` in a handler. This handler creates an `Error` type and then writes it as JSON to the response:

```go
func displayError(w http.ResponseWriter, r *http.Request) {
	e := Error{
		HTTPCode: http.StatusForbidden,
		Code:     123,
		Message:  "An Error Occurred",
	}
	JSONError(w, e)
}
```

### Consuming custom errors




## Transport layer (TODO)

The transport layer sits between the application code and the network connection.