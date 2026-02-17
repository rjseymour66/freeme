+++
title = 'Input/output'
date = '2025-10-10T12:30:05-04:00'
weight = 60
draft = false
+++

In Go, input and output center around the `io.Reader` and `io.Writer` interfaces. A type that implements `io.Reader` is a "reader", and a type that implements `io.Writer` is a "writer". Here is a summary of each:
- Reader: A type that reads its own bytes. Each reader has a `Read` method that reads the contents of the reader itself and stores it in a slice of bytes in memory.
- Writer: A type that can receive bytes. Each writer has a `Write` method that writes a slice of bytes from memory into the writer itself.

{{< admonition "Memory management" note >}}
Memory management is a primary design feature of the Reader and Writer interface. Both interfaces require that the caller provide a byte slice (`[]byte`). This lets the caller allocate memory for one byte slice, read or write data into that slice, then do something with the data. The caller can fill that single buffer as many times as needed instead of allocating multiple byte slices.
{{< /admonition >}}

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


| Use Case                   | Reader | BufferedReader |
| :------------------------- | :----: | :------------: |
| Simple, small reads        |   ✅    |       ❌        |
| Line-by-line reading       |   ❌    |       ✅        |
| Minimize syscalls          |   ❌    |       ✅        |
| Real-time reads (no delay) |   ✅    |       ❌        |
| Parsing or tokenizing      |   ❌    |       ✅        |


### Unbuffered

`Read` reads data directly from the input stream. It provides basic, sequential reading---one read at a time with no buffering. This can be costly because each `Read` operation requires a system call, so use `Read` when you are reading a small or known amount of data and you need control over how many bytes are read each time.

Use unbuffered I/O in the following circumstances:

| Use Case                     | Example                                                                                             |
| :--------------------------- | :-------------------------------------------------------------------------------------------------- |
| Small files directly         | Use `os.Open()` + `Read()` for config files or metadata <br>`file.Read(buf)`                        |
| From in-memory data          | Use `strings.NewReader("data")` or `bytes.NewReader()` when you already have the content in memory. |
| From a network connection    | Use `conn.Read()` to process packets or headers directly from a TCP stream.                         |
| Stdin directly (single read) | `os.Stdin.Read(buf)` for reading a fixed-size input or when buffering isn’t needed.                 |
| Composing custom readers     | Implement `io.Reader` to wrap or transform streams (e.g., decrypting reader, counting reader).      |


In this example, we read a small file directly. A file in Go is a reader because the [File interface](https://pkg.go.dev/io/fs#File) implements `Read`. The following example reads data from the file into a buffer of bytes and prints its contents to the console:
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

### Buffered

The `bufio` package provides the `NewReader` method, which wraps an existing reader and uses an in-memory buffer. Buffered I/O reads directly from memory, which reduces the number of system calls during each operation.

Use buffered I/O in the following circumstances:

| Use Case                                    | Example                                                                                            |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------- |
| Text input line by line                     | Wrap stdin or a file: `reader := bufio.NewReader(os.Stdin)` → `line, _ := reader.ReadString('\n')` |
| Parsing structured files (CSV, JSONL, logs) | Use buffering to efficiently read large files without loading them fully in memory.                |
| From network sockets efficiently            | `bufio.NewReader(conn)` minimizes syscalls when reading variable-sized messages.                   |
| Interactive CLI input                       | Use `ReadString('\n')` to get user input with editing or line buffering.                           |
| Scanning tokens or prefixes                 | Use `Peek()` or `ReadBytes()` to inspect part of the stream without consuming all data yet.        |


The reader fills the buffer each time it reads data. This example reads text line-by-line:
1. Returns a file handle and an error. The file is a reader.
2. Create a buffered reader.
3. Read the file in an inifinte `for` loop.
4. `ReadString` reads until it reaches the given delimiter, then returns a string and an error.
5. Check for EOF and return when you reach it.
6. Do something with the new data during each loop.

```go
func main() {
	file, err := os.Open("source.txt")                  // 1
	if err != nil {
		log.Fatalln("Error opening file:", err)
	}
	defer file.Close()

	reader := bufio.NewReader(file)                     // 2

	for {                                               // 3
		line, err := reader.ReadString('\n')            // 4
		if err != nil {
			if err.Error() == "EOF" {                   // 5
				fmt.Print(line)
				break
			}
			log.Fatalf("Error reading line:", err)
		}
		fmt.Printf("%s", line)                          // 6
	}
}
```

By default, the buffer is 4,096 bytes (4KB). If you want to change the size of the buffer, use `bufio.NewReaderSize`. This example creates a buffer that is 20 bytes in length and uses some methods to check the status of the buffer:

1. Create a reader from a string.
2. Wrap the string reader with a buffered reader of size 20 bytes.
   {{< admonition "Internal minimum buffer size" note >}}
   The minimum buffer size in bytes is 16. If you create a buffer smaller than 16 bytes, Go silently rounds the buffer size up to 16.
   {{< /admonition >}}
3. Log the buffer size with `Size()`.
4. for loop that iterates through `stringReader` one byte at a time.
5. `ReadByte()` returns a single byte and an error.
6. If you reach the end of the file, return.
7. Log the byte you read, how many bytes are in the buffer (`Buffered()`), and the size of the buffer.
   
```go
func main() {
	data := "This is data that we will read one byte at a time."
	stringReader := strings.NewReader(data)                         // 1

	bufferedSize := 20
	br := bufio.NewReaderSize(stringReader, bufferedSize)           // 2

	fmt.Printf("Reader buffer size: %d\n\n", br.Size())             // 3

	for i := 0; i < len(data); i++ {                                // 4
		b, err := br.ReadByte()                                     // 5
		if err != nil {
			if err == io.EOF {                                      // 6
				fmt.Println("End of file")
				break
			}
			fmt.Printf("Error reading byte: %v\n", err)
			return
		}

		fmt.Printf("Read byte: %c (Buffered: %d/%d)\n", b, br.Buffered(), br.Size())    // 7
	}
}
```

This outputs the following:

```bash
Reader buffer size: 20

Read byte: T (Buffered: 19/20)
Read byte: h (Buffered: 18/20)
Read byte: i (Buffered: 17/20)
Read byte: s (Buffered: 16/20)
Read byte:   (Buffered: 15/20)
Read byte: i (Buffered: 14/20)
Read byte: s (Buffered: 13/20)
Read byte:   (Buffered: 12/20)
Read byte: d (Buffered: 11/20)
Read byte: a (Buffered: 10/20)
Read byte: t (Buffered: 9/20)
Read byte: a (Buffered: 8/20)
Read byte:   (Buffered: 7/20)
Read byte: t (Buffered: 6/20)
Read byte: h (Buffered: 5/20)
Read byte: a (Buffered: 4/20)
Read byte: t (Buffered: 3/20)
Read byte:   (Buffered: 2/20)
Read byte: w (Buffered: 1/20)
Read byte: e (Buffered: 0/20)
Read byte:   (Buffered: 19/20)
...
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

A writer is anything that you can write bytes to an output stream. Think of it as a mechanism that writes in-memory data into an output:

```
[]bytes -> Writer -> output destination
```

`io.Writer` represents the ability to write to an output stream. The `Writer` interface allows your code to write a slice of bytes to an output destination:

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}
```

Go provides buffered and unbuffered methods. This table summarizes why you would use each:

| Feature               | Regular Writer (`os.File`) | Buffered Writer (`bufio.Writer`) |
| :-------------------- | :------------------------: | :------------------------------: |
| Writes directly to OS |             ✅              |                ❌                 |
| Batches small writes  |             ❌              |                ✅                 |
| Fewer system calls    |             ❌              |                ✅                 |
| Must call `Flush()`   |             ❌              |                ✅                 |
| Best for              |    Large single writes     |        Many small writes         |


### Unbuffered

For example, a file in Go is a writer because the [File interface](https://pkg.go.dev/io/fs#File) implements `Write`. The following example writes an in-memory slice of bytes to the file with the `Write` method:
1. Creates a file and returns a file handle and an error. The file is a writer.
2. Create an in-memory slice of bytes. This could be any output stream, such as a network connection.
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

### Buffered

See [Copy from reader to writer](#copy-from-reader-to-writer).

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

## Copy from reader to writer

`io.Copy` with a buffered writer is the most performant way to read from a reader and write to a writer. Otherwise, you need to need to use expensive, low-level methods:

1. Make an HTTP GET request.
2. Create a writer that you can write the response to. The file handler is a writer.
3. Create a buffered writer. `NewWriter` wraps a writer and returns a writer with a buffer (4KB, by default).
4. `io.Copy` reads the response body stream and writes it to the buffered writer until there is nothing to read. It writes in 4KB chunks.
   
   Internally, `io.Copy` reads from the source and writes to the destination in a loop, until there is nothing left to read.
5. Flush the writer contents to disk. Because the writer waits until its buffer is full, this ensures that no bytes remain in the buffer after all data is extracted from the source.
   
   `Flush()` writes data to the underlying writer---the writer wrapped in the buffered writer. Here, that is `file`. This behavior is why you can call `Flush()` after the `Copy` operation.


```go
func main() {
	url := "https://www.example.com"
	r, err := http.Get(url)
	if err != nil {
		log.Fatalln("Cannot get URL", err)
	}
	defer r.Body.Close()

	file, _ := os.Create("copy.html")
	defer file.Close()

	writer := bufio.NewWriter(file)
	io.Copy(writer, r.Body)
	writer.Flush()
}
```

## Reading files

Go provides a few options for reading files:
- `ReadFile`: Loads the entire file in memory and closes it automatically. This is good for small to medium files.
- `os.Open` + `Read`: Reads into a buffer and lets you control how much data is read at a time. Good for large files.

This table compares use cases for each method:

| Use Case                        | Recommended                 |
| :------------------------------ | :-------------------------- |
| Small file (config.json, < 1MB) | `os.ReadFile`               |
| Large log file (1GB+)           | `os.Open` + `Read`          |
| Stream or pipe (stdin, socket)  | `os.Open` or `bufio.Reader` |
| Test fixture or static HTML     | `os.ReadFile`               |
| Continuous data read            | `os.Open`                   |


This table summarizes the features:

| Feature               | `os.ReadFile` |   `os.Open` + `Read`    |
| :-------------------- | :-----------: | :---------------------: |
| Reads all at once     |       ✅       |            ❌            |
| Stream / partial read |       ❌       |            ✅            |
| Automatic close       |       ✅       |            ❌            |
| Control over buffer   |       ❌       |            ✅            |
| Best for small files  |       ✅       |            ⚠️            |
| Best for large files  |       ❌       |            ✅            |
| Memory use            |     High      |           Low           |
| Simplicity            |  Very simple  | More code, more control |



### ReadFile

`ReadFile` loads the entire file in memory and closes it automatically. This is good for small to medium files:
1. `ReadFile` returns a slice of bytes and an error.
2. Convert the bytes into a string.
3. Do some work with the string data.

```go
func main() {
	bytes, err := os.ReadFile("source.txt")         // 1
	if err != nil {
		log.Println("Cannot read file: ", err)
	}
	str := string(bytes)                            // 2
	fmt.Println(str)                                // 3
}
```


### os.Open and Read

Manually opening and reading the file gives you more control over how much data you read. The following example creates a buffer that is the size of the entire file:
1. `Open` returns a file handle in read-only mode. For other options, use `OpenFile`.
2. Always close the file.
3. Get the file size with `Stat` so you know how large to make the buffer.
4. Create a buffer the size of the file.
5. The file is a reader, so pass its `Read` method buffer to store its contents.
6. Log the number of bytes read from the file.
7. Do some work with the file.

```go
func main() {
	f, err := os.Open("source.txt")                     // 1
	if err != nil {
		log.Println("Cannot read file: ", err)
	}
	defer f.Close()                                     // 2

	stat, err := f.Stat()                               // 3
	if err != nil {
		log.Println("Cannot read file stats: ", err)
	}

	buf := make([]byte, stat.Size())                    // 4

	bytes, err := f.Read(buf)                           // 5
	if err != nil {
		log.Println("Cannot read buffer: ", err)
	}

	fmt.Printf("Read %d bytes from file\n", bytes)      // 6
	fmt.Println(string(buf))                            // 7
}
```

## Writing files

Go provides a few options for writing to files:
- `WriteFile`: Simplest method. It loads the entire file in memory and writes it at once. Good for small to medium files.
- `os.Open` and `Write`: Lets you perform multiple writes and gives you control over how you write (append, truncate, position). Good for streaming data or large file writes.

This table compares use cases for each method:

| Use Case                            | Recommended                               |
| :---------------------------------- | :---------------------------------------- |
| Small config file                   | `os.WriteFile`                            |
| Large file (stream or batch writes) | `os.OpenFile` + `Write`                   |
| Append logs continuously            | `os.OpenFile(..., os.O_APPEND, ...)`      |
| Write structured output in chunks   | `os.OpenFile` + `Write` or `bufio.Writer` |
| Simple output to disk               | `os.WriteFile`                            |

This table summarizes the feature of each method:

| Feature                         | `os.WriteFile` | `os.OpenFile` + `Write` | `os.OpenFile` + `bufio.Writer` |
| :------------------------------ | :------------: | :---------------------: | :----------------------------: |
| Writes all at once              |       ✅        |            ❌            |               ❌                |
| Stream / chunk writing          |       ❌        |            ✅            |               ✅                |
| Buffering                       |       ❌        |            ❌            |               ✅                |
| Simplicity                      |       ✅        |            ⚠️            |               ⚠️                |
| Performance (small data)        |       ✅        |            ✅            |               ✅                |
| Performance (many small writes) |       ❌        |            ⚠️            |               ✅                |
| Automatic close                 |       ✅        |            ❌            |               ❌                |



### WriteFile

`WriteFile` loads all data in memory and writes to a file at once. This is the simplest method and best for small to medium files:
1. Data that you want to write to the file.
2. `WriteFile` takes a file name, a slice of bytes to write to the file, and a set of Unix file permissions. The leading `0` is the sticky bit for SUID. The remaining permissions are owner, group, and user. `0644` gives the owner read and write permissions, and other groups and users read-only permissions.
   
   If the file does not exist, `WriteFile` creates the file with the given permissions. If it does exist, it removes all data in the file and writes to it, but it does not change the permissions.
3. Check for errors.

```go
func main() {
	data := []byte("WriteFile operation for small files!")  // 1

	err := os.WriteFile("writefile.txt", data, 0644)        // 2
	if err != nil {                                         // 3
		log.Println("Cannot write to file: ", err)
	}
}
```

### os.Create/OpenFile and Write

1. Data that you want to write to the file.
2. Create a destination file. `Create` creates a file with 0666 permissions, which gives the owner, group, and user read and write permissions on the file if the file doesn't exist. If it does exist, it removes the data in the file and preserves the permissions.
   
   Alternatively, you could use `OpenFile` to create the file with custom flags. Here, these flags mean create the file if it doesn't exist, open it in write only mode, and if the file exists, clear its contents before you write data.
3. Always close the file.
4. Write the data to the file.
5. Log the number of bytes written.
6. Do some work with the data.
   
```go
func main() {
	data := []byte("WriteFile operation for streams or large files!")   // 1

	f, err := os.Create("create.txt")                                   // 2
    // f, err := os.OpenFile("output.txt", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		log.Println("Cannot create file: ", err)
	}
	defer f.Close()                                                     // 3

	n, err := f.Write(data)                                             // 4
	if err != nil {
		log.Println("Cannot write to file: ", err)
	}
	fmt.Printf("Wrote %d bytes to file\n", n)                           // 5
	fmt.Println(string(data))                                           // 6
}
```

## Temporary files

A temporary file is an ephemeral file that temporarily stores data for a program task and is deleted when either the program completes or the data is persisted on disk. For security purposes, temp files are created with `0600` permissions.

Example use cases include the following:
- Unit tests that need a temporary workspace
- Temporary file uploads or transformations
- Caching intermediate data
- Writing logs or output that doesn’t need to persist

The following example shows how you can create and delete temporary files:
1. Create a temporary directory. `os.TempDir()` creates the directory in the host system's temp directory, and the second argument is a name pattern, where `*` is replaced with a random string. This code is run on Linux, so it creates the following directory: `/tmp/tmpdir_518411422`.
2. Use `os.RemoveAll` to clean up your temp directory and files. This method recursively deletes the given directory and all its contents.
3. `os.CreateTemp` creates a temporary file in `tmpdir`. The second argument is a name pattern, where `*` is replaced with a random string.
4. `os.Remove` takes the name of a file or empty directory and removes it. This is unnecessary in this example because `os.RemoveAll` deletes the temp directory and its contents, but I am adding this here for completeness.
5. Byte data to write to the temp file.
6. Writes `data` to the temp file.
7. If there is no error, this line logs `data` and the temp file name to the console. This line outputs the following message to the console:
   
   ```bash
   Wrote "Random data for temporary file." to /tmp/tmpdir_2826842138/tmpfile_1485316416
   ```
8. `Close` closes the file, releases the file handle, and flushes any data to disk. 

```go
func main() {
	tmpdir, err := os.MkdirTemp(os.TempDir(), "tmpdir_*")                   // 1
	if err != nil {
		log.Println("Cannot create temp directory: ", tmpdir)
	}
	defer os.RemoveAll(tmpdir)                                              // 2

	tmpfile, err := os.CreateTemp(tmpdir, "tmpfile_*")                      // 3
	if err != nil {
		log.Println("Cannot create temp file: ", tmpfile)
	}
	defer os.Remove(tmpfile.Name())                                         // 4

	data := []byte("Random data for temporary file.")                       // 5
	_, err = tmpfile.Write(data)                                            // 6
	if err != nil {
		log.Println("Cannot write to temp file: ", tmpfile)
	}
	fmt.Printf("Wrote \"%s\" to %s\n", string(data), tmpfile.Name())        // 7

	err = tmpfile.Close()                                                   // 8
	if err != nil {
		log.Println("Cannot close temp file", err)
	}
}
```

### Temp files vs files

Temporary files and standard files share many of the same methods. The difference between the two files is how and why they are created, and how they are managed:

| Use case         | `os.CreateTemp`                                                                                  | `os.Create` / `os.Open`                        |
| ---------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Purpose**      | Create a uniquely named temporary file                                                           | Create or open a specific file                 |
| **Location**     | In the system’s temp directory (`/tmp` or `%TEMP%`) by default, or a custom temp dir you pass in | Anywhere you specify (e.g., working directory) |
| **Name pattern** | Automatically generates a random name with a prefix pattern (`tmp_*`)                            | You specify the file name manually             |
| **Cleanup**      | Typically used with `defer os.Remove()` or `RemoveAll()` for auto cleanup                        | File persists until you delete it manually     |
| **Security**     | Uses atomic creation to avoid race conditions (safe for concurrent temp creation)                | No automatic protection from name collisions   |
| **Permissions**  | Default 0600 (owner-only access) for security                                                    | You can specify permissions via `os.OpenFile`  |
