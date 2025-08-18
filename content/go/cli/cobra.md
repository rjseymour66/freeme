+++
title = 'Cobra'
date = '2025-08-13T15:51:46-04:00'
weight = 20
draft = false
+++

https://cobra.dev/docs/tutorials/12-factor-app/

[Cobra](https://github.com/spf13/cobra) is a CLI framework that makes it easier to create POSIX-style command line tools with Go.

This page describes what you need to create and build a project. Read the [user guide](https://github.com/spf13/cobra/blob/main/site/content/user_guide.md) for comprehensive instructions.

## Quickstart

1. Create your project root and init a Go project:
   ```bash
   mkdir app
   go mod init github.com/username/app
   ```
2. Install Cobra dependencies. These commands install the latest versions of Cobra and the [cobra generator](https://github.com/spf13/cobra-cli):
   
   ```bash
   go get -u github.com/spf13/cobra@latest
   go install github.com/spf13/cobra-cli@latest
   ```
3. Initialize a Cobra project. This command inits the project and creates boilerplate:
   ```bash
   cobra-cli init
   tree
   app
   ├── cmd
   │   └── root.go
   ├── go.mod
   ├── go.sum
   ├── LICENSE
   └── main.go
   ```
1. Edit your `cmd/root.go` file with your project information. By default, the `init` command names your project `cobra` and adds boilerplate short and long descriptions. This example renames the project `calculator` and updates both descriptions:
   ```go
   var rootCmd = &cobra.Command{
   	   Use:   "calculator",
   	   Short: "A simple calculator",
   	   Long:  `A calculator that performs simple computations, such as add, subtract, multiply, and divide.`,
   	   // Uncomment the following line if your bare application
   	   // has an action associated with it:
   	   // Run: func(cmd *cobra.Command, args []string) { },
   }
   ```
1. Test your project:
   ```bash
   go run . -t
   ```

## Commands and subcommands

### Adding commands

A subcommand is a
Add commands and subcommands. Here, we want to create a simple math application, so start with the `add` command:
```bash
cobra-cli add add
```
This creates `cmd/add.go`. In the project, the add command is given the internal variable name `addCmd`.


## Flags

## Configuration

When you generate a new project, the boilerplate includes information about the author, which license to use, etc. You can customize this with a `.cobra.yaml` file in your home directory. Here is a basic example:

```yaml
author: First Last <name@email.com>
license: MIT
useViper: true
```