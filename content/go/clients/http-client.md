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


## Transport layer (TODO)

The transport layer sits between the application code and the network connection.

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

### Common errors

#### 2xx – Success

| Status Code | Name       | Description                                                          |
| ----------- | ---------- | -------------------------------------------------------------------- |
| 200         | OK         | The request succeeded and the server returned the requested data.    |
| 201         | Created    | The request succeeded, and a new resource was created.               |
| 202         | Accepted   | The request has been accepted for processing, but not completed yet. |
| 204         | No Content | The request succeeded, but there is no content to send back.         |

#### 3xx – Redirection

| Status Code | Name               | Description                                                                 |
| ----------- | ------------------ | --------------------------------------------------------------------------- |
| 301         | Moved Permanently  | The resource has been moved to a new permanent URL.                         |
| 302         | Found              | The resource is temporarily located at a different URL.                     |
| 303         | See Other          | The client should retrieve the resource using a GET request to another URI. |
| 304         | Not Modified       | The resource has not changed since the last request (used with caching).    |
| 307         | Temporary Redirect | The resource is temporarily located at a new URL, method not changed.       |
| 308         | Permanent Redirect | The resource has permanently moved to a new URL, method not changed.        |

#### 4xx – Client Error

| Status Code | Name                   | Description                                                                  |
| ----------- | ---------------------- | ---------------------------------------------------------------------------- |
| 400         | Bad Request            | The server could not understand the request due to invalid syntax.           |
| 401         | Unauthorized           | Authentication is required or has failed.                                    |
| 403         | Forbidden              | The client is authenticated but does not have permission to access resource. |
| 404         | Not Found              | The requested resource could not be found.                                   |
| 405         | Method Not Allowed     | The HTTP method is not supported for this resource.                          |
| 408         | Request Timeout        | The server timed out waiting for the request.                                |
| 409         | Conflict               | The request conflicts with the current state of the resource.                |
| 410         | Gone                   | The resource requested is no longer available and will not return.           |
| 413         | Payload Too Large      | The request body is larger than the server is willing to process.            |
| 415         | Unsupported Media Type | The request format is not supported by the server.                           |
| 429         | Too Many Requests      | The client has sent too many requests in a given time.                       |


#### 5xx – Server Error

| Status Code | Name                  | Description                                                                |
| ----------- | --------------------- | -------------------------------------------------------------------------- |
| 500         | Internal Server Error | A generic server error. Something went wrong on the server.                |
| 501         | Not Implemented       | The server does not support the functionality required to fulfill request. |
| 502         | Bad Gateway           | The server, acting as a gateway, received an invalid response.             |
| 503         | Service Unavailable   | The server is temporarily unable to handle the request (overloaded/down).  |
| 504         | Gateway Timeout       | The server, acting as a gateway, timed out waiting for an upstream server. |



### Check successful request

Here is a quick `if` clause to check whether a request returned a successful 2xx success code. If the status code is below 200 or greater than 300, it returns a formatted error with the HTTP status:

```go
if res.StatusCode < 200 || res.StatusCode > 300 {
    errFmt := "Unsuccessful HTTP request. Status: %s"
    return fmt.Errorf(errFmt, res.Status)
}
```
### Check error class

This snippet checks the error class with a `switch` statement:

```go
res, err := http.Get("https://example.com")
switch res.StatusCode {
case 300 <= res.StatusCode && res.StatusCode < 400:
    fmt.Println("Redirect Message")
case 400 <= res.StatusCode && res.StatusCode < 500:
    fmt.Println("Client error")
case 500 <= res.StatusCode && res.StatusCode < 600:
    fmt.Println("Server error")
}
```

### Creating custom errors

Custom errors give you more control over how you communicate your error codes. Your frontend application needs to consume the errors and present them within your application, and an API server needs to make errors that are consumable to HTTP clients. Standard HTTP plaintext errors are insufficient in both scenarios.

The `Error` function in the `http` package is plaintext only and sets `X-Content-Type-Options: nosniff` as a header, which means clients cannot try to guess the content type of the response.

Create custom errors as structs. Because HTTP is often parsed as JSON, include struct tags to control what is returned:
1. HTTP status code. For example, `404` or `500`. `json:"-"` means that this value is not included in the JSON response---it is used only in server logic. For example, the JSON consumed by the application does not need this value, but the API client can read it in the response on the protocol level.
2. This returns application-specific code, such as `1001` for invalid input. `omitempty` means that if this value is `0`, it is not marshaled into JSON.
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
6. Write the marshaled JSON to the `Response`.

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

### Using custom errors

This example uses the [custom error type](#creating-custom-errors) in an HTTP request. This error type implments the `Error` interface, which means you can return it where Go expects an `error` type:

```go
type Error struct {
	HTTPCode int    `json:"-"`
	Code     int    `json:"code,omitempty"`
	Message  string `json:"message"`
}

func (e Error) Error() string {
	fs := "HTTP: %d, Code: %d, Message: %s"
	return fmt.Sprintf(fs, e.HTTPCode, e.Code, e.Message)
}
```

The `get` method is a wrapper around the `http.Get` method with smarter error handling:
1. Use the native `Get` method and return any errors.
2. Check if this is a successful response:
   - If it was successful, skip the `if` clause and return the response and a `nil` error.
   - If it was not successful, perform additional error checking.
3. Check if the correct content type---JSON---was returned.
4. Read the response body into a buffer.
5. Create an anonymous `data` struct with the custom `Err` error type.
6. Unmarshal the buffer into the `data` struct. While parsing the JSON, if there is a top-level field named `error`, store its contents in `data.Err`.
7. Check whether there was an error parsing the JSON.
8. Set the `data.Err.HTTPCode` to the response status code.
9.  Return the response and the populated custom `Error` struct.

```go
func get(u string) (*http.Response, error) {
	res, err := http.Get(u)                                         // 1
	if err != nil {
		return res, err
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {              // 2
		if res.Header.Get("Content-Type") != "application/json" {   // 3
			sm := "Unknown error. HTTP status: %s"
			return res, fmt.Errorf(sm, res.Status)
		}

		b, _ := io.ReadAll(res.Body)                                // 4
		res.Body.Close()
		
        var data struct {                                           // 5
			Err Error `json:"error"`
		}
		err = json.Unmarshal(b, &data)                              // 6
		if err != nil {                                             // 7
			sm := "Unable to parse JSON: %s. HTTP status: %s"
			return res, fmt.Errorf(sm, err, res.Status)
		}

		data.Err.HTTPCode = res.StatusCode                          // 8
		return res, data.Err                                        // 9
	}
	return res, nil
}
```

Here is how you can call the method in the application. Notice how it behaves like the native `Get` method, but it return the custom `Error`:

```go
func main() {
	res, err := get("http://example.com")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	b, _ := io.ReadAll(res.Body)
	res.Body.Close()
	fmt.Printf("%s", b)
}
```

## JSON

The most common data format for REST APIs is JSON. Go's [encoding/json package](https://pkg.go.dev/encoding/json) provides all the tools required to parse JSON data into Go data structs.

When JSON data is parsed, it is _unmarshaled_. When you unmarshal a JSON object, you convert the JSON-encoded bytes into an in-memory representation, commonly a struct.

The following example parses JSON data into a struct. For simplicity, the JSON object is stored in a string, but it is more likely to be read from an HTTP response body:
1. Create the struct that models the data. Use struct tags to map a struct field to a field in the JSON object.
2. In-memory JSON object.
3. Create a `Person` object to hold the parsed JSON.
4. `json.Unmarshal` takes a slice of bytes and a pointer to a data structure to store the data. This method mutates the data, so remember to pass a memory address rather than a value.
5. Handle the error.
6. Do something with the parsed JSON.

```go
type Person struct {                            // 1
	Name string `json:"name"`
}
                                                // 2
var JSON = `{                                   
	"name": "Jimmy John"
}`

func main() {
	var p Personv                               // 3
	err := json.Unmarshal([]byte(JSON), &p)     // 4
	if err != nil {                             // 5
		fmt.Println(err)
		return
	}
	fmt.Println(p)                              // 6
}
```
### Unstructured JSON

In some circumstances, you might not know the structure of the JSON data before you consume it. To parse arbitrary JSON, unmarshal the data into an `interface{}`.

For example, here is an in-memory JSON object with an unknown schema:

```go
var ks = []byte(`{ 
"firstName": "Jean", 
"lastName": "Bartik", 
"age": 86, 
"education": [ 
     { 
            "institution": "Northwest Missouri State Teachers College", 
            "degree": "Bachelor of Science in Mathematics" 
     }, 
     {  
            "institution": "University of Pennsylvania", 
            "degree": "Masters in English" 
     } 
], 
"spouse": "William Bartik", 
"children": [ 
     "Timothy John Bartik", 
     "Jane Helen Bartik", 
     "Mary Ruth Bartik" 
]  
}`)
```

To parse the data, create an `interface{}` type and then unmarshal the JSON into a pointer to that interface:

```go
func main() {
	var f interface{}
	err := json.Unmarshal(ks, &f)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	fmt.Println(f)
}
```

After the data is marshaled into the `interface{}`, you need to inspect it. This table describes the types that Go unmarshals data into:

| JSON Type   | Go Type                  |
| ----------- | ------------------------ |
| **string**  | `string`                 |
| **number**  | `float64`                |
| **boolean** | `bool`                   |
| **null**    | `nil`                    |
| **array**   | `[]interface{}`          |
| **object**  | `map[string]interface{}` |

This method shows how you can walk through an unstructured JSON object to learn each field's type and value:

```go
func printJSON(v interface{}) {
	switch vv := v.(type) {
	case string:
		fmt.Println("is string,", vv)
	case float64:
		fmt.Println("is float64,", vv)
	case []interface{}:
		fmt.Println("is an array:")
		for i, u := range vv {
			fmt.Print(i, " ")
			printJSON(u)
		}
	case map[string]interface{}:
		fmt.Println("is an object:")
		for i, u := range vv {
			fmt.Print(i, " ")
			printJSON(u)
		}
	default:
		fmt.Println("Unknown type")
	}
}
```

## Semantic versioning


