+++
title = 'Cobra'
date = '2025-08-13T15:51:46-04:00'
weight = 20
draft = false
+++

```go
/*
Copyright © 2024 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
    "os"

    "github.com/spf13/cobra"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
    Use:   "cobra-calc",
    Short: "A simple calculator.",
    Long:  `A calculator that can perform simple computations, including add, subtract, multiply, and divide.`,
    // Uncomment the following line if your bare application
    // has an action associated with it:
    // Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
    err := rootCmd.Execute()
    if err != nil {
        os.Exit(1)
    }
}

func init() {
    // Here you will define your flags and configuration settings.
    // Cobra supports persistent flags, which, if defined here,
    // will be global for your application.

    // rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.cobra-calc.yaml)")

    // Cobra also supports local flags, which will only run
    // when this action is called directly.
    rootCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
    rootCmd.AddCommand(addCmd)
    rootCmd.AddCommand(subtractCmd)
    rootCmd.AddCommand(multiplyCmd)
    rootCmd.AddCommand(divideCmd)
}
```

add.go

```go
/*
Copyright © 2024 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
    "log"

    "cobra-calc/internal/helpers"

    "github.com/spf13/cobra"
)

// addCmd represents the add command
var addCmd = &cobra.Command{
    Use:   "add",
    Short: "Add two numbers",
    Long:  "Add two numbers: add <number1> <number2>",
    Run: func(cmd *cobra.Command, args []string) {
        result, err := helpers.Operation("add", args[0], args[1])
        if err != nil {
            log.Fatal(err)
        }
        log.Printf("result: %f\n", result)
    },
    Args: cobra.ExactArgs(2),
}

func init() {
    rootCmd.AddCommand(addCmd)

    // Here you will define your flags and configuration settings.

    // Cobra supports Persistent Flags which will work for this command
    // and all subcommands, e.g.:
    // addCmd.PersistentFlags().String("foo", "", "A help for foo")

    // Cobra supports local flags which will only run when this command
    // is called directly, e.g.:
    // addCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
```