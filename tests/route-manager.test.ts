import { RouteManager, RouteStore } from '../src/route-manager';

const mockRouteMap = new Map();

mockRouteMap.set('GET /foo', {
  preHandlers: [],
  response: {},
});

mockRouteMap.set('GET /bar', {
  trailingSlash: true,
  preHandlers: [],
  response: {},
});

/**
 * RouteManager
 */

describe('RouteManager', () => {
  describe('new RouteManager()', () => {
    test('returns an instance of RouteManager with the expected properties', () => {
      //@ts-expect-error
      const routes = new RouteManager(mockRouteMap);

      expect(routes).toBeInstanceOf(RouteManager);
      expect(routes).toHaveProperty('_routes');

      const _routes = routes['_routes'];

      expect(_routes).toHaveProperty('DELETE');
      expect(_routes).toHaveProperty('GET');
      expect(_routes).toHaveProperty('HEAD');
      expect(_routes).toHaveProperty('OPTIONS');
      expect(_routes).toHaveProperty('PATCH');
      expect(_routes).toHaveProperty('POST');
      expect(_routes).toHaveProperty('PUT');
      expect(_routes).toHaveProperty('TRACE');
    });
  });

  describe('RouteManager.prototype.find(\'GET\', \'/foo\')', () => {
    test('returns a function', () => {
      //@ts-expect-error
      const routes = new RouteManager(mockRouteMap);
      const route = routes.find('GET', '/foo');

      expect(typeof route).toBe('function');
    });
  });
});

describe('RouteStore', () => {
  const store = new RouteStore();

  describe('RouteStore.prototype.set()', () => {
    describe('with an argument of `/foo`', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo', {
            response: {},
          },);
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of `/foo/{bar}`', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo/{bar}', {
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of `/foo/bar/{*}`', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo/bar/{*}', {
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of `/{**}`', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/{**}', {
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });
  });
});

/**
 * RouteStore
 */

describe('RouteStore', () => {
  const store = new RouteStore();

  store.set('/foo', {
    response: {},
  });

  store.set('/foo/{*}', {
    response: {},
  });

  store.set('/foo/bar/{*}', {
    response: {},
  });

  store.set('/bar/{**}', {
    response: {},
  });

  describe('RouteStore.prototype.get()', () => {
    describe('with an argument of `/foo`', () => {
      test('returns a function', () => {
        const result = store.get('/foo');

        expect(typeof result).toBe('function');
      });
    });

    describe('with an argument of `/foo/bar`', () => {
      test('returns a function', () => {
        const result = store.get('/foo/bar');

        expect(typeof result).toBe('function');
      });
    });

    describe('with an argument of `/foo/bar/baz`', () => {
      test('returns a function', () => {
        const result = store.get('/foo/bar/baz');

        expect(typeof result).toBe('function');
      });
    });

    describe('with an argument of `/bar/baz`', () => {
      test('returns a function', () => {
        const result = store.get('/bar/baz');

        expect(typeof result).toBe('function');
      });
    });

    describe('with an argument of `/bar/bar/bar`', () => {
      test('returns a function', () => {
        const result = store.get('/bar/bar/bar');

        expect(typeof result).toBe('function');
      });
    });

    describe('with an argument of `/bar`', () => {
      test('returns undefined', () => {
        const result = store.get('/bar');

        expect(result).toBeUndefined();
      });
    });
  });
});
