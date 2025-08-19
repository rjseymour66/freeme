+++
title = 'Errors Panics'
date = '2025-08-18T10:58:11-04:00'
weight = 50
draft = false
+++

You can either use `return` statements to exit when there is an error, or you can generate custom errors:
- return statements: avoids `switch` statements and `if/else` logic
- `os.Exit(1)`
- generic `err`
- custom errors