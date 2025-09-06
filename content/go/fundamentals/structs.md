+++
title = 'Structs'
date = '2025-08-22T08:46:30-04:00'
weight = 20
draft = false
+++

A struct is a user-defined type, and the most common way we represent data in Go. It is similar to an object in object-oriented languages like Java.

## Define a type

Define a custom type with the keyword `struct`:

```go
type user struct {
    name    string
    age     int64
    email   string
}
```

### Zero-value (idiomatic)

The idiomatic way to declare a variable of a custom type is called the zero-value declaration:

```go
var bill user
```

### Anonymous

You can also declare an anonymous struct, which is is common in testing. The anonymous struct defines the type directly followed by its values, and assigns the values to a variable in one expression:

```go
sally := struct {
    name  string
    age   int64
    email string
}{
    name:  "Sally",
    age:   25,
    email: "email@example.com",
}
```

### Struct literal

If you know the values that you want to assign the type at declaration, you can use a struct literal:

```go
sally := user{
    name:  "Sally",
    age:   25,
    email: "email@example.com",
}
```

### Type alias

You can also use an existing type as the specification of a new type:

```go
type Distance int64

type List []string
```

## Methods

You can embed a function in the `struct` definition, but an embedded function cannot access the parent struct and must be passed as a value during instantiation. For these reasons, you should declare functions as methods of the custom type.

A method is a function that is bound to the custom type and adds behavior to that type. It takes a receiver type followed by the function signature. You can declare methods with either value or pointer receivers.

### Value receivers

Methods declared with a value receiver always operate against a copy of the caller. Use value receivers when you do not need to mutate the caller.

Here, we try to increase the age of the user. Because `Birthday` uses a value receiver, it cannot change the `age` value of a `user` instance:

```go
type user struct {
	name  string
	age   int64
	email string
}

func (u user) Birthday() {
	u.age = u.age + 1
}

fmt.Println("age: ", sally.age)     // 25
sally.Birthday()
fmt.Println("age: ", sally.age)     // 25
```

### Pointer receivers

Pointer receivers share the caller values with the method values. They operate on the actual value, and any changes are reflected in the caller after the method invocation. Use method receivers when you need to mutate a value.

To declare a pointer receiver, add an asterisk (`*`) in front of the type in the receiver definition:

```go
func (u *user) Birthday() {
	u.age = u.age + 1
}
```
Now, when you call `Birthday`, the `age` field increases by one.

{{< admonition "Automatic dereferencing" note >}}
Go automatically dereferences receivers for method calls. In other words, if you call a value receiver method on a pointer, Go will operate against the pointer, and vice versa.
{{< /admonition >}}