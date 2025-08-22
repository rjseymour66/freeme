+++
title = 'Configuration'
date = '2025-08-14T11:40:02-04:00'
weight = 20
draft = false
+++

Applications often require persistent configuration information. Config files let you pass the information without having to use command line arguments.

## JSON

Go has a robust JSON package for marshaling and unmarshaling JSON-formatted data. If you use JSON files for configuration, you can store the data in a struct. One issue is that JSON config files cannot contain comments.

Here is `conf.json`:

```json
{
  "username": "rjs",
  "password": "secret",
  "port": 4001,
  "storage": "path/to/local/store",
  "enableFlag": true
}
```
This code sample parses `conf.json` and stores its values in memory:
1. `config` exports all fields with capitalization.
2. `os.Open` returns a `*File` and an error. `*File` implements `io.Reader`.
3. Always use `defer` to close the file after you opening.
4. Create a new decoder, which takes an `io.Reader`
5. Create a `config` struct and decode it with `Decode`. The `Decode` method tries to match the keys in `conf.json` with the keys in the `cfg` struct of type `config`. If it finds a match, the value is assigned to the field in the `cfg` field. If there is no match, the value is ignored. Only exported fields are matched, and matches are case-insensitive.
   
   {{< admonition "" tip >}}
   You use `Decode` rather than `json.Unmarshal` because you are reading from a stream, file, or connection (not in-memory). Use `json.Unmarshal` when the JSON data is already in memory.
   {{< /admonition >}}

```go
type config struct {                        // 1
	Username   string
	Password   string
	Port       int
	Storage    string
	EnableFlag bool
}

func jsonConfig() {
	file, err := os.Open("conf.json")       // 2
	if err != nil {
		fmt.Println("Cannot read file `conf.json`", err)
		return
	}

	defer file.Close()                      // 3
	decoder := json.NewDecoder(file)        // 4
	cfg := config{}                         // 5
	err = decoder.Decode(&cfg)
	if err != nil {
		fmt.Println("Error parsing config file", err)
	}

    // output with field names
    fmt.Printf("%+v\n", cfg)
}
```


## YAML

YAML is a common configuration file format that accepts comments. Go does not have a native YAML parser, but the Gypsy library is widely used and recommended:

- [Gypsy repo](https://github.com/kylelemons/go-gypsy)
- [Gypsy documentation](https://pkg.go.dev/github.com/kylelemons/go-gypsy/yaml)

Here is `conf.yaml`:

```yaml
# Test conf file
username: "abc"
password: "secret"
port: 4001
enableFlag: true
```

This code sample parses `conf.yaml` and stores its values in memory:
1. The `yaml.ReadFile` function takes a string and returns a `*File`.
2. The `*File` type has methods to retrieve values of type `string`, `bool`, and `int`.
3. `GetInt` returns an `int64`, so you have to convert it to a `string`.


```go
func yamlConfig() {

	cfg, err := yaml.ReadFile("conf/conf.yaml")         // 1
	if err != nil {
		fmt.Println(err)
		return
	}

	var username, password, port string
	var intPort int64
	var enableFlag bool

	username, err = cfg.Get("username")                 // 2
	if err != nil {
		fmt.Println("`username` flag not set", err)
		return
	}

	password, err = cfg.Get("password")
	if err != nil {
		fmt.Println("`password` flag not set", err)
		return
	}

	intPort, err = cfg.GetInt("port")                   // 3
	if err != nil {
		fmt.Println("`port` flag not set", err)
		return
	}
	port = strconv.Itoa(int(intPort))

	enableFlag, err = cfg.GetBool("enableFlag")
	if err != nil {
		fmt.Println("`enableFlag` flag not set", err)
		return
	}
}
```

## INI

Go does not have a native INI parser, but the INI library is widely used and recommended:

- [Getting Started](https://ini.unknwon.io/docs/intro/getting_started)
- [API reference](https://gowalker.org/gopkg.in/ini.v1)

Here is `conf.ini`:

```ini
; Top level comment
[user]
username = rjs
password = secret

[server]
port = 4001

[flags]
enable_flag = true
```

This code sample parses `conf.ini` and stores its values in memory:
1. `ini.Load` takes an empty interface and returns a `*File` and an `error`. Make sure you check the error.
2. The `File` type has methods that you can chain to parse the file by hierarchy. Here, we parse first by `Section`, then `Key`. The `String` method returns the value as a `string`. `Bool` returns a Boolean and an error that indicates whether the value is an accepted Boolean value. For example, `true`, `false`, `on`, `off`, `0`, or `1`.

```go
func iniConfig() {

	cfg, err := ini.Load("conf/conf.ini")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	username := cfg.Section("user").Key("username").String()
	password := cfg.Section("user").Key("password").String()
	port := cfg.Section("server").Key("port").String()
	
    enableFlag, err := cfg.Section("flags").Key("enable_flag").Bool()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
```

## Environment variables

Modern applications often use environment variables to set configuration for each environment where the application runs. For example, you might have a different configuration for your development and production environments. Containers in the pipeline need access to this configuration at build time. Because environments and privileges can vary widely---a user might not have filesystem privileges---setting configuration in the environment is required.

{{< admonition "12-factor apps" note >}}
Configuring applications with environment variables is one of the factors in a 12-factor app.
{{< /admonition >}}

You can set environment variables in an environment configuration file like `.bashrc`, or you can manually export them to the shell session. Always namespace your variables to avoid conflicts during build stages.

The following example manually exports the `MYAPP_PORT` environment variable and sets its value as the port for a webserver:

```bash
export MYAPP_PORT="4005"    # set env var in shell session
unset MYAPP_PORT            # unset env var
```

When getting the env var, a common pattern to use is the "short-if declaration":

```go
func main() {
	var port string
	if port = os.Getenv("MYAPP_PORT"); port == "" {
        // handle empty MYAPP_PORT env var
		panic("env var MYAPP_PORT is not set!")
	}
    ...
}
```