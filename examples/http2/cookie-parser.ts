import { tuft, createCookieParser } from '../../src';

const app = tuft({
  preHandlers: [createCookieParser()],
});

app.onError(err => console.error(err));

app.set('GET /cookie-parser', t => {
  return {
    json: t.request.cookies,
  };
});

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`${server.protocol} server listening at http://${server.host}:${server.port}`);
  });
