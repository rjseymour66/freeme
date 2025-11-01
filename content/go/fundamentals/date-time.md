+++
title = 'Date Time'
date = '2025-10-24T00:01:39-04:00'
weight = 70
draft = false
+++

Computers have two different types of clocks: a wall clock and a monotonic. A wall clock is synchronized with an NTP server to set the correct time on the computer. Its time can be inconsistent---another user or program might set this clock, or it might just jump back and forth.

A monotonic clock is always moving forward and is not affected by variables like the wall clock. Because it is always moving forward, the monotonic clock is used to measure duration.

## Time struct

Go's [Time](https://pkg.go.dev/time#Time) struct represents an instant in time with nanosecond precision. It consists of a wall clock, monotonic clock, and time zone:

```go
type Time struct {
    wall uint64        // wall clock time (date/time fields)
    ext  int64         // extended precision or monotonic data
    loc  *Location     // time zone
}
```

### Methods - wall vs monotonic

`Time` has methods that work with exclusively with the wall and monotonic clock:

| Category                 | Method                                                  | Wall Clock | Monotonic Clock | Notes                                                     |
| ------------------------ | ------------------------------------------------------- | ---------- | --------------- | --------------------------------------------------------- |
| **Construction**         | `time.Now()`                                            | ✅          | ✅               | Returns a `Time` with both wall and monotonic times.      |
|                          | `time.Date()`                                           | ✅          | ❌               | Constructs a wall clock time only (no monotonic part).    |
|                          | `time.Unix()` / `time.UnixMicro()` / `time.UnixMilli()` | ✅          | ❌               | Wall clock only.                                          |
| **Accessors**            | `Year()`, `Month()`, `Day()`                            | ✅          | ❌               | Readable calendar parts.                                  |
|                          | `Hour()`, `Minute()`, `Second()`, `Nanosecond()`        | ✅          | ❌               | Wall clock components.                                    |
|                          | `Location()`, `Zone()`                                  | ✅          | ❌               | Based on the `Location` pointer.                          |
|                          | `Weekday()`                                             | ✅          | ❌               | Calendar weekday.                                         |
| **Formatting / Parsing** | `Format()`, `String()`                                  | ✅          | ❌               | Output uses wall time.                                    |
|                          | `time.Parse()`                                          | ✅          | ❌               | Produces a wall time only.                                |
| **Conversions**          | `t.UTC()`                                               | ✅          | ✅ (kept)        | Converts to UTC but preserves monotonic time if present.  |
|                          | `t.In(loc)`                                             | ✅          | ✅ (kept)        | Converts to another zone, monotonic time preserved.       |
| **Comparison**           | `t.Equal(u)`                                            | ✅          | ✅               | Uses monotonic time if both have it; otherwise wall time. |
|                          | `t.Before(u)`                                           | ✅          | ✅               | Uses monotonic time if both have it.                      |
|                          | `t.After(u)`                                            | ✅          | ✅               | Uses monotonic time if both have it.                      |
| **Arithmetic**           | `t.Add(d)`                                              | ✅          | ✅               | Adds duration; monotonic time preserved if present.       |
|                          | `t.Sub(u)`                                              | ❌          | ✅               | Uses monotonic time if both have it; otherwise wall time. |
|                          | `time.Since(t)`                                         | ❌          | ✅               | Shortcut for `time.Now().Sub(t)` — monotonic.             |
|                          | `time.Until(t)`                                         | ❌          | ✅               | Shortcut for `t.Sub(time.Now())` — monotonic.             |
| **Serialization**        | `t.MarshalText()` / `t.UnmarshalText()`                 | ✅          | ❌               | Monotonic info is discarded when serializing.             |
| **Zero / Equality**      | `t.IsZero()`                                            | ✅          | ❌               | Checks wall clock zero time.                              |


If you want to remove the monotonic clock from a `Time` instance, pass `0` to `Round`:

```go
func main() {
	now := time.Now()
	fmt.Println(now.Round(0)) // 2025-11-01 10:30:06.843355608 -0400 EDT
}
```

### Format

When you print a time in its default format (`time.Now()`), you get the following:

```go
2025-10-30 23:20:49.197299338 -0400 EDT m=+0.000016695
```

| Part                        | Example              | Meaning                                                                                                                                                                            |
| --------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**                    | `2025-10-30`         | The calendar date: year-month-day                                                                                                                                                  |
| **Time**                    | `23:20:49.197299338` | The wall clock time (hour:minute:second.nanoseconds)                                                                                                                               |
| **UTC offset**              | `-0400`              | The timezone offset from UTC (here: 4 hours behind UTC)                                                                                                                            |
| **Timezone abbreviation**   | `EDT`                | The name/abbreviation of the time zone (Eastern Daylight Time)                                                                                                                     |
| **Monotonic clock reading** | `m=+0.000016695`     | The elapsed time since the `time` value was obtained, relative to some internal monotonic clock. It’s used for measuring durations without being affected by system clock changes. |


## Current time

Get the current time with `time.Now()`. This returns a `Time` struct that contains both the wall clock and monotonic clock reading:

```go
func main() {
	now := time.Now()
	fmt.Println(now)    // 2025-10-30 23:20:49.197299338 -0400 EDT m=+0.000016695
}
```

## Add and subtract time

You both add and subtract time with the `Add` method. `Add` takes a `Duration` value, so you are adding a duration of time to the instant of time represented by the time struct.

To add, pass a positive Duration. To subtract, pass a negative duration.
1. Add 10 minutes to `now`.
2. Subtract 10 minutes from `now`.

```go
func main() {
	now := time.Now()
	future := now.Add(10 * time.Minute)     // 1
	past := now.Add(-10 * time.Minute)      // 2
	fmt.Println(past)                       // 2025-10-30 23:31:04.216592296 -0400 EDT m=-599.999985858
    fmt.Println(now)                        // 2025-10-30 23:41:04.216592296 -0400 EDT m=+0.000014142
	fmt.Println(future)                     // 2025-10-30 23:51:04.216592296 -0400 EDT m=+600.000014142
}
```

## Dates

The `time` package provides the `Date` function that you can use to create a specific date and time. Note that all values are `int` except for `Location`.

```
time.Date(year int, month time.Month, day int, hour int, min int, sec int, nsec int, loc *time.Location)
```
You have to pass a non-nil value for the `*time.Location` parameter.

```go
func main() {
	date := time.Date(2025, time.October, 30, 11, 45, 0, 0, time.UTC)
	fmt.Println(date) // 2025-10-30 11:45:00 +0000 UTC
}
```
### Month and Weekday

The `Month` and `Weekday` types are `int`s that return the corresponding month or weekday. `Weekday` is zero-indexed. You most often use these methods to extract the month or weekday from a `Time` struct.

1. Create a date. `Date` returns a `Time` struct that corresponds to the given values.
2. Extract the month from `date`.
3. Get the string value of `month`.
4. Extract the weekday value from `date`.
5. Get the string value of `weekday`.

```go
func main() {
	date := time.Date(2025, time.October, 30, 11, 45, 0, 0, time.UTC)   // 1
	month := date.Month()                                               // 2
	mStr := month.String()                                              // 3
	weekday := date.Weekday()                                           // 4
	wStr := weekday.String()                                            // 5
	fmt.Println(mStr)                                                   // October
	fmt.Println(wStr)                                                   // Thursday
}
```

## Time Zones

Go's `time` package represents time zones with a `Location`. Go has a built-in time zone database managed by the Internet Assigned Numbers Authority (IANA). This database is called _tz_ or _zoneinfo_, and it uses the `Area/Location` naming convention. For example, `Asia/Singapore`.

### Built-in TZ database

`LoadLocation` gives you access to the time zone in the built-in IANA database. This example loads a location (time zone) from the database and then uses `In` to convert an instant in time to another time zone:
1. Load a location from the built-in database.
2. Check for errors.
3. Create a specific time in UTC.
4. Convert the specific time to Singapore's local time.

```go
func main() {
	location, err := time.LoadLocation("Asia/Singapore")                    // 1
	if err != nil {                                                         // 2
		log.Println("Cannot load location: ", err)
	}

	fmt.Println("location:", location) // location: Asia/Singapore
	utcTime := time.Date(2009, time.November, 10, 23, 0, 0, 0, time.UTC)    // 3
	fmt.Println("UTC time: ", utcTime) // UTC time:  2009-11-10 23:00:00 +0000 UTC
	fmt.Println("equivalent in Singapore:", utcTime.In(location))           // 4 equivalent in Singapore: 2009-11-11 07:00:00 +0800 +08
}
```

### Custom TZ

You don't have to use the internal time zone database to create a time zone. You can define a custom time zone with `FixedZone`. This function takes a string description, and an offset in seconds east of UTC. Custom time zones do not handle daylight saving time.

The following example creates a custom time zone:
1. Create a location named "Singapore Time" that is 8 hours east of UTC.
2. Create a specific time in UTC.
3. Convert the specific time to Singapore's local time.

```go
func main() {
	location := time.FixedZone("Singapore Time", 8*60*60)                   // 1
	fmt.Println("location: ", location)     // location:  Singapore Time
	utcTime := time.Date(2009, time.November, 10, 23, 0, 0, 0, time.UTC)    // 2
	fmt.Println("UTC time:", utcTime)       // UTC time: 2009-11-10 23:00:00 +0000 UTC
	fmt.Println("equivalent in Singapore", utcTime.In(location))            // 3 equivalent in Singapore 2009-11-11 07:00:00 +0800 Singapore Time
}
```

## Durations

Represent a span of time with `Duration`, which is an `int64` with helper methods. Because a `Duration` is an `int64`, you can construct a span of time with arithmetic. This example shows common methods:


```go
func main() {
	d := 2 * time.Hour
	dur := (2 * time.Hour) + (34 * time.Minute) + (5 * time.Second)

	fmt.Println(d)                  // 2h0m0s
	fmt.Println(dur)                // 2h34m5s
    fmt.Println(d.Nanoseconds())    // 7200000000000
	fmt.Println(d.Microseconds())   // 7200000000
	fmt.Println(d.Milliseconds())   // 7200000
	fmt.Println(d.Seconds())        // 7200
	fmt.Println(d.Minutes())        // 120
	fmt.Println(dur.Hours())        // 2.5680555555555555
}
```

## Measuring lapsed time

Measure lapsed time with the monotonic clock available in a `Time` struct. When you log a time instance, you get the monotonic time and wall clock time. The monotonic time begins with `m=`, and the wall clock is everything that precedes it:

```go
2025-11-01 10:10:03.996705232 -0400 EDT m=+0.000068038
2025-11-01 10:10:03.996705232 -0400 EDT     // wall clock
m=+0.000068038                              // monotonic clock
```

The monotonic clock shows how long it takes your program to run. To illustrate, run a simple program, then run the same program with a `Sleep` method:

```go
// standard
func main() {
	now := time.Now()
	fmt.Println(now)            // 2025-11-01 10:19:52.002990026 -0400 EDT m=+0.000073671
}

// with Sleep
func main() {
	time.Sleep(5 * time.Second)
	now := time.Now()
	fmt.Println(now)            // 2025-11-01 10:20:39.105027102 -0400 EDT m=+5.003978979
}
```

Compare the monotonic portions of the `time` instances. The implemenation with `Sleep` has a `5` in the monotonic clock value:

| Implementation   | Monotonic value  |
| :--------------- | :--------------- |
| Standard         | `m=+0.000073671` |
| 5 second `Sleep` | `m=+5.003978979` |

### Sub()

`Sub` returns the duration of the caller minus the given `Time` instance. For example, the following code creates two `Time` instances with a 1 second pause between the two. Call `Sub` with the second instance, `t2` and pass it the first instance, `t1`:







```go
func main() {
	t1 := time.Now()
	time.Sleep(1 * time.Second)
	t2 := time.Now()

	fmt.Println(t1)                             // 2025-11-01 10:36:32.246513737 -0400 EDT m=+0.000023366
	fmt.Println(t2)                             // 2025-11-01 10:36:33.246574122 -0400 EDT m=+1.000083801
	fmt.Println("difference: ", t2.Sub(t1))     // difference:  1.000060435s
}
```