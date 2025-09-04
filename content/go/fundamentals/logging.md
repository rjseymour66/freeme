+++
title = 'Logging'
date = '2025-09-02T08:26:42-04:00'
weight = 100
draft = false
+++

The IETF maintains standards for logging in [RFC 5424](https://datatracker.ietf.org/doc/html/rfc5424).

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

You can create a custom logger by implementing a `Writer` interface on a custom type:

```go
type Writer interface {
    Write(p []bytes) (n int, err error)
}
```

The `Writer` implementation can return by writing the bytes to `os.Stdout` (or another location) directly.

### Formatting output

To create a custom logger, define a struct and a write method. The most important section of the `Write` implementation is the output formatting:
1. Cast the slice of bytes to a string.
2. Format the logger `output` with the date and time and the `msg` string.
3. Write to `os.Stdout` and check for errors.
4. Return the number of bytes and any error.

```go
type customLogger struct{}

func (l *customLogger) Write(p []byte) (int, error) {
	msg := strings.TrimSpace(string(p))                         // 1

	output := fmt.Sprintf("[%s] - %s",                          // 2
		time.Now().Format("2006-01-02 01:02:03"),
		msg,
	)

	n, err := os.Stdout.Write([]byte(output + "\n"))            // 3
	if err != nil {
		return n, fmt.Errorf("Logger failed write: %w", err)
	}

	return n, nil                                               / 4
}
```

You can also use [ANSI color codes](https://gist.github.com/JBlond/2fea43a3049b38287e5e9cefc87b2124) to add color to your logs. 

{{< admonition "ANSI support" warning >}}
Note that many output formats do not support ANSI, so you should enable it with a flag if you use it in your logger.
{{< /admonition >}}

Here is an example `output` function that uses ANSI.

```go
func (l *myLogger) Write(msg []byte) (int, error) {
    // some work
	output := fmt.Sprintf("%s%s - %s%s (called from %s%s)",
		"\033[32m", time.Now().Format("2006/01/02 3:04:05 pm"),
		"\033[0m", strings.TrimSpace(string(msg)),
		"\033[35m", caller)

    return os.Stdout.Write([]byte(output + "\n"))
}
```

### Using the logger

To use the custom logger, you pass it to `log.SetOutput`, which tells the logging package to use your custom logger. While you could write logs with your custom logger directly, this technique gives you access to the log package API, such as `log.Println` while using your custom output:
1. Creates a new `myLogger` instance.
2. Unsets the default logger flags (`Ldate`, `Ltime`)
3. Redirects the log package output to your custom logger
4. Alternate expression that instantiates a logger and injects in log package in one expression

Below 

```go
func main() {
	myLog := new(customLogger)      // 1
	log.SetFlags(0)                 // 2
	log.SetOutput(myLog)            // 3
	
    // Concise injection
    log.SetOutput(&customLogger{})  // 4
}
```

### Logging to a file

Go's logging package can write to any `Writer` type, which includes file handlers:

```go
func main() {
	file, err := os.OpenFile("logging.log", os.O_RDWR|os.O_CREATE, 0755)
	if err != nil {
		panic(errors.New("could not open log file"))
	}
    defer file.Close()

	log.SetOutput(file)
	log.SetFlags(log.LUTC | log.Lshortfile)
	log.Println("Display in UTC and use a short filename")
}
```

## Structured logging

Structured logging includes log levels in its log messages. Log levels help distinguish between messages, increase readability and searchability, simplify parsing, and add context to logs. Many production log analysis tools ingest structured logs.

Go provides structured logging in its `slog` package. This example shows a basic implementation:

```go
func main() {
	slog.Info("default info logger")
	slog.Warn("this is a warning log that might indicate an issue")
	slog.Error("something is broken")
	slog.Debug("development environment message, does not print to the console")
}
```

In the previous example, the `Debug` messages are not logged to the console. You can change that with a custom structured logger.

### JSON logging

This example:
1. Creates a log file.
2. Creates a new structured logger.
   - The `New` method returns a logger and accepts a log handler that handles any logs produced by the logger.
   - `NewJSONHandler` returns a handler that writes log records as line-delimited JSON objects to an `io.Writer`. It accepts the `Writer` type and a `HandlerOptions` struct. Here, the `HandlerOptions` struct sets the logging level at debug or higher.
1. Replaces the default global logger with the new JSON `logger`
2. `Debug` messages log to the console because how the log handler set the logging level.
3. `slog` provides helper functions for each type so you can build key/value structured logs without worrying about formatting. The first value is the log message, which is followed by additional key/value pairs of the specified type. The `Group` attribute lets you create nested structured logs.


```go
func main() {
	file, err := os.OpenFile("structured.log", os.O_RDWR|os.O_CREATE, 0755)     // 1
	if err != nil {
		panic(errors.New("could not open log file"))
	}

	logger := slog.New(slog.NewJSONHandler(file, &slog.HandlerOptions{          // 2
		Level: slog.LevelDebug,
	}))

	slog.SetDefault(logger)                                                     // 3
	slog.Info("default info logger")
	slog.Warn("this is a warning log that might indicate an issue")
	slog.Error("something is broken")
	slog.Debug("development environment message")                               // 4
	slog.Info("complex message example",                                        // 5
		slog.String("accepted values",
			"key/value pairs with specific types for marshalling"),
		slog.Int("an int:", 30),
		slog.Group("grouped_info",
			slog.String("you can", "do this too")))
}
```

This log produces the following output:

```bash
{"time":"2025-09-04T08:44:51.867026258-04:00","level":"INFO","msg":"default info logger"}
{"time":"2025-09-04T08:44:51.867110342-04:00","level":"WARN","msg":"this is a warning log that might indicate an issue"}
{"time":"2025-09-04T08:44:51.867114852-04:00","level":"ERROR","msg":"something is broken"}
{"time":"2025-09-04T08:44:51.867118309-04:00","level":"DEBUG","msg":"development environment message, does not print to the console"}
{"time":"2025-09-04T08:44:51.867122179-04:00","level":"INFO","msg":"complex message example","accepted values":"key/value pairs with specific types for marshalling","an int:":30,"grouped_info":{"you can":"do this too"}}
```

### Typed attributes

| Function                                             | Description                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| **`slog.String(key, value string)`**                 | Adds a string attribute.                                                       |
| **`slog.Int(key string, value int)`**                | Adds an integer attribute.                                                     |
| **`slog.Int64(key string, value int64)`**            | Explicit 64-bit int.                                                           |
| **`slog.Uint64(key string, value uint64)`**          | Unsigned 64-bit int.                                                           |
| **`slog.Float64(key string, value float64)`**        | Floating-point number.                                                         |
| **`slog.Bool(key string, value bool)`**              | Boolean value.                                                                 |
| **`slog.Duration(key string, value time.Duration)`** | Duration in nanoseconds.                                                       |
| **`slog.Time(key string, value time.Time)`**         | Timestamp.                                                                     |
| **`slog.Any(key string, value any)`**                | Generic — lets slog infer the type. Use for custom structs, slices, maps, etc. |
| **`slog.Group(key string, attrs ...slog.Attr)`**     | Groups attributes under a nested object.                                       |


## Stack traces