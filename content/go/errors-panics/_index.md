+++
title = 'Errors and Panics'
date = '2025-08-18T10:58:11-04:00'
weight = 50
draft = false
+++

Differences between an error and a panic:
- An error indicates that a task was not successfully completed.
- A panic indicates that a severe, often unrecoverable event occurred, and the program must exit immediately. This is likely a result of programmer error or environment state.

## Errors

Go "bubbles up" errors to a receiver to be handled in one or more places in the call stack. An example is when you return an `error` type to the caller for handling. Errors are idiomatically returned as the last return value. For example:

```go
func main() {
	result, err := echoString("test!")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(result)
}

func echoString(s string) (string, error) {
	if s == "" {
		return "", errors.New("No string passed")
	}
	return s, nil
}
```


### Compact error checking

If a function or method returns only an `error`, you can assign the error and check it for `nil` on the same line:

```go
if err := returnErr(); err != nil {
    // handle error
}
```

## Creating errors

`errors.New` and `fmt.Errorf` work well when you do not need to create a custom error type

### errors.New

`errors.New` lets you create simple new errors:

```go
func echoString(s string) (string, error) {
	if s == "" {
		return "", errors.New("No string supplied")
	}
	return s, nil
}
```

### fmt.Errorf

The `fmt` package includes the `Errorf` function so you can create simple, custom formatted errors. `Errorf` works similar to `Printf` or `Sprintf`. The returned error uses the format specified in the formatted string:

```go
func echoString(s string) (string, error) {
	if len(s) <= 1 {
		return "", fmt.Errorf("Error: %s is not long enough", s)
	}
	return s, nil
}
```

### Custom error types

A custom error type is an error type that implements the `error` interface with additional functionality.

Here is the `error` interface:

```go
type error interface {
	Error() string
}
```

So, all you need is a type with a method named `Error` that returns a string. The type can include fields that provide additional information about the error. The following `ParseError` type could be used in a file parsing program. It contains a message `string` and `int` values that capture the line and character number where the error occurs. Its `Error` method has the same signature as the `error` interface, so it implicitly implements it:

```go
type ParseError struct {
	Message    string
	Line, Char int
}

func (p *ParseError) Error() string {
	format := "%s on line %d, char %d"
	return fmt.Sprintf(format, p.Message, p.Line, p.Char)
}
```

### Error variables (sentinel errors)

Some code needs to return errors in multiple locations. To make each error meaningful, you can create package-scoped error variables to return when a certain error occurs.

To create an error variable, create an error with `errors.New` and assign it to a variable:

```go
var ErrTimeout = errors.New("The request timed out")
var ErrRejected = errors.New("The request was rejected")
```

## Checking errors

### errors.Is

### errors.As


---

## Lost & found

This abbreviated syntax does not work well if the function returns two or more values because the values are scoped to the `if` clause. For multiple returns, its best to assign the values, then check the error value in a second clause.

You can either use `return` statements to exit when there is an error, or you can generate custom errors:
- return statements: avoids `switch` statements and `if/else` logic
- `os.Exit(1)`
- generic `err`
- custom errors
- 