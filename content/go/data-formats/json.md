+++
title = 'JSON'
date = '2025-10-11T17:08:03-04:00'
weight = 20
draft = false
+++

JavaScript Object Notation (JSON) is a lightweight data exchange format that is popular with RESTful web services and configuration. It is human-readable but also easily read by machines. It is described by [RFC 7159](https://datatracker.ietf.org/doc/html/rfc7159) and [ECMA-404](https://ecma-international.org/publications-and-standards/standards/ecma-404/).

## Decoding JSON

Decoding is another way to say "parsing". When you decode data, you convert it from an encoded format to the format you use in your program. You are parsing the data, byte by byte, into your program's memory.

### Unmarshalling vs decoding

The method you use to parse your JSON depends on the source. In short, `json.unmarshal` is best for in-memory JSON-formatted data, and a decoder works best when streaming data:

| Feature                                              | `json.Unmarshal`                                | `json.Decoder`                  |
| ---------------------------------------------------- | ----------------------------------------------- | ------------------------------- |
| Input type                                           | `[]byte`                                        | `io.Reader`                     |
| Reads                                                | Entire JSON at once                             | Streamed (chunk by chunk)       |
| Suitable for                                         | Small/medium data                               | Large or continuous data        |
| Can decode multiple JSONs                            | ❌                                               | ✅ Yes (via repeated `Decode()`) |
| Fine-grained control (unknown fields, numbers, etc.) | ❌ Limited                                       | ✅ More options                  |
| Common usage                                         | Parsing HTTP response body after `io.ReadAll()` | Streaming from file/socket/pipe |

### Bytes vs streams

Here is a JSON-formatted file, where each object is in a single array:

```json
[
  {
    "name": "Luke Skywalker",
    "height": "172",
    "mass": "77",
    "hair_color": "blond",
    "skin_color": "fair",
    "eye_color": "blue",
    "birth_year": "19BBY",
    "gender": "male",
    // ...
  },
  {
    "name": "C-3PO",
    "height": "167",
    "mass": "75",
    "hair_color": "n/a",
    "skin_color": "gold",
    "eye_color": "yellow",
    "birth_year": "112BBY",
    "gender": "n/a",
    // ...
  }
]
```

For comparison, this data is representative of a JSON stream. Each object is listed in no particular format, one after another:

```bash
{
    "name": "Luke Skywalker", 
    "height": "172", 
    "mass": "77", 
    "hair_color": "blond", 
    "skin_color": "fair", 
    "eye_color": "blue", 
    "birth_year": "19BBY", 
    "gender": "male", 
    ...
}
{
    "name": "C-3PO", 
    "height": "167", 
    "mass": "75", 
    "hair_color": "n/a", 
    "skin_color": "gold", 
    "eye_color": "yellow", 
    "birth_year": "112BBY", 
    "gender": "n/a", 
    ...
}
```

### Unmarshalling byte arrays

This example uses [this endpoint in SWAPI](https://swapi.dev/api/people/1), the Star Wars API.

Parsing JSON data involves two main steps:
1. Create a struct that models the JSON data you are decoding.
2. Unmarshal the raw JSON bytes into the struct.

The `Person` struct models the JSON object. Each field definition is followed by a struct tag, a raw string literal that maps that field to a key in the JSON for the encoder or decoder. A struct tag is always in the format `json:"key_name"`, with no space after the colon. Note that Go field names use camelCase, and struct tags use snake case:

```go
type Person struct {
	Name      string    `json:"name"`
	Height    string    `json:"height"`
	Mass      string    `json:"mass"`
	HairColor string    `json:"hair_color"`
	SkinColor string    `json:"skin_color"`
	EyeColor  string    `json:"eye_color"`
	BirthYear string    `json:"birth_year"`
	Gender    string    `json:"gender"`
	Homeworld string    `json:"homeworld"`
	Films     []string  `json:"films"`
	Species   []string  `json:"species"`
	Vehicles  []string  `json:"vehicles"`
	Starships []string  `json:"starships"`
	Created   time.Time `json:"created"`
	Edited    time.Time `json:"edited"`
	URL       string    `json:"url"`
}
```
The `unmarshal` function demonstrates how you can convert a JSON-formatted file from raw JSON bytes to a struct:
1. Open a local file. The file is a Reader.
2. `ReadAll` accepts a reader and returns a slice of bytes and an error. Here, we pass it the file handle.
3. Create a variable of type `Person`.
4. Call `json.Unmarshal` to unmarshal the slice of bytes in `data` into `person`. `Unmarshal` takes a slice of bytes to read and a pointer to a variable that can store the slice of bytes. It converts the raw bytes into the Go types defined by the pointer type.
5. Return the `person` variable.

```go
func unmarshal() Person {
	file, err := os.Open("person.json")                     // 1
	if err != nil {
		log.Println("Error opening json file: ", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)                           // 2
	if err != nil {
		log.Println("Error reading json data: ", err)
	}

	var person Person                                       // 3
	err = json.Unmarshal(data, &person)                     // 4
	if err != nil {
		log.Println("Error unmarshalling json data:", err)
	}
	return person                                           // 5
}
```

The `unmarshalAPI` function demonstrates how you can convert a GET request from raw JSON bytes to a struct. This method works when you are reading a single finite resource. For reading streams, see [Parsing JSON streams](#parsing-json-streams):
1. Makes a GET request to the given URL. This function returns an `http.Response` (a ReadCloser) and an `error`.
2. `ReadAll` accepts a Reader and returns a byte slice and an error.
3. Create a variable of type `Person`.
4. Call `json.Unmarshal` to unmarshal the slice of bytes in `data` into `person`. `Unmarshal` takes a slice of bytes to read and a pointer to a variable that can store the slice of bytes. It converts the raw bytes into the Go types defined by the pointer type.
5. Return the `person` variable.

```go
func unmarshalAPI() Person {
	res, err := http.Get("https://swapi.dev/api/people/1")      // 1
	if err != nil {
		log.Println("Cannot get from URL", err)
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)                           // 2
	if err != nil {
		log.Println("Error reading json data: ", err)
	}

	var person Person                                           // 3
	err = json.Unmarshal(data, &person)                         // 4
	if err != nil {
		log.Println("Error unmarshalling json data:", err)
	}
	return person                                               // 5
}
```

Finally, call the functions. Here, we log the returned `Person` struct to the console:

```go
func main() {
	file := unmarshal()
	api := unmarshalAPI()

	fmt.Println(file)
	fmt.Println(api)
}
```

### Decoding streams

A stream of JSON data is a continuous flow of JSON-encoded bytes. Parsing a stream of data requires different techniques than parsing a JSON file, because file techniques require that you read the entire file into memory before parsing. When you parse a stream, you parse it in chunks.

You can decode a JSON stream with `json.Decoder` and channels. The `decode` function uses channels to decode the JSON stream:
1. Takes as an argument a channel
2. Open a local file, but it can open any Reader. The file is a Reader.
3. Create a new Decoder. A Decoder is a wrapper around a Reader. Here, we wrap `file`.
4. Create an infinite `for` loop that decodes `Person` objects. Another option is to use a while-style `for` loop and the `More` method. `More` returns a boolean that reports whether there is another element in the stream, so you wouldn't need to check for an EOF. For a working example, see the [Go json docs](https://pkg.go.dev/encoding/json#Decoder.Decode).
5. Create a `person` variable of type `Person`.
6. `Decode` reads the next JSON-encoded value from the Reader. `Decode` mutates `person`, so you need to pass it a pointer.
7. When `Decode` reaches the end of the stream, it returns `io.EOF`. Exit the loop with `break` when this occurs.
8. Handle any errors and `break`, if necessary.
9. Send the `person` value into the channel. This send channel is unbuffered, so it blocks until another goroutine retrieves its value.
10. Close the channel after the loop exits when it either completes or returns an error.

```go
func decode(p chan Person) {                                    // 1
	file, err := os.Open("stream.txt")                          // 2
	if err != nil {
		log.Println("Error opening JSON file: ", err)
	}
	defer file.Close()

	decoder := json.NewDecoder(file)                            // 3

	for {                                                       // 4
		var person Person                                       // 5
		err = decoder.Decode(&person)                           // 6
		if err == io.EOF {                                      // 7
			break
		}
		if err != nil {                                         // 8
			log.Println("Error decoding json data: ", err)
			break
		}
		p <- person                                             // 9
	}
	close(p)                                                    // 10
}
```

The `main` function runs `decode` in a goroutine. This means that `main` can retrieve data from a channel:

1. Create a channel of type `Person`.
2. Run `decode` in its own goroutine.
3. Create an infinite loop to read from the channel. Because `decode` is running in a separate thread, `main` can start reading from the channel immediately.
4. Check for values with the [comma-ok](../fundamentals/idioms#comma-ok) idiom. `person` receives any value from the `p` channel, and `ok` reports whether the channel is open or closed. It returns `true` if the channel is open and `false` if the channel is closed. This occurs if `decode` exited its loop because of error or reaching an EOF.
5. If `ok` is `true`, there is a value in the channel. Here, we print it to the console with the 3rd-party [pretty](github.com/kr/pretty) package.
6. If `ok` is `false`, break. There is no cleanup because `decode` closes the channel.

```go
func main() {
	p := make(chan Person)                  // 1
	go decode(p)                            // 2

	for {                                   // 3
		person, ok := <-p                   // 4
		if ok {                             // 5
			fmt.Printf("%# v\n", pretty.Formatter(person))
		} else {                            // 6
			break
		}
	}
}
```

## Encoding JSON

When you encode json, you create JSON-encoded data from in-memory data, such as a struct.

### Marshaling byte arrays


### Encoding streams


## Omitting fields