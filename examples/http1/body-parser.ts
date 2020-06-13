import { tuft, createBodyParser } from '../../src';

const app = tuft({
  preHandlers: [
    createBodyParser({
      text: true,
      json: true,
      urlEncoded: true,
    }),
  ],
});

app.onError(err => console.error(err));

app.set('POST /body-parser', t => {
  const { body } = t.request;

  if (typeof body === 'string') {
    return {
      text: t.request.body,
    };
  }

  else if (Buffer.isBuffer(body)) {
    return {
      raw: t.request.body,
    };
  }

  else if (typeof body === 'object' && body !== null) {
    return {
      json: t.request.body,
    };
  }
});

const server = app.createServer({ port: 3000, http1: true });

server
  .start()
  .then(() => {
    console.log(`${server.protocol} server listening at http://${server.host}:${server.port}`);
  });
