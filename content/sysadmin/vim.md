+++
title = 'Vim'
date = '2025-08-18T10:04:38-04:00'
weight = 10
draft = false
+++


## Basic Navigation

| Command    | Description                                |
| ---------- | ------------------------------------------ |
| `h`        | Move left                                  |
| `j`        | Move down                                  |
| `k`        | Move up                                    |
| `l`        | Move right                                 |
| `w`        | Move to the beginning of the next word     |
| `b`        | Move to the beginning of the previous word |
| `e`        | Move to the end of the current word        |
| `0`        | Move to the beginning of the line          |
| `$`        | Move to the end of the line                |
| `gg`       | Go to the first line of the file           |
| `G`        | Go to the last line of the file            |
| `Ctrl + u` | Move up half a screen                      |
| `Ctrl + d` | Move down half a screen                    |

## Editing

| Command    | Description                                         |
| ---------- | --------------------------------------------------- |
| `i`        | Insert mode at the cursor                           |
| `I`        | Insert mode at the beginning of the line            |
| `a`        | Append mode after the cursor                        |
| `A`        | Append mode at the end of the line                  |
| `o`        | Open a new line below the current line              |
| `O`        | Open a new line above the current line              |
| `x`        | Delete the character under the cursor               |
| `X`        | Delete the character before the cursor              |
| `dd`       | Delete the current line                             |
| `dw`       | Delete from the cursor to the end of the word       |
| `d$`       | Delete from the cursor to the end of the line       |
| `d0`       | Delete from the cursor to the beginning of the line |
| `yy`       | Copy (yank) the current line                        |
| `yw`       | Copy (yank) the current word                        |
| `y$`       | Copy (yank) to the end of the line                  |
| `p`        | Paste after the cursor                              |
| `P`        | Paste before the cursor                             |
| `u`        | Undo                                                |
| `Ctrl + r` | Redo                                                |

## Visual Mode

| Command    | Description                   |
| ---------- | ----------------------------- |
| `v`        | Start visual mode             |
| `V`        | Start visual line mode        |
| `Ctrl + v` | Start visual block mode       |
| `y`        | Yank (copy) the selected text |
| `d`        | Delete the selected text      |
| `>`        | Indent the selected text      |
| `<`        | Un-indent the selected text   |

## Search and Replace

| Command          | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `/pattern`       | Search for pattern                                         |
| `?pattern`       | Search backward for pattern                                |
| `n`              | Repeat the search in the same direction                    |
| `N`              | Repeat the search in the opposite direction                |
| `:%s/old/new/g`  | Replace all occurrences of old with new in the entire file |
| `:%s/old/new/gc` | Replace all occurrences with confirmation                  |

## Working with Multiple Files

| Command       | Description               |
| ------------- | ------------------------- |
| `:e filename` | Open a file               |
| `:w`          | Save the current file     |
| `:w filename` | Save as filename          |
| `:q`          | Quit Vim                  |
| `:wq`         | Save and quit             |
| `:q!`         | Quit without saving       |
| `:bn`         | Go to the next buffer     |
| `:bp`         | Go to the previous buffer |
| `:bd`         | Delete a buffer           |

## Useful Commands

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `:set nu`           | Show line numbers                 |
| `:set nonu`         | Hide line numbers                 |
| `:syntax on`        | Enable syntax highlighting        |
| `:syntax off`       | Disable syntax highlighting       |
| `:set paste`        | Enable paste mode                 |
| `:set nopaste`      | Disable paste mode                |
| `:set tabstop=4`    | Set tab width to 4 spaces         |
| `:set expandtab`    | Convert tabs to spaces            |
| `:set shiftwidth=4` | Set indentation width to 4 spaces |

## Exiting Vim

| Command       | Description         |
| ------------- | ------------------- |
| `:w`          | Save the file       |
| `:q`          | Quit Vim            |
| `:wq` or `ZZ` | Save and quit       |
| `:q!`         | Quit without saving |