+++
title = 'TCP'
date = '2025-09-06T22:59:20-04:00'
weight = 10
draft = false
+++

TCP provides built-in handshaking, error detection, and reconnection features.

## Simple TCP server

To test TCP programs, you need a TCP server. Netcat is a simple command line utility that accepts simple test messages on the specified port and writes them to the console.

Run this command in a terminal to start a TCP server that listens (`-l`) continuously (`-k`) on port 1902:

```bash
nc -lk 1902
```