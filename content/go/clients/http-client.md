+++
title = 'HTTP client'
date = '2025-09-25T08:29:56-04:00'
weight = 10
draft = false
+++

{{< admonition "HTTPBin for testing" note >}}
You can test clients with [HTTPBin](https://httpbin.org/).
{{< /admonition >}}

Network programming in Go uses the `http` package---built on top of the `net` package---to perform the fundamental aspects of network programming:
1. Establish a connection to a remote server.
2. Retrieve data.
3. Close the connection gracefully.

Go's HTTP client can perform almost any HTTP request, and it is highly customizable.


## Basic client

A simple Go client performs a a helper function. Helper functions are a wrapper around a request a `Request` object and HTTP client. Other common helper functions include the following:
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


### Request object and Do

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

### POST

Send a POST request with a custom client. `Post` takes the URL, content type, and request body that is of type `io.Reader`. An easy way to create a Reader is with the `strings.NewReader`:
1. Create a client and set the timeout to one second.
2. Create a Reader from a string to pass as the request body.
3. Make the request.

```go
func main() {
	client := &http.Client{Timeout: time.Second} 									// 1
	body := strings.NewReader(`{"message": "Sending a request"}`) 					// 2
	res, err := client.Post("https://httpbin.org/post", "application/json", body) 	// 3
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

### Form data

Send form data to a server with the `PostForm` method:
1. Create a client and set the timeout to one second.
2. `url.Values` is a map used for form encoding. Its keys are strings, and its values are slices of strings. This lets you send form data if a field has multiple values. This expression creates a map literal.
3. `Add` takes a key and a value and stores it in the map. Because each key has a slice of strings as a value, you can add multiple values to the same key.
4. `PostForm` takes a URL and a `url.Values` type as parameters.

```go
func main() {
	client := &http.Client{Timeout: time.Second}
	formValues := url.Values{}
	formValues.Add("message", "Hello form!")
	formValues.Add("message", "Nice to meet you!")

	res, err := client.PostForm("https://httpbin.org/post", formValues)
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

### Cookies

To add a cookie to the request, create a Request object and use the `addCookie` method. HTTP is a stateless protocol, and cookies help you with things like authentication and user settings. Cookies are sent as a header in the following format: `Cookie: <key>=<value>`:
1. Create a client and set the timeout to one second.
2. Create a Request object. `NewRequest` takes a method, URL, and request body. We're not sending a body, so set that to `nil`.
3. Add a cookie to the `Header` field in the Request object with `AddCookie`.
4. Make the request with `Do`.


```go
func main() {
	client := &http.Client{Timeout: time.Second} 							// 1
	req, err := http.NewRequest("GET", "https://httpbin.org/cookies", nil) 	// 2
	if err != nil {
		panic(err)
	}
	req.AddCookie(&http.Cookie{ 											// 3
		Name:  "cookie",
		Value: "oreo",
	})

	resp, err := client.Do(req) 											// 4
	if err != nil {
		panic(err)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
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

## Reusing connections

### Keep-alive

HTTP keep-alive is a feature of the HTTP protocol that lets a single TCP connection be reused for multiple requests and responses. Go's `DefaultClient` uses the `http.DefaultTransport`, which enables HTTP keep-alive for 30 seconds. To maintain this default, do not change the `KeepAlive` setting in a custom client.


### Close response bodies

Another method to reuse connections is closing response bodies after you read them rather than deferring their closing until the caller returns.

For example, this snippet makes multiple GET requests and closes the body after each call.

1. Make a request.
2. Read the body.
3. Close the request body.
4. Do work with the body.

```go
func main() {
	res, err := http.Get("http://example.com")      // 1
	if err != nil {
		os.Exit(1)
	}

	body, err := io.ReadAll(res.Body)               // 2
	if err != nil {                 
		os.Exit(1)
	}
	res.Body.Close()                                // 3

	fmt.Println(body)                               // 4

	res2, err := http.Get("http://example.com")     // 1
	if err != nil {
		os.Exit(1)
	}

	body2, err := io.ReadAll(res2.Body)             // 2
	if err != nil {
		os.Exit(1)
	}
	res2.Body.Close()                               // 3

	fmt.Println(body2)                              // 4
}
```