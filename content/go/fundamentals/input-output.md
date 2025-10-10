+++
title = 'Input/output'
date = '2025-10-10T12:30:05-04:00'
weight = 60
draft = false
+++

## io.Reader

A reader is something that you can read bytes from. Think of it as a mechanism that reads data from a stream and stores it in memory:

```
stream -> Reader -> buffer
```

`io.Reader` represents the ability to read from an input stream of data. The `Reader` interface allows your code to read data:

```go
type Reader interface {
    Read(p[]byte) (n int, err error)
}
```

Any struct that implements the `Reader` interface is called a "reader". This means the struct must have a `Read` method that takes a slice of bytes and returns the number of bytes read and an error. You read data _from_ the reader into a slice of bytes. So, a reader is something that allows you to read data from it.

### From a buffer

For example, a file in Go is a reader because the [File interface](https://pkg.go.dev/io/fs#File) implements `Read`. The following example reads data from the file into a buffer of bytes and prints its contents to the console:
1. Returns a file handle and an error. The file is a reader.
2. Create a buffer that can hold 1KB.
3. `Read` reads bytes from the file reader into the buffer.
4. Convert the buffer from a slice of bytes to a string.
5. Output the contents of the buffer, number of bytes read, and the error.
   
```go
func main() {
	f, _ := os.Open("test.txt")         // 1
	defer f.Close()

	buf := make([]byte, 1024)           // 2
	n, err := f.Read(buf)               // 3

	str := string(buf)                  // 4
	fmt.Println(str, n, err)            // 5
}
```

### ReadAll

You don't have to explicitly define a slice of bytes to store the contents of a reader. You can use `ReadAll` to read the entire contents of the reader into a slice of bytes:
1. Returns a file handle and an error. The file is a reader.
2. `ReadAll` accepts a reader and returns a slice of bytes and an error. Here, we pass it the file handle.
3. Convert the slice of bytes to a string.
4. Output the file contents and the error.

```go
func main() {
	f, _ := os.Open("test.txt")     // 1
	defer f.Close()

	bytes, err := io.ReadAll(f)     // 2

	str := string(bytes)            // 3
	fmt.Println(str, err)           // 4
}
```

### As a parameter

Functions often take an `io.Reader` as a parameter. These functions call the `Read` method on the reader to read its data.

For example, the `strings` package has a `NewReader` helper function that converts a string into a reader. This lets you pass a string as a reader to a function, and the function calls the `Read` method on that string to read its contents:
1. Create a string variable.
2. Convert the string to a reader. `NewReader` takes a string argument and returns a reader.
3. Pass the reader to `ReadAll`. `ReadAll` calls the `Read` method on the reader and returns a slice of bytes and an error.
4. Convert the slice of bytes to a string.
5. Output the file contents and the error.


```go
func main() {
	str := "Read this data."                // 1
	reader := strings.NewReader(str)        // 2

	bytes, err := io.ReadAll(reader)        // 3
	contents := string(bytes)               // 4
	fmt.Print(contents, err)                // 5
}
```

## io.Writer

A writer is anything that you can write bytes to. Think of it as a mechanism that writes in-memory data into an output:

```
[]bytes -> Writer -> output destination
```

`io.Writer` represents the ability to write to an output stream. The `Writer` interface allows your code to write a slice of bytes to an output destination:

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}
```

### From memory

For example, a file in Go is a writer because the [File interface](https://pkg.go.dev/io/fs#File) implements `Write`. The following example writes an in-memory slice of bytes to the file with the `Write` method:
1. Creates a file and returns a file handle and an error. The file is a writer.
2. Create an in-memory slice of bytes. This could also be a network connection.
3. The file's `Write` method writes the slice to the file and returns the number of bytes written and an error.
4. Output the number of bytes written and an error.

```go
func main() {
	f, _ := os.Create("output.txt")             // 1
	defer f.Close()

	data := []byte("Output from a stream.")     // 2

	n, err := f.Write(data)                     // 3
	fmt.Println(n, err)                         // 4
}
```

### As a parameter

Functions often take an `io.Writer` as a parameter. These functions call the `Write` method on the writer so you can extract its data at a later time.

For example, The `Fprint*`-type functions take a writer as a parameter. These functions call the `Write` method on the writer so you can write data to it. Here, `bytes.Buffer` is a writer (and a reader), and `Fprintf` writes a formatted string to the buffer:
1. Create the `bytes.Buffer`. `buf` is a writer.
2. Write data as a formatted string to `buf`.
3. Extract the data from the buffer.

```go
func main() {
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "Hello, %s.", "Charles")
	str := buf.String()
}
```
