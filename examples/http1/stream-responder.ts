import { tuft, createWriteStreamResponder } from '../../src';

const app = tuft({
  responders: [createWriteStreamResponder()],
});

app.onError(err => console.error(err));

app.set('GET /write-stream', () => {
  return {
    writeStream: write => {
      write('Hello, ');
      write('world!');
    },
  };
});

const server = app.createServer({ port: 3000, http1: true });

server
  .start()
  .then(() => {
    console.log(`${server.protocol} server listening at http://${server.host}:${server.port}`);
  });