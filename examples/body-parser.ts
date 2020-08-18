import { tuft, createBodyParser } from '../src';

const app = tuft({
  preHandlers: [
    createBodyParser('raw'),
    createBodyParser('text'),
    createBodyParser('json'),
    createBodyParser('urlEncoded'),
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

  if (Buffer.isBuffer(body)) {
    return {
      raw: t.request.body,
    };
  }

  if (typeof body === 'object' && body !== null) {
    return {
      json: t.request.body,
    };
  }

  return {
    text: 'No body was detected in the request message.'
  };
});

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`Server listening at http://${server.host}:${server.port}`);
  });
