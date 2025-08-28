+++
title = 'Fundamentals'
date = '2025-08-22T08:45:53-04:00'
weight = 20
draft = false
+++

## Address space (revise)

In Go, the address space is the set of virtual memory addresses your program can use, managed by the OS and Go runtime. Pointers and variables live in this space, and Go ensures memory safety so you can’t accidentally reach outside of it.

An address space is the range of memory addresses that a program can use.

Think of it as the "map" of memory available to your Go program.

Every process (like your Go binary when you run it) has its own virtual address space given by the operating system.

This is why two different Go programs can both have variables at the same "address" (say 0x140000100), because those addresses are virtualized per process.

3. Go runtime and address space

The Go runtime manages memory inside your program’s address space:

Heap → for dynamically allocated objects (new, make, escaped vars).

Stack → each goroutine has its own stack region.

Code segment → compiled Go instructions.

Globals/data → package-level variables.

The garbage collector also works across this address space, tracing pointers and freeing unused memory.

4. Practical implications in Go

A pointer (*T) in Go is literally an address within your program’s address space.

You can’t see outside your process’s address space (Go won’t let you dereference arbitrary integers as memory addresses, unlike C).

If your Go program tries to access memory outside its address space, the OS will kill it (with a segmentation fault).

### Diagram

┌───────────────────────────┐  High memory addresses
│        Kernel Space       │  (reserved for OS, not accessible by Go)
├───────────────────────────┤
│        Shared Libs        │  (system libs, Go runtime, cgo libs)
├───────────────────────────┤
│       Go Heap             │  (dynamically allocated vars, e.g. make, new, escapes)
│       ↑ grows upward      │
├───────────────────────────┤
│       Free / mmap region  │  (unused virtual memory, used when heap expands)
├───────────────────────────┤
│       Goroutine Stacks    │  (each goroutine has its own stack)
│       ↓ grow downward     │
├───────────────────────────┤
│       Globals / Data      │  (package-level vars, constants, initialized data)
├───────────────────────────┤
│       Code Segment        │  (compiled Go instructions, read-only)
├───────────────────────────┤
│       Reserved / NULL     │  (protects invalid access at address 0x0)
└───────────────────────────┘  Low memory addresses
