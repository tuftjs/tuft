import { tuft } from '../../src';

const app = tuft().onError(err => console.error(err));

app.set('GET /file', () => {
  return {
    file: __filename,
  };
});

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`${server.protocol} server listening at http://${server.host}:${server.port}`);
  });
