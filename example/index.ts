import { createRouteMap } from '../src';

void async function() {
  const foo = createRouteMap();

  foo.set('GET /x', {
    response: {
      body: 'hey there'
    }
  });

  foo.add({
    path: '/{**}',
    response: {
      status: 404,
    },
  });

  const server = foo.createServer({ host: 'localhost', port: 3000 });

  await server.start();

  console.log('Server started!');
}();
