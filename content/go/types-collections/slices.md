+++
title = 'Slices'
date = '2025-11-02T09:54:27-05:00'
weight = 20
draft = false
+++

The slice type is a dynamic array with no fixed size. A slice has three fields:
- Pointer: Points to the underlying array.
- Length: Number of elements the slice can access from the array.
- Capacity: Size of the underlying array, or number of elements that the slice has available for growth.

You cannot create a slice with a capacity that's smaller than the length.

{{< admonition "slice vs array" note >}}
If you specify a value inside the `[]` operator (`[4]varName`), then you are creating an array. If you do not specify a value, you create a slice:

```go
array := [3]int{10, 20, 30}
slice := []int{10, 20, 30}
```

An _array_ is a value. They are of a fixed size, and the elements in the array are initialized to their zero value.

A _slice_ is a pointer to an array. It has no specified length, and its zero value is `nil`.
'Slicing' does not copy the slice's data, it creates a new slice value that points to the original array. So `s = slice[2:]` creates slice `s` that begins with second element of `slice`, and they both point to the same underlying data structure. So, modifying elements of a slice changes the  
{{< /admonition >}}


## Creating a slice

Declare a slice with curly brackets, followed by the data type: `[]<type>`. Slices can contain elements of the same type only:
1. Standard "nil slice" declaration. Unlike an array that has elements of the type's default value, a slice can have a length of zero. A nil slice is the most common way to create slices, and can be used with many of the standard library and built-in functions that work with slices.
2. Slice literal. This is the idiomatic way to create slices. It requires that you define the contents when you create the slice.
3. Empty slice. This is useful when you want to represent an empty collection. For example, when a database query returns zero results.

```go
func main() {
	var integers []int 												// 1
	var stones = []string{"jagger", "richards", "wyman", "watts"} 	// 2
	slice := []int{}                    							// 3
}
```
### make

You can also create a slice with the `make` function. `make` requires that you pass the type and length. You can optionally pass a capacity. If the capacity is omitted, it defaults to the given length.

`make` initializes the slice to its default values:
1. No capacity
2. Capacity

```go
func main() {
	eight := make([]int, 8) 		// 1
	tenCap := make([]int, 8, 10)  	// 2
}
```

### new

The `new` method returns a pointer to a slice. It does not initialize the slice, it zeroes it:

```go
func main() {
	var zeroes *[]int = new([]int)
	fmt.Println(zeroes) 			// &[]
}
```
## As function arguments

Pass slices by value, because slices only contain a pointer to the underlying array, its length, and capacity. This is why slices are great--no need for passing pointers.

On 64-bit machines, each component of the slice requires 8 bytes (24 total).

```go
bigSlice := make([]int, 1e9)

slice = fName(slice)

func fName(slice []int) []int {
    return slice
}
```


## Variadic slices

The `...` operator creates a variadic slice, and is also called _slice unpacking notation_. The `...` operator represents the elements of the slice when used as a function parameter or argument:
1. As a parameter, expand a slice to a list of values.
2. As an argument, pass each element of a slice to a function as a list of values.
3. Append the two slices together and display the results.

```go
func someFunc(r io.Reader, args ...string) {} 	// 1

func main() {
	someFunc(os.Stdin, flag.Args()...) 			// 2

	s1 := []int{1, 2}
	s2 := []int{3, 4}
	combined := append(s1, s2...) 				// 3 [1 2 3 4]
}
```

## Functions

### len
_len(slice)_

Returns the number of elements in the given slice:

```go
func main() {
	var stones = []string{"jagger", "richards", "wyman", "watts"}
	fmt.Println(len(stones)) 	// 4
}
```

### cap

_cap(slice)_

Returns the length of the slice's underlying array. When you expand a slice beyond its original capacity, the capacity is always doubled when the existing capacity of the slice is under 1,000 elements.

```go
func main() {
	tenCap := make([]int, 8, 10)
	fmt.Println(cap(tenCap)) 		// 10
}
```

### copy

_copy(dest, src)_

Copies the contents of the `src` slice into the `dest` slice. The `dest` and `src` slices must share the same underlying array. This is commonly used to increase the capacity of an existing slice.

If `dest` and `src` are different lengths, it copies up to the smaller number of elements. 


### append

_append(slice, value)_

Appends `value` to the end of `slice`.

When there’s no available capacity in the underlying array for a slice, the `append` function creates a new underlying array, copies the existing values that are being referenced, and assigns the new value. So, if you append to the 3rd index of a slice with length 2, you get a new underlying array of length 3 with a capacity doubled the original array.

## Accessing elements

Get an element in a slice with its index:

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}
	third := numbers[2] 					// 2
}
```

### for loop

Use a classic C-style loop to perform access each element in a slice:

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}

	for i := 0; i < len(numbers); i++ {
		fmt.Println(i * 2)
	}
}
```

### for ... range

The `for...range` loop gives you access to the index of each element:

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}

	for i, v := range numbers {
		fmt.Printf("index: %d, value: %v\n", i, v)
	}
}
```

## Slicing

Slice a slice to access a range of numbers. Use the following syntax to 'slice' a slice into a new slice: 

`slice[<start>:<end>:<capacity>]`

_start_
: Inclusive. The index position of the element that the new slice begins with. For example, `newTest := test[1:]` means "take everything from element at index 1 to the end of the slice, and place it in `newTest`.

  If you don't use a starting index, the slice starts at 0.

_end_
: Non-inclusive. The index of the existing slice where you stop copying values to the new slice. The new slice ends with the value at `[end-1]`.

  If you don't use an ending index, the slice ends at the last element.

_capacity_
: The capacity for the new slice. When you append to a slice that goes beyond the slice capacity, the capacity is doubled when its length is less than 1,000.


```go
func main() {
	slice := []int{0, 1, 2, 3, 4, 5, 6}

	firstSecond := slice[1:3] 	// [1 2]
	noStart := slice[:4]		// [0 1 2 3]
	noEnd := slice[2:] 			// [2 3 4 5 6]
	copy := slice[:] 			// [0 1 2 3 4 5 6]
}
```

### Convert array to slice

Omit both the start and end indices to convert an array into a slice:

```go
func main() {
	array := [5]int{1, 2, 3, 4, 5}
	slice := array[:]
}
```

### Calculating slices

The start, end, and capacity values have a formula that you can use to correctly calculate slicing. For example, the following slice creates a new slice with 1 element, and the capacity of 2:

```go
newSlice := slice[2:3:4]
```
| Value | Description                                                                  | Formula                                                |
| :---- | :--------------------------------------------------------------------------- | :----------------------------------------------------- |
| 2     | start. The first element in the original slice, inclusive.                   |                                                        |
| 3     | end. The index of the existing slice where the slicing stops, non-inclusive. | start + number of elements you want in the slice.      |
| 4     | capacity. Size of the new slice.                                             | start + number of elements to include in the capacity. |



```go
newSlice := slice[1:3]              // Length:   3 - 1 = 2
                                    // Capacity: 5 - 1 = 4

// Slice the third element and restrict the capacity.
// Contains a length of 1 element and capacity of 2 elements.
slice := source[2:3:4]
```

You can use the built-in function called append, which can grow a slice quickly with efficiency. You can also reduce the size of a slice by slicing out a part of the underlying memory.


## Modifying

A slice can change in size, so you can append to the 

### Index

You can modify an element at a given index. This replaces the existing element in the array with the given element:

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}
	numbers[4] = 7                          // [0 1 2 3 7 5 6]
}
```

### Append

Use `append` one or more elements of the same type to the end of a slice:
1. Append a single element.
2. Append multiple elements.
3. Create a new array of the same type.
4. Append the entire array with the _slice unpacking notation_.
```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}

	numbers = append(numbers, 7) 			// 1 [0 1 2 3 4 5 6 7]
	numbers = append(numbers, 8, 9) 		// 2 [0 1 2 3 4 5 6 7 8 9]
	newNums := []int{10, 11, 12, 13} 		// 3
	numbers = append(numbers, newNums...) 	// 4 [0 1 2 3 4 5 6 7 8 9 10 11 12 13]
}
```

### Insert

#### In the middle

You can insert an element in a slice without replacing the element. This requires that you use `append` with some index
1. Create a slice.
2. This step requires that you create a new slice from the existing slice, then append a portion of the existing slice with the unpacking notation. You need to know the index that you want to insert the new element:
   1. `numbers[:2+1]`: Create a slice from the start of the original slice to the index directly preceding where you want to insert the new element, then add 1. The `+1` reserves a space for the new element that you want to add. For example, if you want to insert the element at index 6, use `[:6+1]`. In the following example, `numbers[:2+1]` creates a slice that is equivalent to `numbers[:3]`, which is `[0 1 2 2]`
   2. Append a slice that begins at index 2 to the end of the slice, using the unpacking notation. This creates a new slice `[2 3 4 5 6]`.
   3. When you append the second slice to the first, you get `[0 1 2 2 3 4 5 6]`.
3. The second `2` at index 3 is replaced with `99`, giving you `[0 1 2 99 3 4 5 6]`.

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6} 				// 1
	numbers = append(numbers[:2+1], numbers[2:]...) 	// 2
	numbers[3] = 99 									// 3 [0 1 2 99 3 4 5 6]
}
```

#### At the beginning

Adding an element at the first element in a slice requires that you use the unpacking notation. Just create a slice literal with the value you want to insert, the append the original slice:

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}
	numbers = append([]int{99}, numbers...) 	// [99 0 1 2 3 4 5 6]
}
```

#### Multiple elements

Inserting multiple elements is tricky. A slice is a pointer to an underlying array, which means that you can't slice elements in-place. You need to create a new slice that contains the values that you want to follow the inserted elements:

1. Original slice.
2. Create a slice of values that you want to insert.
3. Create a new slice that starts with an empty slice, and appends a portion of the original slice with unpacking notation. This portion should start at the element that you want to place after the inserted elements. For example, if you want to insert 3 elements starting at index 3, append `slice[3:]`.
4. Append up to index 3 (non-inclusive), and then unpack the inserted elements into the slice.
5. Append the `tail` slice, which appends values after the inserted values.

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6} 		// 1
	inserted := []int{100, 101, 103} 			// 2

	tail := append([]int{}, numbers[3:]...) 	// 3
	numbers = append(numbers[:3], inserted...) 	// 4
	numbers = append(numbers, tail...)  		// 5 [0 1 2 100 101 103 3 4 5 6]
}
```

### Remove elements

#### At the beginning or end

Removing elements from the beginning or end of the slice is simple---you just reslice:
1. Reslice from the second element (index `1`) to the end of the slice.
2. Reslice from the start of the slice, to the length of the origial slice minus 1. Slices are 0-indexed, so you access the last element in a 7-element slice with `numbers[:6]`, which is equivalent to `numbers[:len(numbers)-1]` (length is 7, so 7-1 = 6).

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}
	rmFirst := numbers[1:] 					// 1 [1 2 3 4 5 6]
	rmLast := numbers[:len(numbers)-1] 		// 2 [0 1 2 3 4 5]
}
```

#### From the middle

To remove elements from a slice, append the head of the slice to the tail, removing elements in between:
1. The head of the slice takes the slice up to but not including the element at index 2, so the head is indices 0 and 1. The tail uses slice unpacking notation to append from index 3 to the end of the slice, so the head is indices 3, 4, and so on. This removes element two.

{{< admonition "" warning >}}
The following example is demonstration purposes only. If you were to run this example, you receive the following:

```go
[0 1 6 6 5 6]
[0 1 6 6]
```

This is because append modifies the `numbers` array, and `rmTwo` and `rmMore` both point to `numbers` as their underlying array.
{{< /admonition >}}

```go
func main() {
	numbers := []int{0, 1, 2, 3, 4, 5, 6}
	rmTwo := append(numbers[:2], numbers[3:]...) 	// 1 [0 1 3 4 5 6]
	rmMore := append(numbers[:2], numbers[5:]...) 	// [0 1 5 6]
}
```

## Concurrency safety

Slices are not safe for concurrent use. If more than one goroutine makes changes to a slice, you should use a mutex to lock the slice, make modifications, and unlock when work is complete.

This 
1. Create the mutex.
2. At the start of the function, start the lock.
3. Do some work.
4. Unlock the mutex.

```go
var shared []int = []int{1, 2, 3, 4, 5, 6}
var mutex sync.Mutex 								// 1

func increase(num int) {
	mutex.Lock() 									// 2
	fmt.Printf("[+%d a] : %v\n", num, shared) 		// 3
	for i := 0; i < len(shared); i++ {
		time.Sleep(20 * time.Microsecond)
		shared[i] = shared[i] + 1
	}
	fmt.Printf("[+%d b] : %v\n", num, shared)
	mutex.Unlock() 									// 4
}
```

When you call the function in a goroutine, only one goroutine can access the slice at a time:

```go
func main() {
	for i := 0; i < 5; i++ {
		go increase(i)
	}

	time.Sleep(2 * time.Second)
}
```

## Sorting

The `sort` package provides methods to sort elements in a slice.

### int, float64, string

Sort these types with the `Ints`, `Float64s`, and `Strings` methods in the `sort` package:

```go
func main() {
	integers := []int{2, 4, 1, 8, 3, 4}
	floats := []float64{3.14, 6.54, 33.4, 9.1}
	strings := []string{"zebra", "elephant", "giraffe", "cat", "apple"}

	sort.Ints(integers) 		// [1 2 3 4 4 8]
	sort.Float64s(floats) 		// [3.14 6.54 9.1 33.4]
	sort.Strings(strings) 		// [apple cat elephant giraffe zebra]
}
```


### Reverse sort

You can reverse sort a sorted slice with a `for` loop:
1. Create the slice.
2. Sort the slice with the `sort` package method.
3. Reverse the slice with a `for` loop. This loop starts work from the middle of the slice and swaps the left side with the right side:
   1. `len(integers) / 2` determines how many swaps you have to do. Subtract 1 from this value because we are working with indices, and slices are 0-indexed. This makes sure it starts at the last valid index in the first half.
   2. `len(integers) - 1 - i` finds the correct element from the opposite side to swap with. If you are swapping the second element (index 1), you need to find its opposite: 6 - 1 - 1 = 4.
      ```bash
	    0 [1] 2 3 [4] 5
	  { 1 [2] 3 4 [6]  8 } 
	  ```
   3. This line uses parallel assignment to swap the elements. 
     

```go
func main() {
	integers := []int{2, 4, 1, 8, 3, 6} 							// 1

	sort.Ints(integers) 											// 2

	for i := len(integers)/2 - 1; i >= 0; i-- { 					// 3, 3.1
		opp := len(integers) - 1 - i 								// 3.2
		integers[i], integers[opp] = integers[opp], integers[i] 	// 3.3
	}
}
```

### Slice method

`sort` also has a `Slice` method, which sorts the given slice using second argument, a `less` function that returns a boolean. The `sort` package repeatedly calls the `less` function to compare two consecutive elements to see whether they should be swapped:
1. `Slice` is called on all consecutive elements in the slice, which is represented by indices `i` and `j`. If it returns `true`, it swaps the elements.
2. For ascending order, use greater than (`>`). In plain English, if `i` is greater than `j`, swap the elements. For descending order, use less than `<`.

```go
func main() {
	floats := []float64{3.14, 6.54, 33.4, 9.1}

	sort.Slice(floats, func(i, j int) bool { 		// 1
		return floats[i] > floats[j] 				// 2
	})
}
```

### Sort interface

The `Sort` interface is three methods that you must implement for a slice type. This is usually more performant than `sort.Slice`:

```go
Len() int
Less(i, j int) bool
Swap(i, j int)
```

To implement this, you need to implement this on a slice type because you are sorting a slice. So, create a type alias of a slice of custom type:
1. Create a custom type.
2. Create a type alias on a slice. This lets you attach methods to your custom time to satisfy the `Sort` interface. This is named `ByAge` because we are sorting by the `Age` field.

```go
type Person struct { 		// 1
	Name string
	Age  int
}

type ByAge []Person 		// 2
```

Next, implement the interface with the `ByAge` type:

```go
func (a ByAge) Len() int {
	return len(a)
}

func (a ByAge) Less(i, j int) bool {
	return a[i].Age < a[j].Age
}

func (a ByAge) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}
```

Finally, you can call the `Sort` method on a slice of `Person` structs. First, you have to cast the `[]Person` slice to `[]ByAge`:

```go
func main() {
	people := []Person{
		{"Sally", 21},
		{"Billy", 35},
		{"Rick", 10},
		{"Mufasa", 68},
		{"Luke", 44},
	}

	sort.Sort(ByAge(people)) 				// [{Rick 10} {Sally 21} {Billy 35} {Luke 44} {Mufasa 68}]
	sorted := sort.IsSorted(ByAge(people)) 	// true

	sort.Sort(sort.Reverse(ByAge(people))) 	// [{Mufasa 68} {Luke 44} {Billy 35} {Sally 21} {Rick 10}]
	sorted = sort.IsSorted(ByAge(people)) 	// false
}
```