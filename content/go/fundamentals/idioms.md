+++
title = 'Idioms and language features'
linkTitle = 'Idioms'
date = '2025-08-12T23:23:49-04:00'
weight = 90
draft = false
+++


## Naked returns

You can return a function with only the `return` keyword when you name your return values and then assign them values in your function. For example:

```go
func nakedReturn() (a, b string) {
	a = "First string"      // named return vals
	b = "second string"
	return                  // naked return
}
```

## comma-ok

Maps:

```go
m := map[string]int{"a": 1}
v, ok := m["a"] // v = 1, ok = true
x, ok := m["b"] // x = 0 (zero value), ok = false
```

Type assertions:

```go
var i interface{} = "hello"
s, ok := i.(string) // s = "hello", ok = true
n, ok := i.(int)    // n = 0, ok = false
```

Channel receives to check if a channel is closed:

```go
ch := make(chan int)
close(ch)
v, ok := <-ch // v = 0, ok = false (channel closed)
```