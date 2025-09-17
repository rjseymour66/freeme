+++
title = 'HTML'
date = '2025-09-16T22:38:19-04:00'
weight = 10
draft = false
+++

Go has a templating engine that lets you return text and HTML in response to HTTP requests. The HTML library is built on top of the text engine. It is context-aware, which means it understands HTML, CSS, JS, and URIs and escapes data based on where it appears in the HTML output. In short, developers are trusted and any user data that is injected with variables is untrusted and is escaped. This is a security measure to prevent attacks such as cross-site scripting (XSS) from untrusted data.

For example, if a user input the following:

```html
<script>alert('malicious')</script>
```

The HTML template package escapes text to output this:

```html
&lt;script&gt;alert(&#39;malicious&#39;)&lt;/script&gt;
```

## Getting started

This example demonstrates the basics of HTML templating. It renders the title and content in this simple web page:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{.Title}}</title>
  </head>
  <body>
    <h1>{{.Title}}</h1>
    <p>{{.Content}}</p>
  </body>
</html>
```

Here is the code to replace `{{.Title}}` and `{{.Content}}` with the templating engine:
1. Create a struct that holds data you want to inject into the template.
2. A handler that loads the template data and executes the template.
3. The `Page` struct holds the data that you inject into the template.
4. This line does a few things:
   - `template.ParseFiles` takes a path to a template file. It loads the HTML file for processing.
   - `template.Must` is a helper function that you can wrap around `template.ParseFiles`. `template.ParseFiles` returns a `*Template` and an `error`. If it returns an `error`, then `Must` panics and stops execution. Otherwise, it returns the `*Template` type and continues processing. This code is equivalent to this:
   ```go
   t, err := template.ParseFiles("html/index.html")
   if err != nil {
       panic(err)
   }
   ```
5. `Execute` executes the template, which substitutes the `Page` values for the `{{.Title}}` and `{{.Content}}` values in the template and writes them to the `Writer`.
   

```go
type Page struct {                                                  // 1
	Title, Content string
}

func displayPage(w http.ResponseWriter, r *http.Request) {          // 2
	p := &Page{                                                     // 3
		Title:   ".Title example",
		Content: "This is the .Content block.",
	}

	t := template.Must(template.ParseFiles("html/index.html"))      // 4
	t.Execute(w, p)                                                 // 5
}

func main() {
	http.HandleFunc("/", displayPage)
	http.ListenAndServe(":8080", nil)
}
```