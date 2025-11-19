+++
title = 'Web apps'
date = '2025-11-18T22:55:55-05:00'
weight = 30
draft = false
+++

Test HTTP applications or services with the `httptest.NewRecorder`, which you can use to create an `httptest.ResponseRecorder` to capture what was written the the `ResponseWriter`.

To demonstrate, here is a simple handler function that returns "Hello World" in the response:

```go
func hello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello World!")
}
```

To test, you need to register the handler function, create a `NewRecorder` that can simulate a ResponseWriter, create a test server, then check the values in the ResponseWriter:
1. Register the HTTP handler function to a path. This registers the handler to `http.DefaultServerMux`.
2. `httptest.NewRecorder()` helps test what was written to the ResponseWriter. It returns an initialized `ResponseRecorder`. A `ResponseRecorder` has the following fields: `Code`, `HeaderMap`, `Body`, and `Flushed`.
3. Create a new HTTP request.
4. Serve the request using a handler and the ResponseWriter you created. `ServeHTTP` dispatches the request to the handler function that matches its URL.
5. Check the response status code.
6. Check the response body.

```go
func TestHttpHello(t *testing.T) {
	http.HandleFunc("/hello", hello)                        // 1
	writer := httptest.NewRecorder()                        // 2
	request, _ := http.NewRequest("GET", "/hello", nil)     // 3
	http.DefaultServeMux.ServeHTTP(writer, request)         // 4

	if writer.Code != http.StatusOK {                       // 5
		t.Errorf("Response code is %v", writer.Code)
	}

	if expected, actual := "Hello, World!", writer.Body.String(); expected != actual {      // 6
		t.Errorf("Response body is %v", actual)
	}
}
```