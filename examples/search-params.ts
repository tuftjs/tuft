import { tuft, createSearchParams } from '../src';

const app = tuft({
  preHandlers: [createSearchParams()],
});

app.onError(err => console.error(err));

app.set('GET /search-params', t => {
  return {
    text: t.request.searchParams,
  };
});

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`Server listening at http://${server.host}:${server.port}`);
  });
