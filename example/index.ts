import {
  createTuft,
  cookieParserPlugin,
  bodyParserPlugin,
  streamResponder,
} from '../src';

const app = createTuft({
  plugins: [
    cookieParserPlugin(),
    bodyParserPlugin(),
  ],
  responders: [
    streamResponder,
  ],
  errorHandler: () => {
    return {
      error: 'BAD_REQUEST',
    };
  },
});

app.onError(err => console.error(err));

app.set('GET /status1', {
  response: { status: 204 },
});

app.set('GET /status2', {
  response: () => {
    return { status: 204 };
  },
});

app.set('GET /text1', {
  response: { body: 'Hello, world!' },
});

app.set('GET /text2', {
  response: () => {
    return { body: 'Hello, world!' };
  },
});

app.set('GET /json1', {
  response: {
    body: { hello: 'world' },
  },
});

app.set('GET /json2', {
  response: () => {
    return {
      body: { hello: 'world' },
    };
  },
});

app.set('GET /content_type1', {
  response: {
    contentType: 'html',
    body: '<h1>Hello, world!</h1>',
  },
});

app.set('GET /content_type2', {
  response: () => {
    return {
      contentType: 'html',
      body: '<h1>Hello, world!</h1>',
    };
  },
});

app.set('GET /request_object', {
  response: (t) => {
    return {
      body: t.request,
    };
  },
});

app.set('GET /file1', {
  response: {
    file: __filename,
  },
});

app.set('GET /file2', {
  response: () => {
    return {
      file: __filename,
    };
  },
});

app.set('GET /stream1', {
  response: {
    writeStream: (write: (chunk: any, enc?: string) => void) => {
      write('Hello, ');
      write('world!');
    },
  },
});

app.set('GET /stream2', {
  response: () => {
    return {
      writeStream: (write: (chunk: any, enc?: string) => void) => {
        write('Hello, ');
        write('world!');
      },
    };
  },
});

app.set('GET /foo/bar/baz', {
  response: {
    body: '/foo/bar/baz',
  },
});

app.set('GET /foo/{**}/baz', {
  response: {
    body: '/foo/{**}/baz',
  },
});

app.set('GET /xyz/{id}', {
  response: (t) => {
    return {
      body: t.request.params,
    };
  },
});

app.set('GET /a', {
  response: {},
});

app.set('GET /a/b', {
  response: {},
});

app.set('GET /a/b/c', {
  response: {},
});

app.set('GET /a/b/c/d', {
  response: {},
});

app.set('GET /a/b/c/d/e', {
  response: {},
});

app.set('GET /a/b/c/d/e/f', {
  response: {},
});

void async function() {
  const server = app.createServer({ port: 3000 });

  await server.start();

  console.log(`Server listening at http://${server.host}:${server.port}`);
}();
