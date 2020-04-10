import { RouteManager } from '../src/route-manager';

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
    expect(routes['_routes']).toHaveProperty('CONNECT');
    expect(routes['_routes']).toHaveProperty('DELETE');
    expect(routes['_routes']).toHaveProperty('GET');
    expect(routes['_routes']).toHaveProperty('HEAD');
    expect(routes['_routes']).toHaveProperty('OPTIONS');
    expect(routes['_routes']).toHaveProperty('PATCH');
    expect(routes['_routes']).toHaveProperty('POST');
    expect(routes['_routes']).toHaveProperty('PUT');
    expect(routes['_routes']).toHaveProperty('TRACE');
  });

  describe('RouteManager.prototype.find(\'GET\', \'/foo\')', () => {
    test('returns a function', () => {
      const route = routes.find('GET', '/foo');
      expect(typeof route).toBe('function');
    });
  });
});
