import { createRouteMap } from '../src';

void async function() {
  const routes = createRouteMap({ parseJson: true });

  routes.set('GET /a', {
    response: () => {
      return { status: 204 };
    },
  });

  routes.set('GET /b', {
    preHandlers: [() => {}],
    response: { status: 204 },
  });

  routes.set('GET /c', {
    response: { status: 204 },
  });

  routes.set('GET /foo/bar/baz', {
    response: {
      status: 200,
      body: 'AAA',
    },
  });

  routes.set('GET /foo/{**}/baz', {
    response: {
      status: 200,
      body: 'BBB',
    },
  });

  routes.set('GET /xyz/{id}', {
    response: () => {
      return {
        status: 200,
      };
    },
  });

  routes.set('GET /json', {
    response: () => {
      return {
        body: {
          hello: 'world',
        },
      };
    },
  });

  routes.set('GET /hello', {
    response: {
      status: 200,
      body: 'Hello, world!',
    },
  });

  routes.set('GET /a/b/c/d/e/f', {
    response: {
      status: 200,
      body: 'Hello, world!',
    },
  });


  routes.set('GET /content_type', {
    response: {
      status: 200,
      contentType: 'text',
      body: 'Hello, world!',
    },
  });

  routes.add({
    path: '/{**}',
    response: {
      status: 404,
    },
  });

  const server = routes.createServer();

  await server.start();

  console.log(`Server listening at http://${server.host}:${server.port}`);
}();
