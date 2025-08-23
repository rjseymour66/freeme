+++
title = 'Interfaces'
date = '2025-08-23T17:46:10-04:00'
weight = 90
draft = false
+++

Interfaces are types that declare behavior. To implement an interface in Go, a user-defined type must a method set with signatures that exactly match the methods declared in the interface. If a type implements an interface, then a value of that type can be assigned to values of the interface type.


When you call a method that accepts an interface value, Go looks at the method set for the user-defined type and tries to find a method that implements the interface. The user-defined type is called the 'concrete type' because it provides the interface concrete behavior. For example, here are the `io.Reader` and `Stringer` interfaces with their signatures between the curly braces:

```go 
type Reader interface {
    Read(b []byte) (n int, err error)
}

type Stringer interface {
    String() string
}
```

A type implements the `io.Reader` interface if the following conditions are met:
- It has a method named `Read`
- This `Read` method accepts a slice of bytes ([]byte is a nil slice)
- The function returns an `integer` and an `error`

A type implements the `Stringer` interface if the following conditions are met:
- It has a method named `Stringer`
- The function returns a `string`

The following example implements the `Stringer` interface:

```go
type user struct {
    name    string
    age     int64
    email   string
}

func (u user) String() string {
    return fmt.Sprintf("My name is %s", u.name)
}
```

## Interface internals

Interface values are two-word data structures:
1. A pointer to an internal table called iTable. iTable contains information about the user-defined stored value that implements the interface---the value's type and its list of methods.
2. A pointer to the actual stored value.

Using the example in the previous section, the `Stringer` iTable contains information about the user type, which includes its list of methods. It also contains a pointer to the memory address that stores the actual user value. You cannot swap value and pointer receiver semantics with interface implementation.

If you implement an interface using a pointer receiver, then only pointers of that type implement the interface.