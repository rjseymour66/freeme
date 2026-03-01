+++
title = 'Testing Servers and Services'
linkTitle = "Testing"
date = '2026-03-01T16:09:09-05:00'
weight = 70
draft = false
+++



## Testing

### Test servers

```go
func TestSendN(t *testing.T) {
	t.Parallel()

	var hits atomic.Int64

	srv := httptest.NewServer(http.HandlerFunc(
		func(_ http.ResponseWriter, _ *http.Request) {
			hits.Add(1)
		},
	))
	defer srv.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL, http.NoBody)
	if err != nil {
		t.Fatalf("creating http requests: %v", err)
	}
	results, err := SendN(t.Context(), 10, req, Options{
		Concurrency: 5,
	})
	if err != nil {
		t.Fatalf("SendN() err=%v, want nil", err)
	}

	for range results { // just consume the results
	}

	if got := hits.Load(); got != 10 {
		t.Errorf("got %d hits, want 10", got)
	}
}
```

### Services


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