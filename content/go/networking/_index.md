+++
title = 'Networking'
date = '2025-08-20T16:15:30-04:00'
weight = 90
draft = false
+++

## Terminology

backpressure
: When an upstream component has to reduce its data transmission rate when a downstream component is overwhelmed. For example, a TCP network logger has to reduce its writes over the network because the log server's buffer is full and cannot process all logging requests in time.

throughput
: The actual rate that data successfully transmits over a network from sender to receiver over a period of time.