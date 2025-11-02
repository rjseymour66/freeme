+++
title = 'Arrays'
date = '2025-11-02T09:56:41-05:00'
weight = 20
draft = false
+++

An array in Go is a fixed-length data type that contains a contiguous block of elements of the same type

Having memory in a contiguous form can help to keep the memory you use stay loaded within CPU caches longer
Since each element is of the same type and follows each other sequentially, moving through the array is consistent and fast

An array is declared by specifying the type of data to be stored and the total number of elements required, also known as the array’s length.
The type of an array variable includes both the length and the type of data that can be stored in each element

When you pass variables between functions, they’re always passed by value. When your variable is an array, this means the entire array, regardless of its size, is copied and passed to the function.
You can pass a pointer to the array and only copy eight bytes, instead of eight megabytes of memory on the stack
You just need to be aware that because you’re now using a pointer, changing the value that the pointer points to will change the memory being shared

Once an array is declared, neither the type of data being stored nor its length can be changed
they’re always initialized to their zero value for their respective type

An array is a value in Go. This means you can use it in an assignment operation
```go
var array1 [5]string
array2 := [5]string{"Red", "Blue", "Green", "Yellow", "Pink"}
array1 = array2
```

```go
var array [5]int                        // standard declaration
array := [5]int{10, 20, 30, 40, 50}     // array literal declaration
array := [...]int{10, 20, 30, 40, 50}   // Go finds the length based on num of elements
array := [5]int{1: 10, 2: 20}           // initialize specific elements

// pointers
array := [5]*int{0: new(int), 1: new(int)}  // array of pointers
array2 := [3]*string{new(string), new(string), new(string)}
// dereference to assign values
*array[0] = 10
*array[1] = 20
*array2[0] = "Red"
*array2[1] = "Blue"
```
