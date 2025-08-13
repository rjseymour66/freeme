+++
title = 'Flag Package'
date = '2025-08-13T13:15:11-04:00'
weight = 10
draft = false
+++

When you create flags in Go, each flag definition is saved in a structure called [*Flagset](https://pkg.go.dev/flag#FlagSet) for tracking. The default Flagset for the flag package is named `CommandLine`, and it has access to all Flagset functions.

The `Parse()` function extracts each command line flag in the Flagset and creates name/value pairs, where the name is the flag name, and the value is the argument provided to the flag. Next, it updates any command line flag’s internal variable.

Define flags, and then execute their logic in the main method. Think of CLI flag implementations as programs that call external libraries, even if the library is included in the same project.

## Defining flags

You have two options when defining flags:
- `flag.[Type]`: Returns a variable that holds the address where the flag value is stored.
- `flag.[Type]Var`: Accepts a pointer to the address where the flag value is stored. Use this when you want to use Go's `flag` package to implement short and long names for a flag.

There is an implementations of these methods for each type. For example, there is a `flag.String`, `flag.StringVar`, `flag.Bool`, `flag.BoolVar`, etc.

### flag.[Type]

This method returns an address where the flag's value is stored:
1. Define a variable.
2. Parse the flag in an `init` function
3. Dereference the variable to access its value.

This example creates a flag named `name` and outputs "Hello [name]" to STDOUT:

```go
var name = flag.String("name", "World", "A name to say hello to.")

func init() {
	flag.Parse()
}

func main() {
	fmt.Printf("Hello %s\n", *name)
}
```

### flag.[Type]Var

This method accepts a pointer to an existing variable. You pass a pointer to this method, and the value is stored in the variable when the flags are parsed.

Use this method when you want to use Go's flag package to create both long and short names for a single flag. When the compiler parses the flags, it assigns the value to whichever flag was passed to on the command line.

1. Define a variable
2. Pass a pointer to this method within the `init` function. Order matters---if the user passes both the long and short flag name, the compiler assigns the value to the flag defined last:
3. Parse the flags in the `init` function.

This example creates two flags: `n` and `name`. Both point to the `name` variable. The `main` method outputs "Hello [name]" to STDOUT:

```go
var name string

func init() {
	flag.StringVar(&name, "name", "World", "A name to say hello to.")
	flag.StringVar(&name, "n", "World", "A name to say hello to.")
	flag.Parse()
}

func main() {
	fmt.Printf("Hello %s\n", name)
}
```

## Flag functions

Call each of these functions after you call `flag.Parse()`:

| Function               | Description                                                                                                                                                                   | Common Use                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `flag.PrintDefaults()` | Prints all registered flags with their default values and usage text. Runs automatically with `-h` or `--help` when using the default `FlagSet`. Can also be called manually. | Show built-in help/usage output.                    |
| `flag.VisitAll()`      | Runs a callback function for **every** registered flag (set or unset). Useful for custom help formatting or documentation generation.                                         | Build custom usage/help text.                       |
| `flag.Visit()`         | Runs a callback function only for flags that the **user actually set**.                                                                                                       | Log or process only the flags the user passed in.   |
| `flag.Arg(i int)`      | Returns the *i-th* positional argument (after all flags). Index is 0-based. Returns `""` if out of range.                                                                     | Access specific positional args (e.g., input file). |
| `flag.Args()`          | Returns a slice of all positional arguments (after all flags).                                                                                                                | Get all non-flag arguments for further processing.  |
| `flag.NArg()`          | Returns the number of positional arguments (after all flags).                                                                                                                 | Validate number of required positional args.        |
| `flag.NFlag()`         | Returns the number of flags explicitly set by the user.                                                                                                                       | Check if any flags were provided at all.            |
