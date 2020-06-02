import tuft from '../src';

const app = tuft().onError(err => console.error(err));

app.set('GET /text', () => {
  return {
    text: 'Hello, world!',
  };
});

app.set('GET /html', () => {
  return {
    html: '<h1>Hello, world!<h1>',
  };
});

app.set('GET /json', () => {
  return {
    json: {
      hello: 'world',
    }
  };
});

app.set('GET /raw', () => {
  return {
    raw: Buffer.from('Hello, world!'),
  };
});

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`Server listening at http://${server.host}:${server.port}`);
  });
