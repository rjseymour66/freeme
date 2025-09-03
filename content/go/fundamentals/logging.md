+++
title = 'Logging'
date = '2025-09-02T08:26:42-04:00'
weight = 100
draft = false
+++

Go has logging built-in logging support.

## log package

The log package has the same print methods as the `fmt` package, but it prepends the date and time in `YYY/MM/DD HH:MM:SS` format before the message:

```go
func main() {
	fmt.Println("This is fmt to the console")
	log.Println("This is log to the console")
}
```

The previous snippet outputs the following:

```bash
This is fmt to the console
2025/09/02 08:32:03 This is log to the console
```

### SetFlags

You can customize log output with the `SetFlags` function. This function accepts one or more log-formatting options in a union:

```go
func main() {
    log.Println("Standard flags")               // 2025/09/02 08:51:49 Standard flags
	log.SetFlags(log.Ltime | log.Lshortfile)    // 2025/09/02 08:51:49 Standard flags
	log.Println("Time and short file")          // 08:51:49 main.go:18: Time and short file
}
```

Here is a list of the `log.SetFlags` options with their descriptions. If you do not pass any options, the logger outputs the date and time:

| Flag                | Description                                                       |
| ------------------- | :---------------------------------------------------------------- |
| `log.LstdFlags`     | Default setting: `Ldate \| Ltime`.                                |
| `log.Ldate`         | Prints the local date in the format `2009/01/23`.                 |
| `log.Ltime`         | Prints the local time in the format `01:23:23`.                   |
| `log.Lmicroseconds` | Adds microsecond precision to the time: `01:23:23.123123`.        |
| `log.Llongfile`     | Full file path and line number of the log call: `/a/b/c/d.go:23`. |
| `log.Lshortfile`    | Final file name element and line number: `d.go:23`.               |
| `log.LUTC`          | Use UTC instead of local time for `Ldate` and `Ltime`.            |
| `log.Lmsgprefix`    | Place the log prefix *before* the date/time instead of after.     |

### SetOutput

By default, a `log` type writes to `os.Stderr`. To change this, pass an `io.Writer` such as a file or a custom writer to `SetOutput`:

```go
log.SetOutput(myCustomLogger)
```

## Custom logger

You can create a custom logger by implementing a `Writer` interface:

```go
type Writer interface {
    Write(p []bytes) (n int, err error)
}
```

The `Writer` implementation can return by writing the bytes to `os.Stdout` (or another location) directly, or it can use a `fmt.Printx` method. The `fmt.` package print methods all implement the `Writer` interface, so you do not need to explicitly return the number of bytes an an error. In addition, you do not have to explicitly return the error when you write to `os.Stdout` or `os.Stderr` because the `Write` method already returns the error.

You must return an error when you write to files, sockets, pipes, or another logger that expects it.

```go
type customLogger struct{}

func (l *customLogger) Write(lMsg []byte) (int, error) {
	
}
```


To use the custom logger, you pass it to `log.SetOutput`, which tells the logging package to use your custom logger. While you could write logs with your custom logger directly, this technique gives you access to the log package API, such as `log.Println` while using your custom output:
1. Creates a new `myLogger` instance.
2. Unsets the default logger flags (`Ldate`, `Ltime`)
3. Redirects the log package output to your custom logger
4. Alternate expression that instantiates a logger and injects in log package in one expression

Below 

```go
func main() {
	myLog := new(myLogger)      // 1
	log.SetFlags(0)             // 2
	log.SetOutput(myLog)        // 3
	
    // Concise injection
    log.SetOutput(&myLogger{})  // 4
}
```

### Formatting output

[ANSI color codes](https://gist.github.com/JBlond/2fea43a3049b38287e5e9cefc87b2124)