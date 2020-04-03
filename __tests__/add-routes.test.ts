import { createRouteMap } from '../src';
import { RouteMap } from '../src/route-map';

describe('Calling createRouteMap()', () => {
  test('returns an instance of RouteMap', () => {
    expect(createRouteMap()).toBeInstanceOf(RouteMap);
  });
});

describe('Calling RouteMap.prototype.set()', () => {
  test('updates the route map with the expected entry', () => {
    const expectedResult = {
      preHandlers: [],
      response: {
        status: 200,
      },
    };

    const routes = createRouteMap();

    routes.set('GET /foo', {
      response: {
        status: 200,
      },
    });

    expect(routes.get('GET /foo')).toEqual(expectedResult);
  });
});

describe('Calling RouteMap.prototype.add()', () => {
  describe('updates the route map with the expected entry', () => {
    test('when \'path\' is set', () => {
      const expectedResult = {
        preHandlers: [],
        response: {
          status: 200,
        },
      };

      const routes = createRouteMap();

      routes.add({
        path: '/foo',
        response: {
          status: 200,
        },
      });

      expect(routes.get('GET /foo')).toEqual(expectedResult);
    });

    test('when \'path\' is NOT set', () => {
      const expectedResult = {
        preHandlers: [],
        response: {
          status: 200,
        },
      };

      const routes = createRouteMap();

      routes.add({
        response: {
          status: 200,
        },
      });

      expect(routes.get('GET /')).toEqual(expectedResult);
    });

    test('when \'preHandlers\' is set', () => {
      const preHandlers = [() => {}];

      const expectedResult = {
        preHandlers,
        response: {
          status: 200,
        },
      };

      const routes = createRouteMap();

      routes.add({
        preHandlers,
        response: {
          status: 200,
        },
      });

      expect(routes.get('GET /')).toEqual(expectedResult);
    });
  });
});
