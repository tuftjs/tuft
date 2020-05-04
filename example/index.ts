import {
  createRouteMap,
  cookieParserPlugin,
  bodyParserPlugin,
  streamResponder,
} from '../src';

const app = createRouteMap({
  plugins: [
    cookieParserPlugin(),
    bodyParserPlugin(),
  ],
  responders: [
    streamResponder,
  ],
});

app.onError(err => console.error(err));

app.set('GET /status1', {
  response: {
    status: 418,
   },
});

app.set('GET /status2', {
  response: () => {
    return {
      status: 418,
     };
  },
});

app.set('GET /raw1', {
  response: {
    raw: Buffer.from('Hello, world!'),
  },
});

app.set('GET /raw2', {
  response: () => {
    return {
      raw: Buffer.from('Hello, world!'),
    };
  },
});

app.set('GET /text1', {
  response: {
    text: 'Hello, world!',
  },
});

app.set('GET /text2', {
  response: () => {
    return {
      text: 'Hello, world!',
    };
  },
});

app.set('GET /html1', {
  response: {
    html: '<h1>Hello, world!<h1>',
  },
});

app.set('GET /html2', {
  response: () => {
    return {
      html: '<h1>Hello, world!<h1>',
    };
  },
});

app.set('GET /json1', {
  response: {
    json: { hello: 'world' },
  },
});

app.set('GET /json2', {
  response: () => {
    return {
      json: { hello: 'world' },
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

app.set('GET /request_object', {
  response: (t) => {
    return {
      json: t.request,
    };
  },
});

app.set('GET /foo/bar/baz', {
  response: {
    text: '/foo/bar/baz',
  },
});

app.set('GET /foo/{**}/baz', {
  response: {
    text: '/foo/{**}/baz',
  },
});

app.set('GET /xyz/{id}', {
  response: (t) => {
    return {
      json: t.request.params,
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
