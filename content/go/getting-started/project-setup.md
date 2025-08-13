+++
title = 'Project Setup'
date = '2025-08-12T23:23:44-04:00'
weight = 10
draft = false
+++


## Project structure

When you build an executable, the convention is to nest `main` and `init` functions within subdirectories of `/cmd`. For example, `/cmd/host/main.go`. You cannot have more than one `main.go` file in a directory.