import { tuft } from '../src';

const app = tuft().onError(err => console.error(err));

app.static('/', __dirname)
  .then(async () => {
    const server = app.createServer({ port: 3000 });
    await server.start();
    console.log(`Server listening at http://${server.host}:${server.port}`);
  });
