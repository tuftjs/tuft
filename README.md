# Tuft

A fast, lightweight HTTP/2 web framework for Node.js, with no dependencies.

![Node.js CI](https://github.com/tuftjs/tuft/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/tuftjs/tuft/badge.svg)](https://coveralls.io/github/tuftjs/tuft)
[![Known Vulnerabilities](https://snyk.io/test/github/tuftjs/tuft/badge.svg?targetFile=package.json)](https://snyk.io/test/github/tuftjs/tuft?targetFile=package.json)

Tuft was built from the ground up with the future in mind. Leveraging the power of Node's core HTTP/2 API, and the convenience of ES6 async functions, Tuft aims to provide a Node web framework that's optimized for your modern projects.

## Getting started
You can install Tuft via npm:
```sh
npm i tuft
```

A simple **Hello, world!** example:
```js
const { createRouteMap } = require('tuft');

async function init() {
  const app = createRouteMap();

  app.set('GET /', {
    response: {
      body: 'Hello, world!'
    }
  });

  const server = app.createServer({ port: 3000 });

  await server.start();

  console.log(`Server listening at http://${server.host}:${server.port}`);
}

init();
```
This would ordinarily be the part where we might say that if you visit `http://localhost:3000` in your web browser, you'll see the text "Hello, world!" displayed. Except... you wouldn't! As there are no browsers known to support *unencrypted* HTTP/2 connections, you would have to use something like the command line client `curl` to access the above example server.

```sh
$ curl --http2-prior-knowledge http://localhost:3000
Hello, world!
```

>The `--http2-prior-knowledge` option is only necessary for this example so that curl doesn't think we're trying to access a HTTP/1 server.
>It is not necessary when using curl to access an `https` server.

If we want to be able to access our example server from a browser, we'll have to rewrite the above code to use `https` instead of `http`:

```js
const { createRouteMap } = require('tuft');
const { readFileSync } = require('fs');

...

const server = app.createSecureServer({
  key: readFileSync('key.pem'),
  cert: readFileSync('cert.pem'),
  port: 3000
});
```
For this example to work, you'll also need a private key and certificate in `.pem` format. For the purpose of our example, we can just generate our own using the following command:

```sh
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout key.pem -out cert.pem
```

Place the two freshly generated `.pem` files in the example server's root directory, then start the server again. If you visit `https://localhost:3000` in your web browser, you should be presented with the text "Hello, world!".

⚠ Note: Since you've generated your own certificates, and the browser has no way to verify the owner of the server, it will most likely warn you that you're visiting an untrusted webpage. Since you are the owner, you can safely ignore such warnings for this example.

## Application

A Tuft "application" is created by importing and calling `createRouteMap()`. A Tuft route map is simply a JavaScript `Map` object that stores a list of routes and their associated data. Once all of the routes for your application have been added, a server can be created by calling the route map's `.createServer()` or `.createSecureServer()` methods.

## Routing

Tuft is a route-based framework similar to [hapi](https://hapi.dev). When a client requests a particular path, a Tuft server will first determine if there is a route that matches that path. If there is, Tuft will generate a response based on a user-defined handler. By default, if there is no matching route, the server will respond to the client with a `404 Not Found` HTTP status code.

To add a route, call the route map's `.set()` method:

```js
const app = createRouteMap();

app.set('GET /foo', {
  response: { status: 200 }
});
```
In the above example, whenever a client submits a `GET` request with the path `/foo`, the server will respond with a `200 OK` status code and no body.

## Response handling

You can tell Tuft how to respond to a request by defining a `response` object. In Tuft, a `response` object is just a plain JavaScript object with no required properties. So the below example is a perfectly valid route:

```js
app.set('GET /', {
  response: {}
});
```

A `response` object with no properties will respond to client requests with the default `:status` header of `200` and no response body.

You can send a response body by defining the `body` property of the `response` object:

```js
app.set('GET /', {
  response: {
    body: 'Hello, world!'
  }
});
```

The `response` property can also be a function that returns a `response` object. So the above example could also be written as:

```js
app.set('GET /', {
  response: () => {
    const body = 'Hello, world!';
    return { body };
  }
});
```

This is likely how most of your routes will work. However, for any route where the response is known ahead of time, the first method is recommended as it may provide a significant performance improvement.

## Starting a server

Once all your routes have beed added, a server instance can be created by calling `.createServer()` or `.createSecureServer()`. A Tuft server instance exposes asynchronous `.start()` and `.stop()` methods that can be used to start and stop your server.

```js
async function init() {
  const server = app.createServer({
    host: 'localhost',
    port: 80
  });

  await server.start();

  // The server is now running.
  
  await server.stop();

  // The server will be stopped once all current connections have closed.
}

init();
```

For real world applications that must respond to requests from a web browser, you must create your server with `.createSecureServer()`, passing an options object that includes your private key and certificate files:

```js
const server = app.createSecureServer({
  host: 'localhost',
  port: 443,
  key: fs.readFileSync('./my_private_key.pem'),
  cert: fs.readFileSync('./my_certificate.pem')
});
```

Calling `.createSecureServer()` without valid `key` and `cert` options will throw an error.

## API

### `createTuft([options])`

The Tuft library does not have a default export. Instead, it exports a named `createTuft()` function, which is used to create a Tuft "application". The object returned by `createTuft()` is actually just a JavaScript `Map` object, to which all route data and associated response handlers are added. An `options` object can be passed as the only argument to set defaults for all routes that get added.

```js
const { createTuft } = require('tuft');

const app = createTuft();
```

The `options` argument may contain any of the following properties:

#### `trailingSlash`
* A `boolean` that indicates whether or not to consider any path with a trailing slash as a valid route. If set to `true`, the route `/foo` would be matched by both `/foo` and `/foo/`.

  Defaults to `null`.

#### `basePath`
* A `string` that is prepended to the path when adding a route. If `basePath` were set to `/foo`, then adding a route with the path `/bar` would result in a route of `/foo/bar`.

  If this option is not provided, then nothing will be prepended to the route path.

#### `method`
* A `string`, or array of `string`s, that determines the default HTTP request method(s) to be included when matching a route.

  By default, all supported methods will be matched.

  Tuft supports the following request methods:
  * GET
  * HEAD
  * POST
  * PUT
  * PATCH
  * DELETE
  * OPTIONS
  * TRACE

#### `path`
* A `string`, used as the default value for `path` if one is not provided when adding a route.

  Defaults to `'/'`.

#### `errorHandler`
* A `Function`, which gets called when an error is thrown in, or returned from, a plugin or handler.

#### `plugins`
* An `Array` of Tuft plugins. Any plugins set here will be executed by the framework prior to the response handler.

  Defaults to `null`.

### Class: `TuftRouteMap`
Instances of `TuftRouteMap` are not created directly, but are instead returned by the `createTuft()` function. `TuftRouteMap` exposes the following methods:

### `.add(routeSchema)`
Accepts a route schema `object` or another instance of `TuftRouteMap`. If a route schema is provided, a route is created based on its included properties.

```js
const routes1 = createTuft();

// Add the route 'GET /foo' to routes1
routes1.add({
  method: 'GET',
  path: '/foo',
  response: {
    status: 200
  }
});
```

 If passed another instance of `TuftRouteMap`, all routes from that instance will be merged with the current one.

```js
const routes2 = createTuft();

routes2.add(routes1); // routes2 now also includes the route 'GET /foo'
```

### `.set(routeName, routeSchema)`
An alternative to `.add()`. Accepts a `string` representing a request method and route path separated by a space as the first argument, and a route schema `object` as the second argument. The example above could be written as:

```js
routes.set('GET /foo', {
  response: {
    status: 200
  }
});
```

To add multiple methods with `.set()`, separate them with a `|`, or use an asterisk (`*`) to represent all supported methods.

```js
// Add the routes 'GET /foo' and 'POST /foo'
routes.set('GET|POST /foo', {
  response: {
    status: 200
  }
});

// Add the routes 'GET /bar', 'POST /bar', 'PUT /bar', etc.
routes.set('* /bar', {
  response: {
    status: 200
  }
});
```

### `.redirect(routeName, url)`
Redirects any requests for `routeName` to `url`, which can be a fully qualified URL or a relative path.

```js
// Redirect all GET requests for '/foo' to '/bar'
routes.redirect('GET /foo', '/bar');

// Redirect all GET requests for '/example' to 'https://www.example.com'
routes.redirect('GET /example', 'https://www.example.com');
```

### `.onError(callback)`
Adds a listener for application level errors, executing `callback` whenever they are emitted. Application level errors are any errors that were thrown and not caught by a route-specific error handler. For handling errors that occur within your own code or within plugins, you should add route-specific handlers. You can do this using the `errorHandler` property in your route schema when you `.add()` routes, or by setting the `errorHandler` property in your options object when calling `createTuft()`.

Errors that are not caught by route-specific error handlers, or which occur within the Tuft framework itself, will respond to the client with a `500 Internal Server Error` status code, as long as the connection is still open and the headers have not already been sent. The `Error` object will then be passed to `callback` as its first and only argument.

```js
routes.onError(err => {
  console.error(err); // Pipe the error to stderr
})
```

### `.createServer([options])`
Returns an instance of `TuftServer`, which is an `http` server instance that listens for and responds to requests based on the routes that were added to the route map. Accepts an `options` object, which may contain any of the following properties:

#### `host`
* A `string` that represents that host address the server should listen on.

  Defaults to `localhost`.

#### `port`
* A `number` that represents that host port the server should listen on.

  Defaults to `0` (random port).

### `.createSecureServer([options])`
Returns an instance of `TuftSecureServer`, which is an `https` server instance that listens for and responds to requests based on the routes that were added to the route map. Accepts an `options` object, which may contain any of the following properties:

#### `host`
* A `string` that represents that host address the server should listen on.

  Defaults to `localhost`.

#### `port`
* A `number` that represents that host port the server should listen on.

  Defaults to `0` (random port).

#### `key`
* A `string` that represents the file path of a private key in PEM format.

#### `cert`
* A `string` that represents the file path of a certificate in PEM format.
