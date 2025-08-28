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

### Basic pattern

The following example shows the most common pattern for panic recovery. `recoverFunc` uses a deferred closure function to capture the error that was passed to the panic:

```go
func main() {
	fmt.Println("Before panic...")
	recoverFunc()
	fmt.Println("...after panic")
}

func recoverFunc() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("Capturing the panic: %s (%T)\n", r, r)
		}
	}()

	panic(errors.New("Error returned in panic!"))
	fmt.Println("This line never executes")
}
```

{{< admonition "Deferred closure scope" tip >}}
Remember that deferred closures have access to variables declared before the deferred function, but not afterwards. This is because deferred functions are evaluated in order but executed when the function returns.
{{< /admonition >}}

Execution stops after the panic because when Go encounters a panic, it executes all deferred functions so they can recover the panic. When `recover` is called Go does the following:
1. Stops the panic
2. Returns either the value passed to panic or `nil`
3. Continues execution after the deferred function

### Recover with cleanup

Here is an example that reads a file and uses deferred functions to clean up resources and capture panics.

One important technique to notice is that the `OpenFile` function uses named returned values. This lets us reference the return values within the deferred closure function and return the correct values:
1. Closes the `file` return value.
2. Converts the panic into an error by assert-assigning the panic value `r`.

`file` and `err` are named return values, so this makes sure that the caller (`OpenFile`) receives the correct return values:

```go
func main() {
	var file io.ReadCloser
	file, err := OpenFile("file.md")
	if err != nil {
		fmt.Printf("Error: %s", err)
		return
	}
	defer file.Close()
	// do work
}

func OpenFile(filename string) (file *os.File, err error) {
	defer func() {
		if r := recover(); r != nil {
			file.Close()                                        // 1
			err = r.(error)                                     // 2
		}
	}()

	file, err = os.Open(filename)
	if err != nil {
		fmt.Printf("Failed to open file\n")
		return file, err
	}

	ParseFunc(file)
	return file, err
}

func ParseFunc(f *os.File) {
	panic(errors.New("Parse failed"))
}
```

## Goroutines

A goroutine starts the execution of a function call as an independent concurrent thread of control within the same address space.