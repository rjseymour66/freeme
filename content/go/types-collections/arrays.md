+++
title = 'Arrays'
date = '2025-11-02T09:56:41-05:00'
weight = 20
draft = false
+++

An array in Go is a fixed-length data type that contains a contiguous block of elements of the same type. Arrays are static: after an array is declared, neither the type of data being stored nor its length can be changed. 

Contiguous memory keeps data loaded in CPU caches longer. Since each element is the same type and follows the previous sequentially, moving through the array is consistent and fast.

Arrays are values, not a pointer to the first item in an array. When you pass an array to a function, the entire array is copied and passed to the function, regardless of its size. It also means that you can use it in an assignment operation:

```go
var array1 [5]string
array2 := [5]string{"Red", "Blue", "Green", "Yellow", "Pink"}
array1 = array2
```

## Creating an array

Declare the size of the array in square brackets, followed by the data type:`[N]<type>`. Arrays can contain elements of the same type only, and you cannot change their size after it's created.

1. Standard declaration. Go initializes these to the zero value for their type.
2. Array literal. This is the idiomatic way to declare an array.
3. Ellipsis syntax. Go infers the length from the number of elements.
4. Index initialization. Set specific elements by index; unset elements are zeroed.

```go
func main() {
	var numbers [10]int                                         // 1
	beatles := [4]string{"john", "paul", "george", "ringo"}     // 2
	primes := [...]int{2, 3, 5, 7, 11}                          // 3
	sparse := [5]int{1: 10, 2: 20}                              // 4
}
```

### new

The `new` built-in returns a pointer to an array. It does not initialize the array, it zeroes it:

```go
func main() {
	var zeroes *[]int = new([]int)
	fmt.Println(zeroes) 			// &[0 0 0 0 0 0 0 0 0 0]
}
```

You can pass a pointer to an array and copy only eight bytes instead of the full array. Be aware that changes through the pointer affect the shared memory.

### Pointer arrays

An array can hold pointers instead of values. Use `new` to allocate each element, then dereference to assign:

```go
func main() {
	array := [5]*int{0: new(int), 1: new(int)}
	*array[0] = 10
	*array[1] = 20
}
```

## Accessing elements

Access elements by index using `array[i]`:

```go
func main() {
	beatles := [4]string{"john", "paul", "george", "ringo"}
	fmt.Println(beatles[0]) // john
	fmt.Println(beatles[3]) // ringo
}
```



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
