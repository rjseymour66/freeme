+++
title = 'Errors'
date = '2025-08-27T08:13:42-04:00'
weight = 10
draft = false
+++

An error indicates that a task was not successfully completed.

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


## Compact error checking

If a function or method returns only an `error`, you can assign the error and check it for `nil` on the same line:

```go
if err := returnErr(); err != nil {
    // handle error
}
```

{{< admonition "Note" note >}}
This abbreviated syntax is not ideal if the function returns two or more values because the values are scoped to the `if` clause. For multiple returns, its best to assign the values, then check the error value in a second clause.
{{< /admonition >}}

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
```

Here is a trivial example where the custom types are used in the function, and the caller (`main`) checks for the custom errors with `errors.Is` (you can also use normal error checking against `nil`):

```go
var ErrEmptyString = errors.New("No string supplied")
var ErrTooShort = errors.New("string must be longer than 1 character")

func main() {
	result, err := echoString("Test")

	if errors.Is(err, ErrEmptyString) {
		fmt.Println(ErrEmptyString)
	} else if errors.Is(err, ErrTooShort) {
		fmt.Println(ErrTooShort)
	} else {
		fmt.Println(result)
	}

}

func echoString(s string) (string, error) {
	switch {
	case s == "":
		return "", ErrEmptyString
	case len(s) == 1:
		return s, ErrTooShort
	default:
		return s, nil
	}
}
```

## Wrapping errors

Wrap errors with the `%w` formatting verb:

```go
fmt.Errorf("Error: %w", ErrEmptyString)
```

## Checking errors

### errors.Is

`errors.Is` helps you identify an error variable, also called a sentinel variable. It is a recursive implementation of `errors.Unwrap`, which can identify a sentinel error when the error is returned directly from the caller. `errors.Is` is better because it handles bubbling up the error chain.

This trivial example wraps the error to provide additional information:

```go
func main() {
	result, err := echoString("Test")

	if errors.Is(err, ErrEmptyString) {
		log.Println(err)
	}
	...

}

func echoString(s string) (string, error) {
	switch {
	case s == "":
		return "", fmt.Errorf("Error: %w", ErrEmptyString)
	...
	}
}
```

### errors.As

`errors.As` checks if the error is of a specific type and assigns it to a variable. It accepts an error and a pointer to a variable of the custom error type. When you call `errors.As`, it checks if the error value is the same type as the pointer variable. If so, it assigns the error to the variable. This is helpful if you want to access additional fields in a custom error that implements the `error` interface.

This example creates a custom error that contains a `Code` and a `Message`. The `returnError` method returns an error of this type with a specific error code. The `main` method does the following:
1. Assigns to a variable the error returned from `returnError`.
2. Creates a variable of type `CustomError`.
3. Checks whether the error is a `CustomError` type. If there is a match, `err` is assigned to `&cError`.
4. Logs the `Code` value of the newly assigned `cError` variable.

```go
type CustomError struct {
	Message string
	Code    int
}

func (e *CustomError) Error() string {
	return e.Message
}

func returnError() error {
	return fmt.Errorf("Wrapped error: %w", &CustomError{Message: "This is an error message", Code: 42})
}

func main() {
	err := returnError()                                    // 1

	var cError *CustomError                                 // 2
	if errors.As(err, &cError) {                            // 3
		log.Println("Got error with code:", cError.Code)    // 4
	}
}
```