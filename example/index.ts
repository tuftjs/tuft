import { createRouteMap, cookieParserPlugin, bodyParserPlugin } from '../src';

const app = createRouteMap({
  plugins: [
    cookieParserPlugin(),
    bodyParserPlugin(),
  ],
});

app.set('GET /a', {
  response: () => {
    return { status: 204 };
  },
});

app.set('POST /a', {
  response: () => {
    return { status: 204 };
  },
});

app.set('GET /b', {
  response: { status: 204 },
});

app.set('GET /foo/bar/baz', {
  response: {
    status: 200,
    body: 'AAA',
  },
});

app.set('GET /foo/{**}/baz', {
  response: {
    status: 200,
    body: 'BBB',
  },
});

app.set('GET /xyz/{id}', {
  response: () => {
    return {
      status: 200,
    };
  },
});

app.set('GET /json', {
  response: () => {
    return {
      body: {
        hello: 'world',
      },
    };
  },
});

app.set('GET /a/b/c/d/e/f', {
  response: {
    status: 200,
    body: 'Hello, world!',
  },
});


app.set('GET /content_type', {
  response: {
    status: 200,
    contentType: 'text',
    body: 'Hello, world!',
  },
});

app.set('GET /request_object', {
  response: (t) => {
    return {
      body: t.request,
    };
  },
});

app.add({
  path: '/{**}',
  response: {
    error: 'NOT_FOUND',
  },
});

void async function() {
  const server = app.createServer({ port: 3000 });

  await server.start();

  console.log(`Server listening at http://${server.host}:${server.port}`);
}();
