import tuft from '../src';

const app = tuft().onError(err => console.error(err));

app.static('/', __dirname);

const server = app.createServer({ port: 3000 });

server
  .start()
  .then(() => {
    console.log(`Server listening at http://${server.host}:${server.port}`);
  });
