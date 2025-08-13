+++
title = 'Idioms and language features'
linkTitle = 'Idioms'
date = '2025-08-12T23:23:49-04:00'
weight = 30
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