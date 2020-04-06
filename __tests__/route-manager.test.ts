import { h2c } from 'h2c';
import { createRouteMap } from '../src/route-map';

describe('Starting a server', () => {
  describe('with \'trailingSlash\' set to true', () => {
    test('does not throw an error', () => {
      const routes = createRouteMap({ trailingSlash: true });
      routes.set('GET /foo', {
        response: { status: 200 },
      });

      expect(() => routes.createServer()).not.toThrow();
    });
  });

  describe('with \'trailingSlash\' set to false', () => {
    test('does not throw an error', () => {
      const routes = createRouteMap({ trailingSlash: false });
      routes.set('GET /foo', {
        response: { status: 200 },
      });

      expect(() => routes.createServer()).not.toThrow();
    });
  });

  describe('with a double wildcard route', () => {
    test('does not throw an error', () => {
      const routes = createRouteMap({ trailingSlash: false });
      routes.set('GET /{**}', {
        response: { status: 200 },
      });

      expect(() => routes.createServer()).not.toThrow();
    });
  });

  describe('with a named wildcard route', () => {
    test('does not throw an error', () => {
      const routes = createRouteMap({ trailingSlash: false });
      routes.set('GET /{foo}', {
        response: { status: 200 },
      });

      expect(() => routes.createServer()).not.toThrow();
    });
  });
});

describe('Requesting route', () => {
  const routes = createRouteMap();

  routes.set('GET /foo', {
    response: { status: 418 },
  });

  routes.set('GET /foo/bar', {
    response: { status: 418 },
  });

  routes.set('GET /foo/{**}', {
    response: { status: 418 },
  });



  const server = routes.createServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('/foo', () => {
    test('returns a status code of 418', async () => {
      const { headers } = await h2c('GET', 'http://localhost:3000/foo');
      expect(headers[':status']).toBe(418);
    });
  });

  describe('/foo/bar', () => {
    test('returns a status code of 418', async () => {
      const { headers } = await h2c('GET', 'http://localhost:3000/foo/bar');
      expect(headers[':status']).toBe(418);
    });
  });

  describe('foo/baz', () => {
    test('returns a status code of 418', async () => {
      const { headers } = await h2c('GET', 'http://localhost:3000/foo/baz');
      expect(headers[':status']).toBe(418);
    });
  });

  describe('foo/baz/baz', () => {
    test('returns a status code of 418', async () => {
      const { headers } = await h2c('GET', 'http://localhost:3000/foo/baz/baz');
      expect(headers[':status']).toBe(418);
    });
  });
});
