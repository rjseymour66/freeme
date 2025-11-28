+++
title = 'Files and directories'
date = '2025-11-28T08:58:30-05:00'
weight = 20
draft = false
+++

## File and directory information

`os.Stat` gets informaiton about a file or directory. It takes a file name string and returns a `FileInfo` type and an `error`. Here is the information available in `FileInfo`:

```go
type FileInfo interface {
	Name() string       // base name of the file
	Size() int64        // length in bytes for regular files; system-dependent for others
	Mode() FileMode     // file mode bits
	ModTime() time.Time // modification time
	IsDir() bool        // abbreviation for Mode().IsDir()
	Sys() any           // underlying data source (can return nil)
}
```
Here is a simple program that returns information about `test.txt`:

```go
func main() {
	info, err := os.Stat("test.txt")
	if err != nil {
		panic(err)
	}

	fmt.Printf("File name: %s\n", info.Name())
	fmt.Printf("File size: %d\n", info.Size())
	fmt.Printf("File permissions: %s\n", info.Mode())
	fmt.Printf("Last modified: %s\n", info.ModTime())
}
```

### Checking errors

When `os.Stat` returns an error, it is important to check the error to understand why you couldn't open the file. Use `errors.Is` with these errors from the `os` package:

```go
var (
	// ErrInvalid indicates an invalid argument.
	// Methods on File will return this error when the receiver is nil.
	ErrInvalid = fs.ErrInvalid // "invalid argument"

	ErrPermission = fs.ErrPermission // "permission denied"
	ErrExist      = fs.ErrExist      // "file already exists"
	ErrNotExist   = fs.ErrNotExist   // "file does not exist"
	ErrClosed     = fs.ErrClosed     // "file already closed"

	ErrNoDeadline       = errNoDeadline()       // "file type does not support deadline"
	ErrDeadlineExceeded = errDeadlineExceeded() // "i/o timeout"
)
```

For example:
1. Try to open a file that doesn't exist.
2. Check for the `ErrNotExist` error.

```go
func main() {
	info, err := os.Stat("example.txt")             // 1
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {         // 2
			fmt.Println("File does not exist.")
			return
		} else {
			panic(err)
		}
	}
    // ...
}
```

## Linux file types

Linux has multiple file types. You can get details about a file type from the [`FileMode` object and its methods](https://pkg.go.dev/io/fs#FileMode), which is returned from `FileInfo.Mod()`.

Regular files
: Common data files containing text, images, or programs. The first character of the file listing is a dash (`-`). Check whether the file is a regular file with the `IsRegular` method on `FileMode`:

  ```go
  func main() {
	info, err := os.Stat("test.txt")
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			log.Fatalln("File does not exist.")
		} else {
			panic(err)
		}
	}

	isReg := info.Mode().IsRegular()            // true
  }
  ```

Directories
: Hold other files and directories. The first character of the file listing is `d`. Check whether the file is a direcotry with the `IsDir` method on `FileMode`:
  ```go
  func main() {
	info, err := os.Stat("testdir")
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			log.Fatalln("File does not exist.")
		} else {
			panic(err)
		}
	}

	isDir := info.Mode().IsDir()
	fmt.Println(isDir)
  }
  ```

Symbolic links
: A symbolic link is a pointer to another file. The first character of the file listing is `l`. Check whether a file is a symlink by checking `Lstat` and `info.Mode()&os.ModeSymLink` is equal to `0`. Non-zero means the file is not a symlink:

  ```go
  func main() {
	info, err := os.Lstat("symlink.file")
	if err != nil {
		// handle error
	}

	if info.Mode()&os.ModeSymlink != 0 {
		fmt.Println("This is a symlink")
	} else {
		fmt.Println("Not a symlink")
	}
  }
  ```

Named pipes (FIFOs)
: A named pipe is a mechanism for inter-process communication (IPC). The first character of the file listing is `p`. Check whether a file is a FIFO with `os.ModeNamedPipe`:

  ```go
  func main() {
	info, err := os.Stat("pipe")
	if err != nil {
		// handle error
	}

	if info.Mode()&os.ModeNamedPipe != 0 {
		fmt.Println("This is a named pipe")
	} else {
		fmt.Println("Not a named pipe")
	}
  }
  ```

Character devices
: Character devices provide unbuffered, direct access to hardware devices. The first character of the file listing is `c`. Check whether a file is a character device with `os.ModeCharDevice`:

  ```go
  func main() {
	info, err := os.Stat("/dev/tty")
	if err != nil {
		// handle error
	}

	if info.Mode()&os.ModeCharDevice != 0 {
		fmt.Println("This is a char device")
	} else {
		fmt.Println("Not a char device")
	}
  }
  ```

Block devices
: Block devices provide buffered access to hardware devices. The first character of the file listing is `b`. Go does not provide a direct method for checking block devices.

Sockets
: A socket is an endpoint for communication. The first character of the file listing is `s`. Check whether a file is a socket with `os.ModeSocket`:
  
  ```go
  func main() {
	info, err := os.Stat("/tmp/mysock")
	if err != nil {
		// handle error
	}

	if info.Mode()&os.ModeSocket != 0 {
		fmt.Println("This is a socket")
	} else {
		fmt.Println("Not a socket")
	}
  }
  ```

## Permissions


Linux permissions are commonly represented in the human-readable octal notation. It is a sum of the read (4), write (2), and execute (1) bits. Set the file permissions to the octal value `761`:

```bash
chmod 761 test.txt
ll test.txt 
-rwxrw---x 1 username username 89 Nov 28 09:04 test.txt*
```

Retrieve the file permissions with the `Perm` method. They are returned in the same format as the bash `ls -l` command, but you can convert them to their octal representation with `Sprintf` and the `%o` formatting verb:
1. Get the file information.
2. Retrieve the permissions. They are returned in `-rwxrw---x` format.
3. Convert the permissions to octal.
4. Print the permissions. This outputs `761`.

```go
func main() {
	info, err := os.Stat("test.txt")                        // 1
	if err != nil {
		// handle error
	}

	permissions := info.Mode().Perm()                       // 2
	permissionsString := fmt.Sprintf("%o", permissions)     // 3
	fmt.Printf("Permissions: %s\n", permissionsString)      // 4
}
```

## Scanning directories