import { tuft } from '../../src';

const app = tuft().onError(err => console.error(err));

app.set('GET /foo/bar/baz', {
  text: '/foo/bar/baz',
});

app.set('GET /foo/{*}/baz', {
  text: '/foo/{*}/baz',
});

app.set('GET /foo/{**}/baz', {
  text: '/foo/{**}/baz',
});

app.set('GET /foo/{bar}', t => {
  return {
    text: t.request.params.bar,
  };
});

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`${server.protocol} server listening at http://${server.host}:${server.port}`);
  });
