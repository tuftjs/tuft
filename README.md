# Tuft

A fast, lightweight HTTP/2 web framework for Node.js, with no dependencies.

![Node.js CI](https://github.com/tuftjs/tuft/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/tuftjs/tuft/badge.svg)](https://coveralls.io/github/tuftjs/tuft)
[![Known Vulnerabilities](https://snyk.io/test/github/tuftjs/tuft/badge.svg?targetFile=package.json)](https://snyk.io/test/github/tuftjs/tuft?targetFile=package.json)

Official website: [https://tuft.dev](https://tuft.dev)

Tuft was built from the ground up with the future in mind. Leveraging the power of Node's core HTTP/2 API, and the convenience of ES6 async functions, Tuft aims to provide a Node web framework that's optimized for your modern projects.

## Getting started
You can install Tuft via npm:
```sh
npm install tuft
```

A simple "Hello, world!" example:
```js
const { createRouteMap } = require('tuft')

async function init() {
  const app = createRouteMap()

  app.set('GET /', {
    text: 'Hello, world!'
  })

  const server = app.createServer({ port: 3000 })

  await server.start()

  console.log(`Server listening at http://${server.host}:${server.port}`)
}

init()
```
This would ordinarily be the part where we might say that if you visit `http://localhost:3000` in your web browser, you'll see the text "Hello, world!" displayed. Except... you wouldn't! As there are no browsers known to support *unencrypted* HTTP/2 connections, you would have to use something like the command line client `curl` to access the server in the example above.

```sh
$ curl --http2-prior-knowledge http://localhost:3000
Hello, world!
```

Note: The `--http2-prior-knowledge` option is only necessary for this example so that curl doesn't think we're trying to access an HTTP/1 server.
It is not necessary when using curl to access a secure HTTP/2 server.

If we want to be able to access our example server from a browser, we'll have to rewrite the above code to use `https` instead of `http`:

```js
const { createRouteMap } = require('tuft')
const { readFileSync } = require('fs')

...

const server = app.createSecureServer({
  key: readFileSync('key.pem'),
  cert: readFileSync('cert.pem'),
  port: 3000
})
```
For this example to work, you'll also need a private key and certificate in `.pem` format. For the purpose of our example, we can just generate our own using the following command:

```sh
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout key.pem -out cert.pem
```

Place the two freshly generated `.pem` files in the example server's root directory, then start the server again. If you visit `https://localhost:3000` in your web browser, you should be presented with the text "Hello, world!".

Note: Since you've generated your own certificates, and the browser has no way to verify the owner of the server, it will most likely warn you that you're visiting an untrusted webpage. Since you are the owner, you can safely ignore such warnings for this example.

For more information on how to use Tuft, see the [official documentation](https://tuft.dev/docs).

## People
The creator and maintainer of Tuft is [Stuart Kennedy](https://github.com/rav2040).

## License
[MIT](https://github.com/tuftjs/tuft/blob/master/LICENSE)
