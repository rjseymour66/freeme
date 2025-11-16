+++
title = 'TLS'
date = '2025-11-15T09:39:02-05:00'
weight = 100
draft = false
+++

Transport Security Layer (TLS) encrypts communications between the client and server. HTTPS is layering HTTP on top of the TLS layer.

## Serving HTTPS

`ListenAndServeTLS` has the following parameters:
- `cert.pem`: The SSL certificate that is issued by a Certificate Authority (CA) such as Let's Encrypt.
- `key.pem`: Private key for the server.

```go
func index(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello TLS"))
}

func main() {
	http.HandleFunc("/", index)
	http.ListenAndServeTLS(":8000", "cert.pem", "key.pem", nil)
}
```
## Generating certs and keys

For testing purposes, you can generate a certificate and a self-signed key with SSL. In a production environment, you want to get your private key signed by a real CA.

The following command generates a private CA certificate and key:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
...
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:US
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:Go Stuff
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:localhost
Email Address []:example@example.com
```

### Command options

Here are the common `openssl` command options to generate a certificiate and key for testing:

| Option             | Meaning                     | Description                                                                                                                    |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `req`              | Certificate request command | Tells OpenSSL to use the X.509 certificate request and creation tool.                                                          |
| `-x509`            | Create a self-signed cert   | Outputs a self-signed X.509 certificate instead of generating a CSR.                                                           |
| `-newkey rsa:4096` | Generate a new key pair     | Creates a new private key and certificate at the same time. Here it uses a 4096-bit RSA key.                                   |
| `-keyout key.pem`  | Output private key file     | Saves the generated private key to `key.pem`.                                                                                  |
| `-out cert.pem`    | Output certificate file     | Writes the generated certificate to `cert.pem`.                                                                                |
| `-days 365`        | Validity period             | Certificate will be valid for 365 days.                                                                                        |
| `-nodes`           | No DES (no encryption)      | Saves the private key without a passphrase (unencrypted). Necessary for servers that must start without manual password entry. |
