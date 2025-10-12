+++
title = 'Loops'
date = '2025-10-12T14:37:24-04:00'
weight = 100
draft = false
+++

In Go, every loop is a `for` loop.

## C-style loops

```go
for i := 0; i < 5; i++ {
    // do something
}
```

## while-style loops

Use the `for` keyword where other languages would use `while`:

```go
i := 0
for i < 5 {
    // Code to be executed in each iteration
    i++
}
for iterator.Next() {
    // do something
}

for line != lastLine {
    // do something
}

for !gotResponse || response.invalid() {
    // do something
}
```

## Infinite loops

Create an infinite loop with only the `for` keyword:

```go
for {
    // loop forever
}
```

## for...range

{{< admonition "Operates on a copy" warning >}}
The `for range` loop operates on a copy of the value, so it cannot mutate the value.
{{< /admonition >}}

The `for range` loop iterates over an array, slice, map, or channel using an index and value:

```go
for index, value := range iterable {
    // do something
}

m := map[string]int{"a": 1, "b": 2}
for key, value := range m {
    // Code using key and value
}
```

If you do not need the index, use the blank identifier:

```go
for _, value := range iterable {
    // do something
}
```