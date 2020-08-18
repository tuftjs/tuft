import { tuft } from '../src';

const app = tuft().onError(err => console.error(err));

app.set('GET /200', () => {
  return {
    status: 200,
  };
});

app.set('GET /204', () => {
  return {
    status: 204,
  };
});

app.set('GET /400', () => {
  return {
    status: 400,
  };
});

app.set('GET /404', () => {
  return {
    status: 404,
  };
});

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`Server listening at http://${server.host}:${server.port}`);
  });
