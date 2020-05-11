import {
  createRouteMap,
  createCookieParser,
  createBodyParser,
  streamResponder,
} from '../src';

const app = createRouteMap({
  preHandlers: [
    createCookieParser(),
    createBodyParser(),
  ],
  responders: [
    streamResponder,
  ],
});

app.onError(err => console.error(err));

app.set('GET /status1', {
  status: 418,
});

app.set('GET /status2', () => {
  return {
    status: 418,
   };
});

app.set('GET /raw1', {
  raw: Buffer.from('Hello, world!'),
});

app.set('GET /raw2', () => {
  return {
    raw: Buffer.from('Hello, world!'),
  };
});

app.set('GET /text1', {
  text: 'Hello, world!',
});

app.set('GET /text2', () => {
  return {
    text: 'Hello, world!',
  };
});

app.set('GET /html1', {
  html: '<h1>Hello, world!<h1>',
});

app.set('GET /html2', () => {
  return {
    html: '<h1>Hello, world!<h1>',
  };
});

app.set('GET /json1', {
  json: { hello: 'world' },
});

app.set('GET /json2', () => {
  return {
    json: { hello: 'world' },
  };
});

app.set('GET /file1', {
  file: __filename,
});

app.set('GET /file2', () => {
  return {
    file: __filename,
  };
});

app.set('GET /stream1', {
  writeStream: (write: (chunk: any, enc?: string) => void) => {
    write('Hello, ');
    write('world!');
  },
});

app.set('GET /stream2', () => {
  return {
    writeStream: (write: (chunk: any, enc?: string) => void) => {
      write('Hello, ');
      write('world!');
    },
  };
});

app.set('GET /request_object', (t: { request: any; }) => {
  return {
    json: t.request,
  };
});

app.set('GET /foo/bar/baz', {
  text: '/foo/bar/baz',
});

app.set('GET /foo/{**}/baz', {
  text: '/foo/{**}/baz',
});

app.set('GET /xyz/{id}', (t: { request: { params: any; }; }) => {
  return {
    json: t.request.params,
  };
});

app
  .set('GET /a', {})
  .set('GET /a/b', {})
  .set('GET /a/b/c', {})
  .set('GET /a/b/c/d', {})
  .set('GET /a/b/c/d/e', {})
  .set('GET /a/b/c/d/e/f', {});

void async function() {
  const server = app.createServer({ port: 3000 });

  await server.start();

  console.log(`Server listening at http://${server.host}:${server.port}`);
}();
