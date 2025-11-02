+++
title = 'Maps'
date = '2025-11-02T09:56:45-05:00'
weight = 40
draft = false
+++


A map provides you with an unordered collection of key/value pairs. maps are unordered collections, and there’s no way to predict the order in which the key/value pairs will be returned because a map is implemented using a hash table
The map’s hash table contains a collection of buckets. When you’re storing, removing, or looking up a key/value pair, everything starts with selecting a bucket. This is performed by passing the key—specified in your map operation—to the map’s hash function. The purpose of the hash function is to generate an index that evenly distributes key/value pairs across all available buckets.

The strength of a map is its ability to retrieve data quickly based on the key. They do not have a capacity or a restriction on growth.
Use len() to get the length of the map
The map key can be a value from any built-in or struct type as long as the value can be used in an expression with the == operator. You CANNOT use:
- slices
- functions
- struct types that contain slices

### Creating and initializing

To create a map, use `make` or a map literal. The map literal is idiomatic:

```go
// create with make
dict := make(map[string]int)

// create and initialize as a literal IDIOTMATIC
dict := map[string]string{"Red": "#da1337", "Orange": "#e95a22"}

// slice as the value
dict := map[int]string{}

// assigning values with a map literal
colors := map[string]string{}
colors["Red"] = "#da137"

// DO NOT create nil maps, they result in a compile error
var colors map[string]string{}

```

### Finding keys with ok

Maps return Boolean values that indicate whether a key exists in a map. The common Go idiom is to name this Boolean `ok`.

> Map keys must be comparable and hashable. This means you cannot use a slice, map, or function.

The following example searches a map and returns whether the key `"blue"` exists in the map:

```go
val, ok := mapname["blue"]
if ok {...}

// compact version
if val, ok := mapname["blue"]; ok {
    // ...
}
```

Some Go code uses the word `exists` or `found` in place of `ok`:
```go
value, exists := colors["Blue"]

if exists {
    fmt.Println(value)
}
```
Return the value and test for the zero value to determine if the key if found:
```go
value, found := colors["Blue"]

if value != "" {
    fmt.Println(value)
}
```

### Iterating over maps with the for range loop

This works the same as slices, except index/value -> key/value:

```go
// Create a map of colors and color hex codes.
colors := map[string]string{
    "AliceBlue":   "#f0f8ff",
    "Coral":       "#ff7F50",
    "DarkGray":    "#a9a9a9",
    "ForestGreen": "#228b22",
}

// Display all the colors in the map.
for key, value := range colors {
    fmt.Printf("Key: %s  Value: %s\n", key, value)
}
```

Use the built-in function `delete` to remove a value from the map:

```go
delete(colors, "Coral")
```

### Passing maps to functions

Functions do not make copies of the map. Any changes made to the map by the function are reflected by all references to the map:

```go
func main() {
    // Create a map of colors and color hex codes.
    colors := map[string]string{
       "AliceBlue":   "#f0f8ff",
       "Coral":       "#ff7F50",
       "DarkGray":    "#a9a9a9",
       "ForestGreen": "#228b22",
    }

    // Call the function to remove the specified key.
    removeColor(colors, "Coral")

    // Display all the colors in the map.
    for key, value := range colors {
        fmt.Printf("Key: %s  Value: %s\n", key, value)
    }
}

// removeColor removes keys from the specified map.
func removeColor(colors map[string]string, key string) {
    delete(colors, key)
}
```

```go
// create with make
dict := make(map[string]int)

// create and initialize as a literal IDIOTMATIC
dict := map[string]string{"Red": "#da1337", "Orange": "#e95a22"}

// slice as the value
dict := map[int]string{}

// assigning values with a map literal
colors := map[string]string{}
colors["Red"] = "#da137"

// DO NOT create nil maps, they result in a compile error
var colors map[string]string{}

// map with a struct literal value
var testResp = map[string]struct {
	Status int 
	Body string 
} {
	//...
}
```