+++
title = 'JSON'
date = '2025-10-11T17:08:03-04:00'
weight = 20
draft = false
+++

JavaScript Object Notation (JSON) is a lightweight data exchange format that is popular with RESTful web services and configuration. It is human-readable but also easily read by machines. It is described by [RFC 7159](https://datatracker.ietf.org/doc/html/rfc7159) and [ECMA-404](https://ecma-international.org/publications-and-standards/standards/ecma-404/).

## Parsing JSON data byte arrays

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

The `unmarshalAPI` function demonstrates how you can convert a GET request from raw JSON bytes to a struct:
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