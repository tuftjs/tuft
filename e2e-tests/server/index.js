const { tuft } = require('../../lib');
const statusRoutes = require('./routes/status');
const textRoutes = require('./routes/text');
const jsonRoutes = require('./routes/json');
const htmlRoutes = require('./routes/html');
const bufferRoutes = require('./routes/buffer');
const fileRoutes = require('./routes/file');

const apps = [];

apps[0] = tuft();

apps[0].set('GET /', { status: 200, text: 'OK' });

for (const response in statusRoutes) {
  apps[0].set(`GET /${response}`, statusRoutes[response]);
}

for (const response in textRoutes) {
  apps[0].set(`GET /${response}`, textRoutes[response]);
}

for (const response in jsonRoutes) {
  apps[0].set(`GET /${response}`, jsonRoutes[response]);
}

for (const response in htmlRoutes) {
  apps[0].set(`GET /${response}`, htmlRoutes[response]);
}

for (const response in bufferRoutes) {
  apps[0].set(`GET /${response}`, bufferRoutes[response]);
}

for (const response in fileRoutes) {
  apps[0].set(`GET /${response}`, fileRoutes[response]);
}

apps[1] = tuft({ cors: true });

apps[1].set('POST /cors', { status: 200, text: 'OK' });

apps[2] = tuft();

apps[2].merge(apps[1]);

apps[2].set('POST /no-cors', { status: 200, text: 'OK' });

apps.forEach((app, i) => {
  app
    .createServer({ port: 3000 + i })
    .start()
    .then(({ host, port }) => {
      console.log(`Server is running at http://${host}:${port}`);
    });
});
