+++
title = 'Arrays'
date = '2025-11-02T09:56:41-05:00'
weight = 20
draft = false
+++

An array in Go is a fixed-length data type that contains a contiguous block of elements of the same type. Arrays are static: after an array is declared, neither the type of data being stored nor its length can be changed. 

Having memory in a contiguous form can help to keep the memory you use stay loaded within CPU caches longer. Since each element is of the same type and follows each other sequentially, moving through the array is consistent and fast.

Arrays are values, not a pointer to the first item in an array. When you pass an array to a function, the entire array is copied and passed to the function, regardless of its size. It also means that you can use it in an assignment operation:

```go
var array1 [5]string
array2 := [5]string{"Red", "Blue", "Green", "Yellow", "Pink"}
array1 = array2
```

## Creating an array

Declare the size of the array in curly brackets, followed by the data type:`[N]<type>`. Arrays can contain elements of the same type only, and you cannot change their size after its created.

1. Standard declaration. These arrays are always initialized to the zero value for their respective type.
2. Array literal. This is the idiomatic way to create a slice.
```go
func main() {
	var numbers [10]int                                         // 1
	beatles := [4]string{"john", "paul", "george", "ringo"}     // 2
}
```

### new

The `new` method returns a pointer to an arry. It does not initialize the array, it zeroes it:

```go
func main() {
	var zeroes *[]int = new([]int)
	fmt.Println(zeroes) 			// &[0 0 0 0 0 0 0 0 0 0]
}
```

## Accessing elements


You can pass a pointer to the array and only copy eight bytes, instead of eight megabytes of memory on the stack
You just need to be aware that because you’re now using a pointer, changing the value that the pointer points to will change the memory being shared.



### Convert to slice

Omit both the start and end indices to convert an array into a slice:

```go
func main() {
	array := [5]int{1, 2, 3, 4, 5}
	slice := array[:]
}
```

## Modifying an array

Arrays cannot change their size, but they are mutable. You can modify an element at a given index:

```go
func main() {
	numbers := [7]int{0, 1, 2, 3, 4, 5, 6}
	numbers[4] = 7                          // [0 1 2 3 7 5 6]
}
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
