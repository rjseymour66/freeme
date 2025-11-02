+++
title = 'Structs'
date = '2025-08-22T08:46:30-04:00'
weight = 20
draft = false
+++

A struct is a user-defined type, and the most common way we represent data in Go. A struct is similar to a class in object-oriented languages, but there is no inheritance, and a struct is not an object. However, an instance of a struct is sometimes referred to as an object.

## Define a type

Define a custom type with the keyword `struct`:

```go
type Person struct {
	Id        int
	Name      string
	email     string
	BirthDate time.Time
}
```

Capitalized names are exported outside of the package. For example, the `Person` type and its `Id`, `Name`, and `BirthDate` fields are exported.

`email` is not directly accessible outside the package, similar to a private property. Use this pattern when you want to restrict access to fields. You might provide methods to mutate private field values.

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

### Function fields

Assigning a function to a struct field lets you assign a value to a struct field at runtime. This lets you change the behavior of an object without changing its type. This is called the Strategy Pattern. Some practical uses for this pattern include the following:
- A logger could switch its output stream. For example, from a file to stdout.
- A formatter could switch its schema from JSON to YAML.

To demonstrate, we define a `Person` struct that uses the `NameFormatter` function type for its `Name` field:

```go
type NameFormatter func(string, string) string

type Person struct {
	Id         int
	GivenName  string
	FamilyName string
	Name       NameFormatter
}
```

`NameFormatter` is a `func` type that only defines the signature. This gives the developer the freedom to format `Name` any way they want.

In the main method, we assign some anonymous functions to variables and assign them to a `Person` instance:
1. Create anonymous functions that use the `NameFormatter` signature.
2. Create a `Person`, and assign its `Name` field the `asian` function.
3. Call the function field. Even though `Name` is a field, you have to call it like a function because its type _is a function_.
4. Reassign the function.
5. Call the function field again.

```go
func main() {
	asian := func(givenName, familyName string) string {                            // 1
		return familyName + " " + givenName
	}

	western := func(givenName, familyName string) string {                          // 1
		return givenName + " " + familyName
	}

	asianPerson := Person{                                                          // 2
		Id:         1,
		GivenName:  "Jackie",
		FamilyName: "Chan",
		Name:       asian,
	}

	fmt.Println(asianPerson.Name(asianPerson.GivenName, asianPerson.FamilyName))    // 3
	asianPerson.Name = western                                                      // 4
	fmt.Println(asianPerson.Name(asianPerson.GivenName, asianPerson.FamilyName))    // 5
}
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