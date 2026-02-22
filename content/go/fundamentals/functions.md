+++
title = 'Functions'
date = '2025-08-30T10:07:00-04:00'
weight = 30
draft = false
+++

## Variadic functions

A variadic function accepts as input a variable number of arguments of the same type. To define a variadic function, place `...` before the data type in the parameter description. Go converts a variadic parameter into a slice, so you can manipulate it with slice methods and techniques.

{{< admonition "Last parameter" warning >}}
If the function has more than one parameter, the variadic parameter must be the last parameter in the list.
{{< /admonition >}}

For example, this function accepts zero or more strings, which you can access with the `str` parameter. The list of variadic arguments is comma-delimited:

```go
func varString(str ...string) {
	for _, s := range str {
		fmt.Printf("%s ", s)
	}
	fmt.Println()
}
```

## Closures

A closure captures variables from its outer scope or environment---it retains its state after it finishes execution. This works because of how variables are assigned and garbage collected.

When a normal function is invoked, it is placed on the stack with its local variables. When the function returns, the function and its local variables are popped off the stack and deleted from memory.

When a closure returns, Go's runtime detects that the variables in the outer function are referenced by the inner function, so it doesn't delete the variable. Instead, it allocates space for the variables in the heap, and the enclosed function stores a pointer to the variable's address in the heap.

For example, when `outerFunc` returns, it is popped off the stack and deleted from memory, but `count` is allocated to the heap and referened by the returned anonymous function:

```go
func outerFunc() func() int {
	count := 0
	return func() int {
		count++
		return count
	}
}
```

### Middleware

The closure pattern is commonly used for middleware in web applications. For example, you can use a closure to add a logger to a handler rather than call a logging function within each handler.

This logger middleware "closes" over the `f` variable, which means the returned handler function can access `f` on the heap, even after `logger` returns:
1. `logger` accepts and returns an `http.HandlerFunc`, which is a function with the same signature as `ServeHTTP`.
2. `HandleFunc` expects this type, so you can wrap it around the `hello` handler.
3. The `return` statement returns a `HandlerFunc`---a function with a handler signature.
4. The anonymous returned function is closed over by `logger`, so it can access its variables from the heap. Here, it accesses `f` to call the function passed to `logger`. In the `main` method, it calls the `hello` handler.
5. The function logs to the console the length of time it takes to execute the handler.

```go
func main() {
	http.HandleFunc("/hello", logger(hello))                                // 2
	http.ListenAndServe(":8080", nil)
}

func hello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello World")
}

func logger(f http.HandlerFunc) http.HandlerFunc {                          // 1
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		f(w, r)
		end := time.Now()
		name := runtime.FuncForPC(reflect.ValueOf(f).Pointer()).Name()
		log.Printf("%s (%v)", name, end.Sub(start))                         // 3
	}
}
```

## Immediately invoked function literals (IIFL)

An IIFL is an anonymous function that you call at the end of the closing bracket. Goroutines are commonly executed as IIFLs:

```go
for _, file := range os.Args[1:] {
    wg.Add(1)
    go func(filename string) {
        compress(filename)
        wg.Done()
    }(file)
}
```

Here, we run a goroutine in an IIFL and pass the `file` value from the outer `for range` loop. Using separate variables (`file` and `filename`) ensures that each goroutine operates on a different file, one for each iteration.

If the goroutine closure captured `file`, all goroutines would share that same variable. This variable changes with each iteration, and it might be the same value by the time they execute. In other words, every goroutine might try to compress the last file passed to the `for range` loop.

Passing `file` as an argument to the IIFL means that it is evaluated immediately, and each goroutine gets its a unique copy of the `file` variable in each iteration.

## Function types

You can declare a type as a function. For example:
- Assign it to a variable
- Pass it as an argument
- Return it from another function
- Store it in a struct

Function types are a clean way to pass behavior in your program. They are similar to an interface, but they are not applied as broadly and are usually used for a simple abstraction.


### Strategy pattern

This pattern lets you pass different behavior into the same function.

1. Declare a function type. `Operation` is a function that takes two `int`s and returns an `int`:
   ```go
   type Operation func(int, int) int
   ```
2. `calculate` takes two `int`s and an `Operation` function type. The function calls the `Operation` function on the given `int` inputs:
   ```go
   func calculate(a, b int, op Operation) int {
	   return op(a, b)
   }
   ```
3. Now, you can define multiple functions that use the `Operation` signature:
   ```go
   func add(a, b int) int {
   	  return a + b
   }
   
   func subtract(a, b int) int {
   	  return a - b
   }
   
   func multiply(a, b int) int {
   	  return a * b
   }
   ```
4. Pass these functions to `calculate`, which defines its behavior:
   ```go
   func main() {
	   a := calculate(5, 4, add)
	   b := calculate(5, 4, subtract)
	   c := calculate(9, 2, multiply)
   }
   ```

### Dependency injection

This example creates a service that uses a function type to define what kind of notification it sends. 

1. Define the function type:
   ```go
   type SendFunc func(to, message string) error
   ```
2. Build a service that depends on it:
   1. Define the struct. The `NotificationService` type does not know what `send` does, only that it is a function that takes two strings and returns an error.
   2. A factory function. This is where the dependency injection occurs. You pass to the factory function a `SendFunc` function that is assigned to the new `NotificationService` instance.
   3. Create a `NotifyUser` method that calls a `SendFunc` with the given arguments. This is a closure that captures the arguments that you pass to the the `SendFunc`. In addition, it registers a function with the service that sends a not-yet-defined function.
   
      `send` returns an error, so we do not have to explicitly return an `error`.

   ```go
   type NotificationService struct {                                    // 1
	   send SendFunc
   }

   func NewNotificationService(send SendFunc) *NotificationService {    // 2
   	  return &NotificationService{send: send}
   }

   func (s *NotificationService) NotifyUser(user string) error {        // 3
      msg := "Welcome!"
      return s.send(user, msg)
   }
   ```
3. To implement the pattern, define a `SendFunc` function:
   ```go
   func testSend(to, message string) error {
	  fmt.Printf("--Test message--\nTo: %s\nMessage: %s\n", to, message)
	  return nil
   }
   ```
4. In `main`, create the service:
   1. Creat a `NotificationService`, and pass the `testSend` function to set its `send` field.
   2. Call the `NotifyUser` method and handle the error.
   ```go
   func main() {
	   svc := NewNotificationService(printSend)                          // 1
	   if err := svc.NotifyUser("alice@example.com"); err != nil {       // 2
	      log.Fatal(err)
	   }
   }
   ```

#### Production-grade 

If we were to implement this in production, we would want to remove the global dependency on STDERR, which is where the error is logged. To do this, we need to move the logic in `main` into a `run` function.

Define an `env` struct that stores the dependencies, and pass it to the `run` function:


```go
// dependencies
type env struct {
	stderr io.Writer
}

func run(e *env) error {
	svc := NewNotificationService(printSend)
	if err := svc.NotifyUser("alice@example.com"); err != nil {
		fmt.Fprintf(e.stderr, "%v\n", err)
		return err
	}
	return nil
}
```

Now, we can call the service from `main` and pass any Writer for STDERR. This makes our code composable and testable:

```go
func main() {
	if err := run(&env{stderr: os.Stderr}); err != nil {
		os.Exit(1)
	}
}
```