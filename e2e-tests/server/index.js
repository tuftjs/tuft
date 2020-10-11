const { tuft } = require('../../lib');
const statusRoutes = require('./routes/status');
const textRoutes = require('./routes/text');
const jsonRoutes = require('./routes/json');
const htmlRoutes = require('./routes/html');
const bufferRoutes = require('./routes/buffer');
const fileRoutes = require('./routes/file');

const app = tuft();

app.set('GET /', { status: 200, text: 'OK' });

for (const response in statusRoutes) {
  app.set(`GET /${response}`, statusRoutes[response]);
}

for (const response in textRoutes) {
  app.set(`GET /${response}`, textRoutes[response]);
}

for (const response in jsonRoutes) {
  app.set(`GET /${response}`, jsonRoutes[response]);
}

for (const response in htmlRoutes) {
  app.set(`GET /${response}`, htmlRoutes[response]);
}

for (const response in bufferRoutes) {
  app.set(`GET /${response}`, bufferRoutes[response]);
}

for (const response in fileRoutes) {
  app.set(`GET /${response}`, fileRoutes[response]);
}

app
  .createServer({ port: 3000 })
  .start()
  .then(({ host, port }) => {
    console.log(`Server is running at http://${host}:${port}`);
  });
