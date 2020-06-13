import { tuft, createSearchParams } from '../../src';

const app = tuft({
  preHandlers: [createSearchParams()],
});

app.onError(err => console.error(err));

app.set('GET /search-params', t => {
  const json: any = {};

  for (const [key, value] of t.request.searchParams) {
    json[key] = value;
  }

  return { json };
});

const server = app.createServer({ port: 3000, http1: true });

server
  .start()
  .then(() => {
    console.log(`${server.protocol} server listening at http://${server.host}:${server.port}`);
  });
