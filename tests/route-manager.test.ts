import { RouteManager, RouteStore } from '../src/route-manager';
import {
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_GET,
  HTTP2_METHOD_HEAD,
  HTTP2_METHOD_OPTIONS,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
  HTTP2_METHOD_TRACE,
} from '../src/constants';

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

describe('RouteManager', () => {
  //@ts-ignore
  const routes = new RouteManager(mockRouteMap);

  test('an instance of RouteManager has the expected properties', () => {
    expect(routes).toBeInstanceOf(RouteManager);
    expect(routes).toHaveProperty('_routes');
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_DELETE);
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_GET);
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_HEAD);
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_OPTIONS);
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_PATCH);
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_POST);
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_PUT);
    expect(routes['_routes']).toHaveProperty(HTTP2_METHOD_TRACE);
  });

  describe('RouteManager.prototype.find(\'GET\', \'/foo\')', () => {
    test('returns a function', () => {
      const route = routes.find('GET', '/foo');
      expect(typeof route).toBe('function');
    });
  });
});

describe('RouteStore', () => {
  const store = new RouteStore();

  describe('RouteStore.prototype.set()', () => {
    describe('with an argument of \'/foo\'', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo', {
            response: {},
          },);
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of \'/foo/{bar}\'', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo/{bar}', {
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of \'/foo/bar/{*}\'', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo/bar/{*}', {
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of \'/{**}\'', () => {
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
    describe('with an argument of \'/foo\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/foo')).toBe('function');
      });
    });

    describe('with an argument of \'/foo/bar\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/foo/bar')).toBe('function');
      });
    });

    describe('with an argument of \'/foo/bar/baz\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/foo/bar/baz')).toBe('function');
      });
    });

    describe('with an argument of \'/bar/baz\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/bar/baz')).toBe('function');
      });
    });

    describe('with an argument of \'/bar/bar/bar\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/bar/bar/bar')).toBe('function');
      });
    });

    describe('with an argument of \'/bar\'', () => {
      test('returns undefined', () => {
        expect(store.get('/bar')).toBeUndefined();
      });
    });
  });
});
