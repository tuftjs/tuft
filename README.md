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

A simple "Hello, world!" example:
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
This would ordinarily be the part where we might say that if you visit `http://localhost:3000` in your web browser, you'll see the text "Hello, world!" displayed. Except... you wouldn't! As there are no browsers known to support *unencrypted* HTTP/2 connections, you would have to use something like the command line client `curl` to access the server in the example above.

```sh
$ curl --http2-prior-knowledge http://localhost:3000
Hello, world!
```

Note: The `--http2-prior-knowledge` option is only necessary for this example so that curl doesn't think we're trying to access an HTTP/1 server.
It is not necessary when using curl to access a secure HTTP/2 server.

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

Note: Since you've generated your own certificates, and the browser has no way to verify the owner of the server, it will most likely warn you that you're visiting an untrusted webpage. Since you are the owner, you can safely ignore such warnings for this example.

## Application

A Tuft "application" is created by importing and calling `createRouteMap()`, which returns a JavaScript `Map` object that stores a list of routes and their associated data. Once all of the routes for your application have been added, a server can be created by calling the route map's `.createServer()` or `.createSecureServer()` methods.

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

The `response` property can also be set to a function that *returns* a `response` object. So the above example could also be written as:

```js
app.set('GET /', {
  response: () => {
    const body = 'Hello, world!';
    return { body };
  }
});
```

This is likely how most of your routes will be implemented. However, for any route where the response is known ahead of time, the first method is recommended as it may provide a significant performance improvement.

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

## API

### `createRouteMap([options])`

The Tuft library does not have a default export. Instead, it exports a named `createRouteMap()` function, which is used to create a Tuft "application". The object returned by `createRouteMap()` is actually just a JavaScript `Map` object, to which all route data and associated response handlers are added. An `options` object can be passed as the only argument to set defaults for all routes that get added.

```js
const { createRouteMap } = require('tuft');

const app = createRouteMap();
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

#### `plugins`
* An `Array` of Tuft plugins. Any plugins set here will be executed by the framework prior to the response handler.

  Defaults to `null`.

#### `responders`
* An `Array` of Tuft responders. A Tuft responder is a function which receives a response object, and then determines how to respond to the client based on the properties included in that object.

---

### Class: `TuftRouteMap`
Instances of `TuftRouteMap` are not created directly, but are instead returned by the `createRouteMap()` function. `TuftRouteMap` exposes the following methods:

### `.add(routeSchema)`
Accepts a route schema `object` or another instance of `TuftRouteMap`. If a route schema is provided, a route is created based on its included properties.

```js
const routes1 = createRouteMap();

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
const routes2 = createRouteMap();

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

To add multiple methods with `.set()`, separate them with a vertical slash (`|`), or use an asterisk (`*`) to represent all supported methods.

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

If the `method` or `path` property is included in the route schema object when using `.set()`, it will be ignored.
```js
// Add the route 'POST /bar'
routes.set('POST /bar', {
  method: 'GET',  // ignored
  path: '/foo',   // ignored
  response: {
    status: 200
  }
})
```

### `.redirect(routeName, url)`
Redirects any requests for `routeName` to `url`, which can be a fully qualified URL or a relative path.

```js
// Redirect all GET requests for '/foo' to '/bar'
routes.redirect('GET /foo', '/bar');

// Redirect all GET requests for '/example' to 'https://www.example.com'
routes.redirect('GET /example', 'https://www.example.com');
```
Clients will be redirected with a `302 Found` status code.

### `.onError(callback)`
Adds a listener for errors that occur in the request/response cycle, executing `callback` whenever they are emitted. Tuft catches synchronous errors that occur in the request/response cycle, or any errors that are emitted by the Node HTTP/2 stream object. It then responds to the client with a `500 Internal Server Error` status code, provided the connection is still open and the headers have not already been sent. The emitted `Error` object is then passed to `callback` as its first and only argument.

```js
routes.onError(err => {
  console.error(err); // Pipe the error to stderr
})
```

Note: At present, Tuft only supports a single error listener. Multiple calls to `.onError()` will override the previously added callback.

### `.createServer([options])`
Returns an instance of [`TuftServer`](#class-tuftserver), which is an `http` server instance that listens for and responds to requests based on the routes that were added to the route map. Accepts an `options` object, which may contain any of the following properties:

#### `host`
* A `string` that represents that host address the server should listen on.

  Defaults to `localhost`.

#### `port`
* A `number` that represents that host port the server should listen on.

  Defaults to `0` (random port).

### `.createSecureServer([options])`
Returns an instance of [`TuftSecureServer`](#class-tuftsecureserver), which is an `https` server instance that listens for and responds to requests based on the routes that were added to the route map. Accepts an `options` object, which may contain any of the following properties:

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

---

### Class: `TuftContext`

The Tuft context object is passed as the first and only argument to the user-defined response handler, as well as any plugins that are present on a particular route. It contains the `request` object as one of its properties, as well as several useful methods.

### `request`
The `request` object contains the following properties:

#### `headers`
* An `object` containing all the incoming HTTP/2 headers.

#### `method`
* A `string` that represents the request method for the current request.

#### `pathname`
* A `string` that represents the pathname for the current request, without the query string (if one existed).

#### `secure`
* A `boolean` that indicates whether the current request is using `http` or `https`.

#### `searchParams`
* An instance of `URLSearchParams` containing the parameters that were present in the query string (if one existed).

#### `params`
* An `object` containing any named parameters that were provided in the route-defined path.

  For example, the route `GET /user/{name}` contains the named parameter 'name'. The `params` object for the request `GET /user/john` would then be `{ name: 'john' }`.

In addition to the properties listed above, the request object may contain other properties that were added by any plugins that are active on the current route.

### `outgoingHeaders`
An `object` that contains the outgoing HTTP headers. Headers can be added to this object directly, or they can be added via `.setHeader()`.

### `.setHeader(name, value)`
Sets the outgoing header `name` to `value`.

```js
t.setHeader(':status', '200');
```

### `.getHeader(name)`
Returns the current value of outgoing header `name`. If `name` has not been set, then returns `undefined`.

```js
t.getHeader(':status'); // '200'
```

### `.setCookie(name, value[, options])`
Updates the outgoing `set-cookie` header (creating it if it doesn't already exist) with the provided `name` and `value`.

```js
t.setCookie('my-cookie-name', 'my-cookie-value');
```

Can be passed a third `options` argument which is an `object` containing any of the following:
#### `expires`
* A `Date` object that represents when the cookie should expire. If not set, a session cookie is created.

  Note: If `expires` and `maxAge` are both set, only `maxAge` will be used.

#### `maxAge`
* The `number` of seconds until the cookie expires. A value less than or equal to zero will expire the cookie immediately.

#### `domain`
* A `string` that represents the host that the cookie will be sent to.

#### `path`
* A `string` that must exist in the request URL in order for the client to send the `cookie` header.

  Defaults to '/'.

#### `secure`
* A `boolean` that indicates whether or not cookies should only be sent via `https`.

#### `httpOnly`
* A `boolean` that indicates whether or not client side JavaScript should be prevented from accessing the cookie.

#### `sameSite`
* A `string` that must be one of the following three values:
  * `Strict`
  * `Lax`
  * `None`

  Can be set to `Strict` or `Lax` to help mitigate the threat of CSRF attacks. For more information, see the [official specification](https://tools.ietf.org/html/draft-ietf-httpbis-cookie-same-site-00#section-4.1.1).

---

### Class: `TuftServer`
An instance of `TuftServer` is returned whenever the `.createServer()` method is called. It exposes the following methods and properties:

### `.start()`
Returns a promise that resolves once the server has started.

### `.stop()`
Returns a promise that resolves once all current connections have been closed and the server has stopped.

### `.setTimeout([msecs][, callback])`
Sets the timeout value (a `number`) in milliseconds for requests to the server. The provided `callback` is invoked whenever the timeout value is reached.

By default, `msecs` is `0` (no timeout).

Throws an error if the provided `callback` is not a function.

### `.address()`

If called while the server is running, returns an `object` containing data about the current server, such as the IP address and port number the server is listening on.

#### `host`
A `string` that represents the IP address or hostname that the server will listen on when it's running.

#### `port`
A `number` that represents port that the server will listen on when it's running.

---

### Class: `TuftSecureServer`
An instance of `TuftSecureServer` is returned whenever the `.createSecureServer()` method is called. Its methods and properties are identical to that of [`TuftServer`](#class-tuftserver).
