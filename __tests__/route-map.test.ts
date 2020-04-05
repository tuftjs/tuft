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

  describe('with a wildcard method', () => {
    test('updates the route map with the expected entry', () => {
      const expectedResult = {
        preHandlers: [],
        response: {
          status: 200,
        },
      };

      const routes = createRouteMap();

      routes.set('* /foo', {
        response: {
          status: 200,
        },
      });

      expect(routes.get('CONNECT /foo')).toEqual(expectedResult);
      expect(routes.get('DELETE /foo')).toEqual(expectedResult);
      expect(routes.get('GET /foo')).toEqual(expectedResult);
      expect(routes.get('HEAD /foo')).toEqual(expectedResult);
      expect(routes.get('OPTIONS /foo')).toEqual(expectedResult);
      expect(routes.get('PATCH /foo')).toEqual(expectedResult);
      expect(routes.get('POST /foo')).toEqual(expectedResult);
      expect(routes.get('PUT /foo')).toEqual(expectedResult);
      expect(routes.get('TRACE /foo')).toEqual(expectedResult);
    });
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

    test('when \'preHandlers\' and \'errorHandler\' are set', () => {
      const preHandlers = [() => {}];
      const errorHandler = () => {
        return {};
      };

      const expectedResult = {
        preHandlers,
        errorHandler,
        response: {
          status: 200,
        },
      };

      const routes = createRouteMap();

      routes.add({
        preHandlers,
        errorHandler,
        response: {
          status: 200,
        },
      });

      expect(routes.get('GET /')).toEqual(expectedResult);
    });

    test('when custom RouteMap options are set', () => {
      const preHandlers = [() => {}];
      const errorHandler = () => {
        return {};
      };

      const expectedResult = {
        preHandlers,
        trailingSlash: true,
        parseCookies: true,
        parseText: 10_485_760,
        parseJson: 10_485_760,
        parseUrlEncoded: 10_485_760,
        response: {
          status: 200,
        },
        errorHandler,
      };

      const routes = createRouteMap({
        preHandlers,
        method: 'POST',
        trailingSlash: true,
        parseCookies: true,
        parseText: true,
        parseJson: true,
        parseUrlEncoded: true,
        basePath: '/foo',
        path: '/bar',
        errorHandler,
      });

      routes.add({
        response: {
          status: 200,
        },
      });

      expect(routes.get('POST /foo/bar')).toEqual(expectedResult);
    });

    test('when parseText, parseJson, and parseUrlEncoded are all set to false', () => {
      const expectedResult = {
        preHandlers: [],
        parseText: false,
        parseJson: false,
        parseUrlEncoded: false,
        response: {
          status: 200,
        },
      };

      const routes = createRouteMap({
        parseText: false,
        parseJson: false,
        parseUrlEncoded: false,
      });

      routes.add({
        response: {
          status: 200,
        },
      });

      expect(routes.get('GET /')).toEqual(expectedResult);
    });

    test('when parseText, parseJson, and parseUrlEncoded are all set to 1000', () => {
      const expectedResult = {
        preHandlers: [],
        parseText: 1000,
        parseJson: 1000,
        parseUrlEncoded: 1000,
        response: {
          status: 200,
        },
      };

      const routes = createRouteMap({
        parseText: 1000,
        parseJson: 1000,
        parseUrlEncoded: 1000,
      });

      routes.add({
        response: {
          status: 200,
        },
      });

      expect(routes.get('GET /')).toEqual(expectedResult);
    });

    test('when the first argument is another instance of RouteMap with its own custom options', () => {
      const preHandlers = [() => {}];
      const errorHandler = () => {
        return {};
      };

      const expectedResult = {
        preHandlers,
        trailingSlash: true,
        parseCookies: true,
        parseText: 10_485_760,
        parseJson: 10_485_760,
        parseUrlEncoded: 10_485_760,
        errorHandler,
        response: {
          status: 200,
        },
      };

      const routes1 = createRouteMap({
        preHandlers,
        method: 'POST',
        trailingSlash: true,
        parseCookies: true,
        parseText: true,
        parseJson: true,
        parseUrlEncoded: true,
        basePath: '/foo',
        path: '/bar',
        errorHandler,
      });

      routes1.add({
        response: {
          status: 200,
        },
      });

      const routes2 = createRouteMap();

      routes2.add(routes1);

      expect(routes2.get('POST /foo/bar')).toEqual(expectedResult);
    });

    test('when the first argument is another instance of RouteMap', () => {
      const preHandlers = [() => {}];
      const errorHandler = () => {
        return {};
      };

      const expectedResult = {
        preHandlers,
        trailingSlash: true,
        parseCookies: true,
        parseText: 10_485_760,
        parseJson: 10_485_760,
        parseUrlEncoded: 10_485_760,
        errorHandler,
        response: {
          status: 200,
        },
      };

      const routes1 = createRouteMap();

      routes1.add({
        response: {
          status: 200,
        },
      });

      const routes2 = createRouteMap({
        preHandlers,
        method: 'POST',
        trailingSlash: true,
        parseCookies: true,
        parseText: true,
        parseJson: true,
        parseUrlEncoded: true,
        basePath: '/foo',
        path: '/bar',
        errorHandler,
      });

      routes2.add(routes1);

      expect(routes2.get('GET /foo')).toEqual(expectedResult);
    });

    test('when neither instance is passed any options', () => {
      const expectedResult = {
        preHandlers: [],
        response: {
          status: 200,
        },
      };

      const routes1 = createRouteMap();

      routes1.add({
        response: {
          status: 200,
        },
      });

      const routes2 = createRouteMap();

      routes2.add(routes1);

      expect(routes2.get('GET /')).toEqual(expectedResult);
    });
  });

  describe('causes the program to exit with error code 1', () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    afterAll(() => {
      mockConsoleError.mockRestore();
      mockExit.mockRestore();
    });

    test('when a non-object is passed as the first argument', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add('foo');

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an invalid property name', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ invalid: 'property' });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an invalid request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: 'FOO' });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an array as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: [[]] });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an object as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: [{}] });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using \'null\' as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: null });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using a symbol as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: Symbol() });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using \'undefined\' as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: undefined });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using a buffer as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: Buffer.from('abc') });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using a 15-byte buffer as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: Buffer.from('abcdefghijklmnop') });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using a buffer longer than 15 bytes as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: Buffer.from('abcdefghijklmnopqrstuvwxyz') });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using a function as a request method', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ method: () => {} });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an invalid path', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ path: 42 });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an invalid pre-handler', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ preHandlers: [42n] });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an invalid response', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ response: true });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('when using an invalid error handler', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add({ errorHandler: 'not a function' });

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
