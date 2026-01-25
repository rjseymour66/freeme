+++
title = 'Language features'
date = '2025-08-29T08:30:12-04:00'
weight = 10
draft = false
+++

## Type system

Go implements a flat type system, which means there are no type hierarchies like classes. This provides a lean version of object-oriented programming that favors composition over inheritence. Polymorphism is achieved with interfaces.

### Composition over inheritence

Go uses composition over inheritence. In inheritence, a child class inherits attributes and behaviors from a parent class to make code more reusable. It promotes flexibility through polymorphism, which lets a child object be treated like its parent class.

Go implements composition through struct embedding, which is when you use one struct type within another, and the outer type can access the inner type's attributes and methods as its own. These types are not connected in a hierarchy, which means they remain distinct and are not interchangeable. This prevents problems with inheritance, such as tight coupling and confusing code hierarchies.

## Address space

In Go, the address space is the set of virtual memory addresses your program can use, managed by the OS and Go runtime. It's a "map" of memory available to your Go program. Pointers and variables live in this space, and Go ensures memory safety so you can’t accidentally reach outside of it.

Every process (like your Go binary when you run it) has its own virtual address space given by the operating system. This is why two different Go programs can both have variables at the same "address" (say 0x140000100), because those addresses are virtualized per process.

### Go runtime and address space

The Go runtime manages memory inside your program’s address space with these memory regions:

| Memory Region    | Description                                         | Growth Direction |
| ---------------- | --------------------------------------------------- | ---------------- |
| Kernel Space     | Reserved for OS, not accessible by Go               | –                |
| Shared Libs      | System libraries, Go runtime, cgo libs              | –                |
| Heap             | Dynamically allocated vars (`make`, `new`, escapes) | ↑ (upward)       |
| Free / mmap      | Unused virtual memory, used when heap expands       | –                |
| Goroutine Stacks | Each goroutine has its own stack                    | ↓ (downward)     |
| Globals / Data   | Package-level vars, constants, initialized data     | –                |
| Code Segment     | Compiled Go instructions, read-only                 | –                |
| Reserved / NULL  | Protects invalid access at address `0x0`            | –                |

The garbage collector also works across this address space, tracing pointers and freeing unused memory.

### Practical implications

A pointer (`*T`) in Go is literally an address within your program’s address space. You cannot access an address outside your process’s address space. For example, Go won’t let you dereference arbitrary integers as memory addresses, unlike C.

If your Go program tries to access memory outside its address space, the OS will kill it with a segmentation fault.


