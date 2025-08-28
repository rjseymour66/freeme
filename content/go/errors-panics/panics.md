+++
title = 'Panics'
date = '2025-08-27T08:13:49-04:00'
weight = 20
draft = false
+++

A panic indicates that a severe, often unrecoverable event occurred, and the program must exit immediately. This is likely a result of programmer error or environment state in which you are asking the program to do something that it cannot do.

When Go encounters a panic, it unwinds the stack looking for a handler for the panic. When Go reaches the top of the stack, it stops the program. "Unwinding" the stack means that Go finds the line of code that caused the panic, and then the line that called that, and so on. For example:
1. The code that caused the panic is on line 30 in `main.go`
2. The code that called line 30 is on line 19 in `main.go`

```bash
panic: runtime error: integer divide by zero

goroutine 1 [running]:
main.divide(...)
	/path/to/main.go:30         // 1 
main.main()
	/path/to/main.go:19 +0xe5   // 2
exit status 2
```

## Issuing a panic

A panic function accepts an empty interface, or `any`:

```go
panic(v any)
```
The best thing to pass a panic is an error:

```go
panic(errors.New("This is a panic"))
```

## Recovering from a panic

Panic recovery depends on deferred functions, which is when a function executes at the moment its parent function returns. This is often used to close files or sockets at the end of the function that opens them.

### Common pattern

The following example shows the most common pattern for panic recovery. `recoverFunc` uses a deferred closure function to capture the error that was passed to the panic:

```go
func main() {
	fmt.Println("Before panic...")
	recoverFunc()
	fmt.Println("...after panic")
}

func recoverFunc() {
	defer func() {
		if err := recover(); err != nil {
			fmt.Printf("Capturing the panic: %s (%T)\n", err, err)
		}
	}()

	panic(errors.New("Error returned in panic!"))
	fmt.Println("This line never executes")
}
```
Execution stops after the panic because when Go encounters a panic, it executes all deferred functions so they can recover the panic. When `recover` is called Go does the following:
1. Stops the panic
2. Returns the value passed to panic or it returns `nil`
3. Continues execution after the deferred function

### Recover with cleanup

